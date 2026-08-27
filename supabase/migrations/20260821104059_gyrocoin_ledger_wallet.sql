-- Phase 4: harden the Gyrocoin ledger, expose read-only wallet summaries,
-- and route every manual adjustment through an audited, idempotent RPC.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

-- Normalize the small legacy vocabulary before constraining future writes.
UPDATE public.points_ledger
   SET source_type = upper(btrim(source_type));

UPDATE public.points_ledger
   SET source_id = btrim(source_id)
 WHERE source_id IS NOT NULL;

UPDATE public.points_ledger
   SET source_type = CASE
         WHEN points > 0 THEN 'MANUAL_AWARD'
         ELSE 'MANUAL_DEDUCTION'
       END
 WHERE source_type = 'MANUAL';

UPDATE public.points_ledger
   SET source_id = 'legacy:' || id::TEXT
 WHERE NULLIF(btrim(source_id), '') IS NULL;

UPDATE public.points_ledger
   SET note = 'Legacy manual adjustment'
 WHERE source_type IN ('MANUAL_AWARD', 'MANUAL_DEDUCTION')
   AND NULLIF(btrim(note), '') IS NULL;

UPDATE public.points_ledger
   SET note = NULLIF(btrim(note), '')
 WHERE note IS NOT NULL;

ALTER TABLE public.points_ledger
  ALTER COLUMN source_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT pg_catalog.now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_source_type_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_source_type_check
      CHECK (
        source_type IN (
          'MANUAL_AWARD',
          'MANUAL_DEDUCTION',
          'EVENT_ATTENDANCE',
          'MARKETPLACE_REDEMPTION',
          'MARKETPLACE_REFUND'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_source_id_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_source_id_check
      CHECK (
        source_id = btrim(source_id)
        AND char_length(source_id) BETWEEN 1 AND 200
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_points_range_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_points_range_check
      CHECK (points <> 0 AND points BETWEEN -1000000 AND 1000000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_balance_nonnegative_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_balance_nonnegative_check
      CHECK (balance_after >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_note_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_note_check
      CHECK (
        note IS NULL
        OR (
          note = btrim(note)
          AND char_length(note) BETWEEN 1 AND 500
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_manual_reason_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_manual_reason_check
      CHECK (
        source_type NOT IN ('MANUAL_AWARD', 'MANUAL_DEDUCTION')
        OR (note IS NOT NULL AND char_length(note) BETWEEN 3 AND 500)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'points_ledger_direction_check'
       AND conrelid = 'public.points_ledger'::regclass
  ) THEN
    ALTER TABLE public.points_ledger
      ADD CONSTRAINT points_ledger_direction_check
      CHECK (
        (source_type IN ('MANUAL_AWARD', 'EVENT_ATTENDANCE', 'MARKETPLACE_REFUND') AND points > 0)
        OR (source_type IN ('MANUAL_DEDUCTION', 'MARKETPLACE_REDEMPTION') AND points < 0)
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_source_identity_idx
  ON public.points_ledger(member_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS points_ledger_member_timeline_idx
  ON public.points_ledger(member_id, created_at DESC, id DESC);

-- Authenticated users may read authorized rows but may not supply ledger
-- balances themselves. The trusted service role can append system entries.
DO $$
DECLARE
  write_policy RECORD;
BEGIN
  FOR write_policy IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'points_ledger'
       AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.points_ledger',
      write_policy.policyname
    );
  END LOOP;
END
$$;

REVOKE ALL ON TABLE public.points_ledger FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.points_ledger
  FROM authenticated, service_role;
GRANT SELECT ON TABLE public.points_ledger TO authenticated, service_role;
GRANT INSERT ON TABLE public.points_ledger TO service_role;
GRANT INSERT ON TABLE public.audit_logs TO service_role;

DROP POLICY IF EXISTS points_ledger_admin_read ON public.points_ledger;
DROP POLICY IF EXISTS points_ledger_member_read ON public.points_ledger;
DROP POLICY IF EXISTS points_ledger_authorized_read ON public.points_ledger;
CREATE POLICY points_ledger_authorized_read ON public.points_ledger
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

-- Trusted integrations use source_id as their idempotency reference. This
-- legacy public name remains for compatibility but is service-role-only.
CREATE OR REPLACE FUNCTION public.award_points(
  p_member_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS public.points_ledger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  normalized_source_type TEXT := upper(btrim(p_source_type));
  normalized_source_id TEXT := NULLIF(btrim(p_source_id), '');
  normalized_note TEXT := NULLIF(btrim(p_note), '');
  current_balance INTEGER;
  candidate_balance BIGINT;
  existing_entry public.points_ledger;
  inserted_entry public.points_ledger;
BEGIN
  IF normalized_source_type NOT IN (
    'EVENT_ATTENDANCE',
    'MARKETPLACE_REDEMPTION',
    'MARKETPLACE_REFUND'
  ) THEN
    RAISE EXCEPTION 'Unsupported system Gyrocoin source type'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_source_id IS NULL OR char_length(normalized_source_id) > 200 THEN
    RAISE EXCEPTION 'A source reference containing 1 to 200 characters is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_points = 0 OR p_points NOT BETWEEN -1000000 AND 1000000 THEN
    RAISE EXCEPTION 'Gyrocoin amount must be a non-zero integer up to 1,000,000'
      USING ERRCODE = '22023';
  END IF;
  IF (normalized_source_type IN ('EVENT_ATTENDANCE', 'MARKETPLACE_REFUND') AND p_points < 0)
     OR (normalized_source_type = 'MARKETPLACE_REDEMPTION' AND p_points > 0) THEN
    RAISE EXCEPTION 'Gyrocoin amount direction does not match its source type'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_note IS NOT NULL AND char_length(normalized_note) > 500 THEN
    RAISE EXCEPTION 'Gyrocoin note must not exceed 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM public.members
     WHERE id = p_member_id
       AND member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active member not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('GYROCOIN:' || p_member_id::TEXT, 0)
  );

  SELECT *
    INTO existing_entry
    FROM public.points_ledger
   WHERE member_id = p_member_id
     AND source_type = normalized_source_type
     AND source_id = normalized_source_id;

  IF existing_entry.id IS NOT NULL THEN
    IF existing_entry.points = p_points
       AND existing_entry.note IS NOT DISTINCT FROM normalized_note THEN
      RETURN existing_entry;
    END IF;
    RAISE EXCEPTION 'Source reference has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT balance_after
    INTO current_balance
    FROM public.points_ledger
   WHERE member_id = p_member_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  candidate_balance := COALESCE(current_balance, 0)::BIGINT + p_points::BIGINT;
  IF candidate_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Gyrocoin balance' USING ERRCODE = '23514';
  END IF;
  IF candidate_balance > 2147483647 THEN
    RAISE EXCEPTION 'Gyrocoin balance exceeds the supported integer range'
      USING ERRCODE = '22003';
  END IF;

  INSERT INTO public.points_ledger(
    member_id, source_type, source_id, points, balance_after, note
  ) VALUES (
    p_member_id,
    normalized_source_type,
    normalized_source_id,
    p_points,
    candidate_balance::INTEGER,
    normalized_note
  )
  RETURNING * INTO inserted_entry;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    NULL,
    'GYROCOIN_SYSTEM_TRANSACTION',
    'points_ledger',
    inserted_entry.id::TEXT,
    jsonb_build_object(
      'member_id', p_member_id,
      'points', p_points,
      'balance_after', inserted_entry.balance_after,
      'source_type', normalized_source_type,
      'source_id', normalized_source_id
    )
  );

  RETURN inserted_entry;
END
$$;

REVOKE ALL ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO service_role;

-- The private helper owns the privileged append and independently confirms
-- the caller is an active administrator. The public wrapper remains invoker.
CREATE OR REPLACE FUNCTION private.adjust_member_gyrocoins(
  p_member_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.points_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  normalized_source_type TEXT;
  operation_reference TEXT;
  current_balance INTEGER;
  candidate_balance BIGINT;
  existing_entry public.points_ledger;
  inserted_entry public.points_ledger;
BEGIN
  actor_id := private.require_active_admin();

  IF p_points = 0 OR p_points NOT BETWEEN -1000000 AND 1000000 THEN
    RAISE EXCEPTION 'Gyrocoin amount must be a non-zero integer up to 1,000,000'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_reason IS NULL
     OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Adjustment reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM public.members
     WHERE id = p_member_id
       AND member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active member not found' USING ERRCODE = 'P0002';
  END IF;

  normalized_source_type := CASE
    WHEN p_points > 0 THEN 'MANUAL_AWARD'
    ELSE 'MANUAL_DEDUCTION'
  END;
  operation_reference := p_operation_key::TEXT;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('GYROCOIN:' || p_member_id::TEXT, 0)
  );

  SELECT *
    INTO existing_entry
    FROM public.points_ledger
   WHERE member_id = p_member_id
     AND source_type IN ('MANUAL_AWARD', 'MANUAL_DEDUCTION')
     AND source_id = operation_reference;

  IF existing_entry.id IS NOT NULL THEN
    IF existing_entry.points = p_points
       AND existing_entry.note = normalized_reason THEN
      RETURN existing_entry;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT balance_after
    INTO current_balance
    FROM public.points_ledger
   WHERE member_id = p_member_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  candidate_balance := COALESCE(current_balance, 0)::BIGINT + p_points::BIGINT;
  IF candidate_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Gyrocoin balance' USING ERRCODE = '23514';
  END IF;
  IF candidate_balance > 2147483647 THEN
    RAISE EXCEPTION 'Gyrocoin balance exceeds the supported integer range'
      USING ERRCODE = '22003';
  END IF;

  INSERT INTO public.points_ledger(
    member_id, source_type, source_id, points, balance_after, note
  ) VALUES (
    p_member_id,
    normalized_source_type,
    operation_reference,
    p_points,
    candidate_balance::INTEGER,
    normalized_reason
  )
  RETURNING * INTO inserted_entry;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    CASE
      WHEN p_points > 0 THEN 'GYROCOIN_MANUAL_AWARD'
      ELSE 'GYROCOIN_MANUAL_DEDUCTION'
    END,
    'points_ledger',
    inserted_entry.id::TEXT,
    jsonb_build_object(
      'member_id', p_member_id,
      'points', p_points,
      'balance_after', inserted_entry.balance_after,
      'reason', normalized_reason,
      'operation_key', operation_reference
    )
  );

  RETURN inserted_entry;
END
$$;

REVOKE ALL ON FUNCTION private.adjust_member_gyrocoins(UUID, INTEGER, TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.adjust_member_gyrocoins(UUID, INTEGER, TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.adjust_member_gyrocoins(
  p_member_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.points_ledger
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.adjust_member_gyrocoins(
    p_member_id,
    p_points,
    p_reason,
    p_operation_key
  )
$$;

REVOKE ALL ON FUNCTION public.adjust_member_gyrocoins(UUID, INTEGER, TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_member_gyrocoins(UUID, INTEGER, TEXT, UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.current_gyrocoin_wallet_summary()
RETURNS TABLE (
  member_id UUID,
  current_balance INTEGER,
  total_earned BIGINT,
  total_spent BIGINT,
  transaction_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH current_member AS (
    SELECT public.current_member_id() AS id
  )
  SELECT
    current_member.id,
    COALESCE(
      (
        SELECT ledger.balance_after
          FROM public.points_ledger AS ledger
         WHERE ledger.member_id = current_member.id
         ORDER BY ledger.created_at DESC, ledger.id DESC
         LIMIT 1
      ),
      0
    )::INTEGER,
    COALESCE(
      (
        SELECT sum(ledger.points)::BIGINT
          FROM public.points_ledger AS ledger
         WHERE ledger.member_id = current_member.id
           AND ledger.points > 0
      ),
      0
    )::BIGINT,
    COALESCE(
      (
        SELECT sum(-ledger.points)::BIGINT
          FROM public.points_ledger AS ledger
         WHERE ledger.member_id = current_member.id
           AND ledger.points < 0
      ),
      0
    )::BIGINT,
    (
      SELECT count(*)
        FROM public.points_ledger AS ledger
       WHERE ledger.member_id = current_member.id
    )::BIGINT
  FROM current_member
  WHERE current_member.id IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.current_gyrocoin_wallet_summary()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_gyrocoin_wallet_summary()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_gyrocoin_accounts()
RETURNS TABLE (
  member_id UUID,
  full_name TEXT,
  email TEXT,
  gdg_id TEXT,
  member_status TEXT,
  current_balance INTEGER,
  transaction_count BIGINT,
  last_transaction_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    member.id,
    member.full_name,
    member.email,
    member.gdg_id,
    member.member_status,
    COALESCE(
      (
        SELECT ledger.balance_after
          FROM public.points_ledger AS ledger
         WHERE ledger.member_id = member.id
         ORDER BY ledger.created_at DESC, ledger.id DESC
         LIMIT 1
      ),
      0
    )::INTEGER,
    (
      SELECT count(*)
        FROM public.points_ledger AS ledger
       WHERE ledger.member_id = member.id
    )::BIGINT,
    (
      SELECT ledger.created_at
        FROM public.points_ledger AS ledger
       WHERE ledger.member_id = member.id
       ORDER BY ledger.created_at DESC, ledger.id DESC
       LIMIT 1
    )
  FROM public.members AS member
  WHERE (SELECT public.is_admin())
    AND member.member_status = 'ACTIVE'
  ORDER BY member.full_name, member.id
$$;

REVOKE ALL ON FUNCTION public.list_gyrocoin_accounts()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_gyrocoin_accounts()
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
