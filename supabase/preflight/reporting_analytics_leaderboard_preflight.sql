-- Hosted preflight for Phase 10 reporting, analytics, and leaderboard.
-- Run in the Supabase SQL Editor before pushing the migration.

WITH checks AS (
  SELECT 10 AS sort_order, 'phase_dependencies_deployed'::TEXT AS check_name,
    count(*) = 3 AS passed,
    'Phase 7 credentials, Phase 8 communications cleanup, and the final Phase 9 public-reader correction must already be recorded'::TEXT AS details
  FROM supabase_migrations.schema_migrations
  WHERE version IN ('20260825170545', '20260826004121', '20260826072424')

  UNION ALL

  SELECT 20, 'reporting_phase_not_deployed',
    NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826090000'
    ),
    'the Phase 10 migration should not already be recorded'

  UNION ALL

  SELECT 30, 'reporting_source_tables_present', count(*) = 12,
    format('found %s of 12 authoritative reporting source tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'members', 'events', 'event_attendance', 'points_ledger', 'rewards',
      'redemptions', 'badges', 'member_badges', 'certificates',
      'notification_campaigns', 'notification_email_outbox', 'articles'
    )

  UNION ALL

  SELECT 40, 'reporting_source_columns_present', count(*) = 30,
    format('found %s of 30 required reporting source columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (table_name, column_name) IN (
      ('members', 'id'), ('members', 'full_name'), ('members', 'gdg_id'),
      ('members', 'auth_id'), ('members', 'member_status'),
      ('members', 'activated_at'),
      ('events', 'id'), ('events', 'title'), ('events', 'start_at'),
      ('events', 'status'),
      ('event_attendance', 'id'), ('event_attendance', 'event_id'),
      ('event_attendance', 'status'), ('event_attendance', 'confirmed_at'),
      ('event_attendance', 'award_ledger_id'),
      ('event_attendance', 'reversal_ledger_id'),
      ('points_ledger', 'id'), ('points_ledger', 'member_id'),
      ('points_ledger', 'points'), ('points_ledger', 'balance_after'),
      ('points_ledger', 'ledger_sequence'), ('points_ledger', 'created_at'),
      ('redemptions', 'status'), ('redemptions', 'created_at'),
      ('redemptions', 'fulfilled_at'), ('member_badges', 'earned_at'),
      ('certificates', 'issued_at'), ('notification_campaigns', 'created_at'),
      ('notification_email_outbox', 'sent_at'), ('articles', 'published_at')
    )

  UNION ALL

  SELECT 50, 'ledger_running_balances_consistent', count(*) = 0,
    format('running-balance mismatches=%s', count(*))
  FROM (
    SELECT ledger.id
    FROM public.points_ledger AS ledger
    JOIN LATERAL (
      SELECT COALESCE(sum(prior.points), 0)::INTEGER AS expected_balance
      FROM public.points_ledger AS prior
      WHERE prior.member_id = ledger.member_id
        AND prior.ledger_sequence <= ledger.ledger_sequence
    ) AS balance ON TRUE
    WHERE ledger.balance_after <> balance.expected_balance
  ) AS mismatches

  UNION ALL

  SELECT 60, 'security_helpers_present', count(*) = 2,
    'the current-member and active-administrator helpers must exist'
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE (namespace.nspname, procedure.proname) IN (
    ('private', 'current_member_id'), ('private', 'require_active_admin')
  )

  UNION ALL

  SELECT 70, 'active_linked_admin_exists', count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE member_status = 'ACTIVE' AND role = 'ADMIN' AND auth_id IS NOT NULL
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
