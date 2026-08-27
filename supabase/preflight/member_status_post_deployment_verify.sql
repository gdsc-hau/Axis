-- Read-only verification for 20260820123815_member_status_lifecycle.sql.
-- Run only after the migration has been pushed successfully.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::text AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260820123815'
    ) AS passed,
    '20260820123815 must exist in remote migration history'::text AS details

  UNION ALL

  SELECT
    20,
    'lifecycle_columns_present',
    count(*) = 6,
    format('found %s of 6 lifecycle columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'members'
    AND column_name IN (
      'member_status',
      'invited_at',
      'activated_at',
      'profile_completed_at',
      'deactivated_at',
      'deactivation_reason'
    )

  UNION ALL

  SELECT
    30,
    'member_status_not_null',
    is_nullable = 'NO',
    format('is_nullable=%s', is_nullable)
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'members'
    AND column_name = 'member_status'

  UNION ALL

  SELECT
    40,
    'member_status_values_valid',
    count(*) = 0,
    format('invalid rows=%s', count(*))
  FROM public.members
  WHERE member_status IS NULL
     OR member_status NOT IN (
       'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI'
     )

  UNION ALL

  SELECT
    50,
    'legacy_acceptance_synchronized',
    count(*) = 0,
    format('mismatched rows=%s', count(*))
  FROM public.members
  WHERE is_accepted IS DISTINCT FROM (member_status = 'ACTIVE')

  UNION ALL

  SELECT
    60,
    'active_admin_exists',
    count(*) > 0,
    format('active admins=%s', count(*))
  FROM public.members
  WHERE role = 'ADMIN'
    AND member_status = 'ACTIVE'

  UNION ALL

  SELECT
    70,
    'compatibility_trigger_enabled',
    EXISTS (
      SELECT 1
      FROM pg_trigger AS t
      JOIN pg_class AS c ON c.oid = t.tgrelid
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'members'
        AND t.tgname = 'sync_member_acceptance_compat'
        AND t.tgenabled <> 'D'
        AND NOT t.tgisinternal
    ),
    'sync_member_acceptance_compat trigger must be enabled'

  UNION ALL

  SELECT
    80,
    'status_constraint_validated',
    EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.members'::regclass
        AND conname = 'members_member_status_check'
        AND convalidated
    ),
    'members_member_status_check must exist and be validated'

  UNION ALL

  SELECT
    90,
    'compatibility_constraint_validated',
    EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.members'::regclass
        AND conname = 'members_acceptance_compat_check'
        AND convalidated
    ),
    'members_acceptance_compat_check must exist and be validated'

  UNION ALL

  SELECT
    100,
    'status_indexes_present',
    count(*) = 2,
    format('found %s of 2 status indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN ('members_status_created_idx', 'members_active_role_idx')

  UNION ALL

  SELECT
    110,
    'authenticated_direct_update_revoked',
    NOT has_table_privilege('authenticated', 'public.members', 'UPDATE'),
    format(
      'authenticated UPDATE privilege=%s',
      has_table_privilege('authenticated', 'public.members', 'UPDATE')
    )

  UNION ALL

  SELECT
    120,
    'anonymous_admin_helpers_revoked',
    NOT has_function_privilege('anon', 'public.current_member_id()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')
      AND NOT has_function_privilege(
        'anon',
        'public.award_points(uuid,integer,text,text,text)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.confirm_event_attendance(uuid,uuid)',
        'EXECUTE'
      ),
    'anon must not execute administrative security-definer functions'

  UNION ALL

  SELECT
    130,
    'anonymous_lifecycle_rpcs_revoked',
    NOT has_function_privilege(
      'anon', 'public.set_member_status(uuid,text,text)', 'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon', 'public.set_member_role(uuid,text)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.record_member_invitation(uuid)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.link_current_member_account()', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.complete_current_member_profile(text,text,jsonb)',
        'EXECUTE'
      ),
    'anon must not execute lifecycle RPCs'

  UNION ALL

  SELECT
    140,
    'authenticated_lifecycle_rpcs_granted',
    has_function_privilege(
      'authenticated', 'public.set_member_status(uuid,text,text)', 'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated', 'public.set_member_role(uuid,text)', 'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated', 'public.record_member_invitation(uuid)', 'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated', 'public.link_current_member_account()', 'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.complete_current_member_profile(text,text,jsonb)',
        'EXECUTE'
      ),
    'authenticated must execute lifecycle RPCs'

  UNION ALL

  SELECT
    150,
    'member_policies_present',
    count(*) = 2,
    format('found %s of 2 required member policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'members'
    AND policyname IN ('members_select_self_or_admin', 'members_update_admin')
),
status_distribution AS (
  SELECT COALESCE(
    jsonb_object_agg(member_status, member_count ORDER BY member_status),
    '{}'::jsonb
  ) AS value
  FROM (
    SELECT member_status, count(*) AS member_count
    FROM public.members
    GROUP BY member_status
  ) AS counts
)
SELECT
  checks.check_name,
  checks.passed,
  checks.details,
  CASE
    WHEN checks.sort_order = 40 THEN status_distribution.value
    ELSE NULL
  END AS status_distribution
FROM checks
CROSS JOIN status_distribution
ORDER BY checks.sort_order;
