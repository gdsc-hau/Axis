BEGIN;

-- Phase 12 adds an administrator-only, durable release-readiness audit. The
-- checks are derived from authoritative Phase 1-11 tables; they do not repair
-- data or call external services.

CREATE TABLE public.system_health_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  total_checks INTEGER NOT NULL DEFAULT 0,
  passed_checks INTEGER NOT NULL DEFAULT 0,
  warning_checks INTEGER NOT NULL DEFAULT 0,
  failed_checks INTEGER NOT NULL DEFAULT 0,
  application_version TEXT NOT NULL,
  initiated_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT system_health_runs_status_check
    CHECK (status IN ('RUNNING', 'PASS', 'WARN', 'FAIL')),
  CONSTRAINT system_health_runs_counts_check CHECK (
    total_checks >= 0 AND passed_checks >= 0 AND warning_checks >= 0
    AND failed_checks >= 0
    AND passed_checks + warning_checks + failed_checks = total_checks
  ),
  CONSTRAINT system_health_runs_version_check
    CHECK (char_length(btrim(application_version)) BETWEEN 1 AND 100),
  CONSTRAINT system_health_runs_timestamps_check
    CHECK (completed_at IS NULL OR completed_at >= started_at),
  CONSTRAINT system_health_runs_completion_check CHECK (
    (status = 'RUNNING' AND completed_at IS NULL)
    OR (status <> 'RUNNING' AND completed_at IS NOT NULL)
  )
);

CREATE TABLE public.system_health_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.system_health_runs(id) ON DELETE RESTRICT,
  check_key TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT system_health_results_key_check
    CHECK (check_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  CONSTRAINT system_health_results_category_check
    CHECK (category ~ '^[A-Z]+(?:_[A-Z]+)*$'),
  CONSTRAINT system_health_results_status_check
    CHECK (status IN ('PASS', 'WARN', 'FAIL')),
  CONSTRAINT system_health_results_details_check
    CHECK (char_length(btrim(details)) BETWEEN 1 AND 1000),
  CONSTRAINT system_health_results_sort_check CHECK (sort_order BETWEEN 1 AND 1000),
  CONSTRAINT system_health_results_run_key UNIQUE (run_id, check_key),
  CONSTRAINT system_health_results_run_sort UNIQUE (run_id, sort_order)
);

CREATE INDEX system_health_runs_started_idx
  ON public.system_health_runs(started_at DESC, id);
CREATE INDEX system_health_runs_status_started_idx
  ON public.system_health_runs(status, started_at DESC);
CREATE INDEX system_health_runs_initiator_idx
  ON public.system_health_runs(initiated_by, started_at DESC);
CREATE INDEX system_health_results_run_status_idx
  ON public.system_health_results(run_id, status, sort_order);

ALTER TABLE public.system_health_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_health_runs_admin_read
  ON public.system_health_runs FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY system_health_results_admin_read
  ON public.system_health_results FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.system_health_runs, public.system_health_results
  FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.system_health_runs, public.system_health_results
  FROM authenticated, service_role;
GRANT SELECT ON TABLE public.system_health_runs, public.system_health_results
  TO authenticated;

CREATE OR REPLACE FUNCTION private.collect_system_health_checks()
RETURNS TABLE (
  check_key TEXT,
  category TEXT,
  status TEXT,
  details TEXT,
  sort_order INTEGER
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  problem_count BIGINT;
  secondary_count BIGINT;
  total_count BIGINT;
  enabled_value BOOLEAN;
  support_value TEXT;
BEGIN
  PERFORM private.require_active_admin();

  SELECT count(*) INTO problem_count
  FROM public.members AS member
  WHERE member.email IS NULL
     OR member.email <> lower(btrim(member.email))
     OR NULLIF(btrim(member.full_name), '') IS NULL
     OR member.member_status NOT IN (
       'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'ALUMNI'
     );
  SELECT count(*) - count(DISTINCT lower(btrim(member.email)))
    INTO secondary_count FROM public.members AS member;
  check_key := 'registry_integrity'; category := 'IDENTITY';
  status := CASE WHEN problem_count + secondary_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid registry rows=%s; duplicate normalized emails=%s',
                    problem_count, secondary_count);
  sort_order := 10; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.members AS member
  LEFT JOIN auth.users AS auth_user ON auth_user.id = member.auth_id
  WHERE member.auth_id IS NOT NULL
    AND (
      auth_user.id IS NULL OR auth_user.email IS NULL
      OR lower(btrim(auth_user.email)) <> member.email
    );
  SELECT count(*) INTO secondary_count
  FROM public.members AS member WHERE member.auth_id IS NOT NULL;
  SELECT count(*) INTO total_count
  FROM public.members AS member WHERE member.member_status = 'ACTIVE';
  check_key := 'auth_link_integrity'; category := 'IDENTITY';
  status := CASE WHEN problem_count > 0 THEN 'FAIL'
                 WHEN secondary_count < total_count THEN 'WARN' ELSE 'PASS' END;
  details := format('invalid linked accounts=%s; linked=%s; active registry members=%s',
                    problem_count, secondary_count, total_count);
  sort_order := 20; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.events AS event
  WHERE NULLIF(btrim(event.title), '') IS NULL
     OR event.end_at < event.start_at
     OR (event.source_provider = 'BEVY' AND (
       event.source_event_id IS NULL OR event.source_chapter_id IS NULL
       OR event.source_url !~* '^https://gdg\.community\.dev/'
     ))
     OR (event.luma_url IS NOT NULL AND event.luma_url !~* '^https://(lu\.ma|luma\.com)/');
  check_key := 'event_mirror_integrity'; category := 'EVENTS';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid event mirror rows=%s', problem_count);
  sort_order := 30; RETURN NEXT;

  SELECT count(*) INTO total_count FROM public.events AS event
  WHERE event.source_provider = 'BEVY';
  check_key := 'event_source_activity'; category := 'EVENTS';
  status := CASE WHEN total_count > 0 THEN 'PASS' ELSE 'WARN' END;
  details := format('Bevy/GDG Community event rows=%s', total_count);
  sort_order := 40; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM (
    SELECT ledger.id, ledger.balance_after,
           sum(ledger.points) OVER (
             PARTITION BY ledger.member_id ORDER BY ledger.ledger_sequence
             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           ) AS expected_balance
    FROM public.points_ledger AS ledger
  ) AS balances
  WHERE balances.balance_after <> balances.expected_balance
     OR balances.balance_after < 0;
  check_key := 'ledger_integrity'; category := 'GYROCOINS';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('running-balance or overdraw violations=%s', problem_count);
  sort_order := 50; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.redemptions AS redemption
  WHERE redemption.debit_ledger_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.points_ledger AS ledger
       WHERE ledger.id = redemption.debit_ledger_id
         AND ledger.member_id = redemption.member_id
         AND ledger.source_type = 'MARKETPLACE_REDEMPTION'
     )
     OR (redemption.status = 'CANCELLED' AND redemption.refund_ledger_id IS NULL)
     OR NOT EXISTS (
       SELECT 1 FROM public.redemption_status_history AS history
       WHERE history.redemption_id = redemption.id
     );
  check_key := 'marketplace_integrity'; category := 'MARKETPLACE';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid redemption financial/history rows=%s', problem_count);
  sort_order := 60; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.event_attendance AS attendance
  WHERE NOT EXISTS (
      SELECT 1 FROM public.event_attendance_status_history AS history
      WHERE history.attendance_id = attendance.id
    )
     OR (attendance.status = 'CONFIRMED' AND (
       attendance.confirmed_at IS NULL OR attendance.confirmed_by IS NULL
       OR (attendance.award_points > 0 AND attendance.award_ledger_id IS NULL)
     ))
     OR (attendance.award_ledger_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.points_ledger AS ledger
       WHERE ledger.id = attendance.award_ledger_id
         AND ledger.member_id = attendance.member_id
     ));
  check_key := 'attendance_integrity'; category := 'ATTENDANCE';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid attendance financial/history rows=%s', problem_count);
  sort_order := 70; RETURN NEXT;

  SELECT
    (SELECT count(*) FROM public.member_badges AS award
      WHERE NOT EXISTS (
        SELECT 1 FROM public.badge_award_status_history AS history
        WHERE history.member_badge_id = award.id
      ))
    +
    (SELECT count(*) FROM public.certificates AS certificate
      WHERE NOT EXISTS (
        SELECT 1 FROM public.certificate_status_history AS history
        WHERE history.certificate_id = certificate.id
      ) OR (certificate.status IN ('ISSUED', 'REVOKED') AND (
        certificate.storage_path IS NULL OR certificate.issued_at IS NULL
      )))
    INTO problem_count;
  check_key := 'credential_integrity'; category := 'CREDENTIALS';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid badge or certificate lifecycle rows=%s', problem_count);
  sort_order := 80; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.notification_email_outbox AS outbox
  WHERE outbox.recipient_email <> lower(btrim(outbox.recipient_email))
     OR outbox.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR (outbox.status = 'SENT' AND outbox.sent_at IS NULL)
     OR (outbox.status = 'PROCESSING' AND outbox.claimed_at IS NULL);
  check_key := 'communications_integrity'; category := 'COMMUNICATIONS';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid email outbox rows=%s', problem_count);
  sort_order := 90; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.articles AS article
  WHERE NOT EXISTS (
      SELECT 1 FROM public.article_revisions AS revision
      WHERE revision.article_id = article.id
    )
     OR NOT EXISTS (
      SELECT 1 FROM public.article_status_history AS history
      WHERE history.article_id = article.id
    )
     OR (article.status = 'PUBLISHED' AND article.published_at IS NULL)
     OR (article.status = 'SCHEDULED' AND article.scheduled_for IS NULL);
  check_key := 'content_integrity'; category := 'CONTENT';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('invalid article revision/status rows=%s', problem_count);
  sort_order := 100; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM public.members AS member
  WHERE member.profile_completed_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.member_profile_revisions AS revision
      WHERE revision.member_id = member.id
    );
  SELECT count(*) INTO secondary_count FROM public.app_settings AS setting
  WHERE setting.key = 'PORTAL_SETTINGS'
    AND jsonb_typeof(setting.value) = 'object'
    AND setting.value ?& ARRAY[
      'organization_name', 'support_email', 'dashboard_message',
      'default_report_days', 'leaderboard_limit'
    ];
  check_key := 'portal_operations_integrity'; category := 'PORTAL';
  status := CASE WHEN problem_count = 0 AND secondary_count = 1 THEN 'PASS' ELSE 'FAIL' END;
  details := format('completed profiles without history=%s; valid portal settings rows=%s',
                    problem_count, secondary_count);
  sort_order := 110; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM (VALUES
    ('members'), ('events'), ('event_attendance'), ('points_ledger'),
    ('rewards'), ('redemptions'), ('badges'), ('member_badges'),
    ('certificates'), ('notifications'), ('articles'), ('app_settings')
  ) AS required(table_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = required.table_name
      AND relation.relrowsecurity
  );
  check_key := 'row_level_security_coverage'; category := 'SECURITY';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format('critical public tables without RLS=%s', problem_count);
  sort_order := 120; RETURN NEXT;

  SELECT count(*) INTO problem_count
  FROM pg_catalog.pg_proc AS procedure
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.prosecdef
    AND pg_catalog.has_function_privilege('anon', procedure.oid, 'EXECUTE')
    -- These four helpers are intentionally narrow, read-only public projections
    -- used by Phase 7 certificate verification and Phase 9 article pages.
    AND procedure.proname NOT IN (
      'list_public_articles', 'get_public_article',
      'list_public_article_categories', 'get_public_certificate_verification'
    );
  check_key := 'security_definer_exposure'; category := 'SECURITY';
  status := CASE WHEN problem_count = 0 THEN 'PASS' ELSE 'FAIL' END;
  details := format(
    'non-allowlisted private security-definer functions executable by anonymous callers=%s',
    problem_count
  );
  sort_order := 130; RETURN NEXT;

  SELECT config.email_delivery_enabled INTO enabled_value
  FROM public.notification_delivery_config AS config
  WHERE config.singleton = TRUE;
  check_key := 'email_delivery_gate'; category := 'OPERATIONS';
  status := CASE WHEN COALESCE(enabled_value, FALSE) THEN 'WARN' ELSE 'PASS' END;
  details := CASE WHEN COALESCE(enabled_value, FALSE)
    THEN 'Database email gate is enabled; confirm worker/provider secrets before release'
    ELSE 'Database email gate remains safely disabled' END;
  sort_order := 140; RETURN NEXT;

  SELECT setting.value ->> 'support_email' INTO support_value
  FROM public.app_settings AS setting WHERE setting.key = 'PORTAL_SETTINGS';
  check_key := 'support_channel'; category := 'OPERATIONS';
  status := CASE WHEN NULLIF(btrim(support_value), '') IS NULL THEN 'WARN' ELSE 'PASS' END;
  details := CASE WHEN NULLIF(btrim(support_value), '') IS NULL
    THEN 'Portal support email is not configured'
    ELSE format('Portal support email is configured as %s', support_value) END;
  sort_order := 150; RETURN NEXT;
END
$$;

REVOKE ALL ON FUNCTION private.collect_system_health_checks()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.run_system_health_check(
  p_operation_key UUID,
  p_application_version TEXT
)
RETURNS public.system_health_runs
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  existing_run public.system_health_runs;
  result_run public.system_health_runs;
  normalized_version TEXT := btrim(p_application_version);
BEGIN
  IF p_operation_key IS NULL THEN
    RAISE EXCEPTION 'An operation key is required' USING ERRCODE = '22023';
  END IF;
  IF normalized_version IS NULL
     OR char_length(normalized_version) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Application version must contain 1 to 100 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT run.* INTO existing_run
  FROM public.system_health_runs AS run
  WHERE run.operation_key = p_operation_key;
  IF existing_run.id IS NOT NULL THEN
    IF existing_run.application_version <> normalized_version
       OR existing_run.initiated_by <> actor_id THEN
      RAISE EXCEPTION 'Operation key was already used for another health check'
        USING ERRCODE = '23505';
    END IF;
    RETURN existing_run;
  END IF;

  INSERT INTO public.system_health_runs(
    operation_key, application_version, initiated_by
  ) VALUES (p_operation_key, normalized_version, actor_id)
  RETURNING * INTO result_run;

  INSERT INTO public.system_health_results(
    run_id, check_key, category, status, details, sort_order
  )
  SELECT result_run.id, health.check_key, health.category, health.status,
         health.details, health.sort_order
  FROM private.collect_system_health_checks() AS health;

  UPDATE public.system_health_runs AS run
  SET total_checks = summary.total_checks,
      passed_checks = summary.passed_checks,
      warning_checks = summary.warning_checks,
      failed_checks = summary.failed_checks,
      status = CASE WHEN summary.failed_checks > 0 THEN 'FAIL'
                    WHEN summary.warning_checks > 0 THEN 'WARN'
                    ELSE 'PASS' END,
      completed_at = clock_timestamp()
  FROM (
    SELECT count(*)::INTEGER AS total_checks,
           count(*) FILTER (WHERE result.status = 'PASS')::INTEGER AS passed_checks,
           count(*) FILTER (WHERE result.status = 'WARN')::INTEGER AS warning_checks,
           count(*) FILTER (WHERE result.status = 'FAIL')::INTEGER AS failed_checks
    FROM public.system_health_results AS result
    WHERE result.run_id = result_run.id
  ) AS summary
  WHERE run.id = result_run.id
  RETURNING run.* INTO result_run;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id,
    'SYSTEM_HEALTH_CHECK_COMPLETED',
    'SYSTEM_HEALTH_RUN',
    result_run.id,
    jsonb_build_object(
      'status', result_run.status,
      'total_checks', result_run.total_checks,
      'warning_checks', result_run.warning_checks,
      'failed_checks', result_run.failed_checks,
      'application_version', result_run.application_version,
      'operation_key', result_run.operation_key
    )
  );

  RETURN result_run;
END
$$;

REVOKE ALL ON FUNCTION private.run_system_health_check(UUID, TEXT)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION private.run_system_health_check(UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.run_system_health_check(
  p_operation_key UUID,
  p_application_version TEXT
)
RETURNS public.system_health_runs
LANGUAGE SQL
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.run_system_health_check(p_operation_key, p_application_version)
$$;

REVOKE ALL ON FUNCTION public.run_system_health_check(UUID, TEXT)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.run_system_health_check(UUID, TEXT)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
