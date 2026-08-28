-- Phase 4 corrective migration: use a database-generated monotonic sequence
-- as the canonical Gyrocoin ledger order. Transaction timestamps are not a
-- safe ordering key because now() is stable for the whole transaction.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

-- The initial Phase 4 rollout was intentionally completed before any ledger
-- entries existed. Refuse to guess the order of rows if writes happened in
-- the gap between the preflight and this corrective migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.points_ledger) THEN
    RAISE EXCEPTION
      'Gyrocoin ordering correction requires an empty points_ledger; stop and inspect existing rows';
  END IF;
END
$$;

ALTER TABLE public.points_ledger
  ADD COLUMN ledger_sequence BIGINT GENERATED ALWAYS AS IDENTITY;

ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_ledger_sequence_key
  UNIQUE (ledger_sequence);

DROP INDEX IF EXISTS public.points_ledger_member_timeline_idx;
CREATE INDEX points_ledger_member_timeline_idx
  ON public.points_ledger(member_id, ledger_sequence DESC);

-- The invoker-mode service RPC needs nextval access. Browser roles never do.
REVOKE ALL ON SEQUENCE public.points_ledger_ledger_sequence_seq
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SEQUENCE public.points_ledger_ledger_sequence_seq
  TO service_role;

-- Enforce the running balance at the append boundary as defense in depth.
-- This protects trusted direct service-role inserts as well as both RPCs.
CREATE OR REPLACE FUNCTION private.enforce_points_ledger_running_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_balance INTEGER;
  candidate_balance BIGINT;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('GYROCOIN:' || NEW.member_id::TEXT, 0)
  );

  SELECT balance_after
    INTO current_balance
    FROM public.points_ledger
   WHERE member_id = NEW.member_id
   ORDER BY ledger_sequence DESC
   LIMIT 1;

  candidate_balance := COALESCE(current_balance, 0)::BIGINT
    + NEW.points::BIGINT;

  IF candidate_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Gyrocoin balance' USING ERRCODE = '23514';
  END IF;
  IF candidate_balance > 2147483647 THEN
    RAISE EXCEPTION 'Gyrocoin balance exceeds the supported integer range'
      USING ERRCODE = '22003';
  END IF;

  NEW.balance_after := candidate_balance::INTEGER;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION private.enforce_points_ledger_running_balance()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_points_ledger_running_balance
  ON public.points_ledger;
CREATE TRIGGER enforce_points_ledger_running_balance
  BEFORE INSERT ON public.points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_points_ledger_running_balance();

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
   ORDER BY ledger_sequence DESC
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
      'source_id', normalized_source_id,
      'ledger_sequence', inserted_entry.ledger_sequence
    )
  );

  RETURN inserted_entry;
END
$$;

REVOKE ALL ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO service_role;

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
   ORDER BY ledger_sequence DESC
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
      'operation_key', operation_reference,
      'ledger_sequence', inserted_entry.ledger_sequence
    )
  );

  RETURN inserted_entry;
END
$$;

REVOKE ALL ON FUNCTION private.adjust_member_gyrocoins(UUID, INTEGER, TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.adjust_member_gyrocoins(UUID, INTEGER, TEXT, UUID)
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
         ORDER BY ledger.ledger_sequence DESC
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
         ORDER BY ledger.ledger_sequence DESC
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
       ORDER BY ledger.ledger_sequence DESC
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
