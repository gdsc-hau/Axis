-- Transactional hosted smoke test for Phase 6 attendance.
--
-- This creates a rollback-only event, impersonates the first linked active
-- administrator, imports a synthetic Luma snapshot, records a manual check-in,
-- confirms and awards attendance, reverses that award through a correction,
-- checks idempotency/audits/write denial, and rolls every fixture back.

BEGIN;

INSERT INTO public.events(
  id,
  title,
  description,
  location,
  luma_url,
  status,
  event_type,
  start_at,
  end_at
) VALUES (
  'a1160000-0000-4000-8000-000000000001',
  'Phase 6 Transactional Smoke Event',
  'Rollback-only attendance fixture',
  'Holy Angel University',
  'https://lu.ma/phase-6-transactional-smoke',
  'COMPLETED',
  'Smoke Test',
  pg_catalog.now() - INTERVAL '2 hours',
  pg_catalog.now() - INTERVAL '1 hour'
);

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

DO $axis_smoke$
DECLARE
  smoke_event_id CONSTANT UUID := 'a1160000-0000-4000-8000-000000000001';
  import_key CONSTANT UUID := 'a1160000-0000-4000-8000-000000000002';
  confirm_key CONSTANT UUID := 'a1160000-0000-4000-8000-000000000003';
  correction_key CONSTANT UUID := 'a1160000-0000-4000-8000-000000000004';
  manual_key CONSTANT UUID := 'a1160000-0000-4000-8000-000000000005';
  file_hash CONSTANT TEXT :=
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  actor_member_id UUID := public.current_member_id();
  second_member_id UUID;
  actor_email TEXT;
  import_summary JSONB;
  retried_import JSONB;
  imported_attendance public.event_attendance;
  confirmed_attendance public.event_attendance;
  retried_confirmation public.event_attendance;
  corrected_attendance public.event_attendance;
  retried_correction public.event_attendance;
  manual_attendance public.event_attendance;
  base_balance INTEGER;
  direct_write_rejected BOOLEAN := FALSE;
  history_count INTEGER;
  audit_count INTEGER;
BEGIN
  IF actor_member_id IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required for this smoke test';
  END IF;

  SELECT email INTO actor_email
  FROM public.members
  WHERE id = actor_member_id;

  SELECT id INTO second_member_id
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND id <> actor_member_id
  ORDER BY created_at, id
  LIMIT 1;

  IF second_member_id IS NULL THEN
    RAISE EXCEPTION 'A second active member is required for the manual check-in assertion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_import_batches
    WHERE operation_key = import_key
  ) OR EXISTS (
    SELECT 1
    FROM public.event_attendance_status_history
    WHERE operation_key IN (
      import_key, confirm_key, correction_key, manual_key
    )
  ) THEN
    RAISE EXCEPTION 'Phase 6 smoke-test operation-key residue exists';
  END IF;

  SELECT COALESCE(
    (
      SELECT balance_after
      FROM public.points_ledger
      WHERE member_id = actor_member_id
      ORDER BY ledger_sequence DESC
      LIMIT 1
    ),
    0
  ) INTO base_balance;

  BEGIN
    PERFORM public.set_event_attendance_points(smoke_event_id, 25);

    SELECT * INTO import_summary
    FROM public.import_luma_attendance_csv(
      smoke_event_id,
      'phase-6-smoke-luma.csv',
      file_hash,
      jsonb_build_array(
        jsonb_build_object(
          'row_number', 2,
          'email', actor_email,
          'registration_status', 'CHECKED_IN',
          'registered_at', '2026-08-25T08:00:00+08:00',
          'checked_in_at', '2026-08-25T10:00:00+08:00'
        ),
        jsonb_build_object(
          'row_number', 3,
          'email', 'not-in-members@example.com',
          'registration_status', 'REGISTERED',
          'registered_at', '2026-08-25T08:05:00+08:00',
          'checked_in_at', NULL
        ),
        jsonb_build_object(
          'row_number', 4,
          'email', 'waitlist@example.com',
          'registration_status', 'IGNORED',
          'registered_at', '2026-08-25T08:10:00+08:00',
          'checked_in_at', NULL
        ),
        jsonb_build_object(
          'row_number', 5,
          'email', actor_email,
          'registration_status', 'REGISTERED',
          'registered_at', '2026-08-25T08:00:00+08:00',
          'checked_in_at', NULL
        )
      ),
      import_key
    );

    SELECT * INTO retried_import
    FROM public.import_luma_attendance_csv(
      smoke_event_id,
      'phase-6-smoke-luma.csv',
      file_hash,
      jsonb_build_array(
        jsonb_build_object(
          'row_number', 2,
          'email', actor_email,
          'registration_status', 'CHECKED_IN',
          'registered_at', '2026-08-25T08:00:00+08:00',
          'checked_in_at', '2026-08-25T10:00:00+08:00'
        )
      ),
      import_key
    );

    IF import_summary->>'batch_id' <> retried_import->>'batch_id' THEN
      RAISE EXCEPTION 'Import retry created a second batch';
    END IF;
    IF (import_summary->>'total_rows')::INTEGER <> 4
       OR (import_summary->>'matched_rows')::INTEGER <> 1
       OR (import_summary->>'unmatched_rows')::INTEGER <> 1
       OR (import_summary->>'ignored_rows')::INTEGER <> 1
       OR (import_summary->>'duplicate_rows')::INTEGER <> 1 THEN
      RAISE EXCEPTION 'Luma import classification was incorrect: %', import_summary;
    END IF;

    SELECT * INTO imported_attendance
    FROM public.event_attendance
    WHERE event_id = smoke_event_id
      AND member_id = actor_member_id;

    IF imported_attendance.status <> 'CHECKED_IN'
       OR imported_attendance.attendance_source <> 'LUMA_CSV'
       OR imported_attendance.checked_in_at IS NULL THEN
      RAISE EXCEPTION 'Luma checked-in evidence was not imported correctly';
    END IF;

    SELECT * INTO manual_attendance
    FROM public.record_manual_event_check_in(
      smoke_event_id,
      second_member_id,
      NULL,
      'Phase 6 scanner outage smoke test',
      manual_key
    );

    IF manual_attendance.status <> 'CHECKED_IN'
       OR manual_attendance.attendance_source <> 'MANUAL'
       OR manual_attendance.checked_in_by <> actor_member_id THEN
      RAISE EXCEPTION 'Manual check-in was not recorded correctly';
    END IF;

    SELECT * INTO confirmed_attendance
    FROM public.confirm_event_attendance(
      imported_attendance.id,
      'Phase 6 smoke confirmation',
      confirm_key
    );
    SELECT * INTO retried_confirmation
    FROM public.confirm_event_attendance(
      imported_attendance.id,
      'Phase 6 smoke confirmation',
      confirm_key
    );

    IF retried_confirmation.id <> confirmed_attendance.id
       OR confirmed_attendance.status <> 'CONFIRMED'
       OR confirmed_attendance.award_points <> 25
       OR confirmed_attendance.award_ledger_id IS NULL THEN
      RAISE EXCEPTION 'Attendance confirmation or retry was incorrect';
    END IF;
    IF (
      SELECT balance_after
      FROM public.points_ledger
      WHERE id = confirmed_attendance.award_ledger_id
    ) <> base_balance + 25 THEN
      RAISE EXCEPTION 'Attendance award produced an incorrect wallet balance';
    END IF;

    SELECT * INTO corrected_attendance
    FROM public.correct_event_attendance(
      confirmed_attendance.id,
      'NO_SHOW',
      'Phase 6 correction smoke test',
      correction_key
    );
    SELECT * INTO retried_correction
    FROM public.correct_event_attendance(
      confirmed_attendance.id,
      'NO_SHOW',
      'Phase 6 correction smoke test',
      correction_key
    );

    IF retried_correction.id <> corrected_attendance.id
       OR corrected_attendance.status <> 'NO_SHOW'
       OR corrected_attendance.reversal_ledger_id IS NULL THEN
      RAISE EXCEPTION 'Attendance correction or retry was incorrect';
    END IF;
    IF (
      SELECT balance_after
      FROM public.points_ledger
      WHERE id = corrected_attendance.reversal_ledger_id
    ) <> base_balance THEN
      RAISE EXCEPTION 'Attendance correction did not restore the base balance';
    END IF;

    SELECT count(*) INTO history_count
    FROM public.event_attendance_status_history
    WHERE attendance_id IN (
      imported_attendance.id, manual_attendance.id
    );
    IF history_count <> 4 THEN
      RAISE EXCEPTION 'Expected four attendance history rows, found %', history_count;
    END IF;

    SELECT count(*) INTO audit_count
    FROM public.audit_logs
    WHERE entity_id IN (
      smoke_event_id::TEXT,
      import_summary->>'batch_id',
      imported_attendance.id::TEXT,
      manual_attendance.id::TEXT
    )
      AND action IN (
        'EVENT_ATTENDANCE_POINTS_SET',
        'LUMA_ATTENDANCE_CSV_IMPORTED',
        'EVENT_MANUAL_CHECK_IN_RECORDED',
        'EVENT_ATTENDANCE_CONFIRMED',
        'EVENT_ATTENDANCE_CORRECTED'
      );
    IF audit_count <> 5 THEN
      RAISE EXCEPTION 'Expected five attendance audit rows, found %', audit_count;
    END IF;

    BEGIN
      INSERT INTO public.event_attendance(event_id, member_id, registered_at)
      VALUES (smoke_event_id, actor_member_id, pg_catalog.now());
    EXCEPTION
      WHEN insufficient_privilege THEN direct_write_rejected := TRUE;
    END;
    IF NOT direct_write_rejected THEN
      RAISE EXCEPTION 'Authenticated direct attendance insertion was allowed';
    END IF;

    RAISE EXCEPTION 'axis_attendance_smoke_rollback' USING ERRCODE = 'ZX006';
  EXCEPTION
    WHEN SQLSTATE 'ZX006' THEN NULL;
  END;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_import_batches
    WHERE operation_key = import_key
  ) OR EXISTS (
    SELECT 1
    FROM public.event_attendance_status_history
    WHERE operation_key IN (
      confirm_key, correction_key, manual_key
    )
  ) OR EXISTS (
    SELECT 1
    FROM public.points_ledger
    WHERE source_type IN (
      'EVENT_ATTENDANCE', 'EVENT_ATTENDANCE_REVERSAL'
    )
      AND source_id = imported_attendance.id::TEXT
  ) THEN
    RAISE EXCEPTION 'Attendance smoke-test subtransaction left database residue';
  END IF;
END
$axis_smoke$;

ROLLBACK;

SELECT
  'event_attendance_luma_csv_transactional_smoke_test'::TEXT AS check_name,
  NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = 'a1160000-0000-4000-8000-000000000001'
  ) AS passed,
  'Luma import, privacy-safe classification, manual check-in, confirmation, idempotent award, correction reversal, history, audit, and write-denial assertions passed; fixtures rolled back'::TEXT
    AS details;
