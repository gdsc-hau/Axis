-- Transactional production smoke test for registry-owned member names.
-- It temporarily reopens the first linked active administrator's profile,
-- rejects a forged name, completes the profile with the registry name, and
-- rolls every fixture change back.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT auth_id::TEXT
      FROM public.members
     WHERE member_status = 'ACTIVE'
       AND role = 'ADMIN'
       AND auth_id IS NOT NULL
     ORDER BY created_at, id
     LIMIT 1
  ),
  TRUE
);

UPDATE public.members
   SET profile_completed_at = NULL
 WHERE auth_id = current_setting('request.jwt.claim.sub')::UUID;

SET LOCAL ROLE authenticated;

DO $axis_smoke$
DECLARE
  actor_member_id UUID := public.current_member_id();
  original_name TEXT;
  completed_member public.members;
  audit_count_before INTEGER;
  audit_count_after INTEGER;
  latest_audit_metadata JSONB;
  mismatched_name_rejected BOOLEAN := FALSE;
  direct_update_rejected BOOLEAN := FALSE;
BEGIN
  IF actor_member_id IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required for this smoke test';
  END IF;

  SELECT full_name
    INTO original_name
    FROM public.members
   WHERE id = actor_member_id;

  SELECT count(*)
    INTO audit_count_before
    FROM public.audit_logs
   WHERE actor_id = actor_member_id
     AND action = 'MEMBER_PROFILE_COMPLETED';

  BEGIN
    PERFORM public.complete_current_member_profile(
      original_name || ' forged',
      'Registry-name lock smoke test',
      jsonb_build_object('github', 'https://github.com/example')
    );
  EXCEPTION
    WHEN insufficient_privilege THEN mismatched_name_rejected := TRUE;
  END;

  IF NOT mismatched_name_rejected THEN
    RAISE EXCEPTION 'A forged profile name was accepted';
  END IF;
  IF (
    SELECT profile_completed_at IS NOT NULL
      FROM public.members
     WHERE id = actor_member_id
  ) THEN
    RAISE EXCEPTION 'The rejected profile submission changed completion state';
  END IF;

  BEGIN
    UPDATE public.members
       SET full_name = original_name || ' direct-write'
     WHERE id = actor_member_id;
  EXCEPTION
    WHEN insufficient_privilege THEN direct_update_rejected := TRUE;
  END;

  IF NOT direct_update_rejected THEN
    RAISE EXCEPTION 'An authenticated direct registry-name update was allowed';
  END IF;

  PERFORM public.complete_current_member_profile(
    original_name,
    'Registry-name lock smoke test',
    jsonb_build_object('github', 'https://github.com/example')
  );

  SELECT *
    INTO completed_member
    FROM public.members
   WHERE id = actor_member_id;

  IF completed_member.full_name IS DISTINCT FROM original_name THEN
    RAISE EXCEPTION 'Profile completion changed the registry-owned name';
  END IF;
  IF completed_member.bio <> 'Registry-name lock smoke test'
     OR completed_member.links <> jsonb_build_object(
       'github', 'https://github.com/example'
     )
     OR completed_member.profile_completed_at IS NULL THEN
    RAISE EXCEPTION 'Profile completion did not save the editable fields';
  END IF;

  SELECT count(*)
    INTO audit_count_after
    FROM public.audit_logs
   WHERE actor_id = actor_member_id
     AND action = 'MEMBER_PROFILE_COMPLETED';

  IF audit_count_after <> audit_count_before + 1 THEN
    RAISE EXCEPTION 'Expected one profile-completion audit entry';
  END IF;

  SELECT metadata
    INTO latest_audit_metadata
    FROM public.audit_logs
   WHERE actor_id = actor_member_id
     AND action = 'MEMBER_PROFILE_COMPLETED'
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF latest_audit_metadata->'fields' ? 'full_name'
     OR latest_audit_metadata->>'registry_full_name_preserved' <> 'true' THEN
    RAISE EXCEPTION 'The profile audit incorrectly reports a name update';
  END IF;
END
$axis_smoke$;

ROLLBACK;

SELECT
  'profile_registry_name_lock_transactional_smoke_test'::TEXT AS check_name,
  TRUE AS passed,
  'forged name, direct update, editable profile fields, audit metadata, and rollback assertions passed'::TEXT
    AS details;
