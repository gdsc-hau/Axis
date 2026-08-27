-- Hosted preflight for Phase 8 notifications and controlled communications.
-- Run this in the Supabase SQL Editor before pushing the migration.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'phase_dependencies_deployed'::TEXT AS check_name,
    count(*) = 4 AS passed,
    'Phase 5 marketplace, Phase 6 attendance, Phase 7 credentials, and the registry-name lock must already be recorded'::TEXT AS details
  FROM supabase_migrations.schema_migrations
  WHERE version IN (
    '20260821172810', '20260825154838', '20260825170545',
    '20260821182815'
  )

  UNION ALL

  SELECT
    20,
    'communications_phase_not_partially_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826001721'
    )
      AND to_regclass('public.member_notification_preferences') IS NULL
      AND to_regclass('public.notification_campaigns') IS NULL
      AND to_regclass('public.notification_delivery_config') IS NULL
      AND to_regclass('public.notification_email_outbox') IS NULL,
    'Phase 8 tables must not exist outside migration history'

  UNION ALL

  SELECT
    30,
    'notification_baseline_present',
    count(*) = 7,
    format('found %s of 7 baseline notification columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name IN (
      'id', 'member_id', 'type', 'message', 'related_id', 'read',
      'created_at'
    )

  UNION ALL

  SELECT
    40,
    'notification_members_resolvable',
    count(*) FILTER (WHERE member.id IS NULL) = 0,
    format(
      'notifications=%s; orphaned member references=%s',
      count(*), count(*) FILTER (WHERE member.id IS NULL)
    )
  FROM public.notifications AS notification
  LEFT JOIN public.members AS member ON member.id = notification.member_id

  UNION ALL

  SELECT
    50,
    'notification_payloads_normalizable',
    count(*) FILTER (
      WHERE notification.message IS NULL
        OR char_length(notification.message) > 10000
        OR notification.created_at IS NULL
    ) = 0,
    format(
      'notifications=%s; unnormalizable rows=%s',
      count(*),
      count(*) FILTER (
        WHERE notification.message IS NULL
          OR char_length(notification.message) > 10000
          OR notification.created_at IS NULL
      )
    )
  FROM public.notifications AS notification

  UNION ALL

  SELECT
    60,
    'domain_history_sources_present',
    count(*) = 5,
    format('found %s of 5 immutable notification source tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'redemption_status_history', 'event_attendance_status_history',
      'badge_award_status_history', 'certificate_status_history',
      'points_ledger'
    )

  UNION ALL

  SELECT
    70,
    'member_emails_normalized_and_unique',
    count(*) FILTER (
      WHERE email IS NULL
        OR email <> lower(btrim(email))
        OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) = 0
      AND count(DISTINCT lower(btrim(email))) = count(*),
    format(
      'members=%s; invalid/non-normalized emails=%s; duplicate normalized emails=%s',
      count(*),
      count(*) FILTER (
        WHERE email IS NULL
          OR email <> lower(btrim(email))
          OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      ),
      count(*) - count(DISTINCT lower(btrim(email)))
    )
  FROM public.members

  UNION ALL

  SELECT
    80,
    'security_helpers_present',
    count(*) = 4,
    'current-member, admin, active-admin, and updated-at helpers must exist'
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE (namespace.nspname, procedure.proname) IN (
    ('public', 'current_member_id'),
    ('public', 'is_admin'),
    ('private', 'require_active_admin'),
    ('public', 'set_updated_at')
  )

  UNION ALL

  SELECT
    90,
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
