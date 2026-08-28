-- Read-only verification for
-- 20260821172810_reward_redemption_marketplace.sql.

WITH private_functions AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private'
     AND p.proname IN (
       'create_marketplace_reward',
       'update_marketplace_reward',
       'request_reward_redemption',
       'cancel_reward_redemption',
       'review_reward_redemption',
       'fulfill_reward_redemption'
     )
),
public_functions AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN (
       'create_marketplace_reward',
       'update_marketplace_reward',
       'request_reward_redemption',
       'cancel_reward_redemption',
       'review_reward_redemption',
       'fulfill_reward_redemption'
     )
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821172810'
    ) AS passed,
    'the Phase 5 marketplace migration must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'marketplace_tables_present',
    to_regclass('public.rewards') IS NOT NULL
      AND to_regclass('public.redemption_status_history') IS NOT NULL,
    'rewards and immutable redemption status history must exist'

  UNION ALL

  SELECT
    30,
    'reward_required_columns_not_null',
    count(*) = 8 AND bool_and(is_nullable = 'NO'),
    format('found %s of 8 required non-null reward columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'rewards'
    AND column_name IN (
      'id', 'slug', 'name', 'point_cost', 'stock_quantity', 'active',
      'created_at', 'updated_at'
    )

  UNION ALL

  SELECT
    40,
    'redemption_required_columns_not_null',
    count(*) = 11 AND bool_and(is_nullable = 'NO'),
    format('found %s of 11 required non-null redemption columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'redemptions'
    AND column_name IN (
      'id', 'member_id', 'reward_id', 'status', 'quantity', 'unit_cost',
      'total_cost', 'request_operation_key', 'debit_ledger_id',
      'created_at', 'updated_at'
    )

  UNION ALL

  SELECT
    50,
    'marketplace_constraints_validated',
    count(*) = 20 AND bool_and(convalidated),
    format('found %s of 20 required validated constraints', count(*))
  FROM pg_constraint
  WHERE (conrelid = 'public.rewards'::regclass AND conname IN (
      'rewards_slug_key',
      'rewards_slug_check',
      'rewards_name_check',
      'rewards_description_check',
      'rewards_image_url_check',
      'rewards_point_cost_check',
      'rewards_stock_quantity_check',
      'rewards_sort_order_check'
    ))
    OR (conrelid = 'public.redemptions'::regclass AND conname IN (
      'redemptions_request_operation_key_key',
      'redemptions_debit_ledger_id_key',
      'redemptions_refund_ledger_id_key',
      'redemptions_quantity_check',
      'redemptions_unit_cost_check',
      'redemptions_total_cost_check',
      'redemptions_reason_check',
      'redemptions_status_state_check'
    ))
    OR (
      conrelid = 'public.redemption_status_history'::regclass
      AND conname IN (
        'redemption_status_history_operation_key_key',
        'redemption_status_history_status_check',
        'redemption_status_history_transition_check',
        'redemption_status_history_reason_check'
      )
    )

  UNION ALL

  SELECT
    60,
    'marketplace_indexes_present',
    count(*) = 8,
    format('found %s of 8 marketplace query indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'rewards_active_catalog_idx',
      'redemptions_reward_idx',
      'redemptions_status_queue_idx',
      'redemptions_member_idx',
      'redemptions_approved_by_idx',
      'redemptions_reviewed_by_idx',
      'redemptions_fulfilled_by_idx',
      'redemption_status_history_redemption_timeline_idx'
    )

  UNION ALL

  SELECT
    70,
    'marketplace_read_policies_present',
    count(*) = 3,
    format('found %s of 3 required marketplace read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'rewards_authorized_read',
      'redemptions_authorized_read',
      'redemption_status_history_authorized_read'
    )
    AND cmd = 'SELECT'

  UNION ALL

  SELECT
    80,
    'marketplace_write_policies_absent',
    count(*) = 0,
    format('found %s direct marketplace write policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('rewards', 'redemptions', 'redemption_status_history')
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')

  UNION ALL

  SELECT
    90,
    'direct_marketplace_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.rewards', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.rewards', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.rewards', 'DELETE')
      AND NOT has_table_privilege('authenticated', 'public.redemptions', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.redemptions', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.redemptions', 'DELETE')
      AND NOT has_table_privilege('authenticated', 'public.redemption_status_history', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.redemption_status_history', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.redemption_status_history', 'DELETE')
      AND NOT has_table_privilege('service_role', 'public.rewards', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.rewards', 'UPDATE')
      AND NOT has_table_privilege('service_role', 'public.rewards', 'DELETE')
      AND NOT has_table_privilege('service_role', 'public.redemptions', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.redemptions', 'UPDATE')
      AND NOT has_table_privilege('service_role', 'public.redemptions', 'DELETE')
      AND NOT has_table_privilege('service_role', 'public.redemption_status_history', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.redemption_status_history', 'UPDATE')
      AND NOT has_table_privilege('service_role', 'public.redemption_status_history', 'DELETE'),
    'browser and service roles must use audited marketplace functions for writes'

  UNION ALL

  SELECT
    100,
    'private_helpers_security_definer',
    count(*) = 6
      AND bool_and(prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 6 hardened private marketplace helpers', count(*))
  FROM private_functions

  UNION ALL

  SELECT
    110,
    'public_rpcs_security_invoker',
    count(*) = 6
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 6 security-invoker marketplace RPCs', count(*))
  FROM public_functions

  UNION ALL

  SELECT
    120,
    'marketplace_rpc_execution_restricted',
    has_function_privilege(
      'authenticated',
      'public.request_reward_redemption(uuid,integer,uuid)',
      'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated',
        'public.cancel_reward_redemption(uuid,text,uuid)',
        'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.review_reward_redemption(uuid,text,text,uuid)',
        'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.fulfill_reward_redemption(uuid,text,uuid)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.request_reward_redemption(uuid,integer,uuid)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.review_reward_redemption(uuid,text,text,uuid)',
        'EXECUTE'
      ),
    'authenticated callers may invoke self-checking RPCs; anonymous callers may not'

  UNION ALL

  SELECT
    130,
    'redemption_financial_links_valid',
    count(*) FILTER (
      WHERE debit.source_type <> 'MARKETPLACE_REDEMPTION'
         OR debit.member_id <> redemption.member_id
         OR debit.source_id <> redemption.id::TEXT
         OR debit.points <> -redemption.total_cost
         OR (
           redemption.refund_ledger_id IS NOT NULL
           AND (
             refund.source_type <> 'MARKETPLACE_REFUND'
             OR refund.member_id <> redemption.member_id
             OR refund.source_id <> redemption.id::TEXT
             OR refund.points <> redemption.total_cost
           )
         )
    ) = 0,
    format(
      'redemptions=%s; invalid ledger links=%s',
      count(*),
      count(*) FILTER (
        WHERE debit.source_type <> 'MARKETPLACE_REDEMPTION'
           OR debit.member_id <> redemption.member_id
           OR debit.source_id <> redemption.id::TEXT
           OR debit.points <> -redemption.total_cost
           OR (
             redemption.refund_ledger_id IS NOT NULL
             AND (
               refund.source_type <> 'MARKETPLACE_REFUND'
               OR refund.member_id <> redemption.member_id
               OR refund.source_id <> redemption.id::TEXT
               OR refund.points <> redemption.total_cost
             )
           )
      )
    )
  FROM public.redemptions AS redemption
  JOIN public.points_ledger AS debit ON debit.id = redemption.debit_ledger_id
  LEFT JOIN public.points_ledger AS refund
    ON refund.id = redemption.refund_ledger_id

  UNION ALL

  SELECT
    140,
    'redemption_history_complete',
    count(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1
          FROM public.redemption_status_history AS history
         WHERE history.redemption_id = redemption.id
           AND history.from_status IS NULL
           AND history.to_status = 'PENDING'
      )
    ) = 0,
    format(
      'redemptions=%s; missing request history=%s',
      count(*),
      count(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1
            FROM public.redemption_status_history AS history
           WHERE history.redemption_id = redemption.id
             AND history.from_status IS NULL
             AND history.to_status = 'PENDING'
        )
      )
    )
  FROM public.redemptions AS redemption
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
