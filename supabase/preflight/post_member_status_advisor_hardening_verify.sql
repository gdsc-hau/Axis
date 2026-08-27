-- Read-only verification for
-- 20260820144434_post_member_status_advisor_hardening.sql.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260820144434'
    ) AS passed,
    'hardening migration must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'set_updated_at_search_path_fixed',
    COALESCE(
      (
        SELECT p.proconfig @> ARRAY['search_path=""']::TEXT[]
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'set_updated_at'
          AND pg_get_function_identity_arguments(p.oid) = ''
      ),
      FALSE
    ),
    'public.set_updated_at() must use an empty search path'

  UNION ALL

  SELECT
    30,
    'public_helpers_security_invoker',
    count(*) = 4 AND bool_and(NOT p.prosecdef),
    format('found %s of 4 security-invoker public helpers', count(*))
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'current_member_id',
      'is_admin',
      'award_points',
      'confirm_event_attendance'
    )

  UNION ALL

  SELECT
    40,
    'private_helpers_security_definer',
    count(*) = 2 AND bool_and(p.prosecdef),
    format('found %s of 2 private security-definer helpers', count(*))
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'private'
    AND p.proname IN ('current_member_id', 'is_admin')

  UNION ALL

  SELECT
    50,
    'private_schema_usage_granted',
    has_schema_privilege('authenticated', 'private', 'USAGE')
      AND has_schema_privilege('service_role', 'private', 'USAGE'),
    'authenticated and service_role must have private schema usage'

  UNION ALL

  SELECT
    60,
    'anonymous_execution_revoked',
    NOT has_function_privilege('anon', 'public.current_member_id()', 'EXECUTE')
      AND NOT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')
      AND NOT has_function_privilege(
        'anon',
        'public.award_points(uuid,integer,text,text,text)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.confirm_event_attendance(uuid,uuid)',
        'EXECUTE'
      ),
    'anon must not execute helper or administrative RPC functions'

  UNION ALL

  SELECT
    70,
    'foreign_key_indexes_present',
    count(*) = 11,
    format('found %s of 11 advisor-requested indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'audit_logs_actor_id_idx',
      'certificates_event_id_idx',
      'event_attendance_confirmed_by_idx',
      'id_qr_codes_member_id_idx',
      'member_badges_badge_id_idx',
      'member_credentials_member_id_idx',
      'member_verifications_member_id_idx',
      'member_verifications_verified_by_idx',
      'redemptions_approved_by_idx',
      'verification_logs_member_id_idx',
      'verification_logs_verified_by_idx'
    )

  UNION ALL

  SELECT
    80,
    'consolidated_read_policies_present',
    count(*) = 8,
    format('found %s of 8 consolidated read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'badges_authenticated_read',
      'events_authenticated_read',
      'member_badges_authorized_read',
      'certificates_authorized_read',
      'event_attendance_authorized_read',
      'notifications_authorized_read',
      'points_ledger_authorized_read',
      'redemptions_authorized_read'
    )
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
