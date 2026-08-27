-- Run in the hosted Supabase SQL Editor before pushing Phase 11.
WITH checks AS (
  SELECT 10 AS sort_order, 'phase_dependencies_deployed'::TEXT AS check_name,
    (SELECT count(*) = 3 FROM supabase_migrations.schema_migrations
      WHERE version IN ('20260821182815', '20260826072424', '20260826090000')) AS passed,
    'registry-name lock, final public article reader, and Phase 10 reporting must already be recorded'::TEXT AS details

  UNION ALL
  SELECT 20, 'member_portal_phase_not_deployed',
    NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260826160000')
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('member_profile_revisions', 'app_setting_revisions'))
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'profile_version'),
    'Phase 11 tables and profile version must not exist outside migration history'

  UNION ALL
  SELECT 30, 'member_profile_baseline_present', count(*) = 7,
    format('found %s of 7 required member profile columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'members'
    AND column_name IN ('id', 'auth_id', 'bio', 'phone_number', 'links', 'profile_completed_at', 'member_status')

  UNION ALL
  SELECT 40, 'completed_profiles_valid', count(*) FILTER (
      WHERE profile_completed_at IS NOT NULL
        AND (NULLIF(btrim(bio), '') IS NULL OR char_length(btrim(bio)) > 1000
          OR (links IS NOT NULL AND jsonb_typeof(links) <> 'object'))
    ) = 0,
    format('completed profiles=%s; invalid completed profiles=%s',
      count(*) FILTER (WHERE profile_completed_at IS NOT NULL),
      count(*) FILTER (WHERE profile_completed_at IS NOT NULL
        AND (NULLIF(btrim(bio), '') IS NULL OR char_length(btrim(bio)) > 1000
          OR (links IS NOT NULL AND jsonb_typeof(links) <> 'object'))))
  FROM public.members

  UNION ALL
  SELECT 50, 'portal_settings_row_compatible', count(*) FILTER (
      WHERE key = 'PORTAL_SETTINGS' AND (
        jsonb_typeof(value) <> 'object'
        OR NOT value ?& ARRAY['organization_name', 'support_email', 'dashboard_message', 'default_report_days', 'leaderboard_limit']
        OR jsonb_typeof(value->'organization_name') <> 'string'
        OR jsonb_typeof(value->'default_report_days') <> 'number'
        OR jsonb_typeof(value->'leaderboard_limit') <> 'number'
      )
    ) = 0,
    format('existing PORTAL_SETTINGS rows=%s; incompatible rows=%s',
      count(*) FILTER (WHERE key = 'PORTAL_SETTINGS'),
      count(*) FILTER (WHERE key = 'PORTAL_SETTINGS' AND (
        jsonb_typeof(value) <> 'object'
        OR NOT value ?& ARRAY['organization_name', 'support_email', 'dashboard_message', 'default_report_days', 'leaderboard_limit']
        OR jsonb_typeof(value->'organization_name') <> 'string'
        OR jsonb_typeof(value->'default_report_days') <> 'number'
        OR jsonb_typeof(value->'leaderboard_limit') <> 'number'
      )))
  FROM public.app_settings

  UNION ALL
  SELECT 60, 'direct_member_updates_revoked',
    NOT has_table_privilege('authenticated', 'public.members', 'UPDATE'),
    'authenticated sessions must not directly update registry rows'

  UNION ALL
  SELECT 70, 'security_helpers_present', count(*) = 4,
    format('found %s of 4 required member/admin helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE (namespace.nspname, procedure.proname) IN (
    ('private', 'current_member_id'), ('private', 'require_active_admin'),
    ('public', 'current_member_id'), ('public', 'is_admin')
  )

  UNION ALL
  SELECT 80, 'active_linked_admin_exists', count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE role = 'ADMIN' AND member_status = 'ACTIVE' AND auth_id IS NOT NULL
)
SELECT check_name, passed, details FROM checks ORDER BY sort_order;
