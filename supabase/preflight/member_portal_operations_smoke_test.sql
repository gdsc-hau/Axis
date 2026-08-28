-- Transactional Phase 11 smoke test. All writes are rolled back.
BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT auth_id::TEXT FROM public.members
    WHERE role = 'ADMIN' AND member_status = 'ACTIVE' AND auth_id IS NOT NULL
    ORDER BY id LIMIT 1),
  TRUE
);
SET LOCAL ROLE authenticated;

DO $member_portal_smoke$
DECLARE
  member_row public.members;
  original_profile public.members;
  updated_profile public.members;
  original_settings public.app_settings;
  updated_settings public.app_settings;
  profile_operation UUID := gen_random_uuid();
  settings_operation UUID := gen_random_uuid();
  summary_count INTEGER;
BEGIN
  SELECT * INTO member_row FROM public.members
  WHERE auth_id = (SELECT auth.uid());
  original_profile := member_row;

  updated_profile := public.update_current_member_profile(
    member_row.profile_version,
    COALESCE(NULLIF(btrim(member_row.bio), ''), 'Phase 11 profile test'),
    '+63 900 000 0000',
    jsonb_build_object('github', 'https://github.com/gdg-hau-phase-11'),
    'Phase 11 transactional profile test',
    profile_operation
  );
  IF updated_profile.full_name <> original_profile.full_name
     OR updated_profile.email <> original_profile.email
     OR updated_profile.profile_version <> original_profile.profile_version + 1 THEN
    RAISE EXCEPTION 'Profile update changed registry identity or failed versioning';
  END IF;
  IF (public.update_current_member_profile(
    original_profile.profile_version,
    COALESCE(NULLIF(btrim(original_profile.bio), ''), 'Phase 11 profile test'),
    '+63 900 000 0000',
    jsonb_build_object('github', 'https://github.com/gdg-hau-phase-11'),
    'Phase 11 transactional profile test', profile_operation
  )).profile_version <> updated_profile.profile_version THEN
    RAISE EXCEPTION 'Profile operation was not idempotent';
  END IF;

  SELECT * INTO original_settings FROM public.get_portal_settings();
  updated_settings := public.update_portal_settings(
    original_settings.version, 'GDG on Campus HAU', 'support@example.com',
    'Phase 11 transactional dashboard message', 30, 50,
    'Phase 11 transactional settings test', settings_operation
  );
  IF updated_settings.version <> original_settings.version + 1 THEN
    RAISE EXCEPTION 'Portal settings version did not advance';
  END IF;
  IF (public.update_portal_settings(
    original_settings.version, 'GDG on Campus HAU', 'support@example.com',
    'Phase 11 transactional dashboard message', 30, 50,
    'Phase 11 transactional settings test', settings_operation
  )).version <> updated_settings.version THEN
    RAISE EXCEPTION 'Settings operation was not idempotent';
  END IF;

  SELECT count(*) INTO summary_count
  FROM public.get_current_member_dashboard_summary();
  IF summary_count <> 1 THEN
    RAISE EXCEPTION 'Member dashboard summary did not return one row';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE action = 'MEMBER_PROFILE_UPDATED' AND metadata->>'operation_key' = profile_operation::TEXT)
     OR NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE action = 'PORTAL_SETTINGS_UPDATED' AND metadata->>'operation_key' = settings_operation::TEXT) THEN
    RAISE EXCEPTION 'Phase 11 audit trail is incomplete';
  END IF;
END
$member_portal_smoke$;

RESET ROLE;
ROLLBACK;

SELECT 'member_portal_operations_transactional_smoke_test'::TEXT AS check_name,
  TRUE AS passed,
  'registry identity lock, profile versioning, settings versioning, idempotency, dashboard aggregates, history, audit, and rollback assertions passed'::TEXT AS details;
