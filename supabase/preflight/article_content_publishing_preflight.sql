-- Hosted preflight for Phase 9 article content publishing.
-- Run in the Supabase SQL Editor before pushing the migration.

WITH checks AS (
  SELECT 10 AS sort_order, 'phase_dependencies_deployed'::TEXT AS check_name,
    count(*) = 2 AS passed,
    'Phase 8 communications cleanup and the registry-name lock must already be recorded'::TEXT AS details
  FROM supabase_migrations.schema_migrations
  WHERE version IN ('20260826004121', '20260821182815')

  UNION ALL

  SELECT 20, 'article_phase_not_partially_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826014432'
    )
      AND to_regclass('public.article_categories') IS NULL
      AND to_regclass('public.article_category_revisions') IS NULL
      AND to_regclass('public.articles') IS NULL
      AND to_regclass('public.article_revisions') IS NULL
      AND to_regclass('public.article_status_history') IS NULL,
    'Phase 9 tables must not exist outside migration history'

  UNION ALL

  SELECT 30, 'article_baseline_tables_present', count(*) = 3,
    format('found %s of 3 required source tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('members', 'events', 'audit_logs')

  UNION ALL

  SELECT 40, 'article_source_columns_present', count(*) = 8,
    format('found %s of 8 required source columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (table_name, column_name) IN (
      ('members', 'id'), ('members', 'auth_id'), ('members', 'full_name'),
      ('members', 'member_status'), ('members', 'role'),
      ('events', 'id'), ('events', 'title'), ('events', 'source_url')
    )

  UNION ALL

  SELECT 50, 'security_helpers_present', count(*) = 2,
    'the administrator authorization helpers must exist'
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE (namespace.nspname, procedure.proname) IN (
    ('public', 'is_admin'), ('private', 'require_active_admin')
  )

  UNION ALL

  SELECT 60, 'active_linked_admin_exists', count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND role = 'ADMIN'
    AND auth_id IS NOT NULL
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
