-- Phase 2: enforce the members registry at the Supabase Auth boundary and
-- harden the audited invitation and status-management operations.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

-- Supabase Auth invokes this function before inserting a new auth.users row.
-- Keep it SECURITY INVOKER and grant the internal Auth role only the three
-- member columns needed for the allowlist lookup.
CREATE OR REPLACE FUNCTION public.hook_restrict_member_account_creation(
  event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  normalized_email TEXT := lower(btrim(event -> 'user' ->> 'email'));
BEGIN
  IF normalized_email IS NOT NULL
     AND normalized_email <> ''
     AND EXISTS (
       SELECT 1
         FROM public.members
        WHERE email = normalized_email
          AND member_status = 'ACTIVE'
          AND auth_id IS NULL
     ) THEN
    RETURN '{}'::JSONB;
  END IF;

  RETURN jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message',
      'Account creation requires an active GDG HAU member registry entry.'
    )
  );
END
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT (email, member_status, auth_id)
  ON TABLE public.members
  TO supabase_auth_admin;

DROP POLICY IF EXISTS members_auth_hook_registry_lookup ON public.members;
CREATE POLICY members_auth_hook_registry_lookup ON public.members
  FOR SELECT
  TO supabase_auth_admin
  USING (TRUE);

REVOKE ALL ON FUNCTION public.hook_restrict_member_account_creation(JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hook_restrict_member_account_creation(JSONB)
  TO supabase_auth_admin;

-- Restricted lifecycle states require an administrator reason at both the UI
-- contract and database boundaries. Approval/reactivation remains reason-free.
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

  IF normalized_reason IS NOT NULL AND char_length(normalized_reason) > 500 THEN
    RAISE EXCEPTION 'Member status reason must not exceed 500 characters'
      USING ERRCODE = '22023';
  END IF;

  IF p_member_status IN ('REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI')
     AND normalized_reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required for restricted member statuses'
      USING ERRCODE = '22023';
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

-- Invitation resends are allowed for ACTIVE rows until account activation.
-- Every successful send receives a separate, timestamped audit event.
CREATE OR REPLACE FUNCTION private.record_member_invitation(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  target_member public.members;
  sent_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  actor_id := private.require_active_admin();

  SELECT *
    INTO target_member
    FROM public.members
   WHERE id = p_member_id
   FOR UPDATE;

  IF target_member.id IS NULL THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_member.member_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Only active members can be invited'
      USING ERRCODE = '23514';
  END IF;
  IF target_member.auth_id IS NOT NULL THEN
    RAISE EXCEPTION 'Activated member accounts cannot be invited'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.members
     SET invited_at = sent_at
   WHERE id = p_member_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    actor_id,
    CASE
      WHEN target_member.invited_at IS NULL THEN 'MEMBER_INVITED'
      ELSE 'MEMBER_INVITATION_RESENT'
    END,
    'member',
    p_member_id::TEXT,
    jsonb_build_object(
      'invited_at', sent_at,
      'previous_invited_at', target_member.invited_at,
      'role', target_member.role
    )
  );
END
$$;

REVOKE ALL ON FUNCTION private.set_member_status(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.record_member_invitation(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_member_status(UUID, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.record_member_invitation(UUID)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
