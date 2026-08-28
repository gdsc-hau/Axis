-- Release hardening: cover every foreign key reported by the hosted
-- Supabase Performance Advisor on 2026-08-27. These indexes support joins
-- and parent-row updates/deletes without changing data or authorization.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260826170000'
  ) THEN
    RAISE EXCEPTION
      'Phase 12 system readiness must be deployed before release advisor hardening';
  END IF;
END
$$;

CREATE INDEX app_settings_updated_by_idx
  ON public.app_settings(updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX article_categories_created_by_idx
  ON public.article_categories(created_by);

CREATE INDEX article_categories_updated_by_idx
  ON public.article_categories(updated_by);

CREATE INDEX article_category_revisions_actor_idx
  ON public.article_category_revisions(actor_id);

CREATE INDEX attendance_import_batches_created_by_idx
  ON public.attendance_import_batches(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX badge_award_batches_badge_idx
  ON public.badge_award_batches(badge_id);

CREATE INDEX badge_award_batches_created_by_idx
  ON public.badge_award_batches(created_by);

CREATE INDEX badge_award_history_actor_idx
  ON public.badge_award_status_history(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX badges_created_by_idx
  ON public.badges(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX certificate_batches_created_by_idx
  ON public.certificate_issuance_batches(created_by);

CREATE INDEX certificate_history_actor_idx
  ON public.certificate_status_history(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX certificates_issued_by_idx
  ON public.certificates(issued_by)
  WHERE issued_by IS NOT NULL;

CREATE INDEX certificates_revoked_by_idx
  ON public.certificates(revoked_by)
  WHERE revoked_by IS NOT NULL;

CREATE INDEX event_attendance_checked_in_by_idx
  ON public.event_attendance(checked_in_by)
  WHERE checked_in_by IS NOT NULL;

CREATE INDEX event_attendance_history_actor_idx
  ON public.event_attendance_status_history(actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX member_badges_awarded_by_idx
  ON public.member_badges(awarded_by)
  WHERE awarded_by IS NOT NULL;

CREATE INDEX member_badges_revoked_by_idx
  ON public.member_badges(revoked_by)
  WHERE revoked_by IS NOT NULL;

CREATE INDEX notification_campaigns_created_by_idx
  ON public.notification_campaigns(created_by);

CREATE INDEX notification_delivery_config_updated_by_idx
  ON public.notification_delivery_config(updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX rewards_created_by_idx
  ON public.rewards(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX rewards_updated_by_idx
  ON public.rewards(updated_by)
  WHERE updated_by IS NOT NULL;

COMMIT;
