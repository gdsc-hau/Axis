BEGIN;

-- Phase 11 closes the member account and system-configuration placeholders.
-- Registry identity remains owned by public.members; members may only revise
-- profile presentation fields through an audited, optimistic-locking RPC.

ALTER TABLE public.members
  ADD COLUMN profile_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.members
  ADD CONSTRAINT members_profile_version_check
  CHECK (profile_version >= 1);

CREATE TABLE public.member_profile_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  bio TEXT NOT NULL,
  phone_number TEXT,
  links JSONB NOT NULL DEFAULT '{}'::JSONB,
  actor_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT member_profile_revisions_revision_check CHECK (revision_number >= 1),
  CONSTRAINT member_profile_revisions_bio_check
    CHECK (char_length(btrim(bio)) BETWEEN 1 AND 1000),
  CONSTRAINT member_profile_revisions_phone_check
    CHECK (phone_number IS NULL OR char_length(phone_number) BETWEEN 7 AND 30),
  CONSTRAINT member_profile_revisions_links_check
    CHECK (jsonb_typeof(links) = 'object'),
  CONSTRAINT member_profile_revisions_reason_check
    CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  CONSTRAINT member_profile_revisions_member_revision_key
    UNIQUE (member_id, revision_number)
);

CREATE INDEX member_profile_revisions_member_created_idx
  ON public.member_profile_revisions(member_id, created_at DESC);
CREATE INDEX member_profile_revisions_actor_idx
  ON public.member_profile_revisions(actor_id);

INSERT INTO public.member_profile_revisions(
  member_id, revision_number, bio, phone_number, links, actor_id, reason,
  operation_key, created_at
)
SELECT member.id, member.profile_version, btrim(member.bio),
       NULLIF(btrim(member.phone_number), ''), COALESCE(member.links, '{}'::JSONB),
       member.id, 'Existing completed profile baseline', gen_random_uuid(),
       COALESCE(member.profile_completed_at, member.updated_at, clock_timestamp())
FROM public.members AS member
WHERE member.profile_completed_at IS NOT NULL
  AND NULLIF(btrim(member.bio), '') IS NOT NULL;

ALTER TABLE public.app_settings
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN updated_by UUID REFERENCES public.members(id) ON DELETE SET NULL;

UPDATE public.app_settings
SET updated_at = COALESCE(updated_at, clock_timestamp());

ALTER TABLE public.app_settings
  ALTER COLUMN updated_at SET NOT NULL,
  ADD CONSTRAINT app_settings_version_check CHECK (version >= 1);

INSERT INTO public.app_settings(key, value, version, updated_at)
VALUES (
  'PORTAL_SETTINGS',
  jsonb_build_object(
    'organization_name', 'GDG on Campus HAU',
    'support_email', '',
    'dashboard_message', 'Welcome back to the GDG HAU member portal.',
    'default_report_days', 30,
    'leaderboard_limit', 100
  ),
  1,
  clock_timestamp()
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.app_setting_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id UUID NOT NULL REFERENCES public.app_settings(id) ON DELETE RESTRICT,
  setting_key TEXT NOT NULL,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  from_value JSONB NOT NULL,
  to_value JSONB NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT app_setting_revisions_key_check
    CHECK (char_length(btrim(setting_key)) BETWEEN 1 AND 100),
  CONSTRAINT app_setting_revisions_versions_check
    CHECK (from_version >= 1 AND to_version = from_version + 1),
  CONSTRAINT app_setting_revisions_values_check
    CHECK (jsonb_typeof(from_value) = 'object' AND jsonb_typeof(to_value) = 'object'),
  CONSTRAINT app_setting_revisions_reason_check
    CHECK (char_length(btrim(reason)) BETWEEN 5 AND 500)
);

CREATE INDEX app_setting_revisions_setting_created_idx
  ON public.app_setting_revisions(setting_id, created_at DESC);
CREATE INDEX app_setting_revisions_actor_idx
  ON public.app_setting_revisions(actor_id);

ALTER TABLE public.member_profile_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_setting_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_admin_all ON public.app_settings;
DROP POLICY IF EXISTS app_settings_admin_read ON public.app_settings;
CREATE POLICY app_settings_admin_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY member_profile_revisions_authorized_read
  ON public.member_profile_revisions
  FOR SELECT TO authenticated
  USING (
    member_id = (SELECT public.current_member_id())
    OR public.is_admin()
  );

CREATE POLICY app_setting_revisions_admin_read
  ON public.app_setting_revisions
  FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.member_profile_revisions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.app_setting_revisions FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.members
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.app_settings
  FROM authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.member_profile_revisions, public.app_setting_revisions
  FROM authenticated, service_role;
GRANT SELECT ON TABLE public.member_profile_revisions TO authenticated;
GRANT SELECT ON TABLE public.app_settings, public.app_setting_revisions
  TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_member_profile_links(p_links JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  link_key TEXT;
  link_value TEXT;
BEGIN
  IF p_links IS NULL OR jsonb_typeof(p_links) <> 'object' THEN
    RAISE EXCEPTION 'Links must be a JSON object' USING ERRCODE = '22023';
  END IF;

  FOR link_key, link_value IN SELECT key, value FROM jsonb_each_text(p_links)
  LOOP
    IF link_key NOT IN ('linkedin', 'github') THEN
      RAISE EXCEPTION 'Only LinkedIn and GitHub profile links are supported'
        USING ERRCODE = '22023';
    END IF;
    IF char_length(link_value) > 2048
       OR link_value !~* '^https://[^[:space:]]+$' THEN
      RAISE EXCEPTION 'Profile links must be complete HTTPS URLs'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION private.update_current_member_profile(
  p_expected_version INTEGER,
  p_bio TEXT,
  p_phone_number TEXT,
  p_links JSONB,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_member public.members;
  prior_revision public.member_profile_revisions;
  normalized_bio TEXT := btrim(p_bio);
  normalized_phone TEXT := NULLIF(btrim(p_phone_number), '');
  normalized_reason TEXT := btrim(p_reason);
  normalized_links JSONB := COALESCE(p_links, '{}'::JSONB);
  result_member public.members;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF normalized_bio IS NULL OR char_length(normalized_bio) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Bio must contain 1 to 1000 characters' USING ERRCODE = '22023';
  END IF;
  IF normalized_phone IS NOT NULL AND (
    char_length(normalized_phone) NOT BETWEEN 7 AND 30
    OR normalized_phone !~ '^[0-9+(). -]+$'
  ) THEN
    RAISE EXCEPTION 'Phone number must contain 7 to 30 valid phone characters'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A profile-change reason of 3 to 500 characters is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL OR p_expected_version IS NULL THEN
    RAISE EXCEPTION 'Expected version and operation key are required'
      USING ERRCODE = '22023';
  END IF;
  PERFORM private.validate_member_profile_links(normalized_links);

  SELECT * INTO actor_member
  FROM public.members AS member
  WHERE member.auth_id = (SELECT auth.uid())
    AND member.member_status = 'ACTIVE'
  FOR UPDATE;

  IF actor_member.id IS NULL THEN
    RAISE EXCEPTION 'Active linked member account required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO prior_revision
  FROM public.member_profile_revisions AS revision
  WHERE revision.operation_key = p_operation_key;

  IF prior_revision.id IS NOT NULL THEN
    IF prior_revision.member_id <> actor_member.id
       OR prior_revision.bio IS DISTINCT FROM normalized_bio
       OR prior_revision.phone_number IS DISTINCT FROM normalized_phone
       OR prior_revision.links IS DISTINCT FROM normalized_links
       OR prior_revision.reason IS DISTINCT FROM normalized_reason THEN
      RAISE EXCEPTION 'Operation key was already used for a different profile update'
        USING ERRCODE = '23505';
    END IF;
    RETURN actor_member;
  END IF;

  IF actor_member.profile_version <> p_expected_version THEN
    RAISE EXCEPTION 'Profile changed in another session; reload before saving'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.members
  SET bio = normalized_bio,
      phone_number = normalized_phone,
      links = normalized_links,
      profile_version = profile_version + 1
  WHERE id = actor_member.id
  RETURNING * INTO result_member;

  INSERT INTO public.member_profile_revisions(
    member_id, revision_number, bio, phone_number, links, actor_id, reason,
    operation_key
  ) VALUES (
    result_member.id, result_member.profile_version, result_member.bio,
    result_member.phone_number, result_member.links, result_member.id,
    normalized_reason, p_operation_key
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    result_member.id, 'MEMBER_PROFILE_UPDATED', 'member', result_member.id::TEXT,
    jsonb_build_object(
      'profile_version', result_member.profile_version,
      'fields', jsonb_build_array('bio', 'phone_number', 'links'),
      'reason', normalized_reason,
      'registry_identity_preserved', TRUE,
      'operation_key', p_operation_key
    )
  );

  RETURN result_member;
END
$$;

CREATE OR REPLACE FUNCTION public.update_current_member_profile(
  p_expected_version INTEGER,
  p_bio TEXT,
  p_phone_number TEXT,
  p_links JSONB,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.members
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.update_current_member_profile(
    p_expected_version, p_bio, p_phone_number, p_links, p_reason, p_operation_key
  )
$$;

-- Keep onboarding compatible while recording the first immutable profile state.
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
  target_member public.members;
  normalized_bio TEXT := btrim(p_bio);
  normalized_links JSONB := COALESCE(p_links, '{}'::JSONB);
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF normalized_bio IS NULL OR char_length(normalized_bio) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Bio must contain 1 to 1000 characters' USING ERRCODE = '22023';
  END IF;
  PERFORM private.validate_member_profile_links(normalized_links);

  SELECT * INTO target_member FROM public.members
  WHERE auth_id = (SELECT auth.uid()) AND member_status = 'ACTIVE'
  FOR UPDATE;
  IF target_member.id IS NULL THEN
    RAISE EXCEPTION 'Active linked member account required' USING ERRCODE = '42501';
  END IF;
  IF p_full_name IS DISTINCT FROM target_member.full_name THEN
    RAISE EXCEPTION 'Registered full name cannot be changed during profile completion'
      USING ERRCODE = '42501';
  END IF;
  IF target_member.profile_completed_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.members
  SET bio = normalized_bio, links = normalized_links,
      profile_completed_at = clock_timestamp()
  WHERE id = target_member.id
  RETURNING * INTO target_member;

  INSERT INTO public.member_profile_revisions(
    member_id, revision_number, bio, phone_number, links, actor_id, reason,
    operation_key
  ) VALUES (
    target_member.id, target_member.profile_version, target_member.bio,
    target_member.phone_number, target_member.links, target_member.id,
    'Initial profile completion', gen_random_uuid()
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    target_member.id, 'MEMBER_PROFILE_COMPLETED', 'member', target_member.id::TEXT,
    jsonb_build_object(
      'fields', jsonb_build_array('bio', 'links'),
      'profile_version', target_member.profile_version,
      'registry_full_name_preserved', TRUE
    )
  );
END
$$;

CREATE OR REPLACE FUNCTION private.get_portal_settings()
RETURNS public.app_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  settings_row public.app_settings;
  caller_id UUID := private.current_member_id();
BEGIN
  IF caller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.members AS member
    WHERE member.id = caller_id AND member.member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active member access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT settings_row FROM public.app_settings
  WHERE key = 'PORTAL_SETTINGS';
  RETURN settings_row;
END
$$;

CREATE OR REPLACE FUNCTION public.get_portal_settings()
RETURNS public.app_settings
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.get_portal_settings() $$;

CREATE OR REPLACE FUNCTION private.update_portal_settings(
  p_expected_version INTEGER,
  p_organization_name TEXT,
  p_support_email TEXT,
  p_dashboard_message TEXT,
  p_default_report_days INTEGER,
  p_leaderboard_limit INTEGER,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.app_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  setting_row public.app_settings;
  prior_revision public.app_setting_revisions;
  next_value JSONB;
  normalized_name TEXT := btrim(p_organization_name);
  normalized_email TEXT := lower(NULLIF(btrim(p_support_email), ''));
  normalized_message TEXT := COALESCE(NULLIF(btrim(p_dashboard_message), ''), '');
  normalized_reason TEXT := btrim(p_reason);
BEGIN
  IF normalized_name IS NULL OR char_length(normalized_name) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Organization name must contain 2 to 120 characters'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_email IS NOT NULL AND (
    char_length(normalized_email) > 254
    OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'Support email is invalid' USING ERRCODE = '22023';
  END IF;
  IF char_length(normalized_message) > 500 THEN
    RAISE EXCEPTION 'Dashboard message must not exceed 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_default_report_days NOT BETWEEN 1 AND 366 THEN
    RAISE EXCEPTION 'Default report range must be 1 to 366 days'
      USING ERRCODE = '22023';
  END IF;
  IF p_leaderboard_limit NOT BETWEEN 10 AND 100 THEN
    RAISE EXCEPTION 'Leaderboard limit must be 10 to 100 rows'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'A settings-change reason of 5 to 500 characters is required'
      USING ERRCODE = '22023';
  END IF;

  next_value := jsonb_build_object(
    'organization_name', normalized_name,
    'support_email', COALESCE(normalized_email, ''),
    'dashboard_message', normalized_message,
    'default_report_days', p_default_report_days,
    'leaderboard_limit', p_leaderboard_limit
  );

  SELECT * INTO setting_row FROM public.app_settings
  WHERE key = 'PORTAL_SETTINGS' FOR UPDATE;

  SELECT * INTO prior_revision FROM public.app_setting_revisions
  WHERE operation_key = p_operation_key;
  IF prior_revision.id IS NOT NULL THEN
    IF prior_revision.setting_id <> setting_row.id
       OR prior_revision.to_value IS DISTINCT FROM next_value
       OR prior_revision.reason IS DISTINCT FROM normalized_reason THEN
      RAISE EXCEPTION 'Operation key was already used for different settings'
        USING ERRCODE = '23505';
    END IF;
    RETURN setting_row;
  END IF;

  IF setting_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'Settings changed in another session; reload before saving'
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.app_setting_revisions(
    setting_id, setting_key, from_version, to_version, from_value, to_value,
    actor_id, reason, operation_key
  ) VALUES (
    setting_row.id, setting_row.key, setting_row.version,
    setting_row.version + 1, setting_row.value, next_value,
    actor_id, normalized_reason, p_operation_key
  );

  UPDATE public.app_settings
  SET value = next_value, version = version + 1, updated_by = actor_id
  WHERE id = setting_row.id
  RETURNING * INTO setting_row;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'PORTAL_SETTINGS_UPDATED', 'app_setting', setting_row.id::TEXT,
    jsonb_build_object(
      'key', setting_row.key,
      'version', setting_row.version,
      'reason', normalized_reason,
      'operation_key', p_operation_key
    )
  );
  RETURN setting_row;
END
$$;

CREATE OR REPLACE FUNCTION public.update_portal_settings(
  p_expected_version INTEGER,
  p_organization_name TEXT,
  p_support_email TEXT,
  p_dashboard_message TEXT,
  p_default_report_days INTEGER,
  p_leaderboard_limit INTEGER,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.app_settings
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.update_portal_settings(
    p_expected_version, p_organization_name, p_support_email,
    p_dashboard_message, p_default_report_days, p_leaderboard_limit,
    p_reason, p_operation_key
  )
$$;

CREATE OR REPLACE FUNCTION private.get_current_member_dashboard_summary()
RETURNS TABLE (
  current_balance INTEGER,
  confirmed_attendance_count BIGINT,
  active_badge_count BIGINT,
  issued_certificate_count BIGINT,
  open_redemption_count BIGINT,
  unread_notification_count BIGINT,
  upcoming_event_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := private.current_member_id();
BEGIN
  IF caller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.members AS member
    WHERE member.id = caller_id AND member.member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active member access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT
    COALESCE((
      SELECT ledger.balance_after FROM public.points_ledger AS ledger
      WHERE ledger.member_id = caller_id
      ORDER BY ledger.ledger_sequence DESC LIMIT 1
    ), 0)::INTEGER,
    (SELECT count(*) FROM public.event_attendance AS attendance
      WHERE attendance.member_id = caller_id AND attendance.status = 'CONFIRMED'),
    (SELECT count(*) FROM public.member_badges AS award
      WHERE award.member_id = caller_id AND award.status = 'AWARDED'),
    (SELECT count(*) FROM public.certificates AS certificate
      WHERE certificate.member_id = caller_id AND certificate.status = 'ISSUED'),
    (SELECT count(*) FROM public.redemptions AS redemption
      WHERE redemption.member_id = caller_id AND redemption.status IN ('PENDING', 'APPROVED')),
    (SELECT count(*) FROM public.notifications AS notification
      WHERE notification.member_id = caller_id AND NOT notification.read
        AND notification.dismissed_at IS NULL),
    (SELECT count(*) FROM public.events AS event
      WHERE event.status = 'PUBLISHED' AND event.start_at >= pg_catalog.now());
END
$$;

CREATE OR REPLACE FUNCTION public.get_current_member_dashboard_summary()
RETURNS TABLE (
  current_balance INTEGER,
  confirmed_attendance_count BIGINT,
  active_badge_count BIGINT,
  issued_certificate_count BIGINT,
  open_redemption_count BIGINT,
  unread_notification_count BIGINT,
  upcoming_event_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT * FROM private.get_current_member_dashboard_summary() $$;

REVOKE ALL ON FUNCTION private.validate_member_profile_links(JSONB)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.update_current_member_profile(INTEGER, TEXT, TEXT, JSONB, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_current_member_profile(INTEGER, TEXT, TEXT, JSONB, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.complete_current_member_profile(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_portal_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_portal_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.update_portal_settings(INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_portal_settings(INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_current_member_dashboard_summary()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_member_dashboard_summary()
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.validate_member_profile_links(JSONB)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_current_member_profile(INTEGER, TEXT, TEXT, JSONB, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_current_member_profile(INTEGER, TEXT, TEXT, JSONB, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.complete_current_member_profile(TEXT, TEXT, JSONB)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_portal_settings(), public.get_portal_settings(),
  private.get_current_member_dashboard_summary(),
  public.get_current_member_dashboard_summary()
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_portal_settings(INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID),
  public.update_portal_settings(INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, UUID)
  TO authenticated;

COMMIT;
