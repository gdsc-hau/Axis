-- Transactional production smoke test for the Phase 4 Gyrocoin ledger.
--
-- This impersonates the first linked active administrator, verifies award,
-- idempotency, deduction, insufficient-balance rejection, and audit behavior,
-- then deliberately rolls back every fixture entry.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT auth_id::TEXT
      FROM public.members
     WHERE member_status = 'ACTIVE'
       AND role = 'ADMIN'
       AND auth_id IS NOT NULL
     ORDER BY created_at, id
     LIMIT 1
  ),
  TRUE
);

SET LOCAL ROLE authenticated;

DO $axis_smoke$
DECLARE
  award_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000041';
  deduction_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000042';
  rejected_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000043';
  target_member_id UUID := public.current_member_id();
  base_balance INTEGER;
  award_entry public.points_ledger;
  duplicate_entry public.points_ledger;
  deduction_entry public.points_ledger;
  matching_audits INTEGER;
  insufficient_rejected BOOLEAN := FALSE;
BEGIN
  IF target_member_id IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required for this smoke test';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.points_ledger
     WHERE source_id IN (award_key::TEXT, deduction_key::TEXT, rejected_key::TEXT)
  ) THEN
    RAISE EXCEPTION 'Smoke-test operation keys already exist; stop and inspect them'
      USING ERRCODE = '23505';
  END IF;

  SELECT COALESCE(
    (
      SELECT balance_after
        FROM public.points_ledger
       WHERE member_id = target_member_id
       ORDER BY ledger_sequence DESC
       LIMIT 1
    ),
    0
  ) INTO base_balance;

  BEGIN
    SELECT *
      INTO award_entry
      FROM public.adjust_member_gyrocoins(
        target_member_id,
        100,
        'Phase 4 transactional smoke award',
        award_key
      );

    IF award_entry.balance_after <> base_balance + 100
       OR award_entry.source_type <> 'MANUAL_AWARD' THEN
      RAISE EXCEPTION 'Manual award produced an unexpected ledger row';
    END IF;

    SELECT *
      INTO duplicate_entry
      FROM public.adjust_member_gyrocoins(
        target_member_id,
        100,
        'Phase 4 transactional smoke award',
        award_key
      );

    IF duplicate_entry.id <> award_entry.id THEN
      RAISE EXCEPTION 'Idempotent retry created a second ledger row';
    END IF;

    SELECT *
      INTO deduction_entry
      FROM public.adjust_member_gyrocoins(
        target_member_id,
        -40,
        'Phase 4 transactional smoke deduction',
        deduction_key
      );

    IF deduction_entry.balance_after <> base_balance + 60
       OR deduction_entry.source_type <> 'MANUAL_DEDUCTION'
       OR deduction_entry.ledger_sequence <= award_entry.ledger_sequence THEN
      RAISE EXCEPTION 'Manual deduction produced an unexpected ledger row';
    END IF;

    BEGIN
      PERFORM public.adjust_member_gyrocoins(
        target_member_id,
        -(base_balance + 61),
        'Phase 4 insufficient balance assertion',
        rejected_key
      );
    EXCEPTION
      WHEN check_violation THEN insufficient_rejected := TRUE;
    END;

    IF NOT insufficient_rejected THEN
      RAISE EXCEPTION 'An adjustment was allowed to overdraw the wallet';
    END IF;

    SELECT count(*)
      INTO matching_audits
      FROM public.audit_logs
     WHERE entity_id IN (award_entry.id::TEXT, deduction_entry.id::TEXT)
       AND action IN (
         'GYROCOIN_MANUAL_AWARD',
         'GYROCOIN_MANUAL_DEDUCTION'
       );

    IF matching_audits <> 2 THEN
      RAISE EXCEPTION 'Expected two adjustment audit rows, found %', matching_audits;
    END IF;

    RAISE EXCEPTION 'axis_gyrocoin_smoke_rollback' USING ERRCODE = 'ZX002';
  EXCEPTION
    WHEN SQLSTATE 'ZX002' THEN NULL;
  END;

  IF EXISTS (
    SELECT 1
      FROM public.points_ledger
     WHERE source_id IN (award_key::TEXT, deduction_key::TEXT, rejected_key::TEXT)
  ) OR EXISTS (
    SELECT 1
      FROM public.audit_logs
     WHERE metadata ->> 'operation_key' IN (
       award_key::TEXT,
       deduction_key::TEXT,
       rejected_key::TEXT
     )
  ) THEN
    RAISE EXCEPTION 'Smoke-test subtransaction left database residue';
  END IF;
END
$axis_smoke$;

ROLLBACK;

SELECT
  'gyrocoin_ledger_transactional_smoke_test'::TEXT AS check_name,
  NOT EXISTS (
    SELECT 1
      FROM public.points_ledger
     WHERE source_id IN (
       'a1150000-0000-4000-8000-000000000041',
       'a1150000-0000-4000-8000-000000000042',
       'a1150000-0000-4000-8000-000000000043'
     )
  ) AS passed,
  'sequence, award, retry, deduction, audit, and overdraw assertions passed; writes rolled back'::TEXT
    AS details;
