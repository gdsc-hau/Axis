-- Read-only hosted verification for
-- 20260825170545_credentials_recognition.sql.

WITH private_functions AS (
  SELECT function_record.*
  FROM pg_proc AS function_record
  JOIN pg_namespace AS function_schema
    ON function_schema.oid = function_record.pronamespace
  WHERE function_schema.nspname = 'private'
    AND function_record.proname IN (
      'create_recognition_badge', 'update_recognition_badge',
      'award_recognition_badge', 'revoke_recognition_badge',
      'award_event_recognition_badge', 'refresh_certificate_batch',
      'prepare_event_certificate_batch', 'finalize_event_certificate',
      'fail_event_certificate', 'retry_event_certificate',
      'revoke_event_certificate', 'get_public_certificate_verification'
    )
),
public_functions AS (
  SELECT function_record.*
  FROM pg_proc AS function_record
  JOIN pg_namespace AS function_schema
    ON function_schema.oid = function_record.pronamespace
  WHERE function_schema.nspname = 'public'
    AND function_record.proname IN (
      'create_recognition_badge', 'update_recognition_badge',
      'award_recognition_badge', 'revoke_recognition_badge',
      'award_event_recognition_badge', 'prepare_event_certificate_batch',
      'finalize_event_certificate', 'fail_event_certificate',
      'retry_event_certificate', 'revoke_event_certificate',
      'get_public_certificate_verification'
    )
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260825170545'
    ) AS passed,
    'the Phase 7 credentials and recognition migration must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'credential_tables_present',
    count(*) = 4,
    format('found %s of 4 Phase 7 history and batch tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'badge_award_batches', 'badge_award_status_history',
      'certificate_issuance_batches', 'certificate_status_history'
    )

  UNION ALL

  SELECT
    30,
    'badge_columns_present',
    count(*) = 25,
    format('found %s of 25 hardened badge and award columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'badges' AND column_name IN (
        'id', 'slug', 'name', 'description', 'icon_url', 'active',
        'created_by', 'created_at', 'updated_at'
      ))
      OR
      (table_name = 'member_badges' AND column_name IN (
        'id', 'member_id', 'badge_id', 'earned_at', 'status', 'source',
        'event_id', 'attendance_id', 'reason', 'awarded_by', 'operation_key',
        'revoked_at', 'revoked_by', 'revocation_reason', 'created_at', 'updated_at'
      ))
    )

  UNION ALL

  SELECT
    40,
    'certificate_columns_present',
    count(*) = 19
      AND count(*) FILTER (WHERE column_name = 'pdf_url') = 0,
    format(
      'certificate columns=%s; legacy public-url columns=%s',
      count(*), count(*) FILTER (WHERE column_name = 'pdf_url')
    )
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'certificates'

  UNION ALL

  SELECT
    50,
    'credential_constraints_validated',
    count(*) = 21 AND bool_and(convalidated),
    format('found %s of 21 critical validated credential constraints', count(*))
  FROM pg_constraint
  WHERE conname IN (
    'badges_slug_format_check', 'badges_name_check', 'badges_icon_url_check',
    'member_badges_status_check', 'member_badges_source_check',
    'member_badges_source_links_check', 'member_badges_revocation_check',
    'member_badges_operation_key_key',
    'badge_award_batches_operation_key_key',
    'badge_award_status_history_operation_key_key',
    'certificate_issuance_batches_operation_key_key',
    'certificate_batches_status_check', 'certificate_batches_counts_check',
    'certificates_attendance_key', 'certificates_request_operation_key_key',
    'certificates_number_check', 'certificates_status_check',
    'certificates_storage_path_check', 'certificates_state_metadata_check',
    'certificate_status_history_operation_key_key',
    'certificate_history_transition_check'
  )

  UNION ALL

  SELECT
    60,
    'credential_indexes_present',
    count(*) = 10,
    format('found %s of 10 credential query indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'member_badges_member_timeline_idx', 'member_badges_event_idx',
      'member_badges_attendance_idx', 'badge_award_batches_event_idx',
      'badge_award_history_award_timeline_idx',
      'certificate_batches_event_idx', 'certificates_member_timeline_idx',
      'certificates_event_idx', 'certificates_batch_idx',
      'certificate_history_certificate_timeline_idx'
    )

  UNION ALL

  SELECT
    70,
    'credential_read_policies_present',
    count(*) = 8,
    format('found %s of 8 required credential read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'badges_public_read', 'badges_authenticated_read',
      'member_badges_authorized_read', 'certificates_authorized_read',
      'badge_award_batches_admin_read',
      'badge_award_history_authorized_read',
      'certificate_batches_admin_read',
      'certificate_history_authorized_read'
    )
    AND cmd = 'SELECT'

  UNION ALL

  SELECT
    80,
    'credential_write_policies_absent',
    count(*) = 0,
    format('found %s direct credential write policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'badges', 'member_badges', 'badge_award_batches',
      'badge_award_status_history', 'certificates',
      'certificate_issuance_batches', 'certificate_status_history'
    )
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')

  UNION ALL

  SELECT
    90,
    'direct_credential_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.badges', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.badges', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.member_badges', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.certificates', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.certificates', 'INSERT')
      AND NOT has_table_privilege(
        'authenticated', 'public.certificate_status_history', 'INSERT'
      ),
    'browser and service roles must use audited credential functions for writes'

  UNION ALL

  SELECT
    100,
    'private_credential_helpers_hardened',
    count(*) = 12
      AND bool_and(prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 12 hardened private credential helpers', count(*))
  FROM private_functions

  UNION ALL

  SELECT
    110,
    'public_credential_rpcs_security_invoker',
    count(*) = 11
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 11 security-invoker public credential RPCs', count(*))
  FROM public_functions

  UNION ALL

  SELECT
    120,
    'credential_rpc_execution_restricted',
    has_function_privilege(
      'authenticated',
      'public.award_recognition_badge(uuid,uuid,text,uuid)', 'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated',
        'public.prepare_event_certificate_batch(uuid,text,text,uuid)', 'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.finalize_event_certificate(uuid,text,uuid)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.award_recognition_badge(uuid,uuid,text,uuid)', 'EXECUTE'
      )
      AND has_function_privilege(
        'anon', 'public.get_public_certificate_verification(text)', 'EXECUTE'
      ),
    'credential mutation requires authentication; public verification alone allows anonymous execution'

  UNION ALL

  SELECT
    130,
    'certificate_bucket_private',
    count(*) = 1
      AND bool_and(public IS FALSE)
      AND bool_and(file_size_limit = 10485760)
      AND bool_and(allowed_mime_types = ARRAY['application/pdf']::TEXT[]),
    format('found %s correctly configured private certificate buckets', count(*))
  FROM storage.buckets
  WHERE id = 'certificates'

  UNION ALL

  SELECT
    140,
    'credential_source_links_valid',
    count(*) FILTER (
      WHERE
        (award.source = 'EVENT_ATTENDANCE' AND (
          attendance.id IS NULL
          OR attendance.event_id <> award.event_id
          OR attendance.member_id <> award.member_id
          OR attendance.status <> 'CONFIRMED'
        ))
    ) = 0,
    format(
      'badge awards=%s; invalid attendance-backed awards=%s',
      count(*),
      count(*) FILTER (
        WHERE
          (award.source = 'EVENT_ATTENDANCE' AND (
            attendance.id IS NULL
            OR attendance.event_id <> award.event_id
            OR attendance.member_id <> award.member_id
            OR attendance.status <> 'CONFIRMED'
          ))
      )
    )
  FROM public.member_badges AS award
  LEFT JOIN public.event_attendance AS attendance
    ON attendance.id = award.attendance_id

  UNION ALL

  SELECT
    150,
    'certificate_attendance_links_valid',
    count(*) FILTER (
      WHERE attendance.id IS NULL
        OR attendance.event_id <> certificate.event_id
        OR attendance.member_id <> certificate.member_id
        OR attendance.status <> 'CONFIRMED'
    ) = 0,
    format(
      'certificates=%s; invalid confirmed-attendance links=%s',
      count(*),
      count(*) FILTER (
        WHERE attendance.id IS NULL
          OR attendance.event_id <> certificate.event_id
          OR attendance.member_id <> certificate.member_id
          OR attendance.status <> 'CONFIRMED'
      )
    )
  FROM public.certificates AS certificate
  LEFT JOIN public.event_attendance AS attendance
    ON attendance.id = certificate.attendance_id

  UNION ALL

  SELECT
    160,
    'credential_histories_complete',
    NOT EXISTS (
      SELECT 1 FROM public.member_badges AS award
      WHERE NOT EXISTS (
        SELECT 1 FROM public.badge_award_status_history AS history
        WHERE history.member_badge_id = award.id
      )
    )
      AND NOT EXISTS (
        SELECT 1 FROM public.certificates AS certificate
        WHERE NOT EXISTS (
          SELECT 1 FROM public.certificate_status_history AS history
          WHERE history.certificate_id = certificate.id
        )
      ),
    'every badge award and certificate must have immutable lifecycle history'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
