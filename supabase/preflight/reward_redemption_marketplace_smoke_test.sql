-- Transactional production smoke test for the Phase 5 marketplace.
--
-- This impersonates the first linked active administrator, exercises catalog
-- creation, atomic debit/reservation, retry idempotency, cancellation/refund,
-- approval, fulfillment, rejection, audit history, and denied direct writes.
-- Every fixture write is deliberately rolled back.

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
  funding_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000051';
  request_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000052';
  cancel_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000053';
  fulfill_request_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000054';
  approve_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000055';
  fulfill_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000056';
  reject_request_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000057';
  reject_key CONSTANT UUID := 'a1150000-0000-4000-8000-000000000058';
  actor_member_id UUID := public.current_member_id();
  base_balance INTEGER;
  reward_row public.rewards;
  requested public.redemptions;
  retried public.redemptions;
  cancelled public.redemptions;
  approved public.redemptions;
  fulfilled public.redemptions;
  rejected public.redemptions;
  direct_write_rejected BOOLEAN := FALSE;
  audit_count INTEGER;
  history_count INTEGER;
BEGIN
  IF actor_member_id IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required for this smoke test';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.points_ledger
     WHERE source_id IN (
       funding_key::TEXT,
       request_key::TEXT,
       cancel_key::TEXT,
       fulfill_request_key::TEXT,
       approve_key::TEXT,
       fulfill_key::TEXT,
       reject_request_key::TEXT,
       reject_key::TEXT
     )
  ) OR EXISTS (
    SELECT 1 FROM public.rewards WHERE slug = 'phase-5-smoke-reward'
  ) THEN
    RAISE EXCEPTION 'Phase 5 smoke-test fixture residue exists; stop and inspect it';
  END IF;

  SELECT COALESCE(
    (
      SELECT balance_after
        FROM public.points_ledger
       WHERE member_id = actor_member_id
       ORDER BY ledger_sequence DESC
       LIMIT 1
    ),
    0
  ) INTO base_balance;

  BEGIN
    PERFORM public.adjust_member_gyrocoins(
      actor_member_id,
      200,
      'Phase 5 transactional smoke funding',
      funding_key
    );

    SELECT * INTO reward_row
      FROM public.create_marketplace_reward(
        'phase-5-smoke-reward',
        'Phase 5 Smoke Reward',
        'Rollback-only catalog fixture',
        NULL,
        50,
        3,
        TRUE,
        0
      );

    SELECT * INTO requested
      FROM public.request_reward_redemption(reward_row.id, 2, request_key);
    SELECT * INTO retried
      FROM public.request_reward_redemption(reward_row.id, 2, request_key);

    IF retried.id <> requested.id THEN
      RAISE EXCEPTION 'Request retry created a second redemption';
    END IF;
    IF requested.status <> 'PENDING' OR requested.total_cost <> 100 THEN
      RAISE EXCEPTION 'Request produced an unexpected redemption';
    END IF;
    IF (SELECT stock_quantity FROM public.rewards WHERE id = reward_row.id) <> 1 THEN
      RAISE EXCEPTION 'Request did not reserve the expected stock';
    END IF;
    IF (
      SELECT balance_after
        FROM public.points_ledger
       WHERE id = requested.debit_ledger_id
    ) <> base_balance + 100 THEN
      RAISE EXCEPTION 'Request did not deduct the expected Gyrocoin amount';
    END IF;

    SELECT * INTO cancelled
      FROM public.cancel_reward_redemption(
        requested.id,
        'Smoke-test member cancellation',
        cancel_key
      );

    IF cancelled.status <> 'CANCELLED' OR cancelled.refund_ledger_id IS NULL THEN
      RAISE EXCEPTION 'Cancellation did not create its refund';
    END IF;
    IF (SELECT stock_quantity FROM public.rewards WHERE id = reward_row.id) <> 3 THEN
      RAISE EXCEPTION 'Cancellation did not restore reserved stock';
    END IF;

    SELECT * INTO approved
      FROM public.request_reward_redemption(
        reward_row.id,
        1,
        fulfill_request_key
      );
    SELECT * INTO approved
      FROM public.review_reward_redemption(
        approved.id,
        'APPROVE',
        NULL,
        approve_key
      );
    SELECT * INTO fulfilled
      FROM public.fulfill_reward_redemption(
        approved.id,
        'Smoke-test handoff complete',
        fulfill_key
      );

    IF fulfilled.status <> 'FULFILLED'
       OR fulfilled.fulfilled_by <> actor_member_id
       OR fulfilled.fulfilled_at IS NULL THEN
      RAISE EXCEPTION 'Approved redemption was not fulfilled correctly';
    END IF;

    SELECT * INTO rejected
      FROM public.request_reward_redemption(
        reward_row.id,
        1,
        reject_request_key
      );
    SELECT * INTO rejected
      FROM public.review_reward_redemption(
        rejected.id,
        'REJECT',
        'Smoke-test rejection reason',
        reject_key
      );

    IF rejected.status <> 'REJECTED' OR rejected.refund_ledger_id IS NULL THEN
      RAISE EXCEPTION 'Rejected redemption did not create its refund';
    END IF;
    IF (SELECT stock_quantity FROM public.rewards WHERE id = reward_row.id) <> 2 THEN
      RAISE EXCEPTION 'Final stock does not reflect only the fulfilled item';
    END IF;

    SELECT count(*)
      INTO history_count
      FROM public.redemption_status_history
     WHERE redemption_id IN (requested.id, fulfilled.id, rejected.id);
    IF history_count <> 7 THEN
      RAISE EXCEPTION 'Expected seven redemption history rows, found %', history_count;
    END IF;

    SELECT count(*)
      INTO audit_count
      FROM public.audit_logs
     WHERE entity_id IN (
       reward_row.id::TEXT,
       requested.id::TEXT,
       fulfilled.id::TEXT,
       rejected.id::TEXT
     )
       AND action LIKE 'MARKETPLACE_%';
    IF audit_count <> 8 THEN
      RAISE EXCEPTION 'Expected eight marketplace audit rows, found %', audit_count;
    END IF;

    BEGIN
      INSERT INTO public.rewards(
        slug, name, point_cost, stock_quantity, active, sort_order
      ) VALUES (
        'forbidden-direct-write', 'Forbidden', 1, 1, FALSE, 0
      );
    EXCEPTION
      WHEN insufficient_privilege THEN direct_write_rejected := TRUE;
    END;
    IF NOT direct_write_rejected THEN
      RAISE EXCEPTION 'Authenticated direct reward insertion was allowed';
    END IF;

    RAISE EXCEPTION 'axis_marketplace_smoke_rollback' USING ERRCODE = 'ZX003';
  EXCEPTION
    WHEN SQLSTATE 'ZX003' THEN NULL;
  END;

  IF EXISTS (
    SELECT 1 FROM public.rewards WHERE slug = 'phase-5-smoke-reward'
  ) OR EXISTS (
    SELECT 1
      FROM public.redemption_status_history
     WHERE operation_key IN (
       request_key,
       cancel_key,
       fulfill_request_key,
       approve_key,
       fulfill_key,
       reject_request_key,
       reject_key
     )
  ) OR EXISTS (
    SELECT 1
      FROM public.points_ledger
     WHERE source_id = funding_key::TEXT
  ) THEN
    RAISE EXCEPTION 'Marketplace smoke-test subtransaction left database residue';
  END IF;
END
$axis_smoke$;

ROLLBACK;

SELECT
  'reward_redemption_transactional_smoke_test'::TEXT AS check_name,
  NOT EXISTS (
    SELECT 1 FROM public.rewards WHERE slug = 'phase-5-smoke-reward'
  ) AS passed,
  'catalog, stock, debit, retry, cancel, refund, review, fulfillment, audit, and write-denial assertions passed; fixtures rolled back'::TEXT
    AS details;
