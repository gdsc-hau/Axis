-- Phase 6: Luma remains the external registration and check-in provider.
-- Axis imports a final CSV snapshot, matches active members by normalized
-- email, requires administrator confirmation, and awards Gyrocoins once.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

ALTER TABLE public.events
  ADD COLUMN attendance_points INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.events
  ADD CONSTRAINT events_attendance_points_check
  CHECK (attendance_points BETWEEN 0 AND 1000000);

CREATE TABLE public.attendance_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  source TEXT NOT NULL DEFAULT 'LUMA_CSV',
  file_name TEXT NOT NULL,
  file_sha256 TEXT NOT NULL,
  operation_key UUID NOT NULL,
  total_rows INTEGER NOT NULL,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  unmatched_rows INTEGER NOT NULL DEFAULT 0,
  ineligible_rows INTEGER NOT NULL DEFAULT 0,
  ignored_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT attendance_import_batches_source_check
    CHECK (source = 'LUMA_CSV'),
  CONSTRAINT attendance_import_batches_file_name_check
    CHECK (
      file_name = btrim(file_name)
      AND char_length(file_name) BETWEEN 1 AND 255
    ),
  CONSTRAINT attendance_import_batches_hash_check
    CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT attendance_import_batches_counts_check
    CHECK (
      total_rows BETWEEN 1 AND 5000
      AND matched_rows >= 0
      AND unmatched_rows >= 0
      AND ineligible_rows >= 0
      AND ignored_rows >= 0
      AND duplicate_rows >= 0
      AND matched_rows + unmatched_rows + ineligible_rows + ignored_rows
        + duplicate_rows = total_rows
    ),
  CONSTRAINT attendance_import_batches_event_hash_key
    UNIQUE (event_id, file_sha256),
  CONSTRAINT attendance_import_batches_operation_key_key
    UNIQUE (operation_key)
);

ALTER TABLE public.event_attendance
  ADD COLUMN attendance_source TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN registered_at TIMESTAMPTZ,
  ADD COLUMN checked_in_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN confirmed_at TIMESTAMPTZ,
  ADD COLUMN confirmation_note TEXT,
  ADD COLUMN award_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN award_ledger_id UUID REFERENCES public.points_ledger(id) ON DELETE RESTRICT,
  ADD COLUMN reversal_ledger_id UUID REFERENCES public.points_ledger(id) ON DELETE RESTRICT,
  ADD COLUMN import_batch_id UUID REFERENCES public.attendance_import_batches(id) ON DELETE SET NULL;

UPDATE public.event_attendance
   SET status = COALESCE(status, 'REGISTERED'),
       registered_at = COALESCE(created_at, pg_catalog.now()),
       checked_in_by = CASE
         WHEN status = 'CHECKED_IN' THEN confirmed_by
         ELSE NULL
       END,
       confirmed_by = NULL;

ALTER TABLE public.event_attendance
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN registered_at SET NOT NULL;

ALTER TABLE public.event_attendance
  DROP CONSTRAINT attendance_status_check;

ALTER TABLE public.event_attendance
  ADD CONSTRAINT attendance_status_check
    CHECK (
      status IN (
        'REGISTERED', 'CHECKED_IN', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'
      )
    ),
  ADD CONSTRAINT event_attendance_source_check
    CHECK (attendance_source IN ('LUMA_CSV', 'MANUAL')),
  ADD CONSTRAINT event_attendance_points_check
    CHECK (award_points BETWEEN 0 AND 1000000),
  ADD CONSTRAINT event_attendance_note_check
    CHECK (
      confirmation_note IS NULL
      OR (
        confirmation_note = btrim(confirmation_note)
        AND char_length(confirmation_note) BETWEEN 1 AND 500
      )
    ),
  ADD CONSTRAINT event_attendance_check_in_state_check
    CHECK (
      status NOT IN ('CHECKED_IN', 'CONFIRMED')
      OR checked_in_at IS NOT NULL
    ),
  ADD CONSTRAINT event_attendance_confirmation_state_check
    CHECK (
      (
        status = 'CONFIRMED'
        AND confirmed_at IS NOT NULL
        AND confirmed_by IS NOT NULL
        AND (
          (award_points = 0 AND award_ledger_id IS NULL)
          OR (award_points > 0 AND award_ledger_id IS NOT NULL)
        )
        AND reversal_ledger_id IS NULL
      )
      OR (
        status <> 'CONFIRMED'
        AND confirmed_at IS NULL
        AND confirmed_by IS NULL
        AND (
          reversal_ledger_id IS NULL
          OR award_ledger_id IS NOT NULL
        )
      )
    );

CREATE UNIQUE INDEX event_attendance_award_ledger_uidx
  ON public.event_attendance(award_ledger_id)
  WHERE award_ledger_id IS NOT NULL;

CREATE UNIQUE INDEX event_attendance_reversal_ledger_uidx
  ON public.event_attendance(reversal_ledger_id)
  WHERE reversal_ledger_id IS NOT NULL;

CREATE INDEX event_attendance_event_status_idx
  ON public.event_attendance(event_id, status, registered_at, id);

CREATE INDEX event_attendance_import_batch_idx
  ON public.event_attendance(import_batch_id)
  WHERE import_batch_id IS NOT NULL;

CREATE INDEX attendance_import_batches_event_created_idx
  ON public.attendance_import_batches(event_id, created_at DESC, id DESC);

CREATE TABLE public.event_attendance_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL
    REFERENCES public.event_attendance(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  reason TEXT,
  operation_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT event_attendance_history_from_status_check
    CHECK (
      from_status IS NULL
      OR from_status IN (
        'REGISTERED', 'CHECKED_IN', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'
      )
    ),
  CONSTRAINT event_attendance_history_to_status_check
    CHECK (
      to_status IN (
        'REGISTERED', 'CHECKED_IN', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'
      )
    ),
  CONSTRAINT event_attendance_history_action_check
    CHECK (
      action IN (
        'LUMA_IMPORTED', 'MANUAL_CHECK_IN', 'CONFIRMED', 'CORRECTED'
      )
    ),
  CONSTRAINT event_attendance_history_reason_check
    CHECK (
      reason IS NULL
      OR (
        reason = btrim(reason)
        AND char_length(reason) BETWEEN 1 AND 500
      )
    ),
  CONSTRAINT event_attendance_history_operation_key_key
    UNIQUE (operation_key)
);

CREATE INDEX event_attendance_history_attendance_created_idx
  ON public.event_attendance_status_history(
    attendance_id, created_at DESC, id DESC
  );

-- A correction never rewrites a prior award. It appends a negative reversal,
-- while the running-balance trigger continues to prohibit wallet overdrafts.
ALTER TABLE public.points_ledger
  DROP CONSTRAINT points_ledger_source_type_check,
  DROP CONSTRAINT points_ledger_direction_check;

ALTER TABLE public.points_ledger
  ADD CONSTRAINT points_ledger_source_type_check
    CHECK (
      source_type IN (
        'MANUAL_AWARD',
        'MANUAL_DEDUCTION',
        'EVENT_ATTENDANCE',
        'EVENT_ATTENDANCE_REVERSAL',
        'MARKETPLACE_REDEMPTION',
        'MARKETPLACE_REFUND'
      )
    ),
  ADD CONSTRAINT points_ledger_direction_check
    CHECK (
      (
        source_type IN (
          'MANUAL_AWARD', 'EVENT_ATTENDANCE', 'MARKETPLACE_REFUND'
        )
        AND points > 0
      )
      OR (
        source_type IN (
          'MANUAL_DEDUCTION', 'EVENT_ATTENDANCE_REVERSAL',
          'MARKETPLACE_REDEMPTION'
        )
        AND points < 0
      )
    );

ALTER TABLE public.attendance_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_attendance_admin_insert
  ON public.event_attendance;
DROP POLICY IF EXISTS event_attendance_admin_update
  ON public.event_attendance;
DROP POLICY IF EXISTS event_attendance_authorized_read
  ON public.event_attendance;

CREATE POLICY event_attendance_authorized_read
  ON public.event_attendance
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

CREATE POLICY attendance_import_batches_admin_read
  ON public.attendance_import_batches
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY event_attendance_history_authorized_read
  ON public.event_attendance_status_history
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.event_attendance AS attendance
      WHERE attendance.id = attendance_id
        AND attendance.member_id = (SELECT public.current_member_id())
    )
  );

REVOKE ALL ON TABLE public.attendance_import_batches
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.event_attendance_status_history
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.event_attendance
  FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE public.attendance_import_batches
  TO authenticated, service_role;
GRANT SELECT ON TABLE public.event_attendance_status_history
  TO authenticated, service_role;
GRANT SELECT ON TABLE public.event_attendance
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.record_event_attendance_history(
  p_attendance_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_action TEXT,
  p_actor_id UUID,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance_status_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted_history public.event_attendance_status_history;
BEGIN
  INSERT INTO public.event_attendance_status_history(
    attendance_id,
    from_status,
    to_status,
    action,
    actor_id,
    reason,
    operation_key
  ) VALUES (
    p_attendance_id,
    p_from_status,
    p_to_status,
    p_action,
    p_actor_id,
    NULLIF(btrim(p_reason), ''),
    p_operation_key
  )
  RETURNING * INTO inserted_history;

  RETURN inserted_history;
END
$$;

CREATE OR REPLACE FUNCTION private.set_event_attendance_points(
  p_event_id UUID,
  p_points INTEGER
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  target_event public.events;
BEGIN
  actor_id := private.require_active_admin();

  IF p_points IS NULL OR p_points NOT BETWEEN 0 AND 1000000 THEN
    RAISE EXCEPTION 'Attendance award must be between 0 and 1,000,000 Gyrocoins'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO target_event
    FROM public.events
   WHERE id = p_event_id
   FOR UPDATE;

  IF target_event.id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_event.attendance_points <> p_points
     AND EXISTS (
       SELECT 1
       FROM public.event_attendance
       WHERE event_id = p_event_id
         AND status = 'CONFIRMED'
     ) THEN
    RAISE EXCEPTION 'Attendance points cannot change after a confirmation'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.events
     SET attendance_points = p_points
   WHERE id = p_event_id
  RETURNING * INTO target_event;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'EVENT_ATTENDANCE_POINTS_SET',
    'events',
    target_event.id::TEXT,
    jsonb_build_object('attendance_points', p_points)
  );

  RETURN target_event;
END
$$;

CREATE OR REPLACE FUNCTION private.import_luma_attendance_csv(
  p_event_id UUID,
  p_file_name TEXT,
  p_file_sha256 TEXT,
  p_rows JSONB,
  p_operation_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  target_event public.events;
  existing_batch public.attendance_import_batches;
  import_batch public.attendance_import_batches;
  row_record RECORD;
  row_data JSONB;
  row_number INTEGER;
  normalized_email TEXT;
  normalized_status TEXT;
  registered_timestamp TIMESTAMPTZ;
  checked_in_timestamp TIMESTAMPTZ;
  matched_member public.members;
  prior_attendance public.event_attendance;
  saved_attendance public.event_attendance;
  prior_status TEXT;
  desired_status TEXT;
  seen_emails JSONB := '{}'::JSONB;
  review_rows JSONB := '[]'::JSONB;
  total_count INTEGER;
  matched_count INTEGER := 0;
  unmatched_count INTEGER := 0;
  ineligible_count INTEGER := 0;
  ignored_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  normalized_file_name TEXT := NULLIF(btrim(p_file_name), '');
  normalized_hash TEXT := lower(NULLIF(btrim(p_file_sha256), ''));
  history_reason TEXT;
BEGIN
  actor_id := private.require_active_admin();

  IF normalized_file_name IS NULL
     OR char_length(normalized_file_name) > 255 THEN
    RAISE EXCEPTION 'CSV file name must contain 1 to 255 characters'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_hash IS NULL OR normalized_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A lowercase SHA-256 CSV hash is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Attendance rows must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  total_count := jsonb_array_length(p_rows);
  IF total_count NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Import between 1 and 5,000 attendance rows'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO target_event
    FROM public.events
   WHERE id = p_event_id
   FOR UPDATE;

  IF target_event.id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_event.luma_url IS NULL THEN
    RAISE EXCEPTION 'Attach the event Luma URL before importing its guest CSV'
      USING ERRCODE = '23514';
  END IF;
  IF target_event.status = 'DRAFT' THEN
    RAISE EXCEPTION 'Draft events cannot accept attendance imports'
      USING ERRCODE = '23514';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'ATTENDANCE_IMPORT:' || p_event_id::TEXT || ':' || normalized_hash,
      0
    )
  );

  SELECT *
    INTO existing_batch
    FROM public.attendance_import_batches
   WHERE operation_key = p_operation_key
      OR (event_id = p_event_id AND file_sha256 = normalized_hash)
   ORDER BY CASE WHEN operation_key = p_operation_key THEN 0 ELSE 1 END
   LIMIT 1;

  IF existing_batch.id IS NOT NULL THEN
    IF existing_batch.event_id <> p_event_id
       OR existing_batch.file_sha256 <> normalized_hash
       OR existing_batch.file_name <> normalized_file_name THEN
      RAISE EXCEPTION 'Import operation conflicts with an earlier CSV'
        USING ERRCODE = '23505';
    END IF;

    RETURN jsonb_build_object(
      'batch_id', existing_batch.id,
      'total_rows', existing_batch.total_rows,
      'matched_rows', existing_batch.matched_rows,
      'unmatched_rows', existing_batch.unmatched_rows,
      'ineligible_rows', existing_batch.ineligible_rows,
      'ignored_rows', existing_batch.ignored_rows,
      'duplicate_rows', existing_batch.duplicate_rows,
      'review_rows', '[]'::JSONB
    );
  END IF;

  -- Counts are finalized after every input row has been classified.
  INSERT INTO public.attendance_import_batches(
    event_id,
    file_name,
    file_sha256,
    operation_key,
    total_rows,
    matched_rows,
    unmatched_rows,
    ineligible_rows,
    ignored_rows,
    duplicate_rows,
    created_by
  ) VALUES (
    p_event_id,
    normalized_file_name,
    normalized_hash,
    p_operation_key,
    total_count,
    total_count,
    0,
    0,
    0,
    0,
    actor_id
  )
  RETURNING * INTO import_batch;

  history_reason := left('Imported from Luma CSV: ' || normalized_file_name, 500);

  FOR row_record IN
    SELECT item.value, item.ordinality
    FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS item(value, ordinality)
    ORDER BY item.ordinality
  LOOP
    row_data := row_record.value;

    IF jsonb_typeof(row_data) <> 'object' THEN
      RAISE EXCEPTION 'Attendance import row % must be an object', row_record.ordinality
        USING ERRCODE = '22023';
    END IF;

    IF COALESCE(row_data->>'row_number', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Attendance import row % has an invalid row number', row_record.ordinality
        USING ERRCODE = '22023';
    END IF;
    row_number := (row_data->>'row_number')::INTEGER;
    normalized_email := lower(NULLIF(btrim(row_data->>'email'), ''));
    normalized_status := upper(NULLIF(btrim(row_data->>'registration_status'), ''));

    IF normalized_email IS NULL
       OR char_length(normalized_email) > 254
       OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Attendance CSV row % has an invalid email address', row_number
        USING ERRCODE = '22023';
    END IF;
    IF normalized_status IS NULL
       OR normalized_status NOT IN (
         'REGISTERED', 'CHECKED_IN', 'CANCELLED', 'IGNORED'
       ) THEN
      RAISE EXCEPTION 'Attendance CSV row % has an unsupported status', row_number
        USING ERRCODE = '22023';
    END IF;

    registered_timestamp := NULL;
    checked_in_timestamp := NULL;
    IF NULLIF(btrim(row_data->>'registered_at'), '') IS NOT NULL THEN
      registered_timestamp := (row_data->>'registered_at')::TIMESTAMPTZ;
    END IF;
    IF NULLIF(btrim(row_data->>'checked_in_at'), '') IS NOT NULL THEN
      checked_in_timestamp := (row_data->>'checked_in_at')::TIMESTAMPTZ;
    END IF;

    IF seen_emails ? normalized_email THEN
      duplicate_count := duplicate_count + 1;
      CONTINUE;
    END IF;
    seen_emails := seen_emails || jsonb_build_object(normalized_email, true);

    IF normalized_status = 'IGNORED' THEN
      ignored_count := ignored_count + 1;
      CONTINUE;
    END IF;

    -- Explicitly clear composite variables before SELECT INTO. PostgreSQL
    -- clears them when no row is found, but keeping that state transition
    -- visible prevents a later refactor from reusing the preceding row.
    matched_member := NULL;
    prior_attendance := NULL;
    saved_attendance := NULL;

    SELECT *
      INTO matched_member
      FROM public.members
     WHERE email = normalized_email
       AND member_status = 'ACTIVE';

    IF matched_member.id IS NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.members WHERE email = normalized_email
      ) THEN
        ineligible_count := ineligible_count + 1;
        review_rows := review_rows || jsonb_build_array(jsonb_build_object(
          'row_number', row_number,
          'email', normalized_email,
          'outcome', 'INELIGIBLE_MEMBER'
        ));
      ELSE
        unmatched_count := unmatched_count + 1;
        review_rows := review_rows || jsonb_build_array(jsonb_build_object(
          'row_number', row_number,
          'email', normalized_email,
          'outcome', 'NO_MEMBER_MATCH'
        ));
      END IF;
      CONTINUE;
    END IF;

    matched_count := matched_count + 1;

    SELECT *
      INTO prior_attendance
      FROM public.event_attendance
     WHERE event_id = p_event_id
       AND member_id = matched_member.id
     FOR UPDATE;

    prior_status := prior_attendance.status;
    desired_status := normalized_status;

    -- Never downgrade confirmed or checked-in evidence from an import.
    IF prior_attendance.status = 'CONFIRMED' THEN
      desired_status := 'CONFIRMED';
    ELSIF prior_attendance.status = 'CHECKED_IN'
       AND normalized_status <> 'CHECKED_IN' THEN
      desired_status := 'CHECKED_IN';
    END IF;

    IF desired_status = 'CHECKED_IN' THEN
      checked_in_timestamp := COALESCE(
        checked_in_timestamp,
        prior_attendance.checked_in_at,
        import_batch.created_at
      );
    END IF;

    IF prior_attendance.id IS NULL THEN
      INSERT INTO public.event_attendance(
        event_id,
        member_id,
        status,
        attendance_source,
        registered_at,
        checked_in_at,
        checked_in_by,
        import_batch_id
      ) VALUES (
        p_event_id,
        matched_member.id,
        desired_status,
        'LUMA_CSV',
        COALESCE(registered_timestamp, import_batch.created_at),
        CASE WHEN desired_status = 'CHECKED_IN'
          THEN checked_in_timestamp ELSE NULL END,
        NULL,
        import_batch.id
      )
      RETURNING * INTO saved_attendance;
    ELSE
      UPDATE public.event_attendance
         SET status = desired_status,
             attendance_source = CASE
               WHEN desired_status = 'CHECKED_IN'
                 AND normalized_status = 'CHECKED_IN' THEN 'LUMA_CSV'
               ELSE attendance_source
             END,
             registered_at = COALESCE(
               registered_timestamp, registered_at
             ),
             checked_in_at = CASE
               WHEN desired_status IN ('CHECKED_IN', 'CONFIRMED')
                 THEN COALESCE(checked_in_timestamp, checked_in_at)
               ELSE checked_in_at
             END,
             checked_in_by = CASE
               WHEN normalized_status = 'CHECKED_IN' THEN NULL
               ELSE checked_in_by
             END,
             import_batch_id = import_batch.id
       WHERE id = prior_attendance.id
      RETURNING * INTO saved_attendance;
    END IF;

    IF prior_attendance.id IS NULL OR prior_status <> saved_attendance.status THEN
      PERFORM private.record_event_attendance_history(
        saved_attendance.id,
        prior_status,
        saved_attendance.status,
        'LUMA_IMPORTED',
        actor_id,
        history_reason,
        gen_random_uuid()
      );
    END IF;
  END LOOP;

  UPDATE public.attendance_import_batches
     SET matched_rows = matched_count,
         unmatched_rows = unmatched_count,
         ineligible_rows = ineligible_count,
         ignored_rows = ignored_count,
         duplicate_rows = duplicate_count
   WHERE id = import_batch.id
  RETURNING * INTO import_batch;

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'LUMA_ATTENDANCE_CSV_IMPORTED',
    'attendance_import_batches',
    import_batch.id::TEXT,
    jsonb_build_object(
      'event_id', p_event_id,
      'file_name', normalized_file_name,
      'file_sha256', normalized_hash,
      'total_rows', import_batch.total_rows,
      'matched_rows', import_batch.matched_rows,
      'unmatched_rows', import_batch.unmatched_rows,
      'ineligible_rows', import_batch.ineligible_rows,
      'ignored_rows', import_batch.ignored_rows,
      'duplicate_rows', import_batch.duplicate_rows
    )
  );

  RETURN jsonb_build_object(
    'batch_id', import_batch.id,
    'total_rows', import_batch.total_rows,
    'matched_rows', import_batch.matched_rows,
    'unmatched_rows', import_batch.unmatched_rows,
    'ineligible_rows', import_batch.ineligible_rows,
    'ignored_rows', import_batch.ignored_rows,
    'duplicate_rows', import_batch.duplicate_rows,
    'review_rows', review_rows
  );
END
$$;

CREATE OR REPLACE FUNCTION private.record_manual_event_check_in(
  p_event_id UUID,
  p_member_id UUID,
  p_checked_in_at TIMESTAMPTZ,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  prior_attendance public.event_attendance;
  saved_attendance public.event_attendance;
  existing_history public.event_attendance_status_history;
BEGIN
  actor_id := private.require_active_admin();

  IF normalized_reason IS NULL
     OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Manual check-in reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND status IN ('PUBLISHED', 'COMPLETED')
  ) THEN
    RAISE EXCEPTION 'Eligible event not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = p_member_id AND member_status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active member not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO existing_history
    FROM public.event_attendance_status_history
   WHERE operation_key = p_operation_key;

  IF existing_history.id IS NOT NULL THEN
    SELECT * INTO saved_attendance
    FROM public.event_attendance
    WHERE id = existing_history.attendance_id;

    IF existing_history.action = 'MANUAL_CHECK_IN'
       AND saved_attendance.event_id = p_event_id
       AND saved_attendance.member_id = p_member_id
       AND existing_history.reason = normalized_reason THEN
      RETURN saved_attendance;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'ATTENDANCE:' || p_event_id::TEXT || ':' || p_member_id::TEXT,
      0
    )
  );

  SELECT *
    INTO prior_attendance
    FROM public.event_attendance
   WHERE event_id = p_event_id AND member_id = p_member_id
   FOR UPDATE;

  IF prior_attendance.status = 'CONFIRMED' THEN
    RAISE EXCEPTION 'Confirmed attendance cannot be checked in again'
      USING ERRCODE = '23514';
  END IF;

  IF prior_attendance.id IS NULL THEN
    INSERT INTO public.event_attendance(
      event_id,
      member_id,
      status,
      attendance_source,
      registered_at,
      checked_in_at,
      checked_in_by
    ) VALUES (
      p_event_id,
      p_member_id,
      'CHECKED_IN',
      'MANUAL',
      COALESCE(p_checked_in_at, pg_catalog.clock_timestamp()),
      COALESCE(p_checked_in_at, pg_catalog.clock_timestamp()),
      actor_id
    )
    RETURNING * INTO saved_attendance;
  ELSE
    UPDATE public.event_attendance
       SET status = 'CHECKED_IN',
           attendance_source = 'MANUAL',
           checked_in_at = COALESCE(
             p_checked_in_at, pg_catalog.clock_timestamp()
           ),
           checked_in_by = actor_id,
           confirmed_at = NULL,
           confirmed_by = NULL,
           confirmation_note = NULL
     WHERE id = prior_attendance.id
    RETURNING * INTO saved_attendance;
  END IF;

  PERFORM private.record_event_attendance_history(
    saved_attendance.id,
    prior_attendance.status,
    'CHECKED_IN',
    'MANUAL_CHECK_IN',
    actor_id,
    normalized_reason,
    p_operation_key
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'EVENT_MANUAL_CHECK_IN_RECORDED',
    'event_attendance',
    saved_attendance.id::TEXT,
    jsonb_build_object(
      'event_id', p_event_id,
      'member_id', p_member_id,
      'reason', normalized_reason
    )
  );

  RETURN saved_attendance;
END
$$;

CREATE OR REPLACE FUNCTION private.confirm_event_attendance(
  p_attendance_id UUID,
  p_note TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  normalized_note TEXT := NULLIF(btrim(p_note), '');
  attendance_row public.event_attendance;
  event_row public.events;
  existing_history public.event_attendance_status_history;
  award_entry public.points_ledger;
BEGIN
  actor_id := private.require_active_admin();

  IF normalized_note IS NOT NULL AND char_length(normalized_note) > 500 THEN
    RAISE EXCEPTION 'Confirmation note must not exceed 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO existing_history
    FROM public.event_attendance_status_history
   WHERE operation_key = p_operation_key;

  IF existing_history.id IS NOT NULL THEN
    SELECT * INTO attendance_row
    FROM public.event_attendance
    WHERE id = existing_history.attendance_id;

    IF existing_history.action = 'CONFIRMED'
       AND attendance_row.id = p_attendance_id
       AND existing_history.reason IS NOT DISTINCT FROM normalized_note THEN
      RETURN attendance_row;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT *
    INTO attendance_row
    FROM public.event_attendance
   WHERE id = p_attendance_id
   FOR UPDATE;

  IF attendance_row.id IS NULL THEN
    RAISE EXCEPTION 'Attendance record not found' USING ERRCODE = 'P0002';
  END IF;
  IF attendance_row.status <> 'CHECKED_IN' THEN
    RAISE EXCEPTION 'Only checked-in attendance can be confirmed'
      USING ERRCODE = '23514';
  END IF;
  IF attendance_row.reversal_ledger_id IS NOT NULL THEN
    RAISE EXCEPTION 'Corrected attendance cannot be confirmed again automatically'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
    INTO event_row
    FROM public.events
   WHERE id = attendance_row.event_id
     AND status IN ('PUBLISHED', 'COMPLETED')
   FOR UPDATE;

  IF event_row.id IS NULL THEN
    RAISE EXCEPTION 'Eligible event not found' USING ERRCODE = 'P0002';
  END IF;

  IF event_row.attendance_points > 0 THEN
    INSERT INTO public.points_ledger(
      member_id, source_type, source_id, points, balance_after, note
    ) VALUES (
      attendance_row.member_id,
      'EVENT_ATTENDANCE',
      attendance_row.id::TEXT,
      event_row.attendance_points,
      0,
      left('Event attendance: ' || event_row.title, 500)
    )
    RETURNING * INTO award_entry;
  END IF;

  UPDATE public.event_attendance
     SET status = 'CONFIRMED',
         confirmed_at = pg_catalog.clock_timestamp(),
         confirmed_by = actor_id,
         confirmation_note = normalized_note,
         award_points = event_row.attendance_points,
         award_ledger_id = award_entry.id,
         reversal_ledger_id = NULL
   WHERE id = attendance_row.id
  RETURNING * INTO attendance_row;

  PERFORM private.record_event_attendance_history(
    attendance_row.id,
    'CHECKED_IN',
    'CONFIRMED',
    'CONFIRMED',
    actor_id,
    normalized_note,
    p_operation_key
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'EVENT_ATTENDANCE_CONFIRMED',
    'event_attendance',
    attendance_row.id::TEXT,
    jsonb_build_object(
      'event_id', attendance_row.event_id,
      'member_id', attendance_row.member_id,
      'award_points', attendance_row.award_points,
      'award_ledger_id', attendance_row.award_ledger_id
    )
  );

  RETURN attendance_row;
END
$$;

CREATE OR REPLACE FUNCTION private.correct_event_attendance(
  p_attendance_id UUID,
  p_status TEXT,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID;
  normalized_status TEXT := upper(NULLIF(btrim(p_status), ''));
  normalized_reason TEXT := NULLIF(btrim(p_reason), '');
  attendance_row public.event_attendance;
  existing_history public.event_attendance_status_history;
  reversal_entry public.points_ledger;
  current_balance INTEGER;
  prior_status TEXT;
BEGIN
  actor_id := private.require_active_admin();

  IF normalized_status IS NULL
     OR normalized_status NOT IN ('CHECKED_IN', 'CANCELLED', 'NO_SHOW') THEN
    RAISE EXCEPTION 'Correction status must be CHECKED_IN, CANCELLED, or NO_SHOW'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_reason IS NULL
     OR char_length(normalized_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Correction reason must contain 3 to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO existing_history
    FROM public.event_attendance_status_history
   WHERE operation_key = p_operation_key;

  IF existing_history.id IS NOT NULL THEN
    SELECT * INTO attendance_row
    FROM public.event_attendance
    WHERE id = existing_history.attendance_id;

    IF existing_history.action = 'CORRECTED'
       AND attendance_row.id = p_attendance_id
       AND existing_history.to_status = normalized_status
       AND existing_history.reason = normalized_reason THEN
      RETURN attendance_row;
    END IF;
    RAISE EXCEPTION 'Operation key has already been used with different values'
      USING ERRCODE = '23505';
  END IF;

  SELECT *
    INTO attendance_row
    FROM public.event_attendance
   WHERE id = p_attendance_id
   FOR UPDATE;

  IF attendance_row.id IS NULL THEN
    RAISE EXCEPTION 'Attendance record not found' USING ERRCODE = 'P0002';
  END IF;
  IF attendance_row.status = normalized_status THEN
    RAISE EXCEPTION 'Attendance already has the requested status'
      USING ERRCODE = '23514';
  END IF;

  prior_status := attendance_row.status;

  IF attendance_row.status = 'CONFIRMED'
     AND attendance_row.award_points > 0
     AND attendance_row.reversal_ledger_id IS NULL THEN
    SELECT balance_after
      INTO current_balance
      FROM public.points_ledger
     WHERE member_id = attendance_row.member_id
     ORDER BY ledger_sequence DESC
     LIMIT 1;

    IF COALESCE(current_balance, 0) < attendance_row.award_points THEN
      RAISE EXCEPTION 'Attendance award cannot be reversed because the member wallet has insufficient balance'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.points_ledger(
      member_id, source_type, source_id, points, balance_after, note
    ) VALUES (
      attendance_row.member_id,
      'EVENT_ATTENDANCE_REVERSAL',
      attendance_row.id::TEXT,
      -attendance_row.award_points,
      0,
      left('Attendance correction: ' || normalized_reason, 500)
    )
    RETURNING * INTO reversal_entry;
  END IF;

  UPDATE public.event_attendance
     SET status = normalized_status,
         checked_in_at = CASE
           WHEN normalized_status = 'CHECKED_IN'
             THEN COALESCE(checked_in_at, pg_catalog.clock_timestamp())
           ELSE checked_in_at
         END,
         checked_in_by = CASE
           WHEN normalized_status = 'CHECKED_IN'
             THEN COALESCE(checked_in_by, actor_id)
           ELSE checked_in_by
         END,
         confirmed_at = NULL,
         confirmed_by = NULL,
         confirmation_note = normalized_reason,
         reversal_ledger_id = COALESCE(
           reversal_entry.id, reversal_ledger_id
         )
   WHERE id = attendance_row.id
  RETURNING * INTO attendance_row;

  PERFORM private.record_event_attendance_history(
    attendance_row.id,
    prior_status,
    normalized_status,
    'CORRECTED',
    actor_id,
    normalized_reason,
    p_operation_key
  );

  INSERT INTO public.audit_logs(
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    actor_id,
    'EVENT_ATTENDANCE_CORRECTED',
    'event_attendance',
    attendance_row.id::TEXT,
    jsonb_build_object(
      'event_id', attendance_row.event_id,
      'member_id', attendance_row.member_id,
      'from_status', prior_status,
      'to_status', normalized_status,
      'reason', normalized_reason,
      'reversal_ledger_id', attendance_row.reversal_ledger_id
    )
  );

  RETURN attendance_row;
END
$$;

DROP FUNCTION public.confirm_event_attendance(UUID, UUID);

CREATE FUNCTION public.set_event_attendance_points(
  p_event_id UUID,
  p_points INTEGER
)
RETURNS public.events
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_event_attendance_points(p_event_id, p_points)
$$;

CREATE FUNCTION public.import_luma_attendance_csv(
  p_event_id UUID,
  p_file_name TEXT,
  p_file_sha256 TEXT,
  p_rows JSONB,
  p_operation_key UUID
)
RETURNS JSONB
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.import_luma_attendance_csv(
    p_event_id,
    p_file_name,
    p_file_sha256,
    p_rows,
    p_operation_key
  )
$$;

CREATE FUNCTION public.record_manual_event_check_in(
  p_event_id UUID,
  p_member_id UUID,
  p_checked_in_at TIMESTAMPTZ,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.record_manual_event_check_in(
    p_event_id,
    p_member_id,
    p_checked_in_at,
    p_reason,
    p_operation_key
  )
$$;

CREATE FUNCTION public.confirm_event_attendance(
  p_attendance_id UUID,
  p_note TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.confirm_event_attendance(
    p_attendance_id,
    p_note,
    p_operation_key
  )
$$;

CREATE FUNCTION public.correct_event_attendance(
  p_attendance_id UUID,
  p_status TEXT,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.event_attendance
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.correct_event_attendance(
    p_attendance_id,
    p_status,
    p_reason,
    p_operation_key
  )
$$;

REVOKE ALL ON FUNCTION private.record_event_attendance_history(
  UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID
) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION private.set_event_attendance_points(UUID, INTEGER)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.import_luma_attendance_csv(
  UUID, TEXT, TEXT, JSONB, UUID
) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.record_manual_event_check_in(
  UUID, UUID, TIMESTAMPTZ, TEXT, UUID
) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.confirm_event_attendance(UUID, TEXT, UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.correct_event_attendance(
  UUID, TEXT, TEXT, UUID
) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION private.set_event_attendance_points(UUID, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.import_luma_attendance_csv(
  UUID, TEXT, TEXT, JSONB, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.record_manual_event_check_in(
  UUID, UUID, TIMESTAMPTZ, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.confirm_event_attendance(UUID, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.correct_event_attendance(
  UUID, TEXT, TEXT, UUID
) TO authenticated;

REVOKE ALL ON FUNCTION public.set_event_attendance_points(UUID, INTEGER)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.import_luma_attendance_csv(
  UUID, TEXT, TEXT, JSONB, UUID
) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.record_manual_event_check_in(
  UUID, UUID, TIMESTAMPTZ, TEXT, UUID
) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.confirm_event_attendance(UUID, TEXT, UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.correct_event_attendance(
  UUID, TEXT, TEXT, UUID
) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.set_event_attendance_points(UUID, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_luma_attendance_csv(
  UUID, TEXT, TEXT, JSONB, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_manual_event_check_in(
  UUID, UUID, TIMESTAMPTZ, TEXT, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_event_attendance(UUID, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_event_attendance(
  UUID, TEXT, TEXT, UUID
) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
