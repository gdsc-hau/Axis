-- Run in the hosted Supabase SQL Editor before pushing Phase 12.
WITH checks AS (
  SELECT 10 AS sort_order, 'phase_dependencies_deployed'::TEXT AS check_name,
    (SELECT count(*) = 5 FROM supabase_migrations.schema_migrations
      WHERE version IN (
        '20260825170545', '20260826004121', '20260826072424',
        '20260826090000', '20260826160000'
      )) AS passed,
    'credentials, communications cleanup, public article reader, reporting, and member operations must already be recorded'::TEXT AS details

  UNION ALL
  SELECT 20, 'system_health_phase_not_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826170000'
    )
    AND to_regclass('public.system_health_runs') IS NULL
    AND to_regclass('public.system_health_results') IS NULL,
    'Phase 12 tables must not exist outside migration history'

  UNION ALL
  SELECT 30, 'health_source_tables_present', count(*) = 18,
    format('found %s of 18 authoritative health-check source tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN (
    'members', 'events', 'event_attendance', 'event_attendance_status_history',
    'points_ledger', 'redemptions', 'redemption_status_history',
    'member_badges', 'badge_award_status_history', 'certificates',
    'certificate_status_history', 'notification_email_outbox',
    'notification_delivery_config', 'articles', 'article_revisions',
    'article_status_history', 'member_profile_revisions', 'app_settings'
  )

  UNION ALL
  SELECT 40, 'ledger_running_balances_consistent', count(*) = 0,
    format('running-balance or overdraw violations=%s', count(*))
  FROM (
    SELECT ledger.balance_after,
      sum(ledger.points) OVER (
        PARTITION BY ledger.member_id ORDER BY ledger.ledger_sequence
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS expected_balance
    FROM public.points_ledger AS ledger
  ) AS balances
  WHERE balances.balance_after <> balances.expected_balance
     OR balances.balance_after < 0

  UNION ALL
  SELECT 50, 'critical_rls_enabled', count(*) = 12,
    format('found %s of 12 RLS-protected critical tables', count(*))
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public' AND relation.relrowsecurity
    AND relation.relname IN (
      'members', 'events', 'event_attendance', 'points_ledger', 'rewards',
      'redemptions', 'badges', 'member_badges', 'certificates',
      'notifications', 'articles', 'app_settings'
    )

  UNION ALL
  SELECT 60, 'security_helpers_present', count(*) = 3,
    format('found %s of 3 required administrator helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE (namespace.nspname, procedure.proname) IN (
    ('private', 'require_active_admin'), ('public', 'is_admin'),
    ('public', 'current_member_id')
  )

  UNION ALL
  SELECT 70, 'active_linked_admin_exists', count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE role = 'ADMIN' AND member_status = 'ACTIVE' AND auth_id IS NOT NULL
)
SELECT check_name, passed, details FROM checks ORDER BY sort_order;
