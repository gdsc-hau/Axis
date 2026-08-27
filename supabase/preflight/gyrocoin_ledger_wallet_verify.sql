-- Read-only verification for
-- 20260821104059_gyrocoin_ledger_wallet.sql.

WITH system_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'award_points'
     AND pg_get_function_identity_arguments(p.oid)
       = 'p_member_id uuid, p_points integer, p_source_type text, p_source_id text, p_note text'
),
private_adjustment_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private'
     AND p.proname = 'adjust_member_gyrocoins'
     AND pg_get_function_identity_arguments(p.oid)
       = 'p_member_id uuid, p_points integer, p_reason text, p_operation_key uuid'
),
public_adjustment_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'adjust_member_gyrocoins'
     AND pg_get_function_identity_arguments(p.oid)
       = 'p_member_id uuid, p_points integer, p_reason text, p_operation_key uuid'
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821104059'
    ) AS passed,
    'the Phase 4 Gyrocoin migration must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'ledger_required_columns_not_null',
    count(*) = 3 AND bool_and(is_nullable = 'NO'),
    format('found %s of 3 required non-null columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'points_ledger'
    AND column_name IN ('source_id', 'source_type', 'created_at')

  UNION ALL

  SELECT
    30,
    'ledger_constraints_validated',
    count(*) = 7 AND bool_and(convalidated),
    format('found %s of 7 required validated constraints', count(*))
  FROM pg_constraint
  WHERE conrelid = 'public.points_ledger'::regclass
    AND conname IN (
      'points_ledger_source_type_check',
      'points_ledger_source_id_check',
      'points_ledger_points_range_check',
      'points_ledger_balance_nonnegative_check',
      'points_ledger_note_check',
      'points_ledger_manual_reason_check',
      'points_ledger_direction_check'
    )

  UNION ALL

  SELECT
    40,
    'ledger_indexes_present',
    count(*) = 2,
    format('found %s of 2 required ledger indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'points_ledger'
    AND indexname IN (
      'points_ledger_source_identity_idx',
      'points_ledger_member_timeline_idx'
    )

  UNION ALL

  SELECT
    50,
    'ledger_read_policy_present',
    count(*) = 1,
    format('found %s required consolidated read policy', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'points_ledger'
    AND policyname = 'points_ledger_authorized_read'
    AND cmd = 'SELECT'

  UNION ALL

  SELECT
    60,
    'ledger_write_policies_absent',
    count(*) = 0,
    format('found %s authenticated write policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'points_ledger'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')

  UNION ALL

  SELECT
    70,
    'authenticated_direct_ledger_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.points_ledger', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.points_ledger', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.points_ledger', 'DELETE'),
    'authenticated users must not directly supply financial ledger rows'

  UNION ALL

  SELECT
    80,
    'service_role_append_only',
    has_table_privilege('service_role', 'public.points_ledger', 'SELECT')
      AND has_table_privilege('service_role', 'public.points_ledger', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.points_ledger', 'UPDATE')
      AND NOT has_table_privilege('service_role', 'public.points_ledger', 'DELETE'),
    'trusted integrations may append and read but may not rewrite ledger history'

  UNION ALL

  SELECT
    90,
    'system_rpc_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured system RPC', count(*))
  FROM system_function

  UNION ALL

  SELECT
    100,
    'system_rpc_service_role_only',
    has_function_privilege(
      'service_role',
      'public.award_points(uuid,integer,text,text,text)',
      'EXECUTE'
    )
      AND NOT has_function_privilege(
        'authenticated',
        'public.award_points(uuid,integer,text,text,text)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.award_points(uuid,integer,text,text,text)',
        'EXECUTE'
      ),
    'only the service role may execute trusted system transactions'

  UNION ALL

  SELECT
    110,
    'private_adjustment_helper_security_definer',
    count(*) = 1
      AND bool_and(prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured private adjustment helper', count(*))
  FROM private_adjustment_function

  UNION ALL

  SELECT
    120,
    'public_adjustment_rpc_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured public adjustment RPC', count(*))
  FROM public_adjustment_function

  UNION ALL

  SELECT
    130,
    'adjustment_rpc_execution_restricted',
    has_function_privilege(
      'authenticated',
      'public.adjust_member_gyrocoins(uuid,integer,text,uuid)',
      'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon',
        'public.adjust_member_gyrocoins(uuid,integer,text,uuid)',
        'EXECUTE'
      ),
    'authenticated callers may invoke the self-checking admin RPC; anon may not'

  UNION ALL

  SELECT
    140,
    'wallet_read_rpcs_restricted',
    has_function_privilege(
      'authenticated', 'public.current_gyrocoin_wallet_summary()', 'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated', 'public.list_gyrocoin_accounts()', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.current_gyrocoin_wallet_summary()', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.list_gyrocoin_accounts()', 'EXECUTE'
      ),
    'wallet and account reads require an authenticated session'

  UNION ALL

  SELECT
    150,
    'ledger_rows_valid',
    count(*) FILTER (
      WHERE balance_after < 0
         OR source_id IS NULL
         OR source_type NOT IN (
           'MANUAL_AWARD', 'MANUAL_DEDUCTION', 'EVENT_ATTENDANCE',
           'MARKETPLACE_REDEMPTION', 'MARKETPLACE_REFUND'
         )
    ) = 0,
    format(
      'ledger rows=%s; invalid rows=%s',
      count(*),
      count(*) FILTER (
        WHERE balance_after < 0
           OR source_id IS NULL
           OR source_type NOT IN (
             'MANUAL_AWARD', 'MANUAL_DEDUCTION', 'EVENT_ATTENDANCE',
             'MARKETPLACE_REDEMPTION', 'MARKETPLACE_REFUND'
           )
      )
    )
  FROM public.points_ledger
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
