-- Hosted preflight for Phase 7 credentials and recognition.
-- Run in Supabase SQL Editor before pushing the migration.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'phase_dependencies_deployed'::TEXT AS check_name,
    count(*) = 2 AS passed,
    'Phase 6 attendance and the registry-name lock must already be recorded'::TEXT AS details
  FROM supabase_migrations.schema_migrations
  WHERE version IN ('20260825154838', '20260821182815')

  UNION ALL

  SELECT
    20,
    'credentials_phase_not_partially_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260825170545'
    )
      AND to_regclass('public.badge_award_status_history') IS NULL
      AND to_regclass('public.certificate_issuance_batches') IS NULL
      AND to_regclass('public.certificate_status_history') IS NULL,
    'Phase 7 history and batch tables must not exist outside migration history'

  UNION ALL

  SELECT
    30,
    'credential_baseline_tables_present',
    count(*) = 5,
    format('found %s of 5 required baseline tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'badges', 'member_badges', 'certificates', 'event_attendance', 'events'
    )

  UNION ALL

  SELECT
    40,
    'badge_baseline_columns_present',
    count(*) = 10,
    format('found %s of 10 badge and member-badge baseline columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'badges' AND column_name IN (
        'id', 'slug', 'name', 'description', 'active', 'created_at'
      ))
      OR
      (table_name = 'member_badges' AND column_name IN (
        'id', 'member_id', 'badge_id', 'earned_at'
      ))
    )

  UNION ALL

  SELECT
    50,
    'certificate_baseline_columns_present',
    count(*) = 9,
    format('found %s of 9 certificate baseline columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'certificates'
    AND column_name IN (
      'id', 'member_id', 'event_id', 'title', 'certificate_number',
      'pdf_url', 'status', 'issued_at', 'created_at'
    )

  UNION ALL

  SELECT
    60,
    'badges_valid_for_hardening',
    count(*) FILTER (
      WHERE slug IS NULL
        OR slug <> lower(btrim(slug))
        OR slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        OR char_length(slug) > 80
        OR name IS NULL
        OR name <> btrim(name)
        OR char_length(name) NOT BETWEEN 1 AND 120
        OR active IS NULL
        OR created_at IS NULL
        OR (description IS NOT NULL AND char_length(description) > 1000)
    ) = 0,
    format(
      'badges=%s; invalid rows=%s',
      count(*),
      count(*) FILTER (
        WHERE slug IS NULL
          OR slug <> lower(btrim(slug))
          OR slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
          OR char_length(slug) > 80
          OR name IS NULL
          OR name <> btrim(name)
          OR char_length(name) NOT BETWEEN 1 AND 120
          OR active IS NULL
          OR created_at IS NULL
          OR (description IS NOT NULL AND char_length(description) > 1000)
      )
    )
  FROM public.badges

  UNION ALL

  SELECT
    70,
    'member_badge_rows_resolvable',
    count(*) FILTER (
      WHERE member.id IS NULL OR badge.id IS NULL OR award.earned_at IS NULL
    ) = 0,
    format(
      'member badges=%s; unresolved rows=%s',
      count(*),
      count(*) FILTER (
        WHERE member.id IS NULL OR badge.id IS NULL OR award.earned_at IS NULL
      )
    )
  FROM public.member_badges AS award
  LEFT JOIN public.members AS member ON member.id = award.member_id
  LEFT JOIN public.badges AS badge ON badge.id = award.badge_id

  UNION ALL

  SELECT
    80,
    'certificates_empty',
    count(*) = 0,
    format(
      'certificates=%s; Phase 7 refuses to invent private PDF or attendance links for legacy rows',
      count(*)
    )
  FROM public.certificates

  UNION ALL

  SELECT
    90,
    'legacy_certificates_have_confirmed_attendance',
    count(*) FILTER (
      WHERE attendance.id IS NULL
    ) = 0,
    format(
      'legacy certificates=%s; missing confirmed attendance=%s',
      count(*),
      count(*) FILTER (WHERE attendance.id IS NULL)
    )
  FROM public.certificates AS certificate
  LEFT JOIN public.event_attendance AS attendance
    ON attendance.event_id = certificate.event_id
   AND attendance.member_id = certificate.member_id
   AND attendance.status = 'CONFIRMED'

  UNION ALL

  SELECT
    100,
    'credential_identity_unique',
    NOT EXISTS (
      SELECT 1
      FROM public.badges
      GROUP BY lower(btrim(slug))
      HAVING count(*) > 1
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.member_badges
        GROUP BY member_id, badge_id
        HAVING count(*) > 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.certificates
        GROUP BY certificate_number
        HAVING count(*) > 1
      ),
    'badge slugs, member awards, and certificate numbers must be unique'

  UNION ALL

  SELECT
    110,
    'attendance_contract_present',
    count(*) = 7,
    format('found %s of 7 confirmed-attendance columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'event_attendance'
    AND column_name IN (
      'id', 'event_id', 'member_id', 'status', 'confirmed_at',
      'confirmed_by', 'award_ledger_id'
    )

  UNION ALL

  SELECT
    120,
    'credential_rls_enabled',
    count(*) = 3 AND bool_and(relrowsecurity),
    format('found %s of 3 RLS-enabled credential tables', count(*))
  FROM pg_class
  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  WHERE pg_namespace.nspname = 'public'
    AND pg_class.relname IN ('badges', 'member_badges', 'certificates')

  UNION ALL

  SELECT
    130,
    'certificate_bucket_available',
    NOT EXISTS (
      SELECT 1
      FROM storage.buckets
      WHERE id = 'certificates'
        AND (
          public IS DISTINCT FROM FALSE
          OR (file_size_limit IS NOT NULL AND file_size_limit < 10485760)
          OR (
            allowed_mime_types IS NOT NULL
            AND NOT ('application/pdf' = ANY(allowed_mime_types))
          )
        )
    ),
    'the certificates bucket must be absent or private and PDF-compatible'

  UNION ALL

  SELECT
    140,
    'security_helpers_present',
    count(*) = 4,
    format('found %s of 4 required authorization/timestamp helpers', count(*))
  FROM pg_proc
  WHERE oid IN (
    to_regprocedure('public.current_member_id()'),
    to_regprocedure('public.is_admin()'),
    to_regprocedure('private.require_active_admin()'),
    to_regprocedure('public.set_updated_at()')
  )

  UNION ALL

  SELECT
    150,
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
