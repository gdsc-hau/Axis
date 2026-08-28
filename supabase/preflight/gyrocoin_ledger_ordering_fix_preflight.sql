-- Read-only preflight for
-- 20260821125016_gyrocoin_ledger_ordering_fix.sql.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'gyrocoin_ledger_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821104059'
    ) AS passed,
    'the initial Phase 4 Gyrocoin migration must already be recorded'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'ordering_fix_not_deployed',
    NOT EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821125016'
    ),
    'the corrective ordering migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'ledger_still_empty',
    count(*) = 0,
    format('points_ledger rows=%s; the correction refuses ambiguous backfills', count(*))
  FROM public.points_ledger

  UNION ALL

  SELECT
    40,
    'ledger_sequence_not_present',
    count(*) = 0,
    format('found %s existing ledger_sequence columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'points_ledger'
    AND column_name = 'ledger_sequence'

  UNION ALL

  SELECT
    50,
    'smoke_test_residue_absent',
    count(*) = 0,
    format('found %s Phase 4 smoke-test ledger rows', count(*))
  FROM public.points_ledger
  WHERE source_id IN (
    'a1150000-0000-4000-8000-000000000041',
    'a1150000-0000-4000-8000-000000000042',
    'a1150000-0000-4000-8000-000000000043'
  )

  UNION ALL

  SELECT
    60,
    'active_linked_admin_exists',
    count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND role = 'ADMIN'
    AND auth_id IS NOT NULL
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
