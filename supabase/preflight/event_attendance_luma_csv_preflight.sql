-- Read-only production preflight for Phase 6: Luma CSV attendance imports,
-- administrator confirmation, member event history, and idempotent Gyrocoin
-- awards. Luma remains the registration/check-in system; this migration will
-- not create an Axis RSVP system or call a Luma API.
--
-- Run this entire file in the hosted Supabase SQL Editor before creating or
-- applying the Phase 6 migration. Every row must return passed = true.

WITH running_balances AS (
  SELECT
    member_id,
    ledger_sequence,
    balance_after,
    sum(points) OVER (
      PARTITION BY member_id
      ORDER BY ledger_sequence
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS expected_balance
  FROM public.points_ledger
),
legacy_attendance_awards AS (
  SELECT
    ledger.id AS ledger_id,
    ledger.member_id AS ledger_member_id,
    ledger.source_id,
    attendance.id AS attendance_id,
    attendance.member_id AS attendance_member_id
  FROM public.points_ledger AS ledger
  LEFT JOIN public.event_attendance AS attendance
    ON attendance.id = CASE
      WHEN ledger.source_id ~* (
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-'
        || '[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) THEN ledger.source_id::UUID
      ELSE NULL
    END
  WHERE ledger.source_type = 'EVENT_ATTENDANCE'
),
checks AS (
  SELECT
    10 AS sort_order,
    'phase_dependencies_deployed'::TEXT AS check_name,
    (
      SELECT count(*) = 4
      FROM supabase_migrations.schema_migrations
      WHERE version IN (
        '20260821092708', -- Bevy event mirror and Luma redirect
        '20260821125016', -- deterministic Gyrocoin ledger ordering
        '20260821172810', -- reward marketplace
        '20260821182815'  -- registry-owned profile names
      )
    ) AS passed,
    'the event mirror, corrected ledger, marketplace, and registry-name lock must already be recorded'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'attendance_phase_not_partially_deployed',
    to_regclass('public.attendance_import_batches') IS NULL
      AND to_regclass('public.event_attendance_status_history') IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'event_attendance'
          AND column_name IN (
            'attendance_source', 'confirmed_at', 'award_points',
            'award_ledger_id', 'reversal_ledger_id', 'import_batch_id'
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.points_ledger'::regclass
          AND conname = 'points_ledger_source_type_check'
          AND pg_get_constraintdef(oid) ILIKE '%EVENT_ATTENDANCE_REVERSAL%'
      ),
    'Phase 6 tables, attendance columns, and reversal ledger source must not exist outside migration history'

  UNION ALL

  SELECT
    30,
    'event_mirror_baseline_present',
    to_regclass('public.events') IS NOT NULL
      AND count(*) = 10,
    format('found %s of 10 required event and source columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name IN (
      'id', 'title', 'status', 'start_at', 'end_at', 'luma_url',
      'source_provider', 'source_event_id', 'source_url', 'last_synced_at'
    )

  UNION ALL

  SELECT
    40,
    'attendance_baseline_present',
    to_regclass('public.event_attendance') IS NOT NULL
      AND count(*) = 8,
    format('found %s of 8 baseline attendance columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'event_attendance'
    AND column_name IN (
      'id', 'event_id', 'member_id', 'status', 'checked_in_at',
      'confirmed_by', 'created_at', 'updated_at'
    )

  UNION ALL

  SELECT
    50,
    'attendance_identity_unique',
    count(*) >= 1 AND bool_and(indisunique),
    format('found %s unique event/member identity indexes', count(*))
  FROM pg_index AS index_record
  JOIN pg_class AS index_table
    ON index_table.oid = index_record.indrelid
  JOIN pg_namespace AS index_schema
    ON index_schema.oid = index_table.relnamespace
  WHERE index_schema.nspname = 'public'
    AND index_table.relname = 'event_attendance'
    AND pg_get_indexdef(index_record.indexrelid)
      ILIKE '%(event_id, member_id)%'

  UNION ALL

  SELECT
    60,
    'existing_attendance_rows_valid',
    count(*) FILTER (
      WHERE status IS NULL
        OR status NOT IN ('REGISTERED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW')
        OR created_at IS NULL
        OR updated_at IS NULL
    ) = 0,
    format(
      'attendance rows=%s; invalid status/timestamp rows=%s',
      count(*),
      count(*) FILTER (
        WHERE status IS NULL
          OR status NOT IN ('REGISTERED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW')
          OR created_at IS NULL
          OR updated_at IS NULL
      )
    )
  FROM public.event_attendance

  UNION ALL

  SELECT
    70,
    'checked_in_metadata_consistent',
    count(*) FILTER (
      WHERE status = 'CHECKED_IN'
        AND (checked_in_at IS NULL OR confirmed_by IS NULL)
    ) = 0,
    format(
      'checked-in rows=%s; missing timestamp/confirmer=%s',
      count(*) FILTER (WHERE status = 'CHECKED_IN'),
      count(*) FILTER (
        WHERE status = 'CHECKED_IN'
          AND (checked_in_at IS NULL OR confirmed_by IS NULL)
      )
    )
  FROM public.event_attendance

  UNION ALL

  SELECT
    80,
    'member_emails_normalized_and_unique',
    count(*) FILTER (
      WHERE NULLIF(btrim(email), '') IS NULL
        OR email <> lower(btrim(email))
    ) = 0
      AND count(*) = count(DISTINCT lower(btrim(email))),
    format(
      'members=%s; invalid/non-normalized emails=%s; duplicate normalized emails=%s',
      count(*),
      count(*) FILTER (
        WHERE NULLIF(btrim(email), '') IS NULL
          OR email <> lower(btrim(email))
      ),
      count(*) - count(DISTINCT lower(btrim(email)))
    )
  FROM public.members

  UNION ALL

  SELECT
    90,
    'luma_redirects_valid',
    count(*) FILTER (
      WHERE luma_url IS NOT NULL
        AND luma_url !~* '^https://(www\.)?(luma\.com|lu\.ma)/[^[:space:]]+$'
    ) = 0,
    format(
      'events=%s; Luma-linked events=%s; invalid Luma URLs=%s',
      count(*),
      count(*) FILTER (WHERE luma_url IS NOT NULL),
      count(*) FILTER (
        WHERE luma_url IS NOT NULL
          AND luma_url !~* '^https://(www\.)?(luma\.com|lu\.ma)/[^[:space:]]+$'
      )
    )
  FROM public.events

  UNION ALL

  SELECT
    100,
    'legacy_attendance_awards_resolvable',
    count(*) FILTER (
      WHERE attendance_id IS NULL
        OR ledger_member_id <> attendance_member_id
    ) = 0,
    format(
      'legacy attendance awards=%s; unresolved or member-mismatched awards=%s',
      count(*),
      count(*) FILTER (
        WHERE attendance_id IS NULL
          OR ledger_member_id <> attendance_member_id
      )
    )
  FROM legacy_attendance_awards

  UNION ALL

  SELECT
    110,
    'ledger_contract_present',
    to_regclass('public.points_ledger') IS NOT NULL
      AND to_regprocedure(
        'private.enforce_points_ledger_running_balance()'
      ) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.points_ledger'::regclass
          AND conname = 'points_ledger_source_type_check'
          AND convalidated
          AND pg_get_constraintdef(oid) ILIKE '%EVENT_ATTENDANCE%'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'points_ledger'
          AND indexname = 'points_ledger_source_identity_idx'
      ),
    'the append-only ledger, running-balance trigger, attendance source, and source identity index must exist'

  UNION ALL

  SELECT
    120,
    'ledger_running_balances_consistent',
    count(*) FILTER (WHERE balance_after <> expected_balance) = 0,
    format(
      'ledger rows=%s; running-balance mismatches=%s',
      count(*),
      count(*) FILTER (WHERE balance_after <> expected_balance)
    )
  FROM running_balances

  UNION ALL

  SELECT
    130,
    'attendance_rls_baseline_present',
    row_security.relrowsecurity
      AND EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'event_attendance'
          AND policyname = 'event_attendance_authorized_read'
          AND cmd = 'SELECT'
      ),
    'event_attendance must have RLS enabled and the consolidated authorized-read policy'
  FROM pg_class AS row_security
  JOIN pg_namespace AS row_security_schema
    ON row_security_schema.oid = row_security.relnamespace
  WHERE row_security_schema.nspname = 'public'
    AND row_security.relname = 'event_attendance'

  UNION ALL

  SELECT
    140,
    'legacy_confirmation_rpc_present',
    to_regprocedure(
      'public.confirm_event_attendance(uuid,uuid)'
    ) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_proc AS function_record
        JOIN pg_namespace AS function_schema
          ON function_schema.oid = function_record.pronamespace
        WHERE function_schema.nspname = 'public'
          AND function_record.proname = 'confirm_event_attendance'
          AND pg_get_function_identity_arguments(function_record.oid)
            = 'p_event_id uuid, p_member_id uuid'
          AND function_record.prosecdef
      ),
    'the legacy security-invoker confirmation RPC must exist so Phase 6 can replace it explicitly'

  UNION ALL

  SELECT
    150,
    'security_helpers_present',
    to_regprocedure('public.current_member_id()') IS NOT NULL
      AND to_regprocedure('public.is_admin()') IS NOT NULL
      AND to_regprocedure('private.require_active_admin()') IS NOT NULL
      AND to_regprocedure('public.set_updated_at()') IS NOT NULL,
    'current-member, admin, active-admin, and timestamp helpers must exist'

  UNION ALL

  SELECT
    160,
    'active_linked_admin_exists',
    count(*) > 0,
    format('active linked administrators=%s', count(*))
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND role = 'ADMIN'
    AND auth_id IS NOT NULL
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
