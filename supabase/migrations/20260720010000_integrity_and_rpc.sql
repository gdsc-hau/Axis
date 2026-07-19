-- Enforce core invariants and provide atomic operations for implemented domains.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_role_check' AND conrelid = 'public.members'::regclass) THEN
    ALTER TABLE public.members ADD CONSTRAINT members_role_check CHECK (role IN ('MEMBER', 'ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_status_check' AND conrelid = 'public.events'::regclass) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_date_order_check' AND conrelid = 'public.events'::regclass) THEN
    ALTER TABLE public.events ADD CONSTRAINT events_date_order_check CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_status_check' AND conrelid = 'public.event_attendance'::regclass) THEN
    ALTER TABLE public.event_attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('REGISTERED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'points_nonzero_check' AND conrelid = 'public.points_ledger'::regclass) THEN
    ALTER TABLE public.points_ledger ADD CONSTRAINT points_nonzero_check CHECK (points <> 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_cost_check' AND conrelid = 'public.redemptions'::regclass) THEN
    ALTER TABLE public.redemptions ADD CONSTRAINT redemptions_cost_check CHECK (total_cost > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_status_check' AND conrelid = 'public.redemptions'::regclass) THEN
    ALTER TABLE public.redemptions ADD CONSTRAINT redemptions_status_check CHECK (status IN ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'CANCELLED'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS event_attendance_event_member_uidx ON public.event_attendance(event_id, member_id);
CREATE UNIQUE INDEX IF NOT EXISTS member_badges_member_badge_uidx ON public.member_badges(member_id, badge_id);
CREATE INDEX IF NOT EXISTS event_attendance_member_idx ON public.event_attendance(member_id);
CREATE INDEX IF NOT EXISTS points_ledger_member_created_idx ON public.points_ledger(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS certificates_member_idx ON public.certificates(member_id);
CREATE INDEX IF NOT EXISTS redemptions_member_idx ON public.redemptions(member_id);
CREATE INDEX IF NOT EXISTS notifications_member_idx ON public.notifications(member_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.award_points(
  p_member_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS public.points_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  inserted_entry public.points_ledger;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  IF p_points = 0 THEN RAISE EXCEPTION 'Points must be non-zero' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));
  SELECT COALESCE(balance_after, 0) INTO current_balance
    FROM public.points_ledger WHERE member_id = p_member_id
   ORDER BY created_at DESC, id DESC LIMIT 1;
  current_balance := COALESCE(current_balance, 0);

  INSERT INTO public.points_ledger(member_id, source_type, source_id, points, balance_after, note)
  VALUES (p_member_id, p_source_type, p_source_id, p_points, current_balance + p_points, p_note)
  RETURNING * INTO inserted_entry;
  RETURN inserted_entry;
END
$$;

CREATE OR REPLACE FUNCTION public.confirm_event_attendance(p_event_id UUID, p_member_id UUID)
RETURNS public.event_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendance public.event_attendance;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
  UPDATE public.event_attendance
     SET status = 'CHECKED_IN', checked_in_at = NOW(), confirmed_by = public.current_member_id()
   WHERE event_id = p_event_id AND member_id = p_member_id
   RETURNING * INTO attendance;
  IF attendance.id IS NULL THEN RAISE EXCEPTION 'Attendance registration not found' USING ERRCODE = 'P0002'; END IF;
  RETURN attendance;
END
$$;

REVOKE ALL ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_event_attendance(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_event_attendance(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
