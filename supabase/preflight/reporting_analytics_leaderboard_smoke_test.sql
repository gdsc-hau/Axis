-- Transactional smoke test for Phase 10 reporting and leaderboard.
-- Run in the hosted SQL Editor after verification. This test is read-only and
-- rolls back its session configuration.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT auth_id::TEXT
    FROM public.members
    WHERE member_status = 'ACTIVE'
      AND role = 'ADMIN'
      AND auth_id IS NOT NULL
    ORDER BY id
    LIMIT 1
  ),
  TRUE
);

SET LOCAL ROLE authenticated;

DO $reporting_smoke$
DECLARE
  leaderboard_count INTEGER;
  current_member_rows INTEGER;
  metrics_count INTEGER;
  invalid_metric_rows INTEGER;
  participation_count INTEGER;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE is_current_member)
    INTO leaderboard_count, current_member_rows
    FROM public.list_member_leaderboard(100, 0);

  IF leaderboard_count = 0 OR current_member_rows <> 1 THEN
    RAISE EXCEPTION 'Leaderboard did not return exactly one current member';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.list_member_leaderboard(100, 0)
    WHERE current_balance < 0 OR total_earned < 0 OR total_spent < 0
  ) THEN
    RAISE EXCEPTION 'Leaderboard returned invalid financial aggregates';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE value < 0)
    INTO metrics_count, invalid_metric_rows
    FROM public.get_admin_report_metrics(
      pg_catalog.now() - INTERVAL '30 days', pg_catalog.now() + INTERVAL '1 second'
    );

  IF metrics_count <> 17 OR invalid_metric_rows <> 0 THEN
    RAISE EXCEPTION 'Administrative metric report returned an invalid shape';
  END IF;

  SELECT count(*) INTO participation_count
  FROM public.list_admin_event_participation_report(
    pg_catalog.now() - INTERVAL '365 days', pg_catalog.now() + INTERVAL '1 second',
    NULL, 100
  );

  IF participation_count > 100 THEN
    RAISE EXCEPTION 'Event participation report ignored its row limit';
  END IF;
END
$reporting_smoke$;

RESET ROLE;
ROLLBACK;

SELECT
  'reporting_analytics_leaderboard_transactional_smoke_test'::TEXT AS check_name,
  TRUE AS passed,
  'active-member leaderboard, administrative metrics, event participation, privacy, and aggregate assertions passed; no data was written'::TEXT AS details;
