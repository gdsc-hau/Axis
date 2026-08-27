-- Hosted verification for the Phase 9 anonymous public-reader correction.
-- Run in Supabase SQL Editor after pushing the corrective migration.

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
), public_readers AS (
  SELECT procedure.oid, procedure.proname, procedure.prosecdef,
    procedure.proconfig
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'list_public_articles',
      'get_public_article',
      'list_public_article_categories'
    )
), checks AS (
  SELECT 10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826072424'
    ) AS passed,
    'the anonymous public-reader correction must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT 20,
    'anonymous_private_schema_usage_granted',
    has_schema_privilege('anon', 'private', 'USAGE'),
    'anonymous requests must be able to resolve the explicitly granted private readers'

  UNION ALL

  SELECT 30,
    'private_public_reader_helpers_executable',
    count(*) = 3,
    format('found %s of 3 hardened anonymous public-reader helpers', count(*))
  FROM reader_helpers
  WHERE prosecdef
    AND proconfig @> ARRAY['search_path=""']::TEXT[]
    AND has_function_privilege('anon', oid, 'EXECUTE')

  UNION ALL

  SELECT 40,
    'public_article_readers_security_invoker',
    count(*) = 3,
    format('found %s of 3 security-invoker public article readers', count(*))
  FROM public_readers
  WHERE NOT prosecdef
    AND proconfig @> ARRAY['search_path=""']::TEXT[]
    AND has_function_privilege('anon', oid, 'EXECUTE')

  UNION ALL

  SELECT 50,
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

  SELECT 60,
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
    'schema usage must not make article mutation functions executable anonymously'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
