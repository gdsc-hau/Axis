-- Transactional production smoke test for the Phase 3 Bevy event mirror.
--
-- This runs the synchronization RPC as service_role, verifies create and
-- stale-delivery behavior, and deliberately raises/catches a custom exception
-- so the inner subtransaction rolls back. No fixture event or audit record is
-- retained after a successful or failed run.

SET ROLE service_role;

DO $axis_smoke$
DECLARE
  smoke_source_event_id CONSTANT TEXT := 'axis-rpc-smoke-20260821';
  first_event public.events;
  stale_event public.events;
  matching_audits INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.events
     WHERE source_provider = 'BEVY'
       AND source_event_id = smoke_source_event_id
  ) OR EXISTS (
    SELECT 1
      FROM public.audit_logs
     WHERE action IN ('BEVY_EVENT_CREATED', 'BEVY_EVENT_UPDATED')
       AND metadata ->> 'source_event_id' = smoke_source_event_id
  ) THEN
    RAISE EXCEPTION 'Smoke-test identifier already exists; stop and inspect it'
      USING ERRCODE = '23505';
  END IF;

  BEGIN
    SELECT *
      INTO first_event
      FROM public.sync_bevy_event(
        p_source_event_id => smoke_source_event_id,
        p_source_chapter_id => '9876',
        p_title => 'Axis transactional event smoke test',
        p_description => 'This row must be rolled back.',
        p_location => 'Holy Angel University',
        p_event_type => 'Internal Test',
        p_start_at => '2026-08-22T09:00:00+08:00'::TIMESTAMPTZ,
        p_end_at => '2026-08-22T10:00:00+08:00'::TIMESTAMPTZ,
        p_source_url => 'https://gdg.community.dev/events/details/axis-rpc-smoke-20260821/',
        p_image_url => NULL,
        p_source_status => 'Draft',
        p_source_updated_at => '2026-08-21T10:15:00Z'::TIMESTAMPTZ,
        p_source_payload_hash => repeat('a', 64)
      );

    IF first_event.id IS NULL
       OR first_event.source_provider <> 'BEVY'
       OR first_event.source_event_id <> smoke_source_event_id
       OR first_event.status <> 'DRAFT'
       OR first_event.luma_url IS NOT NULL THEN
      RAISE EXCEPTION 'Created event did not match the expected normalized row';
    END IF;

    SELECT *
      INTO stale_event
      FROM public.sync_bevy_event(
        p_source_event_id => smoke_source_event_id,
        p_source_chapter_id => '9876',
        p_title => 'Stale payload must not win',
        p_description => 'This older delivery must be ignored.',
        p_location => 'Wrong stale location',
        p_event_type => 'Internal Test',
        p_start_at => '2026-08-22T09:00:00+08:00'::TIMESTAMPTZ,
        p_end_at => '2026-08-22T10:00:00+08:00'::TIMESTAMPTZ,
        p_source_url => 'https://gdg.community.dev/events/details/axis-rpc-smoke-20260821/',
        p_image_url => NULL,
        p_source_status => 'Canceled',
        p_source_updated_at => '2026-08-20T10:15:00Z'::TIMESTAMPTZ,
        p_source_payload_hash => repeat('b', 64)
      );

    IF stale_event.id IS NULL
       OR stale_event.id <> first_event.id
       OR stale_event.title <> 'Axis transactional event smoke test'
       OR stale_event.status <> 'DRAFT'
       OR stale_event.source_payload_hash <> repeat('a', 64) THEN
      RAISE EXCEPTION 'An older Bevy delivery overwrote the newer snapshot';
    END IF;

    SELECT count(*)
      INTO matching_audits
      FROM public.audit_logs
     WHERE action = 'BEVY_EVENT_CREATED'
       AND entity_id = first_event.id::TEXT
       AND metadata ->> 'source_event_id' = smoke_source_event_id;

    IF matching_audits <> 1 THEN
      RAISE EXCEPTION 'Expected exactly one event-creation audit record, found %',
        matching_audits;
    END IF;

    -- PL/pgSQL exception blocks are subtransactions. Catching this deliberate
    -- exception proves the assertions passed while rolling back both RPC calls.
    RAISE EXCEPTION 'axis_event_smoke_rollback' USING ERRCODE = 'ZX001';
  EXCEPTION
    WHEN SQLSTATE 'ZX001' THEN NULL;
  END;

  IF EXISTS (
    SELECT 1
      FROM public.events
     WHERE source_provider = 'BEVY'
       AND source_event_id = smoke_source_event_id
  ) OR EXISTS (
    SELECT 1
      FROM public.audit_logs
     WHERE action IN ('BEVY_EVENT_CREATED', 'BEVY_EVENT_UPDATED')
       AND metadata ->> 'source_event_id' = smoke_source_event_id
  ) THEN
    RAISE EXCEPTION 'Smoke-test subtransaction left database residue';
  END IF;
END
$axis_smoke$;

RESET ROLE;

SELECT
  'bevy_event_sync_transactional_smoke_test'::TEXT AS check_name,
  NOT EXISTS (
    SELECT 1
      FROM public.events
     WHERE source_provider = 'BEVY'
       AND source_event_id = 'axis-rpc-smoke-20260821'
  )
  AND NOT EXISTS (
    SELECT 1
      FROM public.audit_logs
     WHERE action IN ('BEVY_EVENT_CREATED', 'BEVY_EVENT_UPDATED')
       AND metadata ->> 'source_event_id' = 'axis-rpc-smoke-20260821'
  ) AS passed,
  'create, audit, and stale-delivery assertions passed; test writes rolled back'::TEXT
    AS details;
