-- Hosted verification for Phase 9 article content publishing.
-- Run in the Supabase SQL Editor after pushing the migration.

WITH checks AS (
  SELECT 10 AS sort_order, 'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826014432'
    ) AS passed,
    'the Phase 9 article migration must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT 15, 'timestamp_correction_recorded',
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826060920'
    ),
    'the Phase 9 publication timestamp correction must exist in remote history'

  UNION ALL

  SELECT 17, 'public_reader_access_correction_recorded',
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826072424'
    ),
    'the Phase 9 anonymous public-reader correction must exist in remote history'

  UNION ALL

  SELECT 18, 'anonymous_public_reader_path_accessible',
    has_schema_privilege('anon', 'private', 'USAGE')
      AND has_function_privilege(
        'anon', 'private.list_public_articles(text,integer)', 'EXECUTE'
      )
      AND has_function_privilege(
        'anon', 'private.get_public_article(text)', 'EXECUTE'
      )
      AND has_function_privilege(
        'anon', 'private.list_public_article_categories()', 'EXECUTE'
      ),
    'anonymous Data API requests must reach only the explicitly granted private readers'

  UNION ALL

  SELECT 20, 'article_tables_present', count(*) = 5,
    format('found %s of 5 article, revision, and history tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'article_categories', 'article_category_revisions', 'articles',
      'article_revisions', 'article_status_history'
    )

  UNION ALL

  SELECT 30, 'article_columns_present', count(*) = 22,
    format('found %s of 22 required article columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'articles'
    AND column_name IN (
      'id', 'slug', 'title', 'excerpt', 'body_markdown', 'category_id',
      'related_event_id', 'featured_image_url', 'status', 'featured',
      'seo_title', 'seo_description', 'author_id', 'author_display_name',
      'updated_by', 'version', 'create_operation_key', 'scheduled_for',
      'published_at', 'archived_at', 'created_at', 'updated_at'
    )

  UNION ALL

  SELECT 40, 'article_constraints_validated', count(*) = 29,
    format('found %s of 29 validated article constraints', count(*))
  FROM pg_constraint AS constraint_record
  JOIN pg_class AS relation ON relation.oid = constraint_record.conrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND constraint_record.convalidated
    AND constraint_record.conname IN (
      'article_categories_slug_check', 'article_categories_name_check',
      'article_categories_description_check', 'article_categories_version_check',
      'article_categories_timestamp_check',
      'article_category_revisions_identity_key',
      'article_category_revisions_number_check',
      'article_category_revisions_name_check',
      'article_category_revisions_description_check',
      'article_category_revisions_reason_check',
      'articles_slug_check', 'articles_title_check', 'articles_excerpt_check',
      'articles_body_check', 'articles_image_url_check',
      'articles_status_check', 'articles_seo_title_check',
      'articles_seo_description_check', 'articles_author_name_check',
      'articles_version_check', 'articles_status_timestamps_check',
      'articles_timestamp_check', 'article_revisions_identity_key',
      'article_revisions_number_check', 'article_revisions_reason_check',
      'article_status_history_from_check',
      'article_status_history_to_check', 'article_status_history_reason_check',
      'article_status_history_schedule_check'
    )

  UNION ALL

  SELECT 50, 'article_indexes_present', count(*) = 15,
    format('found %s of 15 article query and foreign-key indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'article_categories_active_name_idx',
      'article_category_revisions_category_idx',
      'articles_admin_status_updated_idx',
      'articles_category_status_publication_idx',
      'articles_public_published_idx', 'articles_public_scheduled_idx',
      'articles_related_event_idx', 'articles_author_idx',
      'articles_updated_by_idx', 'article_revisions_article_idx',
      'article_revisions_category_idx', 'article_revisions_event_idx',
      'article_revisions_actor_idx', 'article_status_history_article_idx',
      'article_status_history_actor_idx'
    )

  UNION ALL

  SELECT 60, 'article_read_policies_present', count(*) = 5,
    format('found %s of 5 required administrator read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'article_categories_admin_read',
      'article_category_revisions_admin_read', 'articles_admin_read',
      'article_revisions_admin_read', 'article_status_history_admin_read'
    )

  UNION ALL

  SELECT 70, 'article_write_policies_absent', count(*) = 0,
    format('found %s direct article write policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'article_categories', 'article_category_revisions', 'articles',
      'article_revisions', 'article_status_history'
    )
    AND cmd <> 'SELECT'

  UNION ALL

  SELECT 80, 'direct_article_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.articles', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.articles', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.article_categories', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.articles', 'INSERT'),
    'all article writes must use self-authorizing, audited functions'

  UNION ALL

  SELECT 90, 'private_article_helpers_hardened', count(*) = 9,
    format('found %s of 9 hardened private article helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname IN (
      'article_is_public', 'create_article_category',
      'update_article_category', 'create_content_article',
      'update_content_article', 'transition_content_article',
      'list_public_articles', 'get_public_article',
      'list_public_article_categories'
    )
    AND procedure.prosecdef = (procedure.proname <> 'article_is_public')
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL

  SELECT 100, 'public_article_rpcs_security_invoker', count(*) = 8,
    format('found %s of 8 security-invoker public article RPCs', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'create_article_category', 'update_article_category',
      'create_content_article', 'update_content_article',
      'transition_content_article', 'list_public_articles',
      'get_public_article', 'list_public_article_categories'
    )
    AND NOT procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL

  SELECT 110, 'article_rpc_execution_restricted',
    NOT has_function_privilege(
      'anon', 'public.create_article_category(text,text,text,uuid)', 'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated', 'public.create_article_category(text,text,text,uuid)', 'EXECUTE'
      )
      AND has_function_privilege(
        'anon', 'public.list_public_articles(text,integer)', 'EXECUTE'
      )
      AND has_function_privilege(
        'anon', 'public.get_public_article(text)', 'EXECUTE'
      ),
    'article mutations require authentication while safe publication reads are public'

  UNION ALL

  SELECT 120, 'article_rows_valid',
    count(*) FILTER (
      WHERE status NOT IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')
        OR version < 1
        OR title = '' OR excerpt = '' OR body_markdown = ''
    ) = 0,
    format(
      'articles=%s; invalid rows=%s', count(*),
      count(*) FILTER (
        WHERE status NOT IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')
          OR version < 1
          OR title = '' OR excerpt = '' OR body_markdown = ''
      )
    )
  FROM public.articles

  UNION ALL

  SELECT 130, 'article_histories_complete',
    count(*) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM public.article_revisions AS revision
        WHERE revision.article_id = article.id
      ) OR NOT EXISTS (
        SELECT 1 FROM public.article_status_history AS history
        WHERE history.article_id = article.id
      )
    ) = 0,
    'every article must have content revision and status history'
  FROM public.articles AS article
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
