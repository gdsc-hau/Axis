-- Hosted verification for Phase 10 reporting, analytics, and leaderboard.
-- Run in the Supabase SQL Editor after pushing the migration.

WITH checks AS (
  SELECT 10 AS sort_order, 'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826090000'
    ) AS passed,
    'the Phase 10 reporting migration must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT 20, 'reporting_indexes_present', count(*) = 8,
    format('found %s of 8 reporting indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'members_status_activated_report_idx', 'events_start_report_idx',
      'points_ledger_created_source_report_idx',
      'attendance_confirmed_report_idx',
      'redemptions_created_status_report_idx',
      'member_badges_earned_status_report_idx',
      'certificates_issued_status_report_idx',
      'notification_outbox_sent_status_report_idx'
    )

  UNION ALL

  SELECT 30, 'private_reporting_helpers_hardened', count(*) = 3,
    format('found %s of 3 hardened private reporting helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname IN (
      'list_member_leaderboard', 'get_admin_report_metrics',
      'list_admin_event_participation_report'
    )
    AND procedure.prosecdef
    AND procedure.provolatile = 's'
    AND coalesce(array_to_string(procedure.proconfig, ','), '')
      LIKE '%search_path=%'

  UNION ALL

  SELECT 40, 'public_reporting_rpcs_security_invoker', count(*) = 3,
    format('found %s of 3 security-invoker public reporting RPCs', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'list_member_leaderboard', 'get_admin_report_metrics',
      'list_admin_event_participation_report'
    )
    AND NOT procedure.prosecdef
    AND procedure.provolatile = 's'
    AND coalesce(array_to_string(procedure.proconfig, ','), '')
      LIKE '%search_path=%'

  UNION ALL

  SELECT 50, 'reporting_rpc_execution_restricted',
    NOT has_function_privilege(
      'anon', 'public.list_member_leaderboard(integer,integer)', 'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated', 'public.list_member_leaderboard(integer,integer)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.get_admin_report_metrics(timestamptz,timestamptz)', 'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated', 'public.get_admin_report_metrics(timestamptz,timestamptz)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.list_admin_event_participation_report(timestamptz,timestamptz,uuid,integer)', 'EXECUTE'
      ),
    'leaderboard requires an active member and operational reports require an active administrator'

  UNION ALL

  SELECT 60, 'leaderboard_excludes_private_identity_fields',
    pg_get_function_result(procedure.oid) NOT ILIKE '%email%'
      AND pg_get_function_result(procedure.oid) NOT ILIKE '%student_id%',
    'the member leaderboard must not expose email addresses or student identifiers'
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'list_member_leaderboard'

  UNION ALL

  SELECT 70, 'ledger_running_balances_consistent', count(*) = 0,
    format('ledger rows=%s; running-balance mismatches=%s',
      (SELECT count(*) FROM public.points_ledger), count(*))
  FROM (
    SELECT ledger.id
    FROM public.points_ledger AS ledger
    JOIN LATERAL (
      SELECT COALESCE(sum(prior.points), 0)::INTEGER AS expected_balance
      FROM public.points_ledger AS prior
      WHERE prior.member_id = ledger.member_id
        AND prior.ledger_sequence <= ledger.ledger_sequence
    ) AS balance ON TRUE
    WHERE ledger.balance_after <> balance.expected_balance
  ) AS mismatches
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
