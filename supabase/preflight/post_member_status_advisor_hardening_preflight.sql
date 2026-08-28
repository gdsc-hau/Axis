-- Read-only production preflight for
-- 20260820144434_post_member_status_advisor_hardening.sql.
--
-- Run this in the Supabase SQL Editor before deploying the migration. Every
-- row should return passed = true. No data or schema objects are changed.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'member_lifecycle_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260820123815'
    ) AS passed,
    'member lifecycle migration must already be recorded'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'hardening_not_deployed',
    NOT EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260820144434'
    ),
    'hardening migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'required_functions_present',
    to_regprocedure('public.set_updated_at()') IS NOT NULL
      AND to_regprocedure('public.current_member_id()') IS NOT NULL
      AND to_regprocedure('public.is_admin()') IS NOT NULL
      AND to_regprocedure(
        'public.award_points(uuid,integer,text,text,text)'
      ) IS NOT NULL
      AND to_regprocedure(
        'public.confirm_event_attendance(uuid,uuid)'
      ) IS NOT NULL,
    'all five functions replaced by the hardening migration must exist'

  UNION ALL

  SELECT
    40,
    'private_schema_ready',
    EXISTS (
      SELECT 1
      FROM pg_namespace
      WHERE nspname = 'private'
    )
      AND has_schema_privilege('authenticated', 'private', 'USAGE'),
    'private schema must exist and be usable by authenticated users'

  UNION ALL

  SELECT
    50,
    'foreign_key_columns_present',
    count(*) = 11,
    format('found %s of 11 target foreign-key columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (table_name, column_name) IN (
      ('audit_logs', 'actor_id'),
      ('certificates', 'event_id'),
      ('event_attendance', 'confirmed_by'),
      ('id_qr_codes', 'member_id'),
      ('member_badges', 'badge_id'),
      ('member_credentials', 'member_id'),
      ('member_verifications', 'member_id'),
      ('member_verifications', 'verified_by'),
      ('redemptions', 'approved_by'),
      ('verification_logs', 'member_id'),
      ('verification_logs', 'verified_by')
    )

  UNION ALL

  SELECT
    60,
    'legacy_read_policies_present',
    count(*) = 16,
    format('found %s of 16 policies that will be consolidated', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'badges_admin_all',
      'badges_public_read',
      'events_admin_all',
      'events_public_read',
      'member_badges_admin_all',
      'member_badges_member_read',
      'certificates_admin_read',
      'certificates_member_read',
      'event_attendance_admin_read',
      'event_attendance_member_read',
      'notifications_admin_read',
      'notifications_member_read',
      'points_ledger_admin_read',
      'points_ledger_member_read',
      'redemptions_admin_read',
      'redemptions_member_read'
    )

  UNION ALL

  SELECT
    70,
    'member_status_data_valid',
    count(*) FILTER (
      WHERE member_status NOT IN (
        'PENDING',
        'INVITED',
        'ACTIVE',
        'SUSPENDED',
        'ALUMNI',
        'REJECTED'
      )
        OR member_status IS NULL
    ) = 0,
    format(
      'members=%s; active=%s; invalid=%s',
      count(*),
      count(*) FILTER (WHERE member_status = 'ACTIVE'),
      count(*) FILTER (
        WHERE member_status NOT IN (
          'PENDING',
          'INVITED',
          'ACTIVE',
          'SUSPENDED',
          'ALUMNI',
          'REJECTED'
        )
          OR member_status IS NULL
      )
    )
  FROM public.members

  UNION ALL

  SELECT
    80,
    'active_admin_exists',
    count(*) > 0,
    format('active administrators=%s', count(*))
  FROM public.members
  WHERE role = 'ADMIN'
    AND member_status = 'ACTIVE'

  UNION ALL

  SELECT
    90,
    'member_emails_unique_case_insensitively',
    NOT EXISTS (
      SELECT lower(email)
      FROM public.members
      GROUP BY lower(email)
      HAVING count(*) > 1
    ),
    'no member emails may collide after lowercasing'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
