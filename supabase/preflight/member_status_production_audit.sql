-- Read-only production audit for the member_status lifecycle migration.
--
-- Safe to run in the Supabase SQL Editor. This query reads PostgreSQL
-- catalog metadata and aggregate member counts only. It does not return any
-- member names, email addresses, IDs, or other personal values.

WITH table_state AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table', c.relname,
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity
      )
      ORDER BY c.relname
    ),
    '[]'::jsonb
  ) AS value
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
),
member_columns AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'column', column_name,
        'type', data_type,
        'nullable', is_nullable,
        'default', column_default
      )
      ORDER BY ordinal_position
    ),
    '[]'::jsonb
  ) AS value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'members'
),
legacy_camel_case_columns AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table', table_name,
        'column', column_name
      )
      ORDER BY table_name, ordinal_position
    ),
    '[]'::jsonb
  ) AS value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name COLLATE "C" <> lower(column_name COLLATE "C")
),
constraints AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table', c.relname,
        'name', con.conname,
        'type', con.contype,
        'definition', pg_get_constraintdef(con.oid, true)
      )
      ORDER BY c.relname, con.conname
    ),
    '[]'::jsonb
  ) AS value
  FROM pg_constraint AS con
  JOIN pg_class AS c ON c.oid = con.conrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
),
indexes AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table', tablename,
        'name', indexname,
        'definition', indexdef
      )
      ORDER BY tablename, indexname
    ),
    '[]'::jsonb
  ) AS value
  FROM pg_indexes
  WHERE schemaname = 'public'
),
policies AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table', tablename,
        'name', policyname,
        'permissive', permissive,
        'roles', to_jsonb(roles),
        'command', cmd,
        'using', qual,
        'with_check', with_check
      )
      ORDER BY tablename, policyname
    ),
    '[]'::jsonb
  ) AS value
  FROM pg_policies
  WHERE schemaname = 'public'
),
functions AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'schema', n.nspname,
        'name', p.proname,
        'arguments', pg_get_function_identity_arguments(p.oid),
        'security_definer', p.prosecdef,
        'acl', COALESCE(p.proacl::text, 'DEFAULT_PUBLIC_EXECUTE'),
        'definition', pg_get_functiondef(p.oid)
      )
      ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
    ),
    '[]'::jsonb
  ) AS value
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private')
    AND p.proname IN (
      'current_member_id',
      'is_admin',
      'award_points',
      'confirm_event_attendance',
      'set_member_status',
      'set_member_role',
      'record_member_invitation',
      'link_current_member_account',
      'complete_current_member_profile',
      'sync_member_acceptance_compat'
    )
),
triggers AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'table', c.relname,
        'name', t.tgname,
        'definition', pg_get_triggerdef(t.oid, true)
      )
      ORDER BY c.relname, t.tgname
    ),
    '[]'::jsonb
  ) AS value
  FROM pg_trigger AS t
  JOIN pg_class AS c ON c.oid = t.tgrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
),
member_aggregates AS (
  SELECT jsonb_build_object(
    'total_members', count(*),
    'accepted_true', count(*) FILTER (WHERE is_accepted IS TRUE),
    'accepted_false', count(*) FILTER (WHERE is_accepted IS FALSE),
    'accepted_null', count(*) FILTER (WHERE is_accepted IS NULL),
    'linked_auth', count(*) FILTER (WHERE auth_id IS NOT NULL),
    'unlinked_auth', count(*) FILTER (WHERE auth_id IS NULL),
    'active_admins_legacy', count(*) FILTER (
      WHERE role = 'ADMIN' AND is_accepted IS TRUE
    ),
    'invalid_or_null_roles', count(*) FILTER (
      WHERE role IS NULL OR role NOT IN ('MEMBER', 'ADMIN')
    ),
    'null_or_blank_emails', count(*) FILTER (
      WHERE email IS NULL OR btrim(email) = ''
    )
  ) AS value
  FROM public.members
),
email_duplicate_aggregates AS (
  SELECT jsonb_build_object(
    'case_insensitive_duplicate_groups', count(*),
    'extra_rows_across_duplicate_groups', COALESCE(sum(row_count - 1), 0)
  ) AS value
  FROM (
    SELECT count(*) AS row_count
    FROM public.members
    WHERE email IS NOT NULL
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) AS duplicate_groups
),
migration_history AS (
  SELECT COALESCE(
    jsonb_agg(version ORDER BY version),
    '[]'::jsonb
  ) AS value
  FROM supabase_migrations.schema_migrations
)
SELECT jsonb_pretty(
  jsonb_build_object(
    'generated_at', clock_timestamp(),
    'migration_history', migration_history.value,
    'member_aggregates', member_aggregates.value,
    'email_duplicate_aggregates', email_duplicate_aggregates.value,
    'member_columns', member_columns.value,
    'legacy_camel_case_columns', legacy_camel_case_columns.value,
    'table_rls_state', table_state.value,
    'policies', policies.value,
    'constraints', constraints.value,
    'indexes', indexes.value,
    'functions', functions.value,
    'triggers', triggers.value
  )
) AS production_schema_audit
FROM table_state
CROSS JOIN member_columns
CROSS JOIN legacy_camel_case_columns
CROSS JOIN constraints
CROSS JOIN indexes
CROSS JOIN policies
CROSS JOIN functions
CROSS JOIN triggers
CROSS JOIN member_aggregates
CROSS JOIN email_duplicate_aggregates
CROSS JOIN migration_history;
