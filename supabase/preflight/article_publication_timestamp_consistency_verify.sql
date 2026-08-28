-- Hosted verification for the Phase 9 publication timestamp correction.
-- Run in Supabase SQL Editor after pushing the corrective migration.

WITH transition_helper AS (
  SELECT procedure.oid
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname = 'transition_content_article'
    AND pg_get_function_identity_arguments(procedure.oid) =
      'p_article_id uuid, p_expected_version integer, p_target_status text, p_scheduled_for timestamp with time zone, p_reason text, p_operation_key uuid'
), checks AS (
  SELECT 10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826060920'
    ) AS passed,
    'the publication timestamp correction must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT 20,
    'publication_uses_transaction_timestamp',
    count(*) = 1,
    format('found %s correctly timestamped transition helpers', count(*))
  FROM transition_helper
  WHERE pg_get_functiondef(oid) LIKE
    '%WHEN target_status = ''PUBLISHED'' THEN pg_catalog.now()%'

  UNION ALL

  SELECT 30,
    'transition_helper_still_hardened',
    count(*) = 1,
    format('found %s of 1 hardened transition helpers', count(*))
  FROM transition_helper
  JOIN pg_proc AS procedure ON procedure.oid = transition_helper.oid
  WHERE procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]
    AND has_function_privilege(
      'authenticated',
      procedure.oid,
      'EXECUTE'
    )
    AND NOT has_function_privilege('anon', procedure.oid, 'EXECUTE')

  UNION ALL

  SELECT 40,
    'published_rows_not_future_dated',
    count(*) FILTER (
      WHERE status = 'PUBLISHED' AND published_at > pg_catalog.now()
    ) = 0,
    format(
      'published articles=%s; future-dated published rows=%s',
      count(*) FILTER (WHERE status = 'PUBLISHED'),
      count(*) FILTER (
        WHERE status = 'PUBLISHED' AND published_at > pg_catalog.now()
      )
    )
  FROM public.articles
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
