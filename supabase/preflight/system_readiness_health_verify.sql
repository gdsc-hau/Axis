-- Run in the hosted Supabase SQL Editor after pushing Phase 12.
WITH checks AS (
  SELECT 10 AS sort_order, 'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826170000'
    ) AS passed,
    'the Phase 12 system-readiness migration must exist in remote history'::TEXT AS details

  UNION ALL
  SELECT 20, 'system_health_tables_present', count(*) = 2,
    format('found %s of 2 system health tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('system_health_runs', 'system_health_results')

  UNION ALL
  SELECT 30, 'system_health_columns_present', count(*) = 19,
    format('found %s of 19 required system health columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'system_health_runs' AND column_name IN (
      'id', 'operation_key', 'status', 'total_checks', 'passed_checks',
      'warning_checks', 'failed_checks', 'application_version', 'initiated_by',
      'started_at', 'completed_at'
    )) OR (table_name = 'system_health_results' AND column_name IN (
      'id', 'run_id', 'check_key', 'category', 'status', 'details',
      'sort_order', 'checked_at'
    )))

  UNION ALL
  SELECT 40, 'system_health_constraints_validated', count(*) = 12,
    format('found %s of 12 validated health constraints', count(*))
  FROM pg_constraint AS constraint_record
  JOIN pg_class AS relation ON relation.oid = constraint_record.conrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public' AND constraint_record.convalidated
    AND constraint_record.conname IN (
      'system_health_runs_status_check', 'system_health_runs_counts_check',
      'system_health_runs_version_check', 'system_health_runs_timestamps_check',
      'system_health_runs_completion_check', 'system_health_results_key_check',
      'system_health_results_category_check', 'system_health_results_status_check',
      'system_health_results_details_check', 'system_health_results_sort_check',
      'system_health_results_run_key', 'system_health_results_run_sort'
    )

  UNION ALL
  SELECT 50, 'system_health_indexes_present', count(*) = 4,
    format('found %s of 4 health query indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname IN (
    'system_health_runs_started_idx', 'system_health_runs_status_started_idx',
    'system_health_runs_initiator_idx', 'system_health_results_run_status_idx'
  )

  UNION ALL
  SELECT 60, 'system_health_read_policies_present', count(*) = 2,
    format('found %s of 2 administrator read policies', count(*))
  FROM pg_policies WHERE schemaname = 'public'
    AND policyname IN (
      'system_health_runs_admin_read', 'system_health_results_admin_read'
    )

  UNION ALL
  SELECT 70, 'direct_system_health_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.system_health_runs', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.system_health_results', 'INSERT')
    AND NOT has_table_privilege('service_role', 'public.system_health_runs', 'UPDATE')
    AND NOT has_table_privilege('service_role', 'public.system_health_results', 'DELETE'),
    'health history may only be written by the audited administrator function'

  UNION ALL
  SELECT 80, 'private_system_health_helpers_hardened', count(*) = 2,
    format('found %s of 2 hardened private health helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname IN (
      'collect_system_health_checks', 'run_system_health_check'
    )
    AND procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL
  SELECT 90, 'public_system_health_rpc_security_invoker', count(*) = 1,
    format('found %s of 1 security-invoker public health RPCs', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'run_system_health_check'
    AND NOT procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL
  SELECT 100, 'system_health_execution_restricted',
    has_function_privilege(
      'authenticated', 'public.run_system_health_check(uuid,text)', 'EXECUTE'
    )
    AND NOT has_function_privilege(
      'anon', 'public.run_system_health_check(uuid,text)', 'EXECUTE'
    )
    AND NOT has_function_privilege(
      'anon', 'private.run_system_health_check(uuid,text)', 'EXECUTE'
    )
    AND NOT has_function_privilege(
      'authenticated', 'private.collect_system_health_checks()', 'EXECUTE'
    ),
    'only authenticated administrators may invoke the public health runner'

  UNION ALL
  SELECT 110, 'system_health_rows_valid', count(*) = 0,
    format('invalid health runs=%s', count(*))
  FROM public.system_health_runs AS run
  WHERE run.total_checks <> run.passed_checks + run.warning_checks + run.failed_checks
     OR (run.status = 'PASS' AND (run.warning_checks > 0 OR run.failed_checks > 0))
     OR (run.status = 'WARN' AND (run.warning_checks = 0 OR run.failed_checks > 0))
     OR (run.status = 'FAIL' AND run.failed_checks = 0)

  UNION ALL
  SELECT 120, 'system_health_result_sets_complete', count(*) = 0,
    format('completed runs with mismatched result counts=%s', count(*))
  FROM public.system_health_runs AS run
  WHERE run.status <> 'RUNNING'
    AND run.total_checks <> (
      SELECT count(*) FROM public.system_health_results AS result
      WHERE result.run_id = run.id
    )
)
SELECT check_name, passed, details FROM checks ORDER BY sort_order;
