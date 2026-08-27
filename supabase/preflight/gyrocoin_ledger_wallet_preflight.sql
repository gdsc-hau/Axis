-- Read-only production preflight for
-- 20260821104059_gyrocoin_ledger_wallet.sql.
-- Run in the hosted Supabase SQL Editor before applying the migration.

WITH running_balances AS (
  SELECT
    id,
    member_id,
    balance_after,
    sum(points) OVER (
      PARTITION BY member_id
      ORDER BY created_at, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS expected_balance
  FROM public.points_ledger
),
source_duplicates AS (
  SELECT
    member_id,
    CASE
      WHEN upper(btrim(source_type)) = 'MANUAL' AND points > 0
        THEN 'MANUAL_AWARD'
      WHEN upper(btrim(source_type)) = 'MANUAL' AND points < 0
        THEN 'MANUAL_DEDUCTION'
      ELSE upper(btrim(source_type))
    END AS normalized_source_type,
    btrim(source_id) AS normalized_source_id,
    count(*) AS duplicate_count
  FROM public.points_ledger
  WHERE NULLIF(btrim(source_id), '') IS NOT NULL
  GROUP BY
    member_id,
    CASE
      WHEN upper(btrim(source_type)) = 'MANUAL' AND points > 0
        THEN 'MANUAL_AWARD'
      WHEN upper(btrim(source_type)) = 'MANUAL' AND points < 0
        THEN 'MANUAL_DEDUCTION'
      ELSE upper(btrim(source_type))
    END,
    btrim(source_id)
  HAVING count(*) > 1
),
checks AS (
  SELECT
    10 AS sort_order,
    'event_mirror_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821092708'
    ) AS passed,
    'the Phase 3 Bevy event mirror migration must already be recorded'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'gyrocoin_ledger_not_deployed',
    NOT EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821104059'
    ),
    'the Phase 4 Gyrocoin migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'ledger_baseline_present',
    to_regclass('public.points_ledger') IS NOT NULL
      AND (
        SELECT count(*) = 8
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'points_ledger'
           AND column_name IN (
             'id', 'member_id', 'source_type', 'source_id', 'points',
             'balance_after', 'note', 'created_at'
           )
      ),
    'the existing points_ledger table and all eight baseline columns must exist'

  UNION ALL

  SELECT
    40,
    'ledger_security_helpers_present',
    to_regprocedure('public.current_member_id()') IS NOT NULL
      AND to_regprocedure('public.is_admin()') IS NOT NULL
      AND to_regprocedure('private.require_active_admin()') IS NOT NULL,
    'the current-member, admin, and active-admin helpers must exist'

  UNION ALL

  SELECT
    50,
    'existing_source_types_supported',
    count(*) FILTER (
      WHERE upper(btrim(source_type)) NOT IN (
        'MANUAL', 'MANUAL_AWARD', 'MANUAL_DEDUCTION',
        'EVENT_ATTENDANCE', 'MARKETPLACE_REDEMPTION', 'MARKETPLACE_REFUND'
      )
    ) = 0,
    format(
      'ledger rows=%s; unsupported source types=%s',
      count(*),
      count(*) FILTER (
        WHERE upper(btrim(source_type)) NOT IN (
          'MANUAL', 'MANUAL_AWARD', 'MANUAL_DEDUCTION',
          'EVENT_ATTENDANCE', 'MARKETPLACE_REDEMPTION', 'MARKETPLACE_REFUND'
        )
      )
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    60,
    'existing_points_in_supported_range',
    count(*) FILTER (
      WHERE points = 0 OR points NOT BETWEEN -1000000 AND 1000000
    ) = 0,
    format(
      'ledger rows=%s; zero or out-of-range amounts=%s',
      count(*),
      count(*) FILTER (
        WHERE points = 0 OR points NOT BETWEEN -1000000 AND 1000000
      )
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    70,
    'existing_source_references_valid',
    count(*) FILTER (
      WHERE NULLIF(btrim(source_id), '') IS NOT NULL
        AND char_length(btrim(source_id)) > 200
    ) = 0,
    format(
      'source references over 200 characters=%s',
      count(*) FILTER (
        WHERE NULLIF(btrim(source_id), '') IS NOT NULL
          AND char_length(btrim(source_id)) > 200
      )
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    80,
    'existing_notes_valid',
    count(*) FILTER (
      WHERE NULLIF(btrim(note), '') IS NOT NULL
        AND char_length(btrim(note)) > 500
    ) = 0,
    format(
      'notes over 500 characters=%s',
      count(*) FILTER (
        WHERE NULLIF(btrim(note), '') IS NOT NULL
          AND char_length(btrim(note)) > 500
      )
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    90,
    'existing_transaction_directions_valid',
    count(*) FILTER (
      WHERE (upper(btrim(source_type)) IN (
               'MANUAL_AWARD', 'EVENT_ATTENDANCE', 'MARKETPLACE_REFUND'
             ) AND points < 0)
         OR (upper(btrim(source_type)) IN (
               'MANUAL_DEDUCTION', 'MARKETPLACE_REDEMPTION'
             ) AND points > 0)
    ) = 0,
    format(
      'source/amount direction mismatches=%s',
      count(*) FILTER (
        WHERE (upper(btrim(source_type)) IN (
                 'MANUAL_AWARD', 'EVENT_ATTENDANCE', 'MARKETPLACE_REFUND'
               ) AND points < 0)
           OR (upper(btrim(source_type)) IN (
                 'MANUAL_DEDUCTION', 'MARKETPLACE_REDEMPTION'
               ) AND points > 0)
      )
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    100,
    'existing_balances_nonnegative',
    count(*) FILTER (WHERE balance_after < 0) = 0,
    format(
      'negative balance rows=%s',
      count(*) FILTER (WHERE balance_after < 0)
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    110,
    'existing_running_balances_consistent',
    count(*) FILTER (WHERE balance_after <> expected_balance) = 0,
    format(
      'running-balance mismatches=%s',
      count(*) FILTER (WHERE balance_after <> expected_balance)
    )
  FROM running_balances

  UNION ALL

  SELECT
    120,
    'ledger_timestamps_present',
    count(*) FILTER (WHERE created_at IS NULL) = 0,
    format(
      'null created_at rows=%s',
      count(*) FILTER (WHERE created_at IS NULL)
    )
  FROM public.points_ledger

  UNION ALL

  SELECT
    130,
    'source_references_unique',
    count(*) = 0,
    format('duplicate normalized source references=%s', count(*))
  FROM source_duplicates

  UNION ALL

  SELECT
    140,
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
