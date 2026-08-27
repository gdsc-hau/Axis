-- Read-only preflight for
-- 20260821182815_lock_registry_name_during_profile_completion.sql.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'profile_idempotency_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821081201'
    ) AS passed,
    'the idempotent profile-completion migration must already be recorded'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'registry_name_lock_not_deployed',
    NOT EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821182815'
    ),
    'the registry-name lock migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'profile_rpc_baseline_present',
    to_regprocedure(
      'private.complete_current_member_profile(text,text,jsonb)'
    ) IS NOT NULL
      AND to_regprocedure(
        'public.complete_current_member_profile(text,text,jsonb)'
      ) IS NOT NULL,
    'the private profile helper and public wrapper must already exist'

  UNION ALL

  SELECT
    40,
    'member_profile_columns_present',
    count(*) = 4,
    format('found %s of 4 required member profile columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'members'
    AND column_name IN (
      'full_name', 'bio', 'links', 'profile_completed_at'
    )

  UNION ALL

  SELECT
    50,
    'registry_names_present',
    count(*) FILTER (WHERE btrim(full_name) = '') = 0,
    format(
      'members=%s; blank registry names=%s',
      count(*),
      count(*) FILTER (WHERE btrim(full_name) = '')
    )
  FROM public.members

  UNION ALL

  SELECT
    60,
    'authenticated_direct_member_update_revoked',
    NOT has_table_privilege('authenticated', 'public.members', 'UPDATE'),
    'authenticated sessions must not update registry rows directly'

  UNION ALL

  SELECT
    70,
    'active_linked_admin_exists',
    count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND role = 'ADMIN'
    AND auth_id IS NOT NULL
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
