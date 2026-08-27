-- Read-only production preflight for
-- 20260821172810_reward_redemption_marketplace.sql.
-- Run in the hosted Supabase SQL Editor before applying the migration.

WITH running_balances AS (
  SELECT
    balance_after,
    sum(points) OVER (
      PARTITION BY member_id
      ORDER BY ledger_sequence
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS expected_balance
  FROM public.points_ledger
),
checks AS (
  SELECT
    10 AS sort_order,
    'gyrocoin_ordering_fix_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821125016'
    ) AS passed,
    'the corrected Phase 4 Gyrocoin ledger must already be recorded'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'marketplace_not_deployed',
    NOT EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821172810'
    ),
    'the Phase 5 marketplace migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'redemption_baseline_present',
    to_regclass('public.redemptions') IS NOT NULL
      AND (
        SELECT count(*) = 7
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'redemptions'
           AND column_name IN (
             'id', 'member_id', 'status', 'total_cost', 'approved_by',
             'fulfilled_at', 'created_at'
           )
      ),
    'the existing redemptions table and all seven baseline columns must exist'

  UNION ALL

  SELECT
    40,
    'redemptions_empty',
    count(*) = 0,
    format(
      'redemptions rows=%s; Phase 5 refuses to invent catalog links for legacy rows',
      count(*)
    )
  FROM public.redemptions

  UNION ALL

  SELECT
    50,
    'marketplace_tables_absent',
    to_regclass('public.rewards') IS NULL
      AND to_regclass('public.redemption_status_history') IS NULL,
    'rewards and redemption_status_history must not exist outside migration history'

  UNION ALL

  SELECT
    60,
    'ledger_contract_present',
    to_regclass('public.points_ledger') IS NOT NULL
      AND (
        SELECT count(*) = 9
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'points_ledger'
           AND column_name IN (
             'id', 'ledger_sequence', 'member_id', 'source_type', 'source_id',
             'points', 'balance_after', 'note', 'created_at'
           )
      )
      AND to_regprocedure(
        'private.enforce_points_ledger_running_balance()'
      ) IS NOT NULL,
    'the append-only Phase 4 ledger, sequence, and running-balance trigger must exist'

  UNION ALL

  SELECT
    70,
    'marketplace_ledger_sources_supported',
    EXISTS (
      SELECT 1
        FROM pg_constraint
       WHERE conrelid = 'public.points_ledger'::regclass
         AND conname = 'points_ledger_source_type_check'
         AND pg_get_constraintdef(oid) ILIKE '%MARKETPLACE_REDEMPTION%'
         AND pg_get_constraintdef(oid) ILIKE '%MARKETPLACE_REFUND%'
    ),
    'the ledger source constraint must support marketplace debits and refunds'

  UNION ALL

  SELECT
    80,
    'ledger_balances_consistent',
    count(*) FILTER (WHERE balance_after <> expected_balance) = 0,
    format(
      'ledger rows=%s; running-balance mismatches=%s',
      count(*),
      count(*) FILTER (WHERE balance_after <> expected_balance)
    )
  FROM running_balances

  UNION ALL

  SELECT
    90,
    'ledger_balances_nonnegative',
    count(*) FILTER (WHERE balance_after < 0) = 0,
    format(
      'negative balance rows=%s',
      count(*) FILTER (WHERE balance_after < 0)
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    100,
    'security_helpers_present',
    to_regprocedure('public.current_member_id()') IS NOT NULL
      AND to_regprocedure('public.is_admin()') IS NOT NULL
      AND to_regprocedure('private.require_active_admin()') IS NOT NULL
      AND to_regprocedure('public.set_updated_at()') IS NOT NULL,
    'current-member, admin, active-admin, and timestamp helpers must exist'

  UNION ALL

  SELECT
    110,
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
