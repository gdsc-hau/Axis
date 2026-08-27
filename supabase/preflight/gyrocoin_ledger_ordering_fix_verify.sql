-- Read-only verification for
-- 20260821125016_gyrocoin_ledger_ordering_fix.sql.

WITH ordering_functions AS (
  SELECT p.*, n.nspname
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE (n.nspname = 'public' AND p.proname IN (
          'award_points',
          'current_gyrocoin_wallet_summary',
          'list_gyrocoin_accounts'
        ))
      OR (n.nspname = 'private' AND p.proname = 'adjust_member_gyrocoins')
),
trigger_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private'
     AND p.proname = 'enforce_points_ledger_running_balance'
     AND pg_get_function_identity_arguments(p.oid) = ''
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821125016'
    ) AS passed,
    'the Gyrocoin ordering correction must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'ledger_sequence_identity_present',
    count(*) = 1
      AND bool_and(is_nullable = 'NO')
      AND bool_and(is_identity = 'YES')
      AND bool_and(identity_generation = 'ALWAYS'),
    format('found %s correctly configured identity column', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'points_ledger'
    AND column_name = 'ledger_sequence'

  UNION ALL

  SELECT
    30,
    'ledger_sequence_unique',
    count(*) = 1 AND bool_and(convalidated),
    format('found %s validated sequence uniqueness constraints', count(*))
  FROM pg_constraint
  WHERE conrelid = 'public.points_ledger'::regclass
    AND conname = 'points_ledger_ledger_sequence_key'
    AND contype = 'u'

  UNION ALL

  SELECT
    40,
    'timeline_index_uses_sequence',
    count(*) = 1
      AND bool_and(indexdef ILIKE '%(member_id, ledger_sequence DESC)%'),
    format('found %s sequence-backed member timeline indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'points_ledger'
    AND indexname = 'points_ledger_member_timeline_idx'

  UNION ALL

  SELECT
    50,
    'running_balance_trigger_enabled',
    count(*) = 1 AND bool_and(tgenabled <> 'D'),
    format('found %s enabled running-balance triggers', count(*))
  FROM pg_trigger
  WHERE tgrelid = 'public.points_ledger'::regclass
    AND tgname = 'enforce_points_ledger_running_balance'
    AND NOT tgisinternal

  UNION ALL

  SELECT
    60,
    'running_balance_trigger_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[])
      AND bool_and(pg_get_functiondef(oid) ILIKE '%ORDER BY ledger_sequence DESC%'),
    format('found %s correctly configured trigger functions', count(*))
  FROM trigger_function

  UNION ALL

  SELECT
    70,
    'identity_sequence_execution_restricted',
    has_sequence_privilege(
      'service_role',
      'public.points_ledger_ledger_sequence_seq',
      'USAGE'
    )
      AND NOT has_sequence_privilege(
        'authenticated',
        'public.points_ledger_ledger_sequence_seq',
        'USAGE'
      )
      AND NOT has_sequence_privilege(
        'anon',
        'public.points_ledger_ledger_sequence_seq',
        'USAGE'
      ),
    'only trusted server-side writes may consume ledger sequence values'

  UNION ALL

  SELECT
    80,
    'all_balance_readers_use_sequence',
    count(*) = 4
      AND bool_and(pg_get_functiondef(oid) ILIKE '%ledger_sequence%'),
    format('found %s of 4 sequence-backed balance functions', count(*))
  FROM ordering_functions

  UNION ALL

  SELECT
    90,
    'ledger_sequence_rows_valid',
    count(*) FILTER (WHERE ledger_sequence IS NULL) = 0
      AND count(*) = count(DISTINCT ledger_sequence),
    format(
      'ledger rows=%s; null sequences=%s; distinct sequences=%s',
      count(*),
      count(*) FILTER (WHERE ledger_sequence IS NULL),
      count(DISTINCT ledger_sequence)
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    100,
    'running_balances_consistent',
    count(*) FILTER (WHERE expected_balance <> balance_after) = 0,
    format(
      'ledger rows=%s; running-balance mismatches=%s',
      count(*),
      count(*) FILTER (WHERE expected_balance <> balance_after)
    )
  FROM (
    SELECT
      balance_after,
      sum(points) OVER (
        PARTITION BY member_id
        ORDER BY ledger_sequence
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS expected_balance
    FROM public.points_ledger
  ) AS balances
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
