-- Read-only verification for
-- 20260821182815_lock_registry_name_during_profile_completion.sql.

WITH private_profile_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private'
     AND p.oid = to_regprocedure(
       'private.complete_current_member_profile(text,text,jsonb)'
     )
),
public_profile_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.oid = to_regprocedure(
       'public.complete_current_member_profile(text,text,jsonb)'
     )
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821182815'
    ) AS passed,
    'the registry-name lock migration must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'private_profile_helper_hardened',
    count(*) = 1
      AND bool_and(prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 1 hardened private profile helpers', count(*))
  FROM private_profile_function

  UNION ALL

  SELECT
    30,
    'public_profile_rpc_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 1 security-invoker public profile RPCs', count(*))
  FROM public_profile_function

  UNION ALL

  SELECT
    40,
    'profile_rpc_does_not_write_full_name',
    count(*) = 1
      AND bool_and(position('SET full_name' IN prosrc) = 0),
    'the profile helper must not assign members.full_name'
  FROM private_profile_function

  UNION ALL

  SELECT
    50,
    'profile_rpc_rejects_name_mismatch',
    count(*) = 1
      AND bool_and(
        position(
          'Registered full name cannot be changed during profile completion'
          IN prosrc
        ) > 0
      ),
    'the compatibility name argument must match the current registry value'
  FROM private_profile_function

  UNION ALL

  SELECT
    60,
    'profile_rpc_execution_restricted',
    has_function_privilege(
      'authenticated',
      'public.complete_current_member_profile(text,text,jsonb)',
      'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon',
        'public.complete_current_member_profile(text,text,jsonb)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'private.complete_current_member_profile(text,text,jsonb)',
        'EXECUTE'
      ),
    'only authenticated callers may invoke the self-checking profile RPC'

  UNION ALL

  SELECT
    70,
    'authenticated_direct_member_update_revoked',
    NOT has_table_privilege('authenticated', 'public.members', 'UPDATE'),
    'authenticated sessions must not update registry rows directly'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
