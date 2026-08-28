-- Resolve the production database advisor findings discovered after the
-- member-status lifecycle rollout without changing the public RPC contracts.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

-- Trigger functions do not need a caller-controlled object lookup path.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.set_updated_at()
  FROM PUBLIC, anon, authenticated;

-- Keep the RLS-bypassing member lookups outside the exposed API schema. The
-- public functions retain their signatures as security-invoker wrappers so
-- existing policies and application calls do not change.
CREATE OR REPLACE FUNCTION private.current_member_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
    FROM public.members
   WHERE auth_id = (SELECT auth.uid())
     AND member_status = 'ACTIVE'
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.members
     WHERE auth_id = (SELECT auth.uid())
       AND role = 'ADMIN'
       AND member_status = 'ACTIVE'
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.current_member_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_member_id()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.current_member_id()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin()
$$;

REVOKE ALL ON FUNCTION public.current_member_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_member_id()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin()
  TO authenticated, service_role;

-- These operations already have complete RLS policies and explicit active-
-- admin checks, so they do not need to bypass RLS themselves.
CREATE OR REPLACE FUNCTION public.award_points(
  p_member_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS public.points_ledger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_balance INTEGER;
  inserted_entry public.points_ledger;
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_points = 0 THEN
    RAISE EXCEPTION 'Points must be non-zero' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_member_id::TEXT, 0)
  );

  SELECT COALESCE(balance_after, 0)
    INTO current_balance
    FROM public.points_ledger
   WHERE member_id = p_member_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  current_balance := COALESCE(current_balance, 0);

  INSERT INTO public.points_ledger(
    member_id,
    source_type,
    source_id,
    points,
    balance_after,
    note
  ) VALUES (
    p_member_id,
    p_source_type,
    p_source_id,
    p_points,
    current_balance + p_points,
    p_note
  )
  RETURNING * INTO inserted_entry;

  RETURN inserted_entry;
END
$$;

CREATE OR REPLACE FUNCTION public.confirm_event_attendance(
  p_event_id UUID,
  p_member_id UUID
)
RETURNS public.event_attendance
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  attendance public.event_attendance;
BEGIN
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.event_attendance
     SET status = 'CHECKED_IN',
         checked_in_at = pg_catalog.clock_timestamp(),
         confirmed_by = (SELECT public.current_member_id())
   WHERE event_id = p_event_id
     AND member_id = p_member_id
  RETURNING * INTO attendance;

  IF attendance.id IS NULL THEN
    RAISE EXCEPTION 'Attendance registration not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN attendance;
END
$$;

REVOKE ALL ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_event_attendance(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_event_attendance(UUID, UUID)
  TO authenticated, service_role;

-- Index every currently uncovered foreign-key column. These indexes support
-- joins and keep cascade/set-null checks from scanning whole tables.
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx
  ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS certificates_event_id_idx
  ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS event_attendance_confirmed_by_idx
  ON public.event_attendance(confirmed_by);
CREATE INDEX IF NOT EXISTS id_qr_codes_member_id_idx
  ON public.id_qr_codes(member_id);
CREATE INDEX IF NOT EXISTS member_badges_badge_id_idx
  ON public.member_badges(badge_id);
CREATE INDEX IF NOT EXISTS member_credentials_member_id_idx
  ON public.member_credentials(member_id);
CREATE INDEX IF NOT EXISTS member_verifications_member_id_idx
  ON public.member_verifications(member_id);
CREATE INDEX IF NOT EXISTS member_verifications_verified_by_idx
  ON public.member_verifications(verified_by);
CREATE INDEX IF NOT EXISTS redemptions_approved_by_idx
  ON public.redemptions(approved_by);
CREATE INDEX IF NOT EXISTS verification_logs_member_id_idx
  ON public.verification_logs(member_id);
CREATE INDEX IF NOT EXISTS verification_logs_verified_by_idx
  ON public.verification_logs(verified_by);

-- Consolidate overlapping permissive SELECT policies. Administrator writes
-- remain split by command so they do not overlap authenticated read policies.
DROP POLICY IF EXISTS badges_admin_all ON public.badges;
DROP POLICY IF EXISTS badges_public_read ON public.badges;
CREATE POLICY badges_public_read ON public.badges
  FOR SELECT TO anon
  USING (active);
CREATE POLICY badges_authenticated_read ON public.badges
  FOR SELECT TO authenticated
  USING (active OR (SELECT public.is_admin()));
CREATE POLICY badges_admin_insert ON public.badges
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY badges_admin_update ON public.badges
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY badges_admin_delete ON public.badges
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS events_admin_all ON public.events;
DROP POLICY IF EXISTS events_public_read ON public.events;
CREATE POLICY events_public_read ON public.events
  FOR SELECT TO anon
  USING (status = 'PUBLISHED');
CREATE POLICY events_authenticated_read ON public.events
  FOR SELECT TO authenticated
  USING (status = 'PUBLISHED' OR (SELECT public.is_admin()));
CREATE POLICY events_admin_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY events_admin_update ON public.events
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY events_admin_delete ON public.events
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS member_badges_admin_all ON public.member_badges;
DROP POLICY IF EXISTS member_badges_member_read ON public.member_badges;
CREATE POLICY member_badges_authorized_read ON public.member_badges
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );
CREATE POLICY member_badges_admin_insert ON public.member_badges
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY member_badges_admin_update ON public.member_badges
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY member_badges_admin_delete ON public.member_badges
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS certificates_admin_read ON public.certificates;
DROP POLICY IF EXISTS certificates_member_read ON public.certificates;
CREATE POLICY certificates_authorized_read ON public.certificates
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

DROP POLICY IF EXISTS event_attendance_admin_read ON public.event_attendance;
DROP POLICY IF EXISTS event_attendance_member_read ON public.event_attendance;
CREATE POLICY event_attendance_authorized_read ON public.event_attendance
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

DROP POLICY IF EXISTS notifications_admin_read ON public.notifications;
DROP POLICY IF EXISTS notifications_member_read ON public.notifications;
CREATE POLICY notifications_authorized_read ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

DROP POLICY IF EXISTS points_ledger_admin_read ON public.points_ledger;
DROP POLICY IF EXISTS points_ledger_member_read ON public.points_ledger;
CREATE POLICY points_ledger_authorized_read ON public.points_ledger
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

DROP POLICY IF EXISTS redemptions_admin_read ON public.redemptions;
DROP POLICY IF EXISTS redemptions_member_read ON public.redemptions;
CREATE POLICY redemptions_authorized_read ON public.redemptions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
