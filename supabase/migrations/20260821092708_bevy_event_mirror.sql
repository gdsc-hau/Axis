-- Phase 3: mirror authoritative GDG Community (Bevy) event content while
-- keeping Luma as a separately managed registration destination.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source_provider TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS source_event_id TEXT,
  ADD COLUMN IF NOT EXISTS source_chapter_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_status TEXT,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_payload_hash TEXT;

UPDATE public.events
   SET status = 'DRAFT'
 WHERE status IS NULL;

ALTER TABLE public.events
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_source_provider_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_source_provider_check
      CHECK (source_provider IN ('MANUAL', 'BEVY'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_title_nonempty_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_title_nonempty_check
      CHECK (btrim(title) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_source_status_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_source_status_check
      CHECK (
        source_status IS NULL
        OR source_status IN ('Draft', 'Published', 'Canceled')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_bevy_identity_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_bevy_identity_check
      CHECK (
        source_provider <> 'BEVY'
        OR (
          NULLIF(btrim(source_event_id), '') IS NOT NULL
          AND NULLIF(btrim(source_chapter_id), '') IS NOT NULL
          AND source_url IS NOT NULL
          AND source_status IS NOT NULL
          AND start_at IS NOT NULL
          AND end_at IS NOT NULL
          AND source_updated_at IS NOT NULL
          AND last_synced_at IS NOT NULL
          AND source_payload_hash ~ '^[0-9a-f]{64}$'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_bevy_source_url_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_bevy_source_url_check
      CHECK (
        source_provider <> 'BEVY'
        OR source_url ~ '^https://gdg\.community\.dev/events/details/'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_image_url_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_image_url_check
      CHECK (image_url IS NULL OR image_url ~ '^https://');
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'events_luma_url_check'
       AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_luma_url_check
      CHECK (
        luma_url IS NULL
        OR luma_url ~* '^https://(www\.)?(luma\.com|lu\.ma)/[^[:space:]]+$'
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS events_source_identity_idx
  ON public.events(source_provider, source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_public_timeline_idx
  ON public.events(status, start_at, id);

-- GDG-owned event content may only enter through the service-role webhook.
-- Administrators update the separate Luma destination through the RPC below.
DROP POLICY IF EXISTS events_admin_insert ON public.events;
DROP POLICY IF EXISTS events_admin_update ON public.events;
DROP POLICY IF EXISTS events_admin_delete ON public.events;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.events
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.events TO service_role;
GRANT INSERT ON TABLE public.audit_logs TO service_role;

DROP POLICY IF EXISTS events_public_read ON public.events;
DROP POLICY IF EXISTS events_authenticated_read ON public.events;

CREATE POLICY events_public_read ON public.events
  FOR SELECT TO anon
  USING (status IN ('PUBLISHED', 'COMPLETED', 'CANCELLED'));

CREATE POLICY events_authenticated_read ON public.events
  FOR SELECT TO authenticated
  USING (
    status IN ('PUBLISHED', 'COMPLETED', 'CANCELLED')
    OR (SELECT public.is_admin())
  );

CREATE OR REPLACE FUNCTION public.sync_bevy_event(
  p_source_event_id TEXT,
  p_source_chapter_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_location TEXT,
  p_event_type TEXT,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_source_url TEXT,
  p_image_url TEXT,
  p_source_status TEXT,
  p_source_updated_at TIMESTAMPTZ,
  p_source_payload_hash TEXT
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  normalized_event_id TEXT := NULLIF(btrim(p_source_event_id), '');
  normalized_chapter_id TEXT := NULLIF(btrim(p_source_chapter_id), '');
  normalized_title TEXT := NULLIF(btrim(p_title), '');
  prior_event public.events;
  synced_event public.events;
BEGIN
  IF normalized_event_id IS NULL OR normalized_chapter_id IS NULL THEN
    RAISE EXCEPTION 'Bevy event and chapter identifiers are required'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_title IS NULL OR char_length(normalized_title) > 300 THEN
    RAISE EXCEPTION 'Bevy event title must contain 1 to 300 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_source_status NOT IN ('Draft', 'Published', 'Canceled') THEN
    RAISE EXCEPTION 'Unsupported Bevy event status'
      USING ERRCODE = '22023';
  END IF;
  IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at < p_start_at THEN
    RAISE EXCEPTION 'Bevy event dates are missing or invalid'
      USING ERRCODE = '22023';
  END IF;
  IF p_source_updated_at IS NULL THEN
    RAISE EXCEPTION 'Bevy source update timestamp is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_source_url IS NULL
     OR p_source_url !~ '^https://gdg\.community\.dev/events/details/' THEN
    RAISE EXCEPTION 'Bevy event URL must use the GDG Community event host'
      USING ERRCODE = '22023';
  END IF;
  IF p_image_url IS NOT NULL AND p_image_url !~ '^https://' THEN
    RAISE EXCEPTION 'Bevy image URL must use HTTPS'
      USING ERRCODE = '22023';
  END IF;
  IF p_source_payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Bevy payload hash must be a lowercase SHA-256 value'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('BEVY:' || normalized_event_id, 0)
  );

  SELECT *
    INTO prior_event
    FROM public.events
   WHERE source_provider = 'BEVY'
     AND source_event_id = normalized_event_id;

  INSERT INTO public.events(
    title,
    description,
    location,
    status,
    event_type,
    start_at,
    end_at,
    source_provider,
    source_event_id,
    source_chapter_id,
    source_url,
    image_url,
    source_status,
    source_updated_at,
    last_synced_at,
    source_payload_hash
  ) VALUES (
    normalized_title,
    NULLIF(btrim(p_description), ''),
    NULLIF(btrim(p_location), ''),
    CASE p_source_status
      WHEN 'Draft' THEN 'DRAFT'
      WHEN 'Published' THEN 'PUBLISHED'
      WHEN 'Canceled' THEN 'CANCELLED'
    END,
    NULLIF(btrim(p_event_type), ''),
    p_start_at,
    p_end_at,
    'BEVY',
    normalized_event_id,
    normalized_chapter_id,
    p_source_url,
    p_image_url,
    p_source_status,
    p_source_updated_at,
    pg_catalog.clock_timestamp(),
    p_source_payload_hash
  )
  ON CONFLICT (source_provider, source_event_id)
    WHERE source_event_id IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    status = EXCLUDED.status,
    event_type = EXCLUDED.event_type,
    start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at,
    source_chapter_id = EXCLUDED.source_chapter_id,
    source_url = EXCLUDED.source_url,
    image_url = EXCLUDED.image_url,
    source_status = EXCLUDED.source_status,
    source_updated_at = EXCLUDED.source_updated_at,
    last_synced_at = EXCLUDED.last_synced_at,
    source_payload_hash = EXCLUDED.source_payload_hash
  WHERE events.source_updated_at IS NULL
     OR EXCLUDED.source_updated_at >= events.source_updated_at
  RETURNING * INTO synced_event;

  -- A delayed webhook must never overwrite a newer event snapshot.
  IF synced_event.id IS NULL THEN
    SELECT *
      INTO synced_event
      FROM public.events
     WHERE source_provider = 'BEVY'
       AND source_event_id = normalized_event_id;
    RETURN synced_event;
  END IF;

  IF prior_event.id IS NULL
     OR prior_event.source_payload_hash IS DISTINCT FROM p_source_payload_hash THEN
    INSERT INTO public.audit_logs(
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      NULL,
      CASE
        WHEN prior_event.id IS NULL THEN 'BEVY_EVENT_CREATED'
        ELSE 'BEVY_EVENT_UPDATED'
      END,
      'event',
      synced_event.id::TEXT,
      jsonb_build_object(
        'source_event_id', normalized_event_id,
        'source_chapter_id', normalized_chapter_id,
        'source_status', p_source_status,
        'source_updated_at', p_source_updated_at
      )
    );
  END IF;

  RETURN synced_event;
END
$$;

REVOKE ALL ON FUNCTION public.sync_bevy_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_bevy_event(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ,
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION private.set_event_luma_url(
  p_event_id UUID,
  p_luma_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  event_row public.events;
  normalized_luma_url TEXT := NULLIF(btrim(p_luma_url), '');
BEGIN
  actor_id := private.require_active_admin();

  IF normalized_luma_url IS NOT NULL
     AND normalized_luma_url !~* '^https://(www\.)?(luma\.com|lu\.ma)/[^[:space:]]+$' THEN
    RAISE EXCEPTION 'Registration URL must use luma.com or lu.ma over HTTPS'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO event_row
    FROM public.events
   WHERE id = p_event_id
   FOR UPDATE;

  IF event_row.id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  IF event_row.luma_url IS NOT DISTINCT FROM normalized_luma_url THEN
    RETURN;
  END IF;

  UPDATE public.events
     SET luma_url = normalized_luma_url
   WHERE id = p_event_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    actor_id,
    'EVENT_LUMA_URL_CHANGED',
    'event',
    p_event_id::TEXT,
    jsonb_build_object(
      'from', event_row.luma_url,
      'to', normalized_luma_url,
      'source_event_id', event_row.source_event_id
    )
  );
END
$$;

REVOKE ALL ON FUNCTION private.set_event_luma_url(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_event_luma_url(UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.set_event_luma_url(
  p_event_id UUID,
  p_luma_url TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_event_luma_url(p_event_id, p_luma_url)
$$;

REVOKE ALL ON FUNCTION public.set_event_luma_url(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_event_luma_url(UUID, TEXT)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
