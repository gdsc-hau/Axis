-- Transactional hosted smoke test for Phase 8 communications.
-- Creates member preferences, a manual-wallet notification, an administrator
-- campaign, email outbox work, and lifecycle changes, then rolls back all data.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT auth_id::TEXT
    FROM public.members
    WHERE member_status = 'ACTIVE'
      AND role = 'ADMIN'
      AND auth_id IS NOT NULL
    ORDER BY created_at, id
    LIMIT 1
  ),
  TRUE
);

SET LOCAL ROLE authenticated;

DO $member_and_admin_operations$
DECLARE
  admin_member_id UUID := public.current_member_id();
  campaign public.notification_campaigns;
  repeated_campaign public.notification_campaigns;
  campaign_notification public.notifications;
  direct_write_rejected BOOLEAN := FALSE;
BEGIN
  IF admin_member_id IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required';
  END IF;

  PERFORM public.update_current_notification_preferences(
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
  );

  PERFORM public.adjust_member_gyrocoins(
    admin_member_id, 1, 'Phase 8 rollback-only notification smoke test',
    'a1180000-0000-4000-8000-000000000001'
  );

  SELECT * INTO campaign
  FROM public.publish_notification_campaign(
    'ANNOUNCEMENT', 'Phase 8 smoke announcement',
    'This message and its queued email will be rolled back.',
    '/member/notifications', TRUE,
    'a1180000-0000-4000-8000-000000000002'
  );
  SELECT * INTO repeated_campaign
  FROM public.publish_notification_campaign(
    'ANNOUNCEMENT', 'Phase 8 smoke announcement',
    'This message and its queued email will be rolled back.',
    '/member/notifications', TRUE,
    'a1180000-0000-4000-8000-000000000002'
  );
  IF campaign.id <> repeated_campaign.id OR campaign.recipient_count < 1 THEN
    RAISE EXCEPTION 'Campaign publishing was not correct and idempotent';
  END IF;

  SELECT notification_record.* INTO campaign_notification
  FROM public.notifications AS notification_record
  WHERE notification_record.member_id = admin_member_id
    AND notification_record.source_type = 'CAMPAIGN'
    AND notification_record.source_id = campaign.id::TEXT;
  IF campaign_notification.id IS NULL OR campaign_notification.read THEN
    RAISE EXCEPTION 'Campaign notification was not created unread';
  END IF;

  PERFORM public.mark_notification_read(campaign_notification.id);
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE id = campaign_notification.id AND read AND read_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Notification could not be marked read';
  END IF;

  PERFORM public.dismiss_notification(campaign_notification.id);
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE id = campaign_notification.id AND dismissed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Notification could not be dismissed';
  END IF;

  BEGIN
    INSERT INTO public.notifications(member_id, type, title, message)
    VALUES (admin_member_id, 'SYSTEM', 'Forbidden', 'Forbidden direct write');
  EXCEPTION
    WHEN insufficient_privilege THEN direct_write_rejected := TRUE;
  END;
  IF NOT direct_write_rejected THEN
    RAISE EXCEPTION 'Authenticated direct notification insertion was allowed';
  END IF;

  PERFORM public.set_notification_email_delivery(TRUE);
END
$member_and_admin_operations$;

RESET ROLE;
SET LOCAL ROLE service_role;

DO $worker_operations$
DECLARE
  claimed public.notification_email_outbox;
  completed public.notification_email_outbox;
BEGIN
  SELECT * INTO claimed
  FROM public.claim_notification_email_batch(10)
  ORDER BY created_at, id
  LIMIT 1;

  IF claimed.id IS NULL OR claimed.status <> 'PROCESSING'
     OR claimed.attempt_count <> 1 THEN
    RAISE EXCEPTION 'Email worker could not claim queued work';
  END IF;

  SELECT * INTO completed
  FROM public.complete_notification_email(
    claimed.id, 'phase-8-rollback-provider-id'
  );
  IF completed.status <> 'SENT' OR completed.sent_at IS NULL THEN
    RAISE EXCEPTION 'Email worker could not complete claimed work';
  END IF;
END
$worker_operations$;

RESET ROLE;

DO $assertions$
DECLARE
  admin_member_id UUID;
BEGIN
  SELECT id INTO admin_member_id
  FROM public.members
  WHERE member_status = 'ACTIVE'
    AND role = 'ADMIN'
    AND auth_id IS NOT NULL
  ORDER BY created_at, id
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE member_id = admin_member_id
      AND source_type = 'POINTS_LEDGER'
      AND type = 'GYROCOIN'
  ) THEN
    RAISE EXCEPTION 'Manual Gyrocoin transaction did not create a notification';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notification_email_outbox
    WHERE member_id = admin_member_id AND status = 'SENT'
  ) THEN
    RAISE EXCEPTION 'Email outbox lifecycle was not completed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs
    WHERE actor_id = admin_member_id
      AND action = 'NOTIFICATION_CAMPAIGN_PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'Campaign audit record was not created';
  END IF;
END
$assertions$;

ROLLBACK;

SELECT
  'notifications_communications_transactional_smoke_test'::TEXT AS check_name,
  TRUE AS passed,
  'preferences, domain triggers, campaign idempotency, inbox lifecycle, outbox claiming/completion, audit, and write-denial assertions passed; fixtures rolled back'::TEXT AS details;
