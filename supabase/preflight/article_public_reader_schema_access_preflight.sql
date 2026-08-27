-- Hosted preflight for the Phase 9 anonymous public-reader correction.
-- Run in Supabase SQL Editor before pushing the corrective migration.

WITH reader_helpers AS (
  SELECT procedure.oid, procedure.proname, procedure.prosecdef,
    procedure.proconfig
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname IN (
      'list_public_articles',
      'get_public_article',
      'list_public_article_categories'
    )
), checks AS (
  SELECT 10 AS sort_order,
    'phase_9_dependencies_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826014432'
    ) AND EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826060920'
    ) AS passed,
    'Phase 9 article publishing and its timestamp correction must already be recorded'::TEXT AS details

  UNION ALL

  SELECT 20,
    'public_reader_access_not_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826072424'
    ),
    'the anonymous public-reader correction should not already be recorded'

  UNION ALL

  SELECT 30,
    'anonymous_private_schema_usage_missing',
    NOT has_schema_privilege('anon', 'private', 'USAGE'),
    'the diagnosed production state must still lack anonymous private-schema usage'

  UNION ALL

  SELECT 40,
    'private_public_reader_helpers_hardened',
    count(*) = 3,
    format('found %s of 3 hardened private public-reader helpers', count(*))
  FROM reader_helpers
  WHERE prosecdef
    AND proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL

  SELECT 50,
    'anonymous_reader_execution_already_scoped',
    count(*) = 3,
    format('found %s of 3 anonymous executable public-reader helpers', count(*))
  FROM reader_helpers
  WHERE has_function_privilege('anon', oid, 'EXECUTE')

  UNION ALL

  SELECT 60,
    'anonymous_private_function_surface_scoped',
    count(*) FILTER (
      WHERE has_function_privilege('anon', procedure.oid, 'EXECUTE')
    ) = 4
      AND count(*) FILTER (
        WHERE has_function_privilege('anon', procedure.oid, 'EXECUTE')
          AND procedure.oid NOT IN (
            to_regprocedure('private.list_public_articles(text,integer)'),
            to_regprocedure('private.get_public_article(text)'),
            to_regprocedure('private.list_public_article_categories()'),
            to_regprocedure('private.get_public_certificate_verification(text)')
          )
      ) = 0,
    format(
      'anonymous executable private functions=%s; unexpected functions=%s',
      count(*) FILTER (
        WHERE has_function_privilege('anon', procedure.oid, 'EXECUTE')
      ),
      count(*) FILTER (
        WHERE has_function_privilege('anon', procedure.oid, 'EXECUTE')
          AND procedure.oid NOT IN (
            to_regprocedure('private.list_public_articles(text,integer)'),
            to_regprocedure('private.get_public_article(text)'),
            to_regprocedure('private.list_public_article_categories()'),
            to_regprocedure('private.get_public_certificate_verification(text)')
          )
      )
    )
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'

  UNION ALL

  SELECT 70,
    'anonymous_article_mutations_restricted',
    NOT has_function_privilege(
      'anon',
      'private.create_content_article(text,text,text,text,uuid,uuid,text,boolean,text,text,uuid)',
      'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon',
        'public.create_content_article(text,text,text,text,uuid,uuid,text,boolean,text,text,uuid)',
        'EXECUTE'
      ),
    'anonymous callers must not execute private or public article mutations'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
