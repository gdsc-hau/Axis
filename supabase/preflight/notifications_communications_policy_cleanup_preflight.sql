-- Hosted preflight for the Phase 8 legacy notification-policy cleanup.
-- Run in Supabase SQL Editor before pushing the corrective migration.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'communications_phase_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826001721'
    ) AS passed,
    'the initial Phase 8 communications migration must already be recorded'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'policy_cleanup_not_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826004121'
    ),
    'the corrective policy cleanup should not already be recorded'

  UNION ALL

  SELECT
    30,
    'legacy_notification_insert_policy_identified',
    count(*) = 1,
    format('found %s legacy notification insert policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'notifications'
    AND policyname = 'notifications_admin_insert'
    AND cmd = 'INSERT'

  UNION ALL

  SELECT
    40,
    'direct_notification_writes_still_revoked',
    NOT has_table_privilege('authenticated', 'public.notifications', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.notifications', 'DELETE'),
    'the stale policy is latent because authenticated table-write privileges remain revoked'

  UNION ALL

  SELECT
    50,
    'phase_8_rows_remain_valid',
    count(*) FILTER (
      WHERE read <> (read_at IS NOT NULL)
        OR title IS NULL OR title = ''
        OR message IS NULL OR message = ''
    ) = 0,
    format(
      'notifications=%s; invalid rows=%s',
      count(*),
      count(*) FILTER (
        WHERE read <> (read_at IS NOT NULL)
          OR title IS NULL OR title = ''
          OR message IS NULL OR message = ''
      )
    )
  FROM public.notifications
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
