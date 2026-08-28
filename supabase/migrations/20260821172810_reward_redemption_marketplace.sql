-- Phase 5: secure member-only reward catalog and redemption lifecycle.
--
-- Inventory is reserved and Gyrocoins are deducted in the same transaction as
-- a redemption request. Rejections and member cancellations atomically restore
-- inventory and append an immutable refund entry to the Phase 4 ledger.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM supabase_migrations.schema_migrations
     WHERE version = '20260821125016'
  ) THEN
    RAISE EXCEPTION
      'Phase 5 requires the Phase 4 Gyrocoin ordering correction';
  END IF;

  IF EXISTS (SELECT 1 FROM public.redemptions) THEN
    RAISE EXCEPTION
      'Phase 5 requires an empty redemptions table; stop and inspect existing rows';
  END IF;

  IF to_regclass('public.rewards') IS NOT NULL
     OR to_regclass('public.redemption_status_history') IS NOT NULL THEN
    RAISE EXCEPTION
      'Phase 5 marketplace tables already exist outside migration history';
  END IF;
END
$$;

CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  point_cost INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT rewards_slug_key UNIQUE (slug),
  CONSTRAINT rewards_slug_check CHECK (
    slug = lower(btrim(slug))
    AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 1 AND 120
  ),
  CONSTRAINT rewards_name_check CHECK (
    name = btrim(name) AND char_length(name) BETWEEN 1 AND 200
  ),
  CONSTRAINT rewards_description_check CHECK (
    description IS NULL OR char_length(description) <= 5000
  ),
  CONSTRAINT rewards_image_url_check CHECK (
    image_url IS NULL
    OR (
      char_length(image_url) <= 2048
      AND image_url ~ '^https://[^[:space:]]+$'
    )
  ),
  CONSTRAINT rewards_point_cost_check CHECK (
    point_cost BETWEEN 1 AND 1000000
  ),
  CONSTRAINT rewards_stock_quantity_check CHECK (
    stock_quantity BETWEEN 0 AND 1000000
  ),
  CONSTRAINT rewards_sort_order_check CHECK (
    sort_order BETWEEN 0 AND 1000000
  )
);

CREATE INDEX rewards_active_catalog_idx
  ON public.rewards(sort_order, name, id)
  WHERE active;

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.redemptions
  DROP CONSTRAINT IF EXISTS redemptions_member_id_fkey,
  DROP CONSTRAINT IF EXISTS redemptions_approved_by_fkey;

ALTER TABLE public.redemptions
  ADD CONSTRAINT redemptions_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE RESTRICT,
  ADD CONSTRAINT redemptions_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.members(id) ON DELETE RESTRICT,
  ADD COLUMN reward_id UUID NOT NULL
    REFERENCES public.rewards(id) ON DELETE RESTRICT,
  ADD COLUMN quantity INTEGER NOT NULL,
  ADD COLUMN unit_cost INTEGER NOT NULL,
  ADD COLUMN request_operation_key UUID NOT NULL,
  ADD COLUMN debit_ledger_id UUID NOT NULL
    REFERENCES public.points_ledger(id) ON DELETE RESTRICT,
  ADD COLUMN refund_ledger_id UUID
    REFERENCES public.points_ledger(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_by UUID
    REFERENCES public.members(id) ON DELETE RESTRICT,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN fulfilled_by UUID
    REFERENCES public.members(id) ON DELETE RESTRICT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

ALTER TABLE public.redemptions
  ALTER COLUMN status SET DEFAULT 'PENDING',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT clock_timestamp(),
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT redemptions_request_operation_key_key
    UNIQUE (request_operation_key),
  ADD CONSTRAINT redemptions_debit_ledger_id_key UNIQUE (debit_ledger_id),
  ADD CONSTRAINT redemptions_refund_ledger_id_key UNIQUE (refund_ledger_id),
  ADD CONSTRAINT redemptions_quantity_check CHECK (
    quantity BETWEEN 1 AND 100
  ),
  ADD CONSTRAINT redemptions_unit_cost_check CHECK (
    unit_cost BETWEEN 1 AND 1000000
  ),
  ADD CONSTRAINT redemptions_total_cost_check CHECK (
    total_cost BETWEEN 1 AND 1000000
    AND total_cost::BIGINT = unit_cost::BIGINT * quantity::BIGINT
  ),
  ADD CONSTRAINT redemptions_reason_check CHECK (
    (rejection_reason IS NULL OR char_length(rejection_reason) BETWEEN 3 AND 500)
    AND (
      cancellation_reason IS NULL
      OR char_length(cancellation_reason) BETWEEN 3 AND 500
    )
  ),
  ADD CONSTRAINT redemptions_status_state_check CHECK (
    (
      status = 'PENDING'
      AND approved_by IS NULL
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
      AND rejection_reason IS NULL
      AND cancellation_reason IS NULL
      AND refund_ledger_id IS NULL
      AND fulfilled_by IS NULL
      AND fulfilled_at IS NULL
    )
    OR (
      status = 'APPROVED'
      AND approved_by IS NOT NULL
      AND reviewed_by = approved_by
      AND reviewed_at IS NOT NULL
      AND rejection_reason IS NULL
      AND cancellation_reason IS NULL
      AND refund_ledger_id IS NULL
      AND fulfilled_by IS NULL
      AND fulfilled_at IS NULL
    )
    OR (
      status = 'FULFILLED'
      AND approved_by IS NOT NULL
      AND reviewed_by = approved_by
      AND reviewed_at IS NOT NULL
      AND rejection_reason IS NULL
      AND cancellation_reason IS NULL
      AND refund_ledger_id IS NULL
      AND fulfilled_by IS NOT NULL
      AND fulfilled_at IS NOT NULL
    )
    OR (
      status = 'REJECTED'
      AND approved_by IS NULL
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND rejection_reason IS NOT NULL
      AND cancellation_reason IS NULL
      AND refund_ledger_id IS NOT NULL
      AND fulfilled_by IS NULL
      AND fulfilled_at IS NULL
    )
    OR (
      status = 'CANCELLED'
      AND approved_by IS NULL
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
      AND rejection_reason IS NULL
      AND cancellation_reason IS NOT NULL
      AND refund_ledger_id IS NOT NULL
      AND fulfilled_by IS NULL
      AND fulfilled_at IS NULL
    )
  );

CREATE INDEX redemptions_reward_idx
  ON public.redemptions(reward_id);
CREATE INDEX redemptions_status_queue_idx
  ON public.redemptions(status, created_at, id)
  WHERE status IN ('PENDING', 'APPROVED');
DROP INDEX IF EXISTS public.redemptions_member_idx;
CREATE INDEX redemptions_member_idx
  ON public.redemptions(member_id, created_at DESC, id DESC);
DROP INDEX IF EXISTS public.redemptions_approved_by_idx;
CREATE INDEX redemptions_approved_by_idx
  ON public.redemptions(approved_by)
  WHERE approved_by IS NOT NULL;
CREATE INDEX redemptions_reviewed_by_idx
  ON public.redemptions(reviewed_by)
  WHERE reviewed_by IS NOT NULL;
CREATE INDEX redemptions_fulfilled_by_idx
  ON public.redemptions(fulfilled_by)
  WHERE fulfilled_by IS NOT NULL;

CREATE TRIGGER update_redemptions_updated_at
  BEFORE UPDATE ON public.redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.redemption_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID NOT NULL
    REFERENCES public.redemptions(id) ON DELETE RESTRICT,
  operation_key UUID NOT NULL,
  actor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT redemption_status_history_operation_key_key
    UNIQUE (operation_key),
  CONSTRAINT redemption_status_history_status_check CHECK (
    (from_status IS NULL OR from_status IN (
      'PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED'
    ))
    AND to_status IN (
      'PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED'
    )
  ),
  CONSTRAINT redemption_status_history_transition_check CHECK (
    (from_status IS NULL AND to_status = 'PENDING')
    OR (from_status = 'PENDING' AND to_status IN (
      'APPROVED', 'REJECTED', 'CANCELLED'
    ))
    OR (from_status = 'APPROVED' AND to_status = 'FULFILLED')
  ),
  CONSTRAINT redemption_status_history_reason_check CHECK (
    reason IS NULL OR char_length(reason) BETWEEN 1 AND 500
  )
);

CREATE INDEX redemption_status_history_redemption_timeline_idx
  ON public.redemption_status_history(redemption_id, created_at, id);
CREATE INDEX redemption_status_history_actor_idx
  ON public.redemption_status_history(actor_id)
  WHERE actor_id IS NOT NULL;

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rewards_authorized_read ON public.rewards;
CREATE POLICY rewards_authorized_read ON public.rewards
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR (
      active
      AND (SELECT public.current_member_id()) IS NOT NULL
    )
  );

DROP POLICY IF EXISTS redemptions_authorized_read ON public.redemptions;
CREATE POLICY redemptions_authorized_read ON public.redemptions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

DROP POLICY IF EXISTS redemption_status_history_authorized_read
  ON public.redemption_status_history;
CREATE POLICY redemption_status_history_authorized_read
  ON public.redemption_status_history
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
        FROM public.redemptions AS redemption
       WHERE redemption.id = redemption_status_history.redemption_id
         AND redemption.member_id = (SELECT public.current_member_id())
    )
  );

DO $$
DECLARE
  write_policy RECORD;
BEGIN
  FOR write_policy IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN (
         'rewards', 'redemptions', 'redemption_status_history'
       )
       AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      write_policy.policyname,
      write_policy.schemaname,
      write_policy.tablename
    );
  END LOOP;
END
$$;

REVOKE ALL ON TABLE public.rewards
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.redemptions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.redemption_status_history
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.rewards, public.redemptions,
  public.redemption_status_history TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.create_marketplace_reward(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_point_cost INTEGER,
  p_stock_quantity INTEGER,
  p_active BOOLEAN,
  p_sort_order INTEGER
)
RETURNS public.rewards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_slug TEXT := lower(btrim(p_slug));
  normalized_name TEXT := btrim(p_name);
  normalized_description TEXT := NULLIF(btrim(p_description), '');
  normalized_image_url TEXT := NULLIF(btrim(p_image_url), '');
  reward_row public.rewards;
BEGIN
  INSERT INTO public.rewards(
    slug, name, description, image_url, point_cost, stock_quantity,
    active, sort_order, created_by, updated_by
  ) VALUES (
    normalized_slug,
    normalized_name,
    normalized_description,
    normalized_image_url,
    p_point_cost,
    p_stock_quantity,
    COALESCE(p_active, FALSE),
    p_sort_order,
    actor_id,
    actor_id
  )
  RETURNING * INTO reward_row;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'MARKETPLACE_REWARD_CREATED',
    'reward',
    reward_row.id::TEXT,
    jsonb_build_object(
      'slug', reward_row.slug,
      'point_cost', reward_row.point_cost,
      'stock_quantity', reward_row.stock_quantity,
      'active', reward_row.active
    )
  );

  RETURN reward_row;
END
$$;

CREATE OR REPLACE FUNCTION private.update_marketplace_reward(
  p_reward_id UUID,
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_point_cost INTEGER,
  p_stock_quantity INTEGER,
  p_active BOOLEAN,
  p_sort_order INTEGER
)
RETURNS public.rewards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_slug TEXT := lower(btrim(p_slug));
  normalized_name TEXT := btrim(p_name);
  normalized_description TEXT := NULLIF(btrim(p_description), '');
  normalized_image_url TEXT := NULLIF(btrim(p_image_url), '');
  reserved_quantity BIGINT;
  previous_reward public.rewards;
  reward_row public.rewards;
BEGIN
  SELECT *
    INTO previous_reward
    FROM public.rewards
   WHERE id = p_reward_id
   FOR UPDATE;

  IF previous_reward.id IS NULL THEN
    RAISE EXCEPTION 'Reward not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(sum(quantity), 0)
    INTO reserved_quantity
    FROM public.redemptions
   WHERE reward_id = p_reward_id
     AND status IN ('PENDING', 'APPROVED');

  IF p_stock_quantity::BIGINT + reserved_quantity > 1000000 THEN
    RAISE EXCEPTION
      'Available plus reserved stock cannot exceed 1,000,000 units'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.rewards
     SET slug = normalized_slug,
         name = normalized_name,
         description = normalized_description,
         image_url = normalized_image_url,
         point_cost = p_point_cost,
         stock_quantity = p_stock_quantity,
         active = COALESCE(p_active, FALSE),
         sort_order = p_sort_order,
         updated_by = actor_id
   WHERE id = p_reward_id
  RETURNING * INTO reward_row;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'MARKETPLACE_REWARD_UPDATED',
    'reward',
    reward_row.id::TEXT,
    jsonb_build_object(
      'from', jsonb_build_object(
        'slug', previous_reward.slug,
        'point_cost', previous_reward.point_cost,
        'stock_quantity', previous_reward.stock_quantity,
        'active', previous_reward.active
      ),
      'to', jsonb_build_object(
        'slug', reward_row.slug,
        'point_cost', reward_row.point_cost,
        'stock_quantity', reward_row.stock_quantity,
        'active', reward_row.active
      ),
      'reserved_quantity', reserved_quantity
    )
  );

  RETURN reward_row;
END
$$;

CREATE OR REPLACE FUNCTION private.request_reward_redemption(
  p_reward_id UUID,
  p_quantity INTEGER,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_member_id UUID := public.current_member_id();
  redemption_id UUID := gen_random_uuid();
  total_cost_value BIGINT;
  current_balance INTEGER;
  reward_row public.rewards;
  existing_redemption public.redemptions;
  existing_operation public.redemption_status_history;
  debit_entry public.points_ledger;
  redemption_row public.redemptions;
BEGIN
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Active member access required' USING ERRCODE = '42501';
  END IF;
  IF p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Reward quantity must be between 1 and 100'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'MARKETPLACE-OP:' || p_operation_key::TEXT,
      0
    )
  );

  SELECT *
    INTO existing_operation
    FROM public.redemption_status_history
   WHERE operation_key = p_operation_key;

  SELECT *
    INTO existing_redemption
    FROM public.redemptions
   WHERE request_operation_key = p_operation_key;

  IF existing_redemption.id IS NOT NULL THEN
    IF existing_redemption.member_id = actor_member_id
       AND existing_redemption.reward_id = p_reward_id
       AND existing_redemption.quantity = p_quantity
       AND existing_operation.redemption_id = existing_redemption.id
       AND existing_operation.from_status IS NULL
       AND existing_operation.to_status = 'PENDING' THEN
      RETURN existing_redemption;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  IF existing_operation.id IS NOT NULL THEN
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT *
    INTO reward_row
    FROM public.rewards
   WHERE id = p_reward_id
   FOR UPDATE;

  IF reward_row.id IS NULL OR NOT reward_row.active THEN
    RAISE EXCEPTION 'Active reward not found' USING ERRCODE = 'P0002';
  END IF;
  IF reward_row.stock_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient reward stock' USING ERRCODE = '23514';
  END IF;

  total_cost_value := reward_row.point_cost::BIGINT * p_quantity::BIGINT;
  IF total_cost_value NOT BETWEEN 1 AND 1000000 THEN
    RAISE EXCEPTION 'Redemption total must not exceed 1,000,000 Gyrocoins'
      USING ERRCODE = '22003';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('GYROCOIN:' || actor_member_id::TEXT, 0)
  );

  SELECT balance_after
    INTO current_balance
    FROM public.points_ledger
   WHERE member_id = actor_member_id
   ORDER BY ledger_sequence DESC
   LIMIT 1;

  IF COALESCE(current_balance, 0) < total_cost_value THEN
    RAISE EXCEPTION 'Insufficient Gyrocoin balance' USING ERRCODE = '23514';
  END IF;

  UPDATE public.rewards
     SET stock_quantity = stock_quantity - p_quantity
   WHERE id = reward_row.id;

  INSERT INTO public.points_ledger(
    member_id, source_type, source_id, points, balance_after, note
  ) VALUES (
    actor_member_id,
    'MARKETPLACE_REDEMPTION',
    redemption_id::TEXT,
    -total_cost_value::INTEGER,
    0,
    left('Reward redemption: ' || reward_row.name || ' x' || p_quantity, 500)
  )
  RETURNING * INTO debit_entry;

  INSERT INTO public.redemptions(
    id, member_id, reward_id, status, quantity, unit_cost, total_cost,
    request_operation_key, debit_ledger_id
  ) VALUES (
    redemption_id,
    actor_member_id,
    reward_row.id,
    'PENDING',
    p_quantity,
    reward_row.point_cost,
    total_cost_value::INTEGER,
    p_operation_key,
    debit_entry.id
  )
  RETURNING * INTO redemption_row;

  INSERT INTO public.redemption_status_history(
    redemption_id, operation_key, actor_id, from_status, to_status
  ) VALUES (
    redemption_row.id, p_operation_key, actor_member_id, NULL, 'PENDING'
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_member_id,
    'MARKETPLACE_REDEMPTION_REQUESTED',
    'redemption',
    redemption_row.id::TEXT,
    jsonb_build_object(
      'reward_id', reward_row.id,
      'quantity', p_quantity,
      'unit_cost', reward_row.point_cost,
      'total_cost', total_cost_value,
      'debit_ledger_id', debit_entry.id,
      'balance_after', debit_entry.balance_after,
      'operation_key', p_operation_key
    )
  );

  RETURN redemption_row;
END
$$;

CREATE OR REPLACE FUNCTION private.cancel_reward_redemption(
  p_redemption_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_member_id UUID := public.current_member_id();
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  existing_operation public.redemption_status_history;
  redemption_row public.redemptions;
  reward_row public.rewards;
  refund_entry public.points_ledger;
BEGIN
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Active member access required' USING ERRCODE = '42501';
  END IF;
  IF normalized_reason IS NULL
     OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Cancellation reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'MARKETPLACE-OP:' || p_operation_key::TEXT,
      0
    )
  );

  SELECT *
    INTO existing_operation
    FROM public.redemption_status_history
   WHERE operation_key = p_operation_key;

  IF existing_operation.id IS NOT NULL THEN
    IF existing_operation.redemption_id = p_redemption_id
       AND existing_operation.from_status = 'PENDING'
       AND existing_operation.to_status = 'CANCELLED'
       AND existing_operation.reason = normalized_reason THEN
      SELECT * INTO redemption_row
        FROM public.redemptions
       WHERE id = p_redemption_id AND member_id = actor_member_id;
      IF redemption_row.id IS NOT NULL THEN
        RETURN redemption_row;
      END IF;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT *
    INTO redemption_row
    FROM public.redemptions
   WHERE id = p_redemption_id
     AND member_id = actor_member_id
   FOR UPDATE;

  IF redemption_row.id IS NULL THEN
    RAISE EXCEPTION 'Redemption not found' USING ERRCODE = 'P0002';
  END IF;
  IF redemption_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending redemptions can be cancelled'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
    INTO reward_row
    FROM public.rewards
   WHERE id = redemption_row.reward_id
   FOR UPDATE;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('GYROCOIN:' || actor_member_id::TEXT, 0)
  );

  INSERT INTO public.points_ledger(
    member_id, source_type, source_id, points, balance_after, note
  ) VALUES (
    actor_member_id,
    'MARKETPLACE_REFUND',
    redemption_row.id::TEXT,
    redemption_row.total_cost,
    0,
    left('Reward cancellation refund: ' || reward_row.name, 500)
  )
  RETURNING * INTO refund_entry;

  UPDATE public.rewards
     SET stock_quantity = stock_quantity + redemption_row.quantity
   WHERE id = reward_row.id;

  UPDATE public.redemptions
     SET status = 'CANCELLED',
         cancellation_reason = normalized_reason,
         refund_ledger_id = refund_entry.id
   WHERE id = redemption_row.id
  RETURNING * INTO redemption_row;

  INSERT INTO public.redemption_status_history(
    redemption_id, operation_key, actor_id, from_status, to_status, reason
  ) VALUES (
    redemption_row.id,
    p_operation_key,
    actor_member_id,
    'PENDING',
    'CANCELLED',
    normalized_reason
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_member_id,
    'MARKETPLACE_REDEMPTION_CANCELLED',
    'redemption',
    redemption_row.id::TEXT,
    jsonb_build_object(
      'reason', normalized_reason,
      'refund_ledger_id', refund_entry.id,
      'balance_after', refund_entry.balance_after,
      'operation_key', p_operation_key
    )
  );

  RETURN redemption_row;
END
$$;

CREATE OR REPLACE FUNCTION private.review_reward_redemption(
  p_redemption_id UUID,
  p_decision TEXT,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_decision TEXT := upper(btrim(p_decision));
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  target_status TEXT;
  existing_operation public.redemption_status_history;
  redemption_row public.redemptions;
  reward_row public.rewards;
  refund_entry public.points_ledger;
BEGIN
  IF normalized_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'Decision must be APPROVE or REJECT'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_decision = 'APPROVE' THEN
    normalized_reason := NULL;
    target_status := 'APPROVED';
  ELSE
    target_status := 'REJECTED';
    IF normalized_reason IS NULL
       OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
      RAISE EXCEPTION 'Rejection reason must contain 3 to 500 characters'
        USING ERRCODE = '22023';
    END IF;
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'MARKETPLACE-OP:' || p_operation_key::TEXT,
      0
    )
  );

  SELECT *
    INTO existing_operation
    FROM public.redemption_status_history
   WHERE operation_key = p_operation_key;

  IF existing_operation.id IS NOT NULL THEN
    IF existing_operation.redemption_id = p_redemption_id
       AND existing_operation.from_status = 'PENDING'
       AND existing_operation.to_status = target_status
       AND existing_operation.reason IS NOT DISTINCT FROM normalized_reason THEN
      SELECT * INTO redemption_row
        FROM public.redemptions
       WHERE id = p_redemption_id;
      IF redemption_row.id IS NOT NULL THEN
        RETURN redemption_row;
      END IF;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT *
    INTO redemption_row
    FROM public.redemptions
   WHERE id = p_redemption_id
   FOR UPDATE;

  IF redemption_row.id IS NULL THEN
    RAISE EXCEPTION 'Redemption not found' USING ERRCODE = 'P0002';
  END IF;
  IF redemption_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending redemptions can be reviewed'
      USING ERRCODE = '23514';
  END IF;

  IF target_status = 'APPROVED' THEN
    UPDATE public.redemptions
       SET status = 'APPROVED',
           approved_by = actor_id,
           reviewed_by = actor_id,
           reviewed_at = clock_timestamp()
     WHERE id = redemption_row.id
    RETURNING * INTO redemption_row;
  ELSE
    SELECT *
      INTO reward_row
      FROM public.rewards
     WHERE id = redemption_row.reward_id
     FOR UPDATE;

    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'GYROCOIN:' || redemption_row.member_id::TEXT,
        0
      )
    );

    INSERT INTO public.points_ledger(
      member_id, source_type, source_id, points, balance_after, note
    ) VALUES (
      redemption_row.member_id,
      'MARKETPLACE_REFUND',
      redemption_row.id::TEXT,
      redemption_row.total_cost,
      0,
      left('Rejected reward refund: ' || reward_row.name, 500)
    )
    RETURNING * INTO refund_entry;

    UPDATE public.rewards
       SET stock_quantity = stock_quantity + redemption_row.quantity
     WHERE id = reward_row.id;

    UPDATE public.redemptions
       SET status = 'REJECTED',
           reviewed_by = actor_id,
           reviewed_at = clock_timestamp(),
           rejection_reason = normalized_reason,
           refund_ledger_id = refund_entry.id
     WHERE id = redemption_row.id
    RETURNING * INTO redemption_row;
  END IF;

  INSERT INTO public.redemption_status_history(
    redemption_id, operation_key, actor_id, from_status, to_status, reason
  ) VALUES (
    redemption_row.id,
    p_operation_key,
    actor_id,
    'PENDING',
    target_status,
    normalized_reason
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    CASE
      WHEN target_status = 'APPROVED'
        THEN 'MARKETPLACE_REDEMPTION_APPROVED'
      ELSE 'MARKETPLACE_REDEMPTION_REJECTED'
    END,
    'redemption',
    redemption_row.id::TEXT,
    jsonb_build_object(
      'member_id', redemption_row.member_id,
      'reward_id', redemption_row.reward_id,
      'reason', normalized_reason,
      'refund_ledger_id', refund_entry.id,
      'balance_after', refund_entry.balance_after,
      'operation_key', p_operation_key
    )
  );

  RETURN redemption_row;
END
$$;

CREATE OR REPLACE FUNCTION private.fulfill_reward_redemption(
  p_redemption_id UUID,
  p_note TEXT,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_note TEXT := NULLIF(btrim(p_note), '');
  existing_operation public.redemption_status_history;
  redemption_row public.redemptions;
BEGIN
  IF normalized_note IS NOT NULL AND char_length(normalized_note) > 500 THEN
    RAISE EXCEPTION 'Fulfillment note must not exceed 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'MARKETPLACE-OP:' || p_operation_key::TEXT,
      0
    )
  );

  SELECT *
    INTO existing_operation
    FROM public.redemption_status_history
   WHERE operation_key = p_operation_key;

  IF existing_operation.id IS NOT NULL THEN
    IF existing_operation.redemption_id = p_redemption_id
       AND existing_operation.from_status = 'APPROVED'
       AND existing_operation.to_status = 'FULFILLED'
       AND existing_operation.reason IS NOT DISTINCT FROM normalized_note THEN
      SELECT * INTO redemption_row
        FROM public.redemptions
       WHERE id = p_redemption_id;
      IF redemption_row.id IS NOT NULL THEN
        RETURN redemption_row;
      END IF;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT *
    INTO redemption_row
    FROM public.redemptions
   WHERE id = p_redemption_id
   FOR UPDATE;

  IF redemption_row.id IS NULL THEN
    RAISE EXCEPTION 'Redemption not found' USING ERRCODE = 'P0002';
  END IF;
  IF redemption_row.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Only approved redemptions can be fulfilled'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.redemptions
     SET status = 'FULFILLED',
         fulfilled_by = actor_id,
         fulfilled_at = clock_timestamp()
   WHERE id = redemption_row.id
  RETURNING * INTO redemption_row;

  INSERT INTO public.redemption_status_history(
    redemption_id, operation_key, actor_id, from_status, to_status, reason
  ) VALUES (
    redemption_row.id,
    p_operation_key,
    actor_id,
    'APPROVED',
    'FULFILLED',
    normalized_note
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'MARKETPLACE_REDEMPTION_FULFILLED',
    'redemption',
    redemption_row.id::TEXT,
    jsonb_build_object(
      'member_id', redemption_row.member_id,
      'reward_id', redemption_row.reward_id,
      'note', normalized_note,
      'operation_key', p_operation_key
    )
  );

  RETURN redemption_row;
END
$$;

CREATE OR REPLACE FUNCTION public.create_marketplace_reward(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_point_cost INTEGER,
  p_stock_quantity INTEGER,
  p_active BOOLEAN,
  p_sort_order INTEGER
)
RETURNS public.rewards
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.create_marketplace_reward(
    p_slug, p_name, p_description, p_image_url, p_point_cost,
    p_stock_quantity, p_active, p_sort_order
  )
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_reward(
  p_reward_id UUID,
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_point_cost INTEGER,
  p_stock_quantity INTEGER,
  p_active BOOLEAN,
  p_sort_order INTEGER
)
RETURNS public.rewards
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.update_marketplace_reward(
    p_reward_id, p_slug, p_name, p_description, p_image_url, p_point_cost,
    p_stock_quantity, p_active, p_sort_order
  )
$$;

CREATE OR REPLACE FUNCTION public.request_reward_redemption(
  p_reward_id UUID,
  p_quantity INTEGER,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.request_reward_redemption(
    p_reward_id, p_quantity, p_operation_key
  )
$$;

CREATE OR REPLACE FUNCTION public.cancel_reward_redemption(
  p_redemption_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.cancel_reward_redemption(
    p_redemption_id, p_reason, p_operation_key
  )
$$;

CREATE OR REPLACE FUNCTION public.review_reward_redemption(
  p_redemption_id UUID,
  p_decision TEXT,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.review_reward_redemption(
    p_redemption_id, p_decision, p_reason, p_operation_key
  )
$$;

CREATE OR REPLACE FUNCTION public.fulfill_reward_redemption(
  p_redemption_id UUID,
  p_note TEXT,
  p_operation_key UUID
)
RETURNS public.redemptions
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.fulfill_reward_redemption(
    p_redemption_id, p_note, p_operation_key
  )
$$;

REVOKE ALL ON FUNCTION private.create_marketplace_reward(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.update_marketplace_reward(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.request_reward_redemption(UUID, INTEGER, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.cancel_reward_redemption(UUID, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.review_reward_redemption(UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.fulfill_reward_redemption(UUID, TEXT, UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.create_marketplace_reward(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_marketplace_reward(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.request_reward_redemption(UUID, INTEGER, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.cancel_reward_redemption(UUID, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.review_reward_redemption(UUID, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.fulfill_reward_redemption(UUID, TEXT, UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.create_marketplace_reward(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_marketplace_reward(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_reward_redemption(UUID, INTEGER, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_reward_redemption(UUID, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_reward_redemption(UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fulfill_reward_redemption(UUID, TEXT, UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_marketplace_reward(
  TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_reward(
  UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_reward_redemption(UUID, INTEGER, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reward_redemption(UUID, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_reward_redemption(UUID, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_reward_redemption(UUID, TEXT, UUID)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
