-- Read-only verification for
-- 20260821092708_bevy_event_mirror.sql.

WITH sync_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'sync_bevy_event'
),
luma_private_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'private'
     AND p.proname = 'set_event_luma_url'
     AND pg_get_function_identity_arguments(p.oid)
       = 'p_event_id uuid, p_luma_url text'
),
luma_public_function AS (
  SELECT p.*
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'set_event_luma_url'
     AND pg_get_function_identity_arguments(p.oid)
       = 'p_event_id uuid, p_luma_url text'
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821092708'
    ) AS passed,
    'the Bevy event mirror migration must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'event_source_columns_present',
    count(*) = 9,
    format('found %s of 9 event source columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name IN (
      'source_provider', 'source_event_id', 'source_chapter_id', 'source_url',
      'image_url', 'source_status', 'source_updated_at', 'last_synced_at',
      'source_payload_hash'
    )

  UNION ALL

  SELECT
    30,
    'event_status_not_null',
    is_nullable = 'NO',
    format('events.status is_nullable=%s', is_nullable)
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'status'

  UNION ALL

  SELECT
    40,
    'event_constraints_validated',
    count(*) = 7 AND bool_and(convalidated),
    format('found %s of 7 required validated constraints', count(*))
  FROM pg_constraint
  WHERE conrelid = 'public.events'::regclass
    AND conname IN (
      'events_source_provider_check', 'events_title_nonempty_check',
      'events_source_status_check', 'events_bevy_identity_check',
      'events_bevy_source_url_check', 'events_image_url_check',
      'events_luma_url_check'
    )

  UNION ALL

  SELECT
    50,
    'event_indexes_present',
    count(*) = 2,
    format('found %s of 2 required event indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'events'
    AND indexname IN (
      'events_source_identity_idx', 'events_public_timeline_idx'
    )

  UNION ALL

  SELECT
    60,
    'event_read_policies_present',
    count(*) = 2,
    format('found %s of 2 required event read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'events'
    AND policyname IN ('events_public_read', 'events_authenticated_read')

  UNION ALL

  SELECT
    70,
    'authenticated_direct_event_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.events', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.events', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.events', 'DELETE'),
    'authenticated users must not directly mutate GDG-owned event rows'

  UNION ALL

  SELECT
    80,
    'sync_rpc_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured sync RPC', count(*))
  FROM sync_function

  UNION ALL

  SELECT
    90,
    'sync_rpc_service_role_only',
    has_function_privilege(
      'service_role',
      'public.sync_bevy_event(text,text,text,text,text,text,timestamptz,timestamptz,text,text,text,timestamptz,text)',
      'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon',
        'public.sync_bevy_event(text,text,text,text,text,text,timestamptz,timestamptz,text,text,text,timestamptz,text)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'authenticated',
        'public.sync_bevy_event(text,text,text,text,text,text,timestamptz,timestamptz,text,text,text,timestamptz,text)',
        'EXECUTE'
      ),
    'only the service role may execute the Bevy sync RPC'

  UNION ALL

  SELECT
    100,
    'private_luma_helper_security_definer',
    count(*) = 1
      AND bool_and(prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured private Luma helper', count(*))
  FROM luma_private_function

  UNION ALL

  SELECT
    110,
    'public_luma_rpc_security_invoker',
    count(*) = 1
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s correctly configured public Luma RPC', count(*))
  FROM luma_public_function

  UNION ALL

  SELECT
    120,
    'luma_rpc_execution_restricted',
    has_function_privilege(
      'authenticated', 'public.set_event_luma_url(uuid,text)', 'EXECUTE'
    )
      AND NOT has_function_privilege(
        'anon', 'public.set_event_luma_url(uuid,text)', 'EXECUTE'
      ),
    'authenticated callers may invoke the self-checking Luma RPC; anon may not'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
