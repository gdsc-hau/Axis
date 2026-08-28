-- Phase 1: make member_status the membership lifecycle source of truth and
-- enforce active-member access at the database boundary.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.members
     GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot normalize member emails because case-insensitive duplicates exist';
  END IF;
END
$$;

UPDATE public.members
   SET email = lower(btrim(email))
 WHERE email IS DISTINCT FROM lower(btrim(email));

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS member_status TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

UPDATE public.members SET is_accepted = FALSE WHERE is_accepted IS NULL;
ALTER TABLE public.members
  ALTER COLUMN is_accepted SET DEFAULT FALSE,
  ALTER COLUMN is_accepted SET NOT NULL;

UPDATE public.members
   SET member_status = CASE WHEN is_accepted THEN 'ACTIVE' ELSE 'PENDING' END
 WHERE member_status IS NULL;

UPDATE public.members
   SET profile_completed_at = updated_at
 WHERE profile_completed_at IS NULL
   AND NULLIF(btrim(bio), '') IS NOT NULL;

ALTER TABLE public.members
  ALTER COLUMN member_status SET DEFAULT 'PENDING',
  ALTER COLUMN member_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'members_member_status_check'
       AND conrelid = 'public.members'::regclass
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_member_status_check
      CHECK (
        member_status IN (
          'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'members_email_normalized_check'
       AND conrelid = 'public.members'::regclass
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_email_normalized_check
      CHECK (email = lower(btrim(email)));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'members_acceptance_compat_check'
       AND conrelid = 'public.members'::regclass
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_acceptance_compat_check
      CHECK (is_accepted = (member_status = 'ACTIVE'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_member_acceptance_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.is_accepted := NEW.member_status = 'ACTIVE';
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS sync_member_acceptance_compat ON public.members;
CREATE TRIGGER sync_member_acceptance_compat
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.sync_member_acceptance_compat();

REVOKE ALL ON FUNCTION public.sync_member_acceptance_compat()
  FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS members_status_created_idx
  ON public.members(member_status, created_at DESC);
CREATE INDEX IF NOT EXISTS members_active_role_idx
  ON public.members(role)
  WHERE member_status = 'ACTIVE';

-- current_member_id intentionally resolves only ACTIVE members. Every domain
-- RLS policy that already depends on this helper now denies inactive accounts.
CREATE OR REPLACE FUNCTION public.current_member_id()
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT role = 'ADMIN' AND member_status = 'ACTIVE'
        FROM public.members
       WHERE auth_id = (SELECT auth.uid())
       LIMIT 1
    ),
    FALSE
  )
$$;

REVOKE ALL ON FUNCTION public.current_member_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS members_select_self_or_admin ON public.members;
CREATE POLICY members_select_self_or_admin ON public.members
  FOR SELECT TO authenticated
  USING (auth_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS members_update_admin ON public.members;
CREATE POLICY members_update_admin ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated clients must use the audited RPCs below. The service role keeps
-- its operational bypass for migrations and controlled backend maintenance.
REVOKE UPDATE ON TABLE public.members FROM authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.require_active_admin()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT id
    INTO actor_id
    FROM public.members
   WHERE auth_id = (SELECT auth.uid())
     AND role = 'ADMIN'
     AND member_status = 'ACTIVE'
   LIMIT 1;

  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Active administrator access required'
      USING ERRCODE = '42501';
  END IF;

  RETURN actor_id;
END
$$;

CREATE OR REPLACE FUNCTION private.set_member_status(
  p_member_id UUID,
  p_member_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  target_member public.members;
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
BEGIN
  actor_id := private.require_active_admin();

  IF p_member_status IS NULL OR p_member_status NOT IN (
    'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI'
  ) THEN
    RAISE EXCEPTION 'Invalid member status' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO target_member
    FROM public.members
   WHERE id = p_member_id
   FOR UPDATE;

  IF target_member.id IS NULL THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_member.member_status = p_member_status THEN
    RETURN;
  END IF;

  IF target_member.role = 'ADMIN'
     AND target_member.member_status = 'ACTIVE'
     AND p_member_status <> 'ACTIVE' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('axis-active-admin-guard', 0)
    );
    IF (
      SELECT count(*)
        FROM public.members
       WHERE role = 'ADMIN'
         AND member_status = 'ACTIVE'
    ) <= 1 THEN
      RAISE EXCEPTION 'The last active administrator cannot be deactivated'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.members
     SET member_status = p_member_status,
         deactivated_at = CASE
           WHEN p_member_status = 'ACTIVE' THEN NULL
           ELSE clock_timestamp()
         END,
         deactivation_reason = CASE
           WHEN p_member_status = 'ACTIVE' THEN NULL
           ELSE normalized_reason
         END
   WHERE id = p_member_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    actor_id,
    'MEMBER_STATUS_CHANGED',
    'member',
    p_member_id::TEXT,
    jsonb_build_object(
      'from', target_member.member_status,
      'to', p_member_status,
      'reason', normalized_reason
    )
  );
END
$$;

CREATE OR REPLACE FUNCTION private.set_member_role(
  p_member_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  target_member public.members;
BEGIN
  actor_id := private.require_active_admin();

  IF p_role IS NULL OR p_role NOT IN ('MEMBER', 'ADMIN') THEN
    RAISE EXCEPTION 'Invalid member role' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO target_member
    FROM public.members
   WHERE id = p_member_id
   FOR UPDATE;

  IF target_member.id IS NULL THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_member.role = p_role THEN
    RETURN;
  END IF;

  IF p_role = 'ADMIN' AND target_member.member_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Only active members can be administrators'
      USING ERRCODE = '23514';
  END IF;

  IF target_member.id = actor_id AND p_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Administrators cannot change their own role'
      USING ERRCODE = '23514';
  END IF;

  IF target_member.role = 'ADMIN' AND p_role <> 'ADMIN' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('axis-active-admin-guard', 0)
    );
    IF (
      SELECT count(*)
        FROM public.members
       WHERE role = 'ADMIN'
         AND member_status = 'ACTIVE'
    ) <= 1 THEN
      RAISE EXCEPTION 'The last active administrator cannot be demoted'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.members SET role = p_role WHERE id = p_member_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    actor_id,
    'MEMBER_ROLE_CHANGED',
    'member',
    p_member_id::TEXT,
    jsonb_build_object('from', target_member.role, 'to', p_role)
  );
END
$$;

CREATE OR REPLACE FUNCTION private.record_member_invitation(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  target_status TEXT;
BEGIN
  actor_id := private.require_active_admin();

  SELECT member_status
    INTO target_status
    FROM public.members
   WHERE id = p_member_id
   FOR UPDATE;

  IF target_status IS NULL THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Only active members can be invited'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.members
     SET invited_at = clock_timestamp()
   WHERE id = p_member_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    actor_id,
    'MEMBER_INVITED',
    'member',
    p_member_id::TEXT,
    jsonb_build_object('invited_at', clock_timestamp())
  );
END
$$;

CREATE OR REPLACE FUNCTION private.link_current_member_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_auth_id UUID := (SELECT auth.uid());
  current_email TEXT;
  target_member public.members;
BEGIN
  IF current_auth_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT lower(btrim(email))
    INTO current_email
    FROM auth.users
   WHERE id = current_auth_id;

  IF current_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated email is unavailable'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO target_member
    FROM public.members
   WHERE email = current_email
     AND member_status = 'ACTIVE'
   FOR UPDATE;

  IF target_member.id IS NULL THEN
    RAISE EXCEPTION 'No active member is registered for this account'
      USING ERRCODE = '42501';
  END IF;

  IF target_member.auth_id IS NOT NULL
     AND target_member.auth_id <> current_auth_id THEN
    RAISE EXCEPTION 'Member is linked to a different account'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.members
     SET auth_id = current_auth_id,
         activated_at = COALESCE(activated_at, clock_timestamp())
   WHERE id = target_member.id;

  IF target_member.auth_id IS NULL THEN
    INSERT INTO public.audit_logs(
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      target_member.id,
      'MEMBER_ACCOUNT_ACTIVATED',
      'member',
      target_member.id::TEXT,
      jsonb_build_object('auth_id', current_auth_id)
    );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.complete_current_member_profile(
  p_full_name TEXT,
  p_bio TEXT,
  p_links JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_id UUID;
  normalized_name TEXT := btrim(p_full_name);
  normalized_bio TEXT := btrim(p_bio);
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF normalized_name = '' OR char_length(normalized_name) > 100 THEN
    RAISE EXCEPTION 'Full name must contain 1 to 100 characters'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_bio = '' OR char_length(normalized_bio) > 1000 THEN
    RAISE EXCEPTION 'Bio must contain 1 to 1000 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_links IS NULL OR jsonb_typeof(p_links) <> 'object' THEN
    RAISE EXCEPTION 'Links must be a JSON object' USING ERRCODE = '22023';
  END IF;

  SELECT id
    INTO member_id
    FROM public.members
   WHERE auth_id = (SELECT auth.uid())
     AND member_status = 'ACTIVE'
   FOR UPDATE;

  IF member_id IS NULL THEN
    RAISE EXCEPTION 'Active linked member account required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.members
     SET full_name = normalized_name,
         bio = normalized_bio,
         links = p_links,
         profile_completed_at = COALESCE(
           profile_completed_at,
           clock_timestamp()
         )
   WHERE id = member_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    member_id,
    'MEMBER_PROFILE_COMPLETED',
    'member',
    member_id::TEXT,
    jsonb_build_object('fields', jsonb_build_array('full_name', 'bio', 'links'))
  );
END
$$;

REVOKE ALL ON FUNCTION private.require_active_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.set_member_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.set_member_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.record_member_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.link_current_member_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.complete_current_member_profile(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.require_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_member_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_member_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION private.record_member_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.link_current_member_account() TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_current_member_profile(TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_member_status(
  p_member_id UUID,
  p_member_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_member_status(p_member_id, p_member_status, p_reason)
$$;

CREATE OR REPLACE FUNCTION public.set_member_role(
  p_member_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_member_role(p_member_id, p_role)
$$;

CREATE OR REPLACE FUNCTION public.record_member_invitation(p_member_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.record_member_invitation(p_member_id)
$$;

CREATE OR REPLACE FUNCTION public.link_current_member_account()
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.link_current_member_account()
$$;

CREATE OR REPLACE FUNCTION public.complete_current_member_profile(
  p_full_name TEXT,
  p_bio TEXT,
  p_links JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.complete_current_member_profile(p_full_name, p_bio, p_links)
$$;

REVOKE ALL ON FUNCTION public.set_member_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_member_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_member_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_current_member_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_current_member_profile(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_member_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_member_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_current_member_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_current_member_profile(TEXT, TEXT, JSONB) TO authenticated;

-- These older administrative RPCs already enforce active-admin authorization
-- through public.is_admin(). Remove the unnecessary explicit anonymous grants
-- found in the hosted project while preserving authenticated and service-role
-- access.
REVOKE ALL ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_event_attendance(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_event_attendance(UUID, UUID)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
