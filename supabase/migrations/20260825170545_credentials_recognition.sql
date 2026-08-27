BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260825154838'
  ) THEN
    RAISE EXCEPTION 'Phase 6 attendance must be deployed before credentials and recognition';
  END IF;

  IF to_regclass('public.badge_award_status_history') IS NOT NULL
     OR to_regclass('public.badge_award_batches') IS NOT NULL
     OR to_regclass('public.certificate_issuance_batches') IS NOT NULL
     OR to_regclass('public.certificate_status_history') IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 7 credential objects already exist outside migration history';
  END IF;
END
$$;

-- Badge catalog hardening.
ALTER TABLE public.badges
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN active SET DEFAULT TRUE,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ADD COLUMN icon_url TEXT,
  ADD COLUMN created_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD CONSTRAINT badges_slug_format_check CHECK (
    slug = lower(btrim(slug))
    AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 1 AND 80
  ),
  ADD CONSTRAINT badges_name_check CHECK (
    name = btrim(name) AND char_length(name) BETWEEN 1 AND 120
  ),
  ADD CONSTRAINT badges_description_check CHECK (
    description IS NULL OR char_length(description) <= 1000
  ),
  ADD CONSTRAINT badges_icon_url_check CHECK (
    icon_url IS NULL
    OR (
      char_length(icon_url) <= 2000
      AND icon_url ~ '^https://'
    )
  ),
  ADD CONSTRAINT badges_timestamps_check CHECK (updated_at >= created_at);

CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Existing member_badges rows become legacy manual awards. A generated operation
-- key provides a stable identity for every pre-Phase-7 award.
ALTER TABLE public.member_badges
  ALTER COLUMN earned_at SET DEFAULT NOW(),
  ALTER COLUMN earned_at SET NOT NULL,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'AWARDED',
  ADD COLUMN source TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE RESTRICT,
  ADD COLUMN attendance_id UUID REFERENCES public.event_attendance(id) ON DELETE RESTRICT,
  ADD COLUMN reason TEXT,
  ADD COLUMN awarded_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN operation_key UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD COLUMN revoked_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN revocation_reason TEXT,
  ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD CONSTRAINT member_badges_status_check CHECK (
    status IN ('AWARDED', 'REVOKED')
  ),
  ADD CONSTRAINT member_badges_source_check CHECK (
    source IN ('MANUAL', 'EVENT_ATTENDANCE')
  ),
  ADD CONSTRAINT member_badges_source_links_check CHECK (
    (source = 'MANUAL' AND event_id IS NULL AND attendance_id IS NULL)
    OR
    (source = 'EVENT_ATTENDANCE' AND event_id IS NOT NULL AND attendance_id IS NOT NULL)
  ),
  ADD CONSTRAINT member_badges_reason_check CHECK (
    reason IS NULL OR char_length(reason) BETWEEN 3 AND 500
  ),
  ADD CONSTRAINT member_badges_revocation_check CHECK (
    (status = 'AWARDED'
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND revocation_reason IS NULL)
    OR
    (status = 'REVOKED'
      AND revoked_at IS NOT NULL
      AND revoked_by IS NOT NULL
      AND char_length(revocation_reason) BETWEEN 3 AND 500)
  ),
  ADD CONSTRAINT member_badges_operation_key_key UNIQUE (operation_key);

UPDATE public.member_badges
   SET created_at = earned_at,
       updated_at = earned_at;

ALTER TABLE public.member_badges
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT member_badges_timestamps_check CHECK (
    updated_at >= created_at AND earned_at >= created_at
  );

CREATE INDEX member_badges_member_timeline_idx
  ON public.member_badges(member_id, earned_at DESC, id);
CREATE INDEX member_badges_event_idx
  ON public.member_badges(event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX member_badges_attendance_idx
  ON public.member_badges(attendance_id)
  WHERE attendance_id IS NOT NULL;

CREATE TRIGGER update_member_badges_updated_at
  BEFORE UPDATE ON public.member_badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.badge_award_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  operation_key UUID NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  eligible_count INTEGER NOT NULL DEFAULT 0,
  awarded_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT badge_award_batches_reason_check CHECK (
    char_length(reason) BETWEEN 3 AND 500
  ),
  CONSTRAINT badge_award_batches_counts_check CHECK (
    eligible_count >= 0
    AND awarded_count >= 0
    AND skipped_count >= 0
    AND eligible_count = awarded_count + skipped_count
  )
);

CREATE INDEX badge_award_batches_event_idx
  ON public.badge_award_batches(event_id, created_at DESC, id);

CREATE TABLE public.badge_award_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_badge_id UUID NOT NULL REFERENCES public.member_badges(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  reason TEXT,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT badge_award_history_status_check CHECK (
    (from_status IS NULL OR from_status IN ('AWARDED', 'REVOKED'))
    AND to_status IN ('AWARDED', 'REVOKED')
  ),
  CONSTRAINT badge_award_history_transition_check CHECK (
    (from_status IS NULL AND to_status = 'AWARDED')
    OR (from_status = 'AWARDED' AND to_status = 'REVOKED')
    OR (from_status = 'REVOKED' AND to_status = 'AWARDED')
  ),
  CONSTRAINT badge_award_history_reason_check CHECK (
    reason IS NULL OR char_length(reason) BETWEEN 3 AND 500
  )
);

CREATE INDEX badge_award_history_award_timeline_idx
  ON public.badge_award_status_history(member_badge_id, created_at, id);

-- Seed immutable history for any legacy awards.
INSERT INTO public.badge_award_status_history(
  member_badge_id, from_status, to_status, actor_id, reason,
  operation_key, created_at
)
SELECT id, NULL, 'AWARDED', NULL, 'Legacy award imported into Phase 7',
       operation_key, earned_at
  FROM public.member_badges;

-- Certificate issuance is prepared in the database, rendered by the trusted
-- application server, and finalized only after the private object upload succeeds.
CREATE TABLE public.certificate_issuance_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  template_version TEXT NOT NULL,
  operation_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PREPARED',
  eligible_count INTEGER NOT NULL DEFAULT 0,
  prepared_count INTEGER NOT NULL DEFAULT 0,
  issued_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certificate_batches_title_check CHECK (
    title = btrim(title) AND char_length(title) BETWEEN 1 AND 200
  ),
  CONSTRAINT certificate_batches_template_check CHECK (
    template_version = btrim(template_version)
    AND template_version ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$'
  ),
  CONSTRAINT certificate_batches_status_check CHECK (
    status IN ('PREPARED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED')
  ),
  CONSTRAINT certificate_batches_counts_check CHECK (
    eligible_count >= 0
    AND prepared_count >= 0
    AND issued_count >= 0
    AND failed_count >= 0
    AND prepared_count <= eligible_count
    AND issued_count + failed_count <= prepared_count
  ),
  CONSTRAINT certificate_batches_timestamps_check CHECK (updated_at >= created_at)
);

CREATE INDEX certificate_batches_event_idx
  ON public.certificate_issuance_batches(event_id, created_at DESC, id);

CREATE TRIGGER update_certificate_batches_updated_at
  BEFORE UPDATE ON public.certificate_issuance_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.certificates
  DROP COLUMN pdf_url,
  ALTER COLUMN event_id SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN certificate_number SET NOT NULL,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN issued_at DROP DEFAULT,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ADD COLUMN attendance_id UUID NOT NULL REFERENCES public.event_attendance(id) ON DELETE RESTRICT,
  ADD COLUMN issuance_batch_id UUID REFERENCES public.certificate_issuance_batches(id) ON DELETE RESTRICT,
  ADD COLUMN storage_path TEXT,
  ADD COLUMN template_version TEXT NOT NULL DEFAULT 'axis-placeholder-v1',
  ADD COLUMN issued_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN request_operation_key UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN failure_reason TEXT,
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD COLUMN revoked_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN revocation_reason TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD CONSTRAINT certificates_attendance_key UNIQUE (attendance_id),
  ADD CONSTRAINT certificates_request_operation_key_key UNIQUE (request_operation_key),
  ADD CONSTRAINT certificates_title_check CHECK (
    title = btrim(title) AND char_length(title) BETWEEN 1 AND 200
  ),
  ADD CONSTRAINT certificates_number_check CHECK (
    certificate_number ~ '^GDGHAU-[0-9A-F]{32}$'
  ),
  ADD CONSTRAINT certificates_status_check CHECK (
    status IN ('PENDING', 'ISSUED', 'FAILED', 'REVOKED')
  ),
  ADD CONSTRAINT certificates_storage_path_check CHECK (
    storage_path IS NULL
    OR (
      char_length(storage_path) BETWEEN 1 AND 500
      AND storage_path !~ '(^|/)\.\.(/|$)'
      AND storage_path ~ '^[0-9a-f-]{36}/GDGHAU-[0-9A-F]{32}\.pdf$'
    )
  ),
  ADD CONSTRAINT certificates_template_check CHECK (
    template_version = btrim(template_version)
    AND template_version ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$'
  ),
  ADD CONSTRAINT certificates_failure_reason_check CHECK (
    failure_reason IS NULL OR char_length(failure_reason) BETWEEN 3 AND 500
  ),
  ADD CONSTRAINT certificates_state_metadata_check CHECK (
    (status = 'PENDING'
      AND storage_path IS NULL
      AND issued_at IS NULL
      AND issued_by IS NULL
      AND failure_reason IS NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND revocation_reason IS NULL)
    OR
    (status = 'FAILED'
      AND storage_path IS NULL
      AND issued_at IS NULL
      AND issued_by IS NULL
      AND char_length(failure_reason) BETWEEN 3 AND 500
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND revocation_reason IS NULL)
    OR
    (status = 'ISSUED'
      AND storage_path IS NOT NULL
      AND issued_at IS NOT NULL
      AND issued_by IS NOT NULL
      AND failure_reason IS NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
      AND revocation_reason IS NULL)
    OR
    (status = 'REVOKED'
      AND storage_path IS NOT NULL
      AND issued_at IS NOT NULL
      AND issued_by IS NOT NULL
      AND failure_reason IS NULL
      AND revoked_at IS NOT NULL
      AND revoked_by IS NOT NULL
      AND char_length(revocation_reason) BETWEEN 3 AND 500)
  ),
  ADD CONSTRAINT certificates_timestamps_check CHECK (
    updated_at >= created_at
    AND (issued_at IS NULL OR issued_at >= created_at)
    AND (revoked_at IS NULL OR revoked_at >= issued_at)
  );

CREATE INDEX certificates_member_timeline_idx
  ON public.certificates(member_id, created_at DESC, id);
CREATE INDEX certificates_event_idx
  ON public.certificates(event_id, status, id);
CREATE INDEX certificates_batch_idx
  ON public.certificates(issuance_batch_id, status, id)
  WHERE issuance_batch_id IS NOT NULL;

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.certificate_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  reason TEXT,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certificate_history_status_check CHECK (
    (from_status IS NULL OR from_status IN ('PENDING', 'ISSUED', 'FAILED', 'REVOKED'))
    AND to_status IN ('PENDING', 'ISSUED', 'FAILED', 'REVOKED')
  ),
  CONSTRAINT certificate_history_transition_check CHECK (
    (from_status IS NULL AND to_status = 'PENDING')
    OR (from_status = 'PENDING' AND to_status IN ('ISSUED', 'FAILED'))
    OR (from_status = 'FAILED' AND to_status = 'PENDING')
    OR (from_status = 'ISSUED' AND to_status = 'REVOKED')
  ),
  CONSTRAINT certificate_history_reason_check CHECK (
    reason IS NULL OR char_length(reason) BETWEEN 3 AND 500
  )
);

CREATE INDEX certificate_history_certificate_timeline_idx
  ON public.certificate_status_history(certificate_id, created_at, id);

-- Private PDF storage: browser sessions never receive direct object privileges.
INSERT INTO storage.buckets(
  id, name, public, file_size_limit, allowed_mime_types
) VALUES (
  'certificates',
  'certificates',
  FALSE,
  10485760,
  ARRAY['application/pdf']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = FALSE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS and privileges. All writes go through the functions below.
ALTER TABLE public.badge_award_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_award_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_issuance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS badges_public_read ON public.badges;
DROP POLICY IF EXISTS badges_authenticated_read ON public.badges;
CREATE POLICY badges_public_read ON public.badges
  FOR SELECT TO anon USING (active);
CREATE POLICY badges_authenticated_read ON public.badges
  FOR SELECT TO authenticated
  USING (
    active
    OR (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.member_badges AS award
      WHERE award.badge_id = badges.id
        AND award.member_id = (SELECT public.current_member_id())
    )
  );

DROP POLICY IF EXISTS member_badges_authorized_read ON public.member_badges;
CREATE POLICY member_badges_authorized_read ON public.member_badges
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

DROP POLICY IF EXISTS certificates_authorized_read ON public.certificates;
CREATE POLICY certificates_authorized_read ON public.certificates
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

CREATE POLICY badge_award_batches_admin_read
  ON public.badge_award_batches
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY badge_award_history_authorized_read
  ON public.badge_award_status_history
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.member_badges AS award
      WHERE award.id = member_badge_id
        AND award.member_id = (SELECT public.current_member_id())
    )
  );

CREATE POLICY certificate_batches_admin_read
  ON public.certificate_issuance_batches
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY certificate_history_authorized_read
  ON public.certificate_status_history
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.certificates AS certificate
      WHERE certificate.id = certificate_id
        AND certificate.member_id = (SELECT public.current_member_id())
    )
  );

DO $$
DECLARE
  write_policy RECORD;
BEGIN
  FOR write_policy IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN (
         'badges', 'member_badges', 'badge_award_batches',
         'badge_award_status_history', 'certificates',
         'certificate_issuance_batches', 'certificate_status_history'
       )
       AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      write_policy.policyname,
      write_policy.schemaname,
      write_policy.tablename
    );
  END LOOP;
END
$$;

REVOKE ALL ON TABLE public.badges, public.member_badges,
  public.badge_award_batches, public.badge_award_status_history,
  public.certificates, public.certificate_issuance_batches,
  public.certificate_status_history
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.badges TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.member_badges,
  public.badge_award_batches, public.badge_award_status_history,
  public.certificates, public.certificate_issuance_batches,
  public.certificate_status_history
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.create_recognition_badge(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_icon_url TEXT,
  p_active BOOLEAN
)
RETURNS public.badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  badge_row public.badges;
BEGIN
  INSERT INTO public.badges(
    slug, name, description, icon_url, active, created_by
  ) VALUES (
    lower(btrim(p_slug)),
    btrim(p_name),
    NULLIF(btrim(p_description), ''),
    NULLIF(btrim(p_icon_url), ''),
    COALESCE(p_active, FALSE),
    actor_id
  )
  RETURNING * INTO badge_row;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'RECOGNITION_BADGE_CREATED',
    'badge',
    badge_row.id::TEXT,
    jsonb_build_object('slug', badge_row.slug, 'active', badge_row.active)
  );

  RETURN badge_row;
END
$$;

CREATE OR REPLACE FUNCTION private.update_recognition_badge(
  p_badge_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_icon_url TEXT,
  p_active BOOLEAN
)
RETURNS public.badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  badge_row public.badges;
BEGIN
  UPDATE public.badges
     SET name = btrim(p_name),
         description = NULLIF(btrim(p_description), ''),
         icon_url = NULLIF(btrim(p_icon_url), ''),
         active = COALESCE(p_active, FALSE)
   WHERE id = p_badge_id
  RETURNING * INTO badge_row;

  IF badge_row.id IS NULL THEN
    RAISE EXCEPTION 'Badge not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'RECOGNITION_BADGE_UPDATED',
    'badge',
    badge_row.id::TEXT,
    jsonb_build_object('active', badge_row.active)
  );

  RETURN badge_row;
END
$$;

CREATE OR REPLACE FUNCTION private.award_recognition_badge(
  p_member_id UUID,
  p_badge_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.member_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  award_row public.member_badges;
  previous_status TEXT;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT award.*
    INTO award_row
    FROM public.badge_award_status_history AS history
    JOIN public.member_badges AS award ON award.id = history.member_badge_id
   WHERE history.operation_key = p_operation_key;

  IF award_row.id IS NOT NULL THEN
    RETURN award_row;
  END IF;

  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Award reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_member_id AND member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active member not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.badges WHERE id = p_badge_id AND active
  ) THEN
    RAISE EXCEPTION 'Active badge not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO award_row
    FROM public.member_badges
   WHERE member_id = p_member_id AND badge_id = p_badge_id
   FOR UPDATE;

  previous_status := award_row.status;

  IF award_row.id IS NULL THEN
    INSERT INTO public.member_badges(
      member_id, badge_id, status, source, reason, awarded_by,
      operation_key
    ) VALUES (
      p_member_id, p_badge_id, 'AWARDED', 'MANUAL', normalized_reason,
      actor_id, p_operation_key
    )
    RETURNING * INTO award_row;
  ELSIF award_row.status = 'AWARDED' THEN
    RAISE EXCEPTION 'Member already holds this badge' USING ERRCODE = '23505';
  ELSE
    UPDATE public.member_badges
       SET status = 'AWARDED',
           source = 'MANUAL',
           event_id = NULL,
           attendance_id = NULL,
           reason = normalized_reason,
           awarded_by = actor_id,
           operation_key = p_operation_key,
           earned_at = NOW(),
           revoked_at = NULL,
           revoked_by = NULL,
           revocation_reason = NULL
     WHERE id = award_row.id
    RETURNING * INTO award_row;
  END IF;

  INSERT INTO public.badge_award_status_history(
    member_badge_id, from_status, to_status, actor_id, reason, operation_key
  ) VALUES (
    award_row.id,
    previous_status,
    'AWARDED',
    actor_id,
    normalized_reason,
    p_operation_key
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'RECOGNITION_BADGE_AWARDED',
    'member_badge',
    award_row.id::TEXT,
    jsonb_build_object(
      'member_id', p_member_id,
      'badge_id', p_badge_id,
      'source', 'MANUAL',
      'operation_key', p_operation_key
    )
  );

  RETURN award_row;
END
$$;

CREATE OR REPLACE FUNCTION private.revoke_recognition_badge(
  p_member_badge_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.member_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  award_row public.member_badges;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT award.*
    INTO award_row
    FROM public.badge_award_status_history AS history
    JOIN public.member_badges AS award ON award.id = history.member_badge_id
   WHERE history.operation_key = p_operation_key;

  IF award_row.id IS NOT NULL THEN
    RETURN award_row;
  END IF;

  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Revocation reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO award_row
    FROM public.member_badges
   WHERE id = p_member_badge_id
   FOR UPDATE;

  IF award_row.id IS NULL THEN
    RAISE EXCEPTION 'Badge award not found' USING ERRCODE = 'P0002';
  END IF;
  IF award_row.status <> 'AWARDED' THEN
    RAISE EXCEPTION 'Only an awarded badge can be revoked' USING ERRCODE = '23514';
  END IF;

  UPDATE public.member_badges
     SET status = 'REVOKED',
         revoked_at = pg_catalog.clock_timestamp(),
         revoked_by = actor_id,
         revocation_reason = normalized_reason
   WHERE id = p_member_badge_id
  RETURNING * INTO award_row;

  INSERT INTO public.badge_award_status_history(
    member_badge_id, from_status, to_status, actor_id, reason, operation_key
  ) VALUES (
    award_row.id, 'AWARDED', 'REVOKED', actor_id,
    normalized_reason, p_operation_key
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'RECOGNITION_BADGE_REVOKED',
    'member_badge',
    award_row.id::TEXT,
    jsonb_build_object(
      'member_id', award_row.member_id,
      'badge_id', award_row.badge_id,
      'operation_key', p_operation_key
    )
  );

  RETURN award_row;
END
$$;

CREATE OR REPLACE FUNCTION private.award_event_recognition_badge(
  p_event_id UUID,
  p_badge_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.badge_award_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  batch_row public.badge_award_batches;
  attendance_row public.event_attendance;
  award_row public.member_badges;
  eligible_total INTEGER := 0;
  awarded_total INTEGER := 0;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO batch_row
    FROM public.badge_award_batches
   WHERE operation_key = p_operation_key;
  IF batch_row.id IS NOT NULL THEN
    RETURN batch_row;
  END IF;

  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Award reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.badges WHERE id = p_badge_id AND active) THEN
    RAISE EXCEPTION 'Active badge not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*)::INTEGER
    INTO eligible_total
    FROM public.event_attendance AS attendance
    JOIN public.members AS member ON member.id = attendance.member_id
   WHERE attendance.event_id = p_event_id
     AND attendance.status = 'CONFIRMED'
     AND member.member_status = 'ACTIVE';

  INSERT INTO public.badge_award_batches(
    badge_id, event_id, operation_key, reason, eligible_count,
    awarded_count, skipped_count, created_by
  ) VALUES (
    p_badge_id, p_event_id, p_operation_key, normalized_reason,
    eligible_total, 0, eligible_total, actor_id
  ) RETURNING * INTO batch_row;

  FOR attendance_row IN
    SELECT attendance.*
      FROM public.event_attendance AS attendance
      JOIN public.members AS member ON member.id = attendance.member_id
     WHERE attendance.event_id = p_event_id
       AND attendance.status = 'CONFIRMED'
       AND member.member_status = 'ACTIVE'
     ORDER BY attendance.id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.member_badges
       WHERE member_id = attendance_row.member_id
         AND badge_id = p_badge_id
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.member_badges(
      member_id, badge_id, status, source, event_id, attendance_id,
      reason, awarded_by
    ) VALUES (
      attendance_row.member_id, p_badge_id, 'AWARDED',
      'EVENT_ATTENDANCE', p_event_id, attendance_row.id,
      normalized_reason, actor_id
    ) RETURNING * INTO award_row;

    INSERT INTO public.badge_award_status_history(
      member_badge_id, from_status, to_status, actor_id, reason, operation_key
    ) VALUES (
      award_row.id, NULL, 'AWARDED', actor_id,
      normalized_reason, award_row.operation_key
    );

    awarded_total := awarded_total + 1;
  END LOOP;

  UPDATE public.badge_award_batches
     SET awarded_count = awarded_total,
         skipped_count = eligible_total - awarded_total
   WHERE id = batch_row.id
  RETURNING * INTO batch_row;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'RECOGNITION_EVENT_BADGE_BATCH_COMPLETED',
    'badge_award_batch',
    batch_row.id::TEXT,
    jsonb_build_object(
      'event_id', p_event_id,
      'badge_id', p_badge_id,
      'eligible_count', eligible_total,
      'awarded_count', awarded_total,
      'operation_key', p_operation_key
    )
  );

  RETURN batch_row;
END
$$;

CREATE OR REPLACE FUNCTION private.refresh_certificate_batch(
  p_batch_id UUID
)
RETURNS public.certificate_issuance_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  batch_row public.certificate_issuance_batches;
  issued_total INTEGER;
  failed_total INTEGER;
  pending_total INTEGER;
  next_status TEXT;
BEGIN
  SELECT *
    INTO batch_row
    FROM public.certificate_issuance_batches
   WHERE id = p_batch_id
   FOR UPDATE;

  IF batch_row.id IS NULL THEN
    RAISE EXCEPTION 'Certificate batch not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    count(*) FILTER (WHERE status = 'ISSUED')::INTEGER,
    count(*) FILTER (WHERE status = 'FAILED')::INTEGER,
    count(*) FILTER (WHERE status = 'PENDING')::INTEGER
  INTO issued_total, failed_total, pending_total
  FROM public.certificates
  WHERE issuance_batch_id = p_batch_id;

  next_status := CASE
    WHEN batch_row.prepared_count = 0 THEN 'COMPLETED'
    WHEN pending_total > 0 AND issued_total + failed_total = 0 THEN 'PREPARED'
    WHEN pending_total > 0 THEN 'PROCESSING'
    WHEN issued_total = batch_row.prepared_count THEN 'COMPLETED'
    WHEN failed_total = batch_row.prepared_count THEN 'FAILED'
    ELSE 'PARTIAL'
  END;

  UPDATE public.certificate_issuance_batches
     SET issued_count = issued_total,
         failed_count = failed_total,
         status = next_status
   WHERE id = p_batch_id
  RETURNING * INTO batch_row;

  RETURN batch_row;
END
$$;

CREATE OR REPLACE FUNCTION private.prepare_event_certificate_batch(
  p_event_id UUID,
  p_title TEXT,
  p_template_version TEXT,
  p_operation_key UUID
)
RETURNS public.certificate_issuance_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_title TEXT := btrim(p_title);
  normalized_template TEXT := btrim(p_template_version);
  batch_row public.certificate_issuance_batches;
  attendance_row public.event_attendance;
  certificate_id UUID;
  certificate_operation_key UUID;
  certificate_number_value TEXT;
  eligible_total INTEGER := 0;
  prepared_total INTEGER := 0;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO batch_row
    FROM public.certificate_issuance_batches
   WHERE operation_key = p_operation_key;
  IF batch_row.id IS NOT NULL THEN
    RETURN batch_row;
  END IF;

  IF normalized_title IS NULL OR char_length(normalized_title) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Certificate title must contain 1 to 200 characters'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_template IS NULL
     OR normalized_template !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$' THEN
    RAISE EXCEPTION 'Invalid certificate template version'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*)::INTEGER
    INTO eligible_total
    FROM public.event_attendance
   WHERE event_id = p_event_id
     AND status = 'CONFIRMED';

  INSERT INTO public.certificate_issuance_batches(
    event_id, title, template_version, operation_key, status,
    eligible_count, prepared_count, created_by
  ) VALUES (
    p_event_id, normalized_title, normalized_template, p_operation_key,
    'PREPARED', eligible_total, 0, actor_id
  ) RETURNING * INTO batch_row;

  FOR attendance_row IN
    SELECT *
      FROM public.event_attendance
     WHERE event_id = p_event_id
       AND status = 'CONFIRMED'
     ORDER BY id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.certificates
       WHERE attendance_id = attendance_row.id
    ) THEN
      CONTINUE;
    END IF;

    certificate_id := gen_random_uuid();
    certificate_operation_key := gen_random_uuid();
    certificate_number_value := 'GDGHAU-'
      || upper(replace(certificate_id::TEXT, '-', ''));

    INSERT INTO public.certificates(
      id, member_id, event_id, attendance_id, issuance_batch_id,
      title, certificate_number, status, template_version,
      request_operation_key, issued_at
    ) VALUES (
      certificate_id,
      attendance_row.member_id,
      p_event_id,
      attendance_row.id,
      batch_row.id,
      normalized_title,
      certificate_number_value,
      'PENDING',
      normalized_template,
      certificate_operation_key,
      NULL
    );

    INSERT INTO public.certificate_status_history(
      certificate_id, from_status, to_status, actor_id, reason, operation_key
    ) VALUES (
      certificate_id, NULL, 'PENDING', actor_id,
      'Certificate prepared from confirmed attendance',
      certificate_operation_key
    );

    prepared_total := prepared_total + 1;
  END LOOP;

  UPDATE public.certificate_issuance_batches
     SET prepared_count = prepared_total,
         status = CASE WHEN prepared_total = 0 THEN 'COMPLETED' ELSE 'PREPARED' END
   WHERE id = batch_row.id
  RETURNING * INTO batch_row;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'CERTIFICATE_BATCH_PREPARED',
    'certificate_issuance_batch',
    batch_row.id::TEXT,
    jsonb_build_object(
      'event_id', p_event_id,
      'eligible_count', eligible_total,
      'prepared_count', prepared_total,
      'template_version', normalized_template,
      'operation_key', p_operation_key
    )
  );

  RETURN batch_row;
END
$$;

CREATE OR REPLACE FUNCTION private.finalize_event_certificate(
  p_certificate_id UUID,
  p_storage_path TEXT,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_path TEXT := btrim(p_storage_path);
  expected_path TEXT;
  certificate_row public.certificates;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT certificate.*
    INTO certificate_row
    FROM public.certificate_status_history AS history
    JOIN public.certificates AS certificate
      ON certificate.id = history.certificate_id
   WHERE history.operation_key = p_operation_key;
  IF certificate_row.id IS NOT NULL THEN
    RETURN certificate_row;
  END IF;

  SELECT *
    INTO certificate_row
    FROM public.certificates
   WHERE id = p_certificate_id
   FOR UPDATE;

  IF certificate_row.id IS NULL THEN
    RAISE EXCEPTION 'Certificate not found' USING ERRCODE = 'P0002';
  END IF;
  IF certificate_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only a pending certificate can be finalized'
      USING ERRCODE = '23514';
  END IF;

  expected_path := certificate_row.event_id::TEXT || '/'
    || certificate_row.certificate_number || '.pdf';
  IF normalized_path IS DISTINCT FROM expected_path THEN
    RAISE EXCEPTION 'Certificate storage path does not match its immutable identity'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'certificates'
      AND name = normalized_path
  ) THEN
    RAISE EXCEPTION 'Certificate PDF object was not found in private storage'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.certificates
     SET status = 'ISSUED',
         storage_path = normalized_path,
         issued_at = pg_catalog.clock_timestamp(),
         issued_by = actor_id,
         failure_reason = NULL
   WHERE id = p_certificate_id
  RETURNING * INTO certificate_row;

  INSERT INTO public.certificate_status_history(
    certificate_id, from_status, to_status, actor_id, reason, operation_key
  ) VALUES (
    certificate_row.id, 'PENDING', 'ISSUED', actor_id,
    'Private certificate PDF stored successfully', p_operation_key
  );

  IF certificate_row.issuance_batch_id IS NOT NULL THEN
    PERFORM private.refresh_certificate_batch(certificate_row.issuance_batch_id);
  END IF;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'CERTIFICATE_ISSUED',
    'certificate',
    certificate_row.id::TEXT,
    jsonb_build_object(
      'certificate_number', certificate_row.certificate_number,
      'event_id', certificate_row.event_id,
      'operation_key', p_operation_key
    )
  );

  RETURN certificate_row;
END
$$;

CREATE OR REPLACE FUNCTION private.fail_event_certificate(
  p_certificate_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  certificate_row public.certificates;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT certificate.*
    INTO certificate_row
    FROM public.certificate_status_history AS history
    JOIN public.certificates AS certificate
      ON certificate.id = history.certificate_id
   WHERE history.operation_key = p_operation_key;
  IF certificate_row.id IS NOT NULL THEN
    RETURN certificate_row;
  END IF;

  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Failure reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO certificate_row
    FROM public.certificates
   WHERE id = p_certificate_id
   FOR UPDATE;
  IF certificate_row.id IS NULL THEN
    RAISE EXCEPTION 'Certificate not found' USING ERRCODE = 'P0002';
  END IF;
  IF certificate_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only a pending certificate can fail'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.certificates
     SET status = 'FAILED', failure_reason = normalized_reason
   WHERE id = p_certificate_id
  RETURNING * INTO certificate_row;

  INSERT INTO public.certificate_status_history(
    certificate_id, from_status, to_status, actor_id, reason, operation_key
  ) VALUES (
    certificate_row.id, 'PENDING', 'FAILED', actor_id,
    normalized_reason, p_operation_key
  );

  IF certificate_row.issuance_batch_id IS NOT NULL THEN
    PERFORM private.refresh_certificate_batch(certificate_row.issuance_batch_id);
  END IF;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'CERTIFICATE_GENERATION_FAILED',
    'certificate',
    certificate_row.id::TEXT,
    jsonb_build_object('operation_key', p_operation_key, 'reason', normalized_reason)
  );

  RETURN certificate_row;
END
$$;

CREATE OR REPLACE FUNCTION private.retry_event_certificate(
  p_certificate_id UUID,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  certificate_row public.certificates;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT certificate.*
    INTO certificate_row
    FROM public.certificate_status_history AS history
    JOIN public.certificates AS certificate
      ON certificate.id = history.certificate_id
   WHERE history.operation_key = p_operation_key;
  IF certificate_row.id IS NOT NULL THEN
    RETURN certificate_row;
  END IF;

  SELECT *
    INTO certificate_row
    FROM public.certificates
   WHERE id = p_certificate_id
   FOR UPDATE;
  IF certificate_row.id IS NULL THEN
    RAISE EXCEPTION 'Certificate not found' USING ERRCODE = 'P0002';
  END IF;
  IF certificate_row.status <> 'FAILED' THEN
    RAISE EXCEPTION 'Only a failed certificate can be retried'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.certificates
     SET status = 'PENDING', failure_reason = NULL
   WHERE id = p_certificate_id
  RETURNING * INTO certificate_row;

  INSERT INTO public.certificate_status_history(
    certificate_id, from_status, to_status, actor_id, reason, operation_key
  ) VALUES (
    certificate_row.id, 'FAILED', 'PENDING', actor_id,
    'Administrator requested certificate generation retry', p_operation_key
  );

  IF certificate_row.issuance_batch_id IS NOT NULL THEN
    PERFORM private.refresh_certificate_batch(certificate_row.issuance_batch_id);
  END IF;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'CERTIFICATE_GENERATION_RETRIED',
    'certificate',
    certificate_row.id::TEXT,
    jsonb_build_object('operation_key', p_operation_key)
  );

  RETURN certificate_row;
END
$$;

CREATE OR REPLACE FUNCTION private.revoke_event_certificate(
  p_certificate_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  certificate_row public.certificates;
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'Operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT certificate.*
    INTO certificate_row
    FROM public.certificate_status_history AS history
    JOIN public.certificates AS certificate
      ON certificate.id = history.certificate_id
   WHERE history.operation_key = p_operation_key;
  IF certificate_row.id IS NOT NULL THEN
    RETURN certificate_row;
  END IF;

  IF normalized_reason IS NULL OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Revocation reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO certificate_row
    FROM public.certificates
   WHERE id = p_certificate_id
   FOR UPDATE;
  IF certificate_row.id IS NULL THEN
    RAISE EXCEPTION 'Certificate not found' USING ERRCODE = 'P0002';
  END IF;
  IF certificate_row.status <> 'ISSUED' THEN
    RAISE EXCEPTION 'Only an issued certificate can be revoked'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.certificates
     SET status = 'REVOKED',
         revoked_at = pg_catalog.clock_timestamp(),
         revoked_by = actor_id,
         revocation_reason = normalized_reason
   WHERE id = p_certificate_id
  RETURNING * INTO certificate_row;

  INSERT INTO public.certificate_status_history(
    certificate_id, from_status, to_status, actor_id, reason, operation_key
  ) VALUES (
    certificate_row.id, 'ISSUED', 'REVOKED', actor_id,
    normalized_reason, p_operation_key
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'CERTIFICATE_REVOKED',
    'certificate',
    certificate_row.id::TEXT,
    jsonb_build_object(
      'certificate_number', certificate_row.certificate_number,
      'operation_key', p_operation_key,
      'reason', normalized_reason
    )
  );

  RETURN certificate_row;
END
$$;

CREATE OR REPLACE FUNCTION private.get_public_certificate_verification(
  p_certificate_number TEXT
)
RETURNS TABLE (
  certificate_number TEXT,
  certificate_status TEXT,
  certificate_title TEXT,
  member_full_name TEXT,
  member_gdg_id TEXT,
  event_title TEXT,
  event_start_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    certificate.certificate_number,
    certificate.status,
    certificate.title,
    member.full_name,
    member.gdg_id,
    event.title,
    event.start_at,
    certificate.issued_at
  FROM public.certificates AS certificate
  JOIN public.members AS member ON member.id = certificate.member_id
  JOIN public.events AS event ON event.id = certificate.event_id
  WHERE certificate.certificate_number = upper(btrim(p_certificate_number))
    AND certificate.status IN ('ISSUED', 'REVOKED')
  LIMIT 1
$$;

CREATE FUNCTION public.create_recognition_badge(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_icon_url TEXT,
  p_active BOOLEAN
)
RETURNS public.badges
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.create_recognition_badge(
    p_slug, p_name, p_description, p_icon_url, p_active
  )
$$;

CREATE FUNCTION public.update_recognition_badge(
  p_badge_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_icon_url TEXT,
  p_active BOOLEAN
)
RETURNS public.badges
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.update_recognition_badge(
    p_badge_id, p_name, p_description, p_icon_url, p_active
  )
$$;

CREATE FUNCTION public.award_recognition_badge(
  p_member_id UUID,
  p_badge_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.member_badges
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.award_recognition_badge(
    p_member_id, p_badge_id, p_reason, p_operation_key
  )
$$;

CREATE FUNCTION public.revoke_recognition_badge(
  p_member_badge_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.member_badges
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.revoke_recognition_badge(
    p_member_badge_id, p_reason, p_operation_key
  )
$$;

CREATE FUNCTION public.award_event_recognition_badge(
  p_event_id UUID,
  p_badge_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.badge_award_batches
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.award_event_recognition_badge(
    p_event_id, p_badge_id, p_reason, p_operation_key
  )
$$;

CREATE FUNCTION public.prepare_event_certificate_batch(
  p_event_id UUID,
  p_title TEXT,
  p_template_version TEXT,
  p_operation_key UUID
)
RETURNS public.certificate_issuance_batches
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.prepare_event_certificate_batch(
    p_event_id, p_title, p_template_version, p_operation_key
  )
$$;

CREATE FUNCTION public.finalize_event_certificate(
  p_certificate_id UUID,
  p_storage_path TEXT,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.finalize_event_certificate(
    p_certificate_id, p_storage_path, p_operation_key
  )
$$;

CREATE FUNCTION public.fail_event_certificate(
  p_certificate_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.fail_event_certificate(
    p_certificate_id, p_reason, p_operation_key
  )
$$;

CREATE FUNCTION public.retry_event_certificate(
  p_certificate_id UUID,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.retry_event_certificate(p_certificate_id, p_operation_key)
$$;

CREATE FUNCTION public.revoke_event_certificate(
  p_certificate_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.certificates
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.revoke_event_certificate(
    p_certificate_id, p_reason, p_operation_key
  )
$$;

CREATE FUNCTION public.get_public_certificate_verification(
  p_certificate_number TEXT
)
RETURNS TABLE (
  certificate_number TEXT,
  certificate_status TEXT,
  certificate_title TEXT,
  member_full_name TEXT,
  member_gdg_id TEXT,
  event_title TEXT,
  event_start_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.get_public_certificate_verification(p_certificate_number)
$$;

REVOKE ALL ON FUNCTION private.create_recognition_badge(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.update_recognition_badge(
  UUID, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.award_recognition_badge(
  UUID, UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.revoke_recognition_badge(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.award_event_recognition_badge(
  UUID, UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.refresh_certificate_batch(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.prepare_event_certificate_batch(
  UUID, TEXT, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.finalize_event_certificate(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.fail_event_certificate(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.retry_event_certificate(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.revoke_event_certificate(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_public_certificate_verification(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.create_recognition_badge(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_recognition_badge(
  UUID, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.award_recognition_badge(
  UUID, UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_recognition_badge(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.award_event_recognition_badge(
  UUID, UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.prepare_event_certificate_batch(
  UUID, TEXT, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.finalize_event_certificate(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.fail_event_certificate(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.retry_event_certificate(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_event_certificate(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_public_certificate_verification(TEXT)
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_recognition_badge(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_recognition_badge(
  UUID, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.award_recognition_badge(
  UUID, UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_recognition_badge(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.award_event_recognition_badge(
  UUID, UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_event_certificate_batch(
  UUID, TEXT, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_event_certificate(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fail_event_certificate(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.retry_event_certificate(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.revoke_event_certificate(
  UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_certificate_verification(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_recognition_badge(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_recognition_badge(
  UUID, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_recognition_badge(
  UUID, UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_recognition_badge(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_event_recognition_badge(
  UUID, UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_event_certificate_batch(
  UUID, TEXT, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_event_certificate(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_event_certificate(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_event_certificate(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_event_certificate(
  UUID, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_certificate_verification(TEXT)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
