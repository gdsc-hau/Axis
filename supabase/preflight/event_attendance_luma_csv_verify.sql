-- Read-only hosted verification for
-- 20260825154838_event_attendance_luma_csv.sql.

WITH private_functions AS (
  SELECT function_record.*
  FROM pg_proc AS function_record
  JOIN pg_namespace AS function_schema
    ON function_schema.oid = function_record.pronamespace
  WHERE function_schema.nspname = 'private'
    AND function_record.proname IN (
      'set_event_attendance_points',
      'import_luma_attendance_csv',
      'record_manual_event_check_in',
      'confirm_event_attendance',
      'correct_event_attendance'
    )
),
public_functions AS (
  SELECT function_record.*
  FROM pg_proc AS function_record
  JOIN pg_namespace AS function_schema
    ON function_schema.oid = function_record.pronamespace
  WHERE function_schema.nspname = 'public'
    AND function_record.proname IN (
      'set_event_attendance_points',
      'import_luma_attendance_csv',
      'record_manual_event_check_in',
      'confirm_event_attendance',
      'correct_event_attendance'
    )
),
running_balances AS (
  SELECT
    balance_after,
    sum(points) OVER (
      PARTITION BY member_id
      ORDER BY ledger_sequence
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS expected_balance
  FROM public.points_ledger
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260825154838'
    ) AS passed,
    'the Phase 6 Luma CSV attendance migration must exist in remote history'::TEXT
      AS details

  UNION ALL

  SELECT
    20,
    'attendance_tables_present',
    to_regclass('public.attendance_import_batches') IS NOT NULL
      AND to_regclass('public.event_attendance_status_history') IS NOT NULL,
    'aggregate-only import batches and immutable attendance history must exist'

  UNION ALL

  SELECT
    30,
    'event_attendance_columns_present',
    count(*) = 10,
    format('found %s of 10 Phase 6 attendance columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'event_attendance'
    AND column_name IN (
      'attendance_source', 'registered_at', 'checked_in_by', 'confirmed_at',
      'confirmation_note', 'award_points', 'award_ledger_id',
      'reversal_ledger_id', 'import_batch_id', 'status'
    )

  UNION ALL

  SELECT
    40,
    'minimal_import_batch_columns_present',
    count(*) = 14
      AND count(*) FILTER (
        WHERE column_name IN (
          'email', 'name', 'phone', 'raw_csv', 'raw_payload', 'payment_data',
          'custom_answers'
        )
      ) = 0,
    format(
      'batch columns=%s; prohibited guest/raw-data columns=%s',
      count(*),
      count(*) FILTER (
        WHERE column_name IN (
          'email', 'name', 'phone', 'raw_csv', 'raw_payload', 'payment_data',
          'custom_answers'
        )
      )
    )
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'attendance_import_batches'

  UNION ALL

  SELECT
    50,
    'attendance_constraints_validated',
    count(*) = 18 AND bool_and(convalidated),
    format('found %s of 18 required validated constraints', count(*))
  FROM pg_constraint
  WHERE conname IN (
    'events_attendance_points_check',
    'attendance_import_batches_source_check',
    'attendance_import_batches_file_name_check',
    'attendance_import_batches_hash_check',
    'attendance_import_batches_counts_check',
    'attendance_import_batches_event_hash_key',
    'attendance_import_batches_operation_key_key',
    'attendance_status_check',
    'event_attendance_source_check',
    'event_attendance_points_check',
    'event_attendance_note_check',
    'event_attendance_check_in_state_check',
    'event_attendance_confirmation_state_check',
    'event_attendance_history_from_status_check',
    'event_attendance_history_to_status_check',
    'event_attendance_history_action_check',
    'event_attendance_history_reason_check',
    'event_attendance_history_operation_key_key'
  )

  UNION ALL

  SELECT
    60,
    'attendance_indexes_present',
    count(*) = 6,
    format('found %s of 6 required attendance indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'event_attendance_award_ledger_uidx',
      'event_attendance_reversal_ledger_uidx',
      'event_attendance_event_status_idx',
      'event_attendance_import_batch_idx',
      'attendance_import_batches_event_created_idx',
      'event_attendance_history_attendance_created_idx'
    )

  UNION ALL

  SELECT
    70,
    'attendance_read_policies_present',
    count(*) = 3,
    format('found %s of 3 required attendance read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'event_attendance_authorized_read',
      'attendance_import_batches_admin_read',
      'event_attendance_history_authorized_read'
    )
    AND cmd = 'SELECT'

  UNION ALL

  SELECT
    80,
    'attendance_write_policies_absent',
    count(*) = 0,
    format('found %s direct attendance write policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'event_attendance', 'attendance_import_batches',
      'event_attendance_status_history'
    )
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')

  UNION ALL

  SELECT
    90,
    'direct_attendance_writes_revoked',
    NOT has_table_privilege(
      'authenticated', 'public.event_attendance', 'INSERT'
    )
      AND NOT has_table_privilege(
        'authenticated', 'public.event_attendance', 'UPDATE'
      )
      AND NOT has_table_privilege(
        'authenticated', 'public.event_attendance', 'DELETE'
      )
      AND NOT has_table_privilege(
        'service_role', 'public.event_attendance', 'INSERT'
      )
      AND NOT has_table_privilege(
        'authenticated', 'public.attendance_import_batches', 'INSERT'
      )
      AND NOT has_table_privilege(
        'authenticated', 'public.event_attendance_status_history', 'INSERT'
      ),
    'browser and service roles must use audited attendance functions for writes'

  UNION ALL

  SELECT
    100,
    'private_attendance_helpers_hardened',
    count(*) = 5
      AND bool_and(prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 5 hardened private attendance helpers', count(*))
  FROM private_functions

  UNION ALL

  SELECT
    110,
    'public_attendance_rpcs_security_invoker',
    count(*) = 5
      AND bool_and(NOT prosecdef)
      AND bool_and(proconfig @> ARRAY['search_path=""']::TEXT[]),
    format('found %s of 5 security-invoker attendance RPCs', count(*))
  FROM public_functions

  UNION ALL

  SELECT
    120,
    'attendance_rpc_execution_restricted',
    has_function_privilege(
      'authenticated', 'public.set_event_attendance_points(uuid,integer)',
      'EXECUTE'
    )
      AND has_function_privilege(
        'authenticated',
        'public.import_luma_attendance_csv(uuid,text,text,jsonb,uuid)',
        'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.record_manual_event_check_in(uuid,uuid,timestamptz,text,uuid)',
        'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.confirm_event_attendance(uuid,text,uuid)',
        'EXECUTE'
      )
      AND has_function_privilege(
        'authenticated',
        'public.correct_event_attendance(uuid,text,text,uuid)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.set_event_attendance_points(uuid,integer)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.import_luma_attendance_csv(uuid,text,text,jsonb,uuid)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon',
        'public.record_manual_event_check_in(uuid,uuid,timestamptz,text,uuid)',
        'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.confirm_event_attendance(uuid,text,uuid)', 'EXECUTE'
      )
      AND NOT has_function_privilege(
        'anon', 'public.correct_event_attendance(uuid,text,text,uuid)', 'EXECUTE'
      ),
    'only authenticated callers may invoke self-authorizing attendance RPCs'

  UNION ALL

  SELECT
    130,
    'legacy_confirmation_rpc_removed',
    to_regprocedure('public.confirm_event_attendance(uuid,uuid)') IS NULL,
    'the obsolete event/member confirmation signature must be absent'

  UNION ALL

  SELECT
    140,
    'attendance_reversal_ledger_source_supported',
    count(*) = 2 AND bool_and(convalidated)
      AND bool_and(
        pg_get_constraintdef(oid) ILIKE '%EVENT_ATTENDANCE_REVERSAL%'
      ),
    format('found %s of 2 reversal-aware ledger constraints', count(*))
  FROM pg_constraint
  WHERE conrelid = 'public.points_ledger'::regclass
    AND conname IN (
      'points_ledger_source_type_check', 'points_ledger_direction_check'
    )

  UNION ALL

  SELECT
    150,
    'attendance_financial_links_valid',
    count(*) FILTER (
      WHERE (
        attendance.status = 'CONFIRMED'
        AND attendance.award_points > 0
        AND (
          award.id IS NULL
          OR award.member_id <> attendance.member_id
          OR award.source_type <> 'EVENT_ATTENDANCE'
          OR award.source_id <> attendance.id::TEXT
          OR award.points <> attendance.award_points
        )
      )
      OR (
        attendance.reversal_ledger_id IS NOT NULL
        AND (
          reversal.id IS NULL
          OR reversal.member_id <> attendance.member_id
          OR reversal.source_type <> 'EVENT_ATTENDANCE_REVERSAL'
          OR reversal.source_id <> attendance.id::TEXT
          OR reversal.points <> -attendance.award_points
        )
      )
    ) = 0,
    format(
      'attendance rows=%s; invalid award/reversal links=%s',
      count(*),
      count(*) FILTER (
        WHERE (
          attendance.status = 'CONFIRMED'
          AND attendance.award_points > 0
          AND award.id IS NULL
        )
        OR (
          attendance.reversal_ledger_id IS NOT NULL
          AND reversal.id IS NULL
        )
      )
    )
  FROM public.event_attendance AS attendance
  LEFT JOIN public.points_ledger AS award
    ON award.id = attendance.award_ledger_id
  LEFT JOIN public.points_ledger AS reversal
    ON reversal.id = attendance.reversal_ledger_id

  UNION ALL

  SELECT
    160,
    'attendance_histories_complete',
    count(*) FILTER (WHERE history.attendance_id IS NULL) = 0,
    format(
      'attendance rows=%s; rows without history=%s',
      count(*),
      count(*) FILTER (WHERE history.attendance_id IS NULL)
    )
  FROM public.event_attendance AS attendance
  LEFT JOIN (
    SELECT DISTINCT attendance_id
    FROM public.event_attendance_status_history
  ) AS history ON history.attendance_id = attendance.id

  UNION ALL

  SELECT
    170,
    'ledger_running_balances_consistent',
    count(*) FILTER (WHERE balance_after <> expected_balance) = 0,
    format(
      'ledger rows=%s; running-balance mismatches=%s',
      count(*),
      count(*) FILTER (WHERE balance_after <> expected_balance)
    )
  FROM running_balances
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
