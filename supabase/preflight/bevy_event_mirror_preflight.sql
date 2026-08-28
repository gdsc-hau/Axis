-- Read-only production preflight for
-- 20260821092708_bevy_event_mirror.sql.
-- Run in the hosted Supabase SQL Editor before applying the migration.

WITH checks AS (
  SELECT
    10 AS sort_order,
    'invitation_guardrails_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821083404'
    ) AS passed,
    'the Phase 2 invitation guardrails migration must already be recorded'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'event_mirror_not_deployed',
    NOT EXISTS (
      SELECT 1
        FROM supabase_migrations.schema_migrations
       WHERE version = '20260821092708'
    ),
    'the Phase 3 event mirror migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'event_table_baseline_present',
    to_regclass('public.events') IS NOT NULL
      AND (
        SELECT count(*) = 10
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'events'
           AND column_name IN (
             'id', 'title', 'description', 'location', 'luma_url', 'status',
             'event_type', 'start_at', 'end_at', 'updated_at'
           )
      ),
    'the existing events table and all ten baseline columns must exist'

  UNION ALL

  SELECT
    40,
    'event_security_helpers_present',
    to_regprocedure('public.is_admin()') IS NOT NULL
      AND to_regprocedure('private.require_active_admin()') IS NOT NULL,
    'the event read policy and Luma RPC require the existing admin helpers'

  UNION ALL

  SELECT
    50,
    'existing_event_statuses_valid',
    count(*) FILTER (
      WHERE status IS NULL
         OR status NOT IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')
    ) = 0,
    format(
      'events=%s; invalid statuses=%s',
      count(*),
      count(*) FILTER (
        WHERE status IS NULL
           OR status NOT IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')
      )
    )
  FROM public.events

  UNION ALL

  SELECT
    60,
    'existing_event_titles_valid',
    count(*) FILTER (WHERE NULLIF(btrim(title), '') IS NULL) = 0,
    format(
      'events=%s; blank titles=%s',
      count(*),
      count(*) FILTER (WHERE NULLIF(btrim(title), '') IS NULL)
    )
  FROM public.events

  UNION ALL

  SELECT
    70,
    'existing_event_dates_valid',
    count(*) FILTER (
      WHERE end_at IS NOT NULL
        AND start_at IS NOT NULL
        AND end_at < start_at
    ) = 0,
    format(
      'events=%s; reversed date ranges=%s',
      count(*),
      count(*) FILTER (
        WHERE end_at IS NOT NULL
          AND start_at IS NOT NULL
          AND end_at < start_at
      )
    )
  FROM public.events

  UNION ALL

  SELECT
    80,
    'existing_luma_urls_valid',
    count(*) FILTER (
      WHERE luma_url IS NOT NULL
        AND luma_url !~* '^https://(www\.)?(luma\.com|lu\.ma)/[^[:space:]]+$'
    ) = 0,
    format(
      'events=%s; invalid Luma URLs=%s',
      count(*),
      count(*) FILTER (
        WHERE luma_url IS NOT NULL
          AND luma_url !~* '^https://(www\.)?(luma\.com|lu\.ma)/[^[:space:]]+$'
      )
    )
  FROM public.events
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
