BEGIN;

-- Phase 10 reports are derived from authoritative domain tables. No aggregate
-- cache is introduced, so the append-only ledger and immutable histories remain
-- the source of truth.

CREATE INDEX IF NOT EXISTS members_status_activated_report_idx
  ON public.members(member_status, activated_at)
  WHERE activated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_start_report_idx
  ON public.events(start_at, id)
  WHERE start_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS points_ledger_created_source_report_idx
  ON public.points_ledger(created_at, source_type, member_id);
CREATE INDEX IF NOT EXISTS attendance_confirmed_report_idx
  ON public.event_attendance(confirmed_at, event_id)
  WHERE confirmed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS redemptions_created_status_report_idx
  ON public.redemptions(created_at, status, id);
CREATE INDEX IF NOT EXISTS member_badges_earned_status_report_idx
  ON public.member_badges(earned_at, status, id);
CREATE INDEX IF NOT EXISTS certificates_issued_status_report_idx
  ON public.certificates(issued_at, status, id)
  WHERE issued_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_outbox_sent_status_report_idx
  ON public.notification_email_outbox(sent_at, status, id)
  WHERE sent_at IS NOT NULL;

CREATE OR REPLACE FUNCTION private.list_member_leaderboard(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank_position BIGINT,
  member_id UUID,
  full_name TEXT,
  gdg_id TEXT,
  current_balance INTEGER,
  total_earned BIGINT,
  total_spent BIGINT,
  transaction_count BIGINT,
  is_current_member BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := private.current_member_id();
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  safe_offset INTEGER := LEAST(GREATEST(COALESCE(p_offset, 0), 0), 10000);
BEGIN
  IF caller_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.members AS member
     WHERE member.id = caller_id
       AND member.member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'An active member account is required';
  END IF;

  RETURN QUERY
  WITH ledger_totals AS (
    SELECT
      ledger.member_id,
      COALESCE(sum(ledger.points) FILTER (WHERE ledger.points > 0), 0)::BIGINT
        AS total_earned,
      COALESCE(sum(-ledger.points) FILTER (WHERE ledger.points < 0), 0)::BIGINT
        AS total_spent,
      count(*)::BIGINT AS transaction_count
    FROM public.points_ledger AS ledger
    GROUP BY ledger.member_id
  ),
  latest_balances AS (
    SELECT DISTINCT ON (ledger.member_id)
      ledger.member_id,
      ledger.balance_after AS current_balance
    FROM public.points_ledger AS ledger
    ORDER BY ledger.member_id, ledger.ledger_sequence DESC
  ),
  ranked AS (
    SELECT
      dense_rank() OVER (
        ORDER BY COALESCE(balance.current_balance, 0) DESC
      )::BIGINT AS rank_position,
      member.id AS member_id,
      member.full_name,
      member.gdg_id,
      COALESCE(balance.current_balance, 0)::INTEGER AS current_balance,
      COALESCE(totals.total_earned, 0)::BIGINT AS total_earned,
      COALESCE(totals.total_spent, 0)::BIGINT AS total_spent,
      COALESCE(totals.transaction_count, 0)::BIGINT AS transaction_count,
      member.id = caller_id AS is_current_member
    FROM public.members AS member
    LEFT JOIN latest_balances AS balance ON balance.member_id = member.id
    LEFT JOIN ledger_totals AS totals ON totals.member_id = member.id
    WHERE member.member_status = 'ACTIVE'
  )
  SELECT ranked.rank_position, ranked.member_id, ranked.full_name,
         ranked.gdg_id, ranked.current_balance, ranked.total_earned,
         ranked.total_spent, ranked.transaction_count,
         ranked.is_current_member
    FROM ranked
   ORDER BY ranked.current_balance DESC, ranked.full_name, ranked.member_id
   LIMIT safe_limit OFFSET safe_offset;
END
$$;

REVOKE ALL ON FUNCTION private.list_member_leaderboard(INTEGER, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.list_member_leaderboard(INTEGER, INTEGER)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_member_leaderboard(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank_position BIGINT,
  member_id UUID,
  full_name TEXT,
  gdg_id TEXT,
  current_balance INTEGER,
  total_earned BIGINT,
  total_spent BIGINT,
  transaction_count BIGINT,
  is_current_member BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.list_member_leaderboard(p_limit, p_offset)
$$;

REVOKE ALL ON FUNCTION public.list_member_leaderboard(INTEGER, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_member_leaderboard(INTEGER, INTEGER)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.get_admin_report_metrics(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS TABLE (
  section TEXT,
  metric TEXT,
  value BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_admin();

  IF p_start_at IS NULL OR p_end_at IS NULL OR p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'A valid reporting range is required';
  END IF;
  IF p_end_at - p_start_at > INTERVAL '366 days' THEN
    RAISE EXCEPTION 'Reporting ranges may not exceed 366 days';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    VALUES
      ('MEMBERS'::TEXT, 'TOTAL_REGISTRY'::TEXT,
        (SELECT count(*)::BIGINT FROM public.members)),
      ('MEMBERS', 'ACTIVE_MEMBERS',
        (SELECT count(*)::BIGINT FROM public.members WHERE member_status = 'ACTIVE')),
      ('MEMBERS', 'LINKED_ACCOUNTS',
        (SELECT count(*)::BIGINT FROM public.members WHERE auth_id IS NOT NULL)),
      ('MEMBERS', 'ACTIVATED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.members
          WHERE activated_at >= p_start_at AND activated_at < p_end_at)),
      ('EVENTS', 'EVENTS_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.events
          WHERE start_at >= p_start_at AND start_at < p_end_at)),
      ('ATTENDANCE', 'CONFIRMED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.event_attendance
          WHERE status = 'CONFIRMED'
            AND confirmed_at >= p_start_at AND confirmed_at < p_end_at)),
      ('ATTENDANCE', 'NO_SHOWS_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.event_attendance
          WHERE status = 'NO_SHOW'
            AND updated_at >= p_start_at AND updated_at < p_end_at)),
      ('GYROCOINS', 'POINTS_AWARDED_IN_RANGE',
        (SELECT COALESCE(sum(points), 0)::BIGINT FROM public.points_ledger
          WHERE points > 0 AND created_at >= p_start_at AND created_at < p_end_at)),
      ('GYROCOINS', 'POINTS_SPENT_IN_RANGE',
        (SELECT COALESCE(sum(-points), 0)::BIGINT FROM public.points_ledger
          WHERE points < 0 AND created_at >= p_start_at AND created_at < p_end_at)),
      ('GYROCOINS', 'CURRENT_CIRCULATION',
        (SELECT COALESCE(sum(latest.balance_after), 0)::BIGINT
           FROM (
             SELECT DISTINCT ON (ledger.member_id) ledger.balance_after
               FROM public.points_ledger AS ledger
              ORDER BY ledger.member_id, ledger.ledger_sequence DESC
           ) AS latest)),
      ('MARKETPLACE', 'REDEMPTIONS_REQUESTED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.redemptions
          WHERE created_at >= p_start_at AND created_at < p_end_at)),
      ('MARKETPLACE', 'REDEMPTIONS_FULFILLED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.redemptions
          WHERE status = 'FULFILLED'
            AND fulfilled_at >= p_start_at AND fulfilled_at < p_end_at)),
      ('CREDENTIALS', 'BADGES_AWARDED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.member_badges
          WHERE earned_at >= p_start_at AND earned_at < p_end_at)),
      ('CREDENTIALS', 'CERTIFICATES_ISSUED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.certificates
          WHERE status IN ('ISSUED', 'REVOKED')
            AND issued_at >= p_start_at AND issued_at < p_end_at)),
      ('COMMUNICATIONS', 'CAMPAIGNS_PUBLISHED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.notification_campaigns
          WHERE created_at >= p_start_at AND created_at < p_end_at)),
      ('COMMUNICATIONS', 'EMAILS_SENT_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.notification_email_outbox
          WHERE status = 'SENT'
            AND sent_at >= p_start_at AND sent_at < p_end_at)),
      ('CONTENT', 'ARTICLES_PUBLISHED_IN_RANGE',
        (SELECT count(*)::BIGINT FROM public.articles
          WHERE published_at >= p_start_at AND published_at < p_end_at))
  ) AS metrics(section, metric, value);
END
$$;

REVOKE ALL ON FUNCTION private.get_admin_report_metrics(TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_admin_report_metrics(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_report_metrics(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS TABLE (section TEXT, metric TEXT, value BIGINT)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.get_admin_report_metrics(p_start_at, p_end_at)
$$;

REVOKE ALL ON FUNCTION public.get_admin_report_metrics(TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_report_metrics(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;

CREATE OR REPLACE FUNCTION private.list_admin_event_participation_report(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_event_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_at TIMESTAMPTZ,
  event_status TEXT,
  registered_count BIGINT,
  checked_in_count BIGINT,
  confirmed_count BIGINT,
  no_show_count BIGINT,
  cancelled_count BIGINT,
  net_points_awarded BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
BEGIN
  PERFORM private.require_active_admin();

  IF p_start_at IS NULL OR p_end_at IS NULL OR p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'A valid reporting range is required';
  END IF;
  IF p_end_at - p_start_at > INTERVAL '366 days' THEN
    RAISE EXCEPTION 'Reporting ranges may not exceed 366 days';
  END IF;

  RETURN QUERY
  SELECT
    event.id,
    event.title,
    event.start_at,
    event.status,
    count(attendance.id) FILTER (WHERE attendance.status = 'REGISTERED')::BIGINT,
    count(attendance.id) FILTER (WHERE attendance.status = 'CHECKED_IN')::BIGINT,
    count(attendance.id) FILTER (WHERE attendance.status = 'CONFIRMED')::BIGINT,
    count(attendance.id) FILTER (WHERE attendance.status = 'NO_SHOW')::BIGINT,
    count(attendance.id) FILTER (WHERE attendance.status = 'CANCELLED')::BIGINT,
    COALESCE(sum(award.points), 0)::BIGINT
      + COALESCE(sum(reversal.points), 0)::BIGINT
  FROM public.events AS event
  LEFT JOIN public.event_attendance AS attendance ON attendance.event_id = event.id
  LEFT JOIN public.points_ledger AS award ON award.id = attendance.award_ledger_id
  LEFT JOIN public.points_ledger AS reversal ON reversal.id = attendance.reversal_ledger_id
  WHERE event.start_at >= p_start_at
    AND event.start_at < p_end_at
    AND (p_event_id IS NULL OR event.id = p_event_id)
  GROUP BY event.id, event.title, event.start_at, event.status
  ORDER BY event.start_at DESC, event.id
  LIMIT safe_limit;
END
$$;

REVOKE ALL ON FUNCTION private.list_admin_event_participation_report(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, INTEGER
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.list_admin_event_participation_report(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, INTEGER
) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admin_event_participation_report(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_event_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_at TIMESTAMPTZ,
  event_status TEXT,
  registered_count BIGINT,
  checked_in_count BIGINT,
  confirmed_count BIGINT,
  no_show_count BIGINT,
  cancelled_count BIGINT,
  net_points_awarded BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.list_admin_event_participation_report(
    p_start_at, p_end_at, p_event_id, p_limit
  )
$$;

REVOKE ALL ON FUNCTION public.list_admin_event_participation_report(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, INTEGER
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_event_participation_report(
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, INTEGER
) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
