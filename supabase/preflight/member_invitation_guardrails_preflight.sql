-- Read-only production preflight for
-- 20260821083404_member_invitation_guardrails.sql.
-- Run in the hosted Supabase SQL Editor before applying the migration.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'profile_idempotency_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260821081201'
    ) AS passed,
    'the Phase 1 profile migration must already be recorded'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'invitation_guardrails_not_deployed',
    NOT EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260821083404'
    ),
    'the Phase 2 migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'auth_hook_role_present',
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin'),
    'the hosted project must expose the Supabase Auth database role'

  UNION ALL

  SELECT
    40,
    'lifecycle_helpers_present',
    to_regprocedure('private.require_active_admin()') IS NOT NULL
      AND to_regprocedure(
        'private.set_member_status(uuid,text,text)'
      ) IS NOT NULL
      AND to_regprocedure(
        'private.record_member_invitation(uuid)'
      ) IS NOT NULL,
    'all lifecycle helpers replaced or called by this migration must exist'

  UNION ALL

  SELECT
    50,
    'member_emails_normalized_and_unique',
    NOT EXISTS (
      SELECT lower(btrim(email))
      FROM public.members
      GROUP BY lower(btrim(email))
      HAVING count(*) > 1
    )
      AND count(*) FILTER (WHERE email IS DISTINCT FROM lower(btrim(email))) = 0,
    format(
      'members=%s; non-normalized emails=%s',
      count(*),
      count(*) FILTER (WHERE email IS DISTINCT FROM lower(btrim(email)))
    )
  FROM public.members

  UNION ALL

  SELECT
    60,
    'member_status_values_valid',
    count(*) FILTER (
      WHERE member_status NOT IN (
        'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI'
      ) OR member_status IS NULL
    ) = 0,
    format(
      'members=%s; active=%s; invalid=%s',
      count(*),
      count(*) FILTER (WHERE member_status = 'ACTIVE'),
      count(*) FILTER (
        WHERE member_status NOT IN (
          'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI'
        ) OR member_status IS NULL
      )
    )
  FROM public.members

  UNION ALL

  SELECT
    70,
    'active_unlinked_invite_candidate_exists',
    count(*) > 0,
    format('active unlinked invitation candidates=%s', count(*))
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND auth_id IS NULL

  UNION ALL

  SELECT
    80,
    'active_linked_admin_exists',
    count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE role = 'ADMIN'
    AND member_status = 'ACTIVE'
    AND auth_id IS NOT NULL
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
