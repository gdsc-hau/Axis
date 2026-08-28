-- Run in the hosted Supabase SQL Editor after pushing Phase 11.
WITH checks AS (
  SELECT 10 AS sort_order, 'migration_recorded'::TEXT AS check_name,
    EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260826160000') AS passed,
    'the Phase 11 member portal migration must exist in remote history'::TEXT AS details

  UNION ALL
  SELECT 20, 'member_profile_history_present',
    to_regclass('public.member_profile_revisions') IS NOT NULL,
    'immutable member profile revisions must exist'

  UNION ALL
  SELECT 30, 'settings_history_present',
    to_regclass('public.app_setting_revisions') IS NOT NULL,
    'immutable portal-setting revisions must exist'

  UNION ALL
  SELECT 40, 'phase_columns_present', count(*) = 5,
    format('found %s of 5 Phase 11 columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'members' AND column_name = 'profile_version')
      OR (table_name = 'app_settings' AND column_name IN ('version', 'updated_by'))
      OR (table_name = 'member_profile_revisions' AND column_name IN ('revision_number', 'operation_key')))

  UNION ALL
  SELECT 50, 'portal_settings_seeded', count(*) = 1,
    format('found %s PORTAL_SETTINGS rows', count(*))
  FROM public.app_settings WHERE key = 'PORTAL_SETTINGS'

  UNION ALL
  SELECT 60, 'phase_constraints_validated', count(*) = 11,
    format('found %s of 11 validated Phase 11 constraints', count(*))
  FROM pg_constraint AS constraint_record
  JOIN pg_class AS relation ON relation.oid = constraint_record.conrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public' AND constraint_record.convalidated
    AND constraint_record.conname IN (
      'members_profile_version_check', 'app_settings_version_check',
      'member_profile_revisions_revision_check', 'member_profile_revisions_bio_check',
      'member_profile_revisions_phone_check', 'member_profile_revisions_links_check',
      'member_profile_revisions_reason_check', 'member_profile_revisions_member_revision_key',
      'app_setting_revisions_key_check', 'app_setting_revisions_versions_check',
      'app_setting_revisions_reason_check'
    )

  UNION ALL
  SELECT 70, 'phase_read_policies_present', count(*) = 3,
    format('found %s of 3 Phase 11 read policies', count(*))
  FROM pg_policies WHERE schemaname = 'public'
    AND policyname IN ('app_settings_admin_read', 'member_profile_revisions_authorized_read', 'app_setting_revisions_admin_read')

  UNION ALL
  SELECT 80, 'direct_phase_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.members', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.app_settings', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.member_profile_revisions', 'INSERT')
    AND NOT has_table_privilege('service_role', 'public.app_setting_revisions', 'INSERT'),
    'all profile and settings mutations must use audited functions'

  UNION ALL
  SELECT 90, 'private_operations_hardened', count(*) = 5,
    format('found %s of 5 hardened private operation helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname IN ('update_current_member_profile', 'complete_current_member_profile', 'get_portal_settings', 'update_portal_settings', 'get_current_member_dashboard_summary')
    AND procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL
  SELECT 100, 'public_operations_security_invoker', count(*) = 4,
    format('found %s of 4 security-invoker public operation RPCs', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN ('update_current_member_profile', 'get_portal_settings', 'update_portal_settings', 'get_current_member_dashboard_summary')
    AND NOT procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL
  SELECT 110, 'operation_execution_restricted',
    has_function_privilege('authenticated', 'public.update_current_member_profile(integer,text,text,jsonb,text,uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.update_portal_settings(integer,text,text,text,integer,integer,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.update_current_member_profile(integer,text,text,jsonb,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_portal_settings()', 'EXECUTE'),
    'profile and settings operations require authenticated sessions'

  UNION ALL
  SELECT 120, 'profile_history_complete', count(*) FILTER (
      WHERE member.profile_completed_at IS NOT NULL AND revision.member_id IS NULL
    ) = 0,
    format('completed profiles=%s; missing baselines=%s',
      count(*) FILTER (WHERE member.profile_completed_at IS NOT NULL),
      count(*) FILTER (WHERE member.profile_completed_at IS NOT NULL AND revision.member_id IS NULL))
  FROM public.members AS member
  LEFT JOIN public.member_profile_revisions AS revision
    ON revision.member_id = member.id AND revision.revision_number = member.profile_version
)
SELECT check_name, passed, details FROM checks ORDER BY sort_order;
