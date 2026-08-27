-- Hosted preflight for the Phase 9 publication timestamp correction.
-- Run in Supabase SQL Editor before pushing the corrective migration.

WITH checks AS (
  SELECT 10 AS sort_order,
    'article_phase_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826014432'
    ) AS passed,
    'the initial Phase 9 article migration must already be recorded'::TEXT AS details

  UNION ALL

  SELECT 20,
    'timestamp_correction_not_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826060920'
    ),
    'the publication timestamp correction should not already be recorded'

  UNION ALL

  SELECT 30,
    'transition_helper_present',
    count(*) = 1,
    format('found %s of 1 required transition helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname = 'transition_content_article'
    AND pg_get_function_identity_arguments(procedure.oid) =
      'p_article_id uuid, p_expected_version integer, p_target_status text, p_scheduled_for timestamp with time zone, p_reason text, p_operation_key uuid'

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
