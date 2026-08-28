-- Allow the anonymous Data API role to reach the deliberately public,
-- read-only helpers in the private schema.
--
-- The public RPC wrappers remain SECURITY INVOKER. PostgreSQL checks both
-- function EXECUTE and schema USAGE when an invoker function calls a helper
-- in another schema. Phase 9 granted EXECUTE on the three safe article
-- readers but omitted schema USAGE, causing PostgREST error 42501.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260826014432'
  ) OR NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260826060920'
  ) THEN
    RAISE EXCEPTION
      'Phase 9 article publishing and its timestamp correction must be deployed first';
  END IF;

  IF to_regprocedure('private.list_public_articles(text,integer)') IS NULL
     OR to_regprocedure('private.get_public_article(text)') IS NULL
     OR to_regprocedure('private.list_public_article_categories()') IS NULL
     OR to_regprocedure('private.get_public_certificate_verification(text)') IS NULL THEN
    RAISE EXCEPTION 'An intended private public-reader helper is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'private'
      AND has_function_privilege('anon', procedure.oid, 'EXECUTE')
      AND procedure.oid NOT IN (
        to_regprocedure('private.list_public_articles(text,integer)'),
        to_regprocedure('private.get_public_article(text)'),
        to_regprocedure('private.list_public_article_categories()'),
        to_regprocedure('private.get_public_certificate_verification(text)')
      )
  ) THEN
    RAISE EXCEPTION
      'Anonymous EXECUTE exists on an unexpected private function; refusing schema access';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA private TO anon;

-- Reassert the narrow function boundary. Schema USAGE alone grants no
-- ability to execute other private helpers.
REVOKE ALL ON FUNCTION private.list_public_articles(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_public_article(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.list_public_article_categories() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_public_certificate_verification(TEXT)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.list_public_articles(TEXT, INTEGER)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_public_article(TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_public_article_categories()
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_public_certificate_verification(TEXT)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
