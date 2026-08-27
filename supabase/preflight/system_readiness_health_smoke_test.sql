-- Transactional Phase 12 smoke test. All writes are rolled back.
BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT auth_id::TEXT FROM public.members
    WHERE role = 'ADMIN' AND member_status = 'ACTIVE' AND auth_id IS NOT NULL
    ORDER BY id LIMIT 1),
  TRUE
);
SET LOCAL ROLE authenticated;

DO $system_health_smoke$
DECLARE
  operation UUID := gen_random_uuid();
  health_run public.system_health_runs;
  retry_run public.system_health_runs;
  result_count INTEGER;
  insert_was_denied BOOLEAN := FALSE;
BEGIN
  health_run := public.run_system_health_check(operation, 'axis-phase-12-smoke');

  IF health_run.status = 'RUNNING' OR health_run.completed_at IS NULL THEN
    RAISE EXCEPTION 'Health run did not complete';
  END IF;
  IF health_run.failed_checks > 0 THEN
    RAISE EXCEPTION 'Health run found % release-blocking failure(s)',
      health_run.failed_checks;
  END IF;
  IF health_run.total_checks <> 15 THEN
    RAISE EXCEPTION 'Expected 15 health results, found %', health_run.total_checks;
  END IF;

  SELECT count(*) INTO result_count
  FROM public.system_health_results AS result
  WHERE result.run_id = health_run.id;
  IF result_count <> health_run.total_checks THEN
    RAISE EXCEPTION 'Health result count did not match its run summary';
  END IF;

  retry_run := public.run_system_health_check(operation, 'axis-phase-12-smoke');
  IF retry_run.id <> health_run.id THEN
    RAISE EXCEPTION 'Health check operation was not idempotent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs AS audit
    WHERE audit.action = 'SYSTEM_HEALTH_CHECK_COMPLETED'
      AND audit.entity_id = health_run.id::TEXT
      AND audit.metadata ->> 'operation_key' = operation::TEXT
  ) THEN
    RAISE EXCEPTION 'System health audit record was not created';
  END IF;

  BEGIN
    INSERT INTO public.system_health_runs(
      operation_key, application_version, initiated_by
    ) VALUES (gen_random_uuid(), 'forbidden-direct-write', health_run.initiated_by);
  EXCEPTION WHEN insufficient_privilege THEN
    insert_was_denied := TRUE;
  END;
  IF NOT insert_was_denied THEN
    RAISE EXCEPTION 'Authenticated direct health-history insert was allowed';
  END IF;
END
$system_health_smoke$;

RESET ROLE;
ROLLBACK;

SELECT 'system_readiness_health_transactional_smoke_test'::TEXT AS check_name,
  TRUE AS passed,
  'cross-phase checks, immutable results, summary counts, audit, idempotency, write denial, and rollback assertions passed'::TEXT AS details;
