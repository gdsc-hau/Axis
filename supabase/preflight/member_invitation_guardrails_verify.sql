-- Read-only verification for
-- 20260821083404_member_invitation_guardrails.sql.

WITH hook_function AS (
  SELECT p.*
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'hook_restrict_member_account_creation'
    AND pg_get_function_identity_arguments(p.oid) = 'event jsonb'
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260821083404'
    ) AS passed,
    'the invitation guardrails migration must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'auth_hook_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured hook function(s)', count(*))
  FROM hook_function

  UNION ALL

  SELECT
    30,
    'auth_hook_execution_restricted',
    has_function_privilege(
      'supabase_auth_admin',
      'public.hook_restrict_member_account_creation(jsonb)',
      'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon',
        'public.hook_restrict_member_account_creation(jsonb)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'authenticated',
        'public.hook_restrict_member_account_creation(jsonb)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'service_role',
        'public.hook_restrict_member_account_creation(jsonb)',
        'EXECUTE'
      ),
    'only supabase_auth_admin may execute the account-creation hook'

  UNION ALL

  SELECT
    40,
    'auth_hook_member_columns_granted',
    has_column_privilege(
      'supabase_auth_admin', 'public.members', 'email', 'SELECT'
    )
      AND has_column_privilege(
        'supabase_auth_admin', 'public.members', 'member_status', 'SELECT'
      )
      AND has_column_privilege(
        'supabase_auth_admin', 'public.members', 'auth_id', 'SELECT'
      ),
    'the Auth hook role can read only the columns needed for registry matching'

  UNION ALL

  SELECT
    50,
    'auth_hook_rls_policy_present',
    count(*) = 1,
    format('found %s required Auth hook RLS policy', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'members'
    AND policyname = 'members_auth_hook_registry_lookup'

  UNION ALL

  SELECT
    60,
    'invitation_recorder_hardened',
    COALESCE(
      (
        SELECT pg_get_functiondef(p.oid) ILIKE '%auth_id IS NOT NULL%'
          AND pg_get_functiondef(p.oid) ILIKE '%MEMBER_INVITATION_RESENT%'
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'private'
          AND p.proname = 'record_member_invitation'
          AND pg_get_function_identity_arguments(p.oid) = 'p_member_id uuid'
      ),
      FALSE
    ),
    'invites must reject linked accounts and audit resends separately'

  UNION ALL

  SELECT
    70,
    'restricted_status_reason_enforced',
    COALESCE(
      (
        SELECT pg_get_functiondef(p.oid)
          ILIKE '%reason is required for restricted member statuses%'
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'private'
          AND p.proname = 'set_member_status'
          AND pg_get_function_identity_arguments(p.oid)
            = 'p_member_id uuid, p_member_status text, p_reason text'
      ),
      FALSE
    ),
    'the database must require reasons for restricted status transitions'

  UNION ALL

  SELECT
    80,
    'auth_hook_allows_eligible_member',
    COALESCE(
      (
        SELECT public.hook_restrict_member_account_creation(
          jsonb_build_object(
            'user',
            jsonb_build_object('email', email)
          )
        ) = '{}'::JSONB
        FROM public.members
        WHERE member_status = 'ACTIVE'
          AND auth_id IS NULL
        ORDER BY id
        LIMIT 1
      ),
      FALSE
    ),
    'an active unlinked registry email must be accepted by the Auth hook'

  UNION ALL

  SELECT
    90,
    'auth_hook_rejects_unknown_email',
    public.hook_restrict_member_account_creation(
      jsonb_build_object(
        'user',
        jsonb_build_object('email', 'axis-no-member@example.invalid')
      )
    ) #>> '{error,http_code}' = '403',
    'an email absent from members must be rejected by the Auth hook'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
