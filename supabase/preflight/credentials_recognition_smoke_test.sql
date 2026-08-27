-- Transactional hosted smoke test for Phase 7 credentials and recognition.
--
-- This creates rollback-only confirmed attendance, exercises badge award and
-- revocation, prepares a two-recipient certificate batch, verifies Storage
-- evidence before finalization, exercises fail/retry/revoke, checks public
-- verification, audit/history, and direct-write denial, then rolls everything back.

BEGIN;

INSERT INTO public.events(
  id, title, description, location, luma_url, status, event_type,
  start_at, end_at
) VALUES (
  'a1170000-0000-4000-8000-000000000001',
  'Phase 7 Transactional Smoke Event',
  'Rollback-only credentials fixture',
  'Holy Angel University',
  'https://lu.ma/phase-7-transactional-smoke',
  'COMPLETED',
  'Smoke Test',
  pg_catalog.now() - INTERVAL '2 hours',
  pg_catalog.now() - INTERVAL '1 hour'
);

DO $seed_attendance$
DECLARE
  admin_member_id UUID;
  second_member_id UUID;
BEGIN
  SELECT id INTO admin_member_id
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND role = 'ADMIN'
    AND auth_id IS NOT NULL
  ORDER BY created_at, id
  LIMIT 1;

  SELECT id INTO second_member_id
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND id <> admin_member_id
  ORDER BY created_at, id
  LIMIT 1;

  IF admin_member_id IS NULL OR second_member_id IS NULL THEN
    RAISE EXCEPTION 'A linked active administrator and second active member are required';
  END IF;

  INSERT INTO public.event_attendance(
    id, event_id, member_id, status, attendance_source, registered_at,
    checked_in_at, checked_in_by, confirmed_at, confirmed_by,
    confirmation_note, award_points
  ) VALUES
  (
    'a1170000-0000-4000-8000-000000000002',
    'a1170000-0000-4000-8000-000000000001',
    admin_member_id,
    'CONFIRMED', 'MANUAL', pg_catalog.now(), pg_catalog.now(),
    admin_member_id, pg_catalog.now(), admin_member_id,
    'Phase 7 smoke fixture', 0
  ),
  (
    'a1170000-0000-4000-8000-000000000003',
    'a1170000-0000-4000-8000-000000000001',
    second_member_id,
    'CONFIRMED', 'MANUAL', pg_catalog.now(), pg_catalog.now(),
    admin_member_id, pg_catalog.now(), admin_member_id,
    'Phase 7 smoke fixture', 0
  );
END
$seed_attendance$;

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

SET LOCAL ROLE authenticated;

DO $credential_operations$
DECLARE
  smoke_event_id CONSTANT UUID := 'a1170000-0000-4000-8000-000000000001';
  manual_award_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000010';
  manual_revoke_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000011';
  event_batch_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000012';
  certificate_batch_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000013';
  actor_member_id UUID := public.current_member_id();
  manual_badge public.badges;
  event_badge public.badges;
  manual_award public.member_badges;
  retried_award public.member_badges;
  revoked_award public.member_badges;
  retried_revocation public.member_badges;
  event_batch public.badge_award_batches;
  retried_event_batch public.badge_award_batches;
  certificate_batch public.certificate_issuance_batches;
  retried_certificate_batch public.certificate_issuance_batches;
  direct_write_rejected BOOLEAN := FALSE;
BEGIN
  IF actor_member_id IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required';
  END IF;

  SELECT * INTO manual_badge
  FROM public.create_recognition_badge(
    'phase-7-manual-smoke',
    'Phase 7 Manual Smoke Badge',
    'Rollback-only manual recognition fixture',
    NULL,
    TRUE
  );
  SELECT * INTO event_badge
  FROM public.create_recognition_badge(
    'phase-7-event-smoke',
    'Phase 7 Event Smoke Badge',
    'Rollback-only attendance recognition fixture',
    NULL,
    TRUE
  );

  SELECT * INTO manual_award
  FROM public.award_recognition_badge(
    actor_member_id, manual_badge.id,
    'Phase 7 manual award smoke test', manual_award_key
  );
  SELECT * INTO retried_award
  FROM public.award_recognition_badge(
    actor_member_id, manual_badge.id,
    'Phase 7 manual award smoke test', manual_award_key
  );
  IF manual_award.id <> retried_award.id THEN
    RAISE EXCEPTION 'Manual badge retry created a second award';
  END IF;

  SELECT * INTO revoked_award
  FROM public.revoke_recognition_badge(
    manual_award.id, 'Phase 7 revocation smoke test', manual_revoke_key
  );
  SELECT * INTO retried_revocation
  FROM public.revoke_recognition_badge(
    manual_award.id, 'Phase 7 revocation smoke test', manual_revoke_key
  );
  IF revoked_award.id <> retried_revocation.id
     OR revoked_award.status <> 'REVOKED' THEN
    RAISE EXCEPTION 'Badge revocation was not idempotent';
  END IF;

  SELECT * INTO event_batch
  FROM public.award_event_recognition_badge(
    smoke_event_id, event_badge.id,
    'Confirmed attendance badge smoke test', event_batch_key
  );
  SELECT * INTO retried_event_batch
  FROM public.award_event_recognition_badge(
    smoke_event_id, event_badge.id,
    'Confirmed attendance badge smoke test', event_batch_key
  );
  IF event_batch.id <> retried_event_batch.id
     OR event_batch.eligible_count <> 2
     OR event_batch.awarded_count <> 2 THEN
    RAISE EXCEPTION 'Event badge batch was not correct and idempotent';
  END IF;

  SELECT * INTO certificate_batch
  FROM public.prepare_event_certificate_batch(
    smoke_event_id,
    'Phase 7 Certificate of Participation',
    'axis-placeholder-v1',
    certificate_batch_key
  );
  SELECT * INTO retried_certificate_batch
  FROM public.prepare_event_certificate_batch(
    smoke_event_id,
    'Phase 7 Certificate of Participation',
    'axis-placeholder-v1',
    certificate_batch_key
  );
  IF certificate_batch.id <> retried_certificate_batch.id
     OR certificate_batch.eligible_count <> 2
     OR certificate_batch.prepared_count <> 2 THEN
    RAISE EXCEPTION 'Certificate batch was not correct and idempotent';
  END IF;

  BEGIN
    INSERT INTO public.badges(slug, name)
    VALUES ('phase-7-forbidden-write', 'Forbidden direct write');
  EXCEPTION
    WHEN insufficient_privilege THEN direct_write_rejected := TRUE;
  END;
  IF NOT direct_write_rejected THEN
    RAISE EXCEPTION 'Authenticated direct badge insertion was allowed';
  END IF;
END
$credential_operations$;

RESET ROLE;

-- Create rollback-only Storage metadata for exactly one PDF. The finalization
-- function must reject any path that is not backed by this private object row.
INSERT INTO storage.objects(bucket_id, name, metadata)
SELECT
  'certificates',
  certificate.event_id::TEXT || '/' || certificate.certificate_number || '.pdf',
  jsonb_build_object('mimetype', 'application/pdf', 'size', 1)
FROM public.certificates AS certificate
JOIN public.members AS member ON member.id = certificate.member_id
WHERE certificate.event_id = 'a1170000-0000-4000-8000-000000000001'
  AND member.role = 'ADMIN';

SET LOCAL ROLE authenticated;

DO $certificate_operations$
DECLARE
  smoke_event_id CONSTANT UUID := 'a1170000-0000-4000-8000-000000000001';
  finalize_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000020';
  fail_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000021';
  retry_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000022';
  fail_again_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000023';
  revoke_key CONSTANT UUID := 'a1170000-0000-4000-8000-000000000024';
  actor_member_id UUID := public.current_member_id();
  issued_certificate public.certificates;
  second_certificate public.certificates;
  retried_issue public.certificates;
  verification RECORD;
  batch_row public.certificate_issuance_batches;
  missing_object_rejected BOOLEAN := FALSE;
  direct_write_rejected BOOLEAN := FALSE;
  audit_count INTEGER;
BEGIN
  SELECT certificate.* INTO issued_certificate
  FROM public.certificates AS certificate
  JOIN public.members AS member ON member.id = certificate.member_id
  WHERE certificate.event_id = smoke_event_id AND member.role = 'ADMIN';

  SELECT certificate.* INTO second_certificate
  FROM public.certificates AS certificate
  WHERE certificate.event_id = smoke_event_id
    AND certificate.id <> issued_certificate.id;

  BEGIN
    PERFORM public.finalize_event_certificate(
      second_certificate.id,
      second_certificate.event_id::TEXT || '/'
        || second_certificate.certificate_number || '.pdf',
      gen_random_uuid()
    );
  EXCEPTION
    WHEN no_data_found THEN missing_object_rejected := TRUE;
  END;
  IF NOT missing_object_rejected THEN
    RAISE EXCEPTION 'Certificate finalization did not require Storage evidence';
  END IF;

  SELECT * INTO issued_certificate
  FROM public.finalize_event_certificate(
    issued_certificate.id,
    issued_certificate.event_id::TEXT || '/'
      || issued_certificate.certificate_number || '.pdf',
    finalize_key
  );
  SELECT * INTO retried_issue
  FROM public.finalize_event_certificate(
    issued_certificate.id,
    issued_certificate.storage_path,
    finalize_key
  );
  IF issued_certificate.id <> retried_issue.id
     OR issued_certificate.status <> 'ISSUED' THEN
    RAISE EXCEPTION 'Certificate finalization was not idempotent';
  END IF;

  SELECT * INTO second_certificate
  FROM public.fail_event_certificate(
    second_certificate.id, 'Phase 7 generation failure smoke test', fail_key
  );
  SELECT * INTO second_certificate
  FROM public.retry_event_certificate(second_certificate.id, retry_key);
  SELECT * INTO second_certificate
  FROM public.fail_event_certificate(
    second_certificate.id, 'Phase 7 repeated generation failure smoke test',
    fail_again_key
  );
  IF second_certificate.status <> 'FAILED' THEN
    RAISE EXCEPTION 'Certificate fail and retry lifecycle was incorrect';
  END IF;

  SELECT * INTO verification
  FROM public.get_public_certificate_verification(
    issued_certificate.certificate_number
  );
  IF verification.certificate_status <> 'ISSUED'
     OR verification.member_full_name IS NULL
     OR verification.member_gdg_id IS NULL THEN
    RAISE EXCEPTION 'Public certificate verification was incomplete';
  END IF;

  SELECT * INTO issued_certificate
  FROM public.revoke_event_certificate(
    issued_certificate.id, 'Phase 7 certificate revocation smoke test',
    revoke_key
  );
  SELECT * INTO verification
  FROM public.get_public_certificate_verification(
    issued_certificate.certificate_number
  );
  IF issued_certificate.status <> 'REVOKED'
     OR verification.certificate_status <> 'REVOKED' THEN
    RAISE EXCEPTION 'Revoked certificate was not reported accurately';
  END IF;

  SELECT * INTO batch_row
  FROM public.certificate_issuance_batches
  WHERE event_id = smoke_event_id;
  IF batch_row.status <> 'PARTIAL'
     OR batch_row.issued_count <> 1
     OR batch_row.failed_count <> 1 THEN
    RAISE EXCEPTION 'Certificate batch progress was not reconciled';
  END IF;

  SELECT count(*) INTO audit_count
  FROM public.audit_logs
  WHERE entity_id IN (
    SELECT id::TEXT FROM public.certificates WHERE event_id = smoke_event_id
  )
    AND action IN (
      'CERTIFICATE_ISSUED', 'CERTIFICATE_GENERATION_FAILED',
      'CERTIFICATE_GENERATION_RETRIED', 'CERTIFICATE_REVOKED'
    );
  IF audit_count <> 5 THEN
    RAISE EXCEPTION 'Expected five certificate audit rows, found %', audit_count;
  END IF;

  BEGIN
    UPDATE public.certificates SET title = 'Forbidden rewrite'
    WHERE id = issued_certificate.id;
  EXCEPTION
    WHEN insufficient_privilege THEN direct_write_rejected := TRUE;
  END;
  IF NOT direct_write_rejected THEN
    RAISE EXCEPTION 'Authenticated direct certificate update was allowed';
  END IF;
END
$certificate_operations$;

ROLLBACK;

SELECT
  'credentials_recognition_transactional_smoke_test'::TEXT AS check_name,
  NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = 'a1170000-0000-4000-8000-000000000001'
  ) AS passed,
  'badge catalog, manual and event awards, idempotency, revocation, certificate preparation, Storage evidence, finalize/fail/retry/revoke, public verification, audit, history, and write-denial assertions passed; fixtures rolled back'::TEXT AS details;
