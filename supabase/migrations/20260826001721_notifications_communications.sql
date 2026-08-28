-- Phase 8: in-app notifications, member preferences, administrator
-- announcements, and a provider-neutral email outbox.
--
-- External delivery is deliberately disabled on deployment. Domain writes only
-- create durable in-app notifications and, for opted-in members, queue email.
-- A separately authenticated Edge Function must be enabled explicitly before
-- any queued email can leave the system.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260825170545'
  ) THEN
    RAISE EXCEPTION 'Phase 7 credentials must be deployed first';
  END IF;

  IF to_regclass('public.member_notification_preferences') IS NOT NULL
     OR to_regclass('public.notification_campaigns') IS NOT NULL
     OR to_regclass('public.notification_delivery_config') IS NOT NULL
     OR to_regclass('public.notification_email_outbox') IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 8 communications objects already exist outside migration history';
  END IF;
END
$$;

-- Preserve the original columns for compatibility while making the record a
-- complete, independently renderable inbox item.
ALTER TABLE public.notifications
  ADD COLUMN title TEXT,
  ADD COLUMN action_url TEXT,
  ADD COLUMN source_type TEXT,
  ADD COLUMN source_id TEXT,
  ADD COLUMN dedupe_key TEXT,
  ADD COLUMN read_at TIMESTAMPTZ,
  ADD COLUMN dismissed_at TIMESTAMPTZ,
  ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE public.notifications
SET type = CASE upper(btrim(type))
      WHEN 'ACCOUNT' THEN 'ACCOUNT'
      WHEN 'EVENT' THEN 'EVENT'
      WHEN 'ATTENDANCE' THEN 'ATTENDANCE'
      WHEN 'GYROCOIN' THEN 'GYROCOIN'
      WHEN 'REWARD' THEN 'REWARD'
      WHEN 'CREDENTIAL' THEN 'CREDENTIAL'
      WHEN 'ANNOUNCEMENT' THEN 'ANNOUNCEMENT'
      ELSE 'SYSTEM'
    END,
    title = 'Notification',
    message = left(COALESCE(NULLIF(btrim(message), ''), 'Notification'), 1000),
    read = COALESCE(read, FALSE),
    read_at = CASE WHEN COALESCE(read, FALSE) THEN created_at ELSE NULL END,
    updated_at = created_at;

ALTER TABLE public.notifications
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN message SET NOT NULL,
  ALTER COLUMN read SET DEFAULT FALSE,
  ALTER COLUMN read SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT pg_catalog.now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT pg_catalog.now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'SYSTEM', 'ACCOUNT', 'EVENT', 'ATTENDANCE', 'GYROCOIN',
      'REWARD', 'CREDENTIAL', 'ANNOUNCEMENT'
    )
  ),
  ADD CONSTRAINT notifications_title_check CHECK (
    title = btrim(title) AND char_length(title) BETWEEN 1 AND 160
  ),
  ADD CONSTRAINT notifications_message_check CHECK (
    message = btrim(message) AND char_length(message) BETWEEN 1 AND 1000
  ),
  ADD CONSTRAINT notifications_action_url_check CHECK (
    action_url IS NULL OR (
      char_length(action_url) BETWEEN 1 AND 500
      AND action_url ~ '^/[A-Za-z0-9/_?=&.%#-]*$'
      AND action_url !~ '^//'
    )
  ),
  ADD CONSTRAINT notifications_source_check CHECK (
    (source_type IS NULL AND source_id IS NULL)
    OR (
      source_type IN (
        'SYSTEM', 'POINTS_LEDGER', 'REDEMPTION', 'ATTENDANCE',
        'BADGE_AWARD', 'CERTIFICATE', 'CAMPAIGN'
      )
      AND source_id IS NOT NULL
      AND source_id = btrim(source_id)
      AND char_length(source_id) BETWEEN 1 AND 200
    )
  ),
  ADD CONSTRAINT notifications_dedupe_key_check CHECK (
    dedupe_key IS NULL OR (
      dedupe_key = btrim(dedupe_key)
      AND char_length(dedupe_key) BETWEEN 1 AND 300
    )
  ),
  ADD CONSTRAINT notifications_read_consistency_check CHECK (
    read = (read_at IS NOT NULL)
  ),
  ADD CONSTRAINT notifications_timestamp_check CHECK (
    updated_at >= created_at
    AND (read_at IS NULL OR read_at >= created_at)
    AND (dismissed_at IS NULL OR dismissed_at >= created_at)
  );

CREATE UNIQUE INDEX notifications_member_dedupe_idx
  ON public.notifications(member_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE INDEX notifications_member_inbox_idx
  ON public.notifications(member_id, dismissed_at, created_at DESC, id DESC);
CREATE INDEX notifications_member_unread_idx
  ON public.notifications(member_id, created_at DESC, id DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE public.member_notification_preferences (
  member_id UUID PRIMARY KEY
    REFERENCES public.members(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  account_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  event_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  gyrocoin_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reward_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  credential_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  announcement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT member_notification_preferences_timestamp_check
    CHECK (updated_at >= created_at)
);

CREATE TABLE public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key UUID NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  include_email BOOLEAN NOT NULL DEFAULT FALSE,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT notification_campaigns_category_check CHECK (
    category IN ('ANNOUNCEMENT', 'EVENT', 'SYSTEM')
  ),
  CONSTRAINT notification_campaigns_title_check CHECK (
    title = btrim(title) AND char_length(title) BETWEEN 1 AND 160
  ),
  CONSTRAINT notification_campaigns_message_check CHECK (
    message = btrim(message) AND char_length(message) BETWEEN 1 AND 1000
  ),
  CONSTRAINT notification_campaigns_action_url_check CHECK (
    action_url IS NULL OR (
      char_length(action_url) BETWEEN 1 AND 500
      AND action_url ~ '^/[A-Za-z0-9/_?=&.%#-]*$'
      AND action_url !~ '^//'
    )
  ),
  CONSTRAINT notification_campaigns_recipient_count_check
    CHECK (recipient_count >= 0)
);

CREATE INDEX notification_campaigns_created_idx
  ON public.notification_campaigns(created_at DESC, id DESC);

CREATE TABLE public.notification_delivery_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  email_delivery_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

INSERT INTO public.notification_delivery_config(singleton)
VALUES (TRUE);

CREATE TABLE public.notification_email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL UNIQUE
    REFERENCES public.notifications(id) ON DELETE RESTRICT,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'RESEND',
  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT notification_email_outbox_email_check CHECK (
    recipient_email = lower(btrim(recipient_email))
    AND char_length(recipient_email) BETWEEN 3 AND 254
    AND recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT notification_email_outbox_subject_check CHECK (
    subject = btrim(subject) AND char_length(subject) BETWEEN 1 AND 160
  ),
  CONSTRAINT notification_email_outbox_body_check CHECK (
    text_body = btrim(text_body) AND char_length(text_body) BETWEEN 1 AND 5000
  ),
  CONSTRAINT notification_email_outbox_provider_check
    CHECK (provider IN ('RESEND')),
  CONSTRAINT notification_email_outbox_status_check CHECK (
    status IN ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')
  ),
  CONSTRAINT notification_email_outbox_attempt_check
    CHECK (attempt_count BETWEEN 0 AND 10),
  CONSTRAINT notification_email_outbox_provider_id_check CHECK (
    provider_message_id IS NULL
    OR char_length(provider_message_id) BETWEEN 1 AND 300
  ),
  CONSTRAINT notification_email_outbox_error_check CHECK (
    last_error IS NULL OR char_length(last_error) BETWEEN 1 AND 1000
  ),
  CONSTRAINT notification_email_outbox_state_check CHECK (
    (status = 'SENT' AND sent_at IS NOT NULL AND provider_message_id IS NOT NULL)
    OR (status <> 'SENT' AND sent_at IS NULL)
  ),
  CONSTRAINT notification_email_outbox_timestamp_check CHECK (
    updated_at >= created_at
    AND next_attempt_at >= created_at
    AND (claimed_at IS NULL OR claimed_at >= created_at)
    AND (sent_at IS NULL OR sent_at >= created_at)
  )
);

CREATE INDEX notification_email_outbox_claim_idx
  ON public.notification_email_outbox(next_attempt_at, created_at, id)
  WHERE status = 'QUEUED';
CREATE INDEX notification_email_outbox_member_idx
  ON public.notification_email_outbox(member_id, created_at DESC, id DESC);
CREATE INDEX notification_email_outbox_status_idx
  ON public.notification_email_outbox(status, updated_at DESC, id DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_authorized_read ON public.notifications;
CREATE POLICY notifications_authorized_read ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR member_id = (SELECT public.current_member_id())
  );

CREATE POLICY member_notification_preferences_own_read
  ON public.member_notification_preferences
  FOR SELECT TO authenticated
  USING (member_id = (SELECT public.current_member_id()));

CREATE POLICY notification_campaigns_admin_read
  ON public.notification_campaigns
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY notification_delivery_config_admin_read
  ON public.notification_delivery_config
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY notification_email_outbox_admin_read
  ON public.notification_email_outbox
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.notifications,
  public.member_notification_preferences, public.notification_campaigns,
  public.notification_delivery_config, public.notification_email_outbox
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.notifications,
  public.member_notification_preferences TO authenticated, service_role;
GRANT SELECT ON TABLE public.notification_campaigns,
  public.notification_delivery_config, public.notification_email_outbox
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.notification_category_email_enabled(
  preference public.member_notification_preferences,
  p_category TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT preference.email_enabled AND CASE p_category
    WHEN 'ACCOUNT' THEN preference.account_enabled
    WHEN 'EVENT' THEN preference.event_enabled
    WHEN 'ATTENDANCE' THEN preference.attendance_enabled
    WHEN 'GYROCOIN' THEN preference.gyrocoin_enabled
    WHEN 'REWARD' THEN preference.reward_enabled
    WHEN 'CREDENTIAL' THEN preference.credential_enabled
    WHEN 'ANNOUNCEMENT' THEN preference.announcement_enabled
    ELSE FALSE
  END
$$;

CREATE OR REPLACE FUNCTION private.create_member_notification(
  p_member_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT,
  p_source_type TEXT,
  p_source_id TEXT,
  p_dedupe_key TEXT,
  p_allow_email BOOLEAN DEFAULT TRUE
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted_notification public.notifications;
  member_row public.members;
  preference public.member_notification_preferences;
BEGIN
  SELECT * INTO member_row
  FROM public.members
  WHERE id = p_member_id;

  IF member_row.id IS NULL THEN
    RAISE EXCEPTION 'Notification recipient not found';
  END IF;

  INSERT INTO public.notifications(
    member_id, type, title, message, action_url, source_type, source_id,
    related_id, dedupe_key
  ) VALUES (
    member_row.id, upper(btrim(p_type)), btrim(p_title), btrim(p_message),
    NULLIF(btrim(p_action_url), ''), NULLIF(btrim(p_source_type), ''),
    NULLIF(btrim(p_source_id), ''), NULLIF(btrim(p_source_id), ''),
    NULLIF(btrim(p_dedupe_key), '')
  )
  ON CONFLICT (member_id, dedupe_key) WHERE dedupe_key IS NOT NULL
  DO UPDATE SET member_id = EXCLUDED.member_id
  RETURNING * INTO inserted_notification;

  IF p_allow_email THEN
    SELECT * INTO preference
    FROM public.member_notification_preferences
    WHERE member_id = member_row.id;

    IF preference.member_id IS NOT NULL
       AND private.notification_category_email_enabled(
         preference, inserted_notification.type
       ) THEN
      INSERT INTO public.notification_email_outbox(
        notification_id, member_id, recipient_email, subject, text_body
      ) VALUES (
        inserted_notification.id, member_row.id, member_row.email,
        inserted_notification.title, inserted_notification.message
      )
      ON CONFLICT (notification_id) DO NOTHING;
    END IF;
  END IF;

  RETURN inserted_notification;
END
$$;

CREATE OR REPLACE FUNCTION private.set_notification_state(
  p_notification_id UUID,
  p_action TEXT
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_member_id UUID := private.current_member_id();
  changed public.notifications;
BEGIN
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Active member access required';
  END IF;

  UPDATE public.notifications
  SET read = CASE WHEN p_action IN ('READ', 'DISMISS') THEN TRUE ELSE read END,
      read_at = CASE
        WHEN p_action IN ('READ', 'DISMISS') THEN COALESCE(read_at, pg_catalog.clock_timestamp())
        ELSE read_at
      END,
      dismissed_at = CASE
        WHEN p_action = 'DISMISS' THEN COALESCE(dismissed_at, pg_catalog.clock_timestamp())
        ELSE dismissed_at
      END,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_notification_id
    AND notifications.member_id = actor_member_id
  RETURNING * INTO changed;

  IF changed.id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
  RETURN changed;
END
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS public.notifications
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_notification_state(p_notification_id, 'READ')
$$;

CREATE OR REPLACE FUNCTION public.dismiss_notification(p_notification_id UUID)
RETURNS public.notifications
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_notification_state(p_notification_id, 'DISMISS')
$$;

CREATE OR REPLACE FUNCTION private.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_member_id UUID := private.current_member_id();
  changed_count INTEGER;
BEGIN
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Active member access required';
  END IF;
  UPDATE public.notifications
  SET read = TRUE,
      read_at = pg_catalog.clock_timestamp(),
      updated_at = pg_catalog.clock_timestamp()
  WHERE notifications.member_id = actor_member_id
    AND read_at IS NULL
    AND dismissed_at IS NULL;
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count;
END
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.mark_all_notifications_read()
$$;

CREATE OR REPLACE FUNCTION private.update_current_notification_preferences(
  p_email_enabled BOOLEAN,
  p_account_enabled BOOLEAN,
  p_event_enabled BOOLEAN,
  p_attendance_enabled BOOLEAN,
  p_gyrocoin_enabled BOOLEAN,
  p_reward_enabled BOOLEAN,
  p_credential_enabled BOOLEAN,
  p_announcement_enabled BOOLEAN
)
RETURNS public.member_notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_member_id UUID := private.current_member_id();
  saved public.member_notification_preferences;
BEGIN
  IF actor_member_id IS NULL THEN
    RAISE EXCEPTION 'Active member access required';
  END IF;
  INSERT INTO public.member_notification_preferences(
    member_id, email_enabled, account_enabled, event_enabled,
    attendance_enabled, gyrocoin_enabled, reward_enabled,
    credential_enabled, announcement_enabled
  ) VALUES (
    actor_member_id, p_email_enabled, p_account_enabled, p_event_enabled,
    p_attendance_enabled, p_gyrocoin_enabled, p_reward_enabled,
    p_credential_enabled, p_announcement_enabled
  )
  ON CONFLICT (member_id) DO UPDATE SET
    email_enabled = EXCLUDED.email_enabled,
    account_enabled = EXCLUDED.account_enabled,
    event_enabled = EXCLUDED.event_enabled,
    attendance_enabled = EXCLUDED.attendance_enabled,
    gyrocoin_enabled = EXCLUDED.gyrocoin_enabled,
    reward_enabled = EXCLUDED.reward_enabled,
    credential_enabled = EXCLUDED.credential_enabled,
    announcement_enabled = EXCLUDED.announcement_enabled,
    updated_at = pg_catalog.clock_timestamp()
  RETURNING * INTO saved;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_member_id, 'NOTIFICATION_PREFERENCES_UPDATED',
    'member_notification_preferences', actor_member_id::TEXT,
    jsonb_build_object('email_enabled', saved.email_enabled)
  );
  RETURN saved;
END
$$;

CREATE OR REPLACE FUNCTION public.update_current_notification_preferences(
  p_email_enabled BOOLEAN,
  p_account_enabled BOOLEAN,
  p_event_enabled BOOLEAN,
  p_attendance_enabled BOOLEAN,
  p_gyrocoin_enabled BOOLEAN,
  p_reward_enabled BOOLEAN,
  p_credential_enabled BOOLEAN,
  p_announcement_enabled BOOLEAN
)
RETURNS public.member_notification_preferences
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.update_current_notification_preferences(
    p_email_enabled, p_account_enabled, p_event_enabled,
    p_attendance_enabled, p_gyrocoin_enabled, p_reward_enabled,
    p_credential_enabled, p_announcement_enabled
  )
$$;

CREATE OR REPLACE FUNCTION private.publish_notification_campaign(
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT,
  p_include_email BOOLEAN,
  p_operation_key UUID
)
RETURNS public.notification_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  existing_campaign public.notification_campaigns;
  campaign public.notification_campaigns;
  inserted_count INTEGER;
BEGIN
  SELECT * INTO existing_campaign
  FROM public.notification_campaigns
  WHERE operation_key = p_operation_key;
  IF existing_campaign.id IS NOT NULL THEN
    IF existing_campaign.category = upper(btrim(p_category))
       AND existing_campaign.title = btrim(p_title)
       AND existing_campaign.message = btrim(p_message)
       AND existing_campaign.action_url IS NOT DISTINCT FROM NULLIF(btrim(p_action_url), '')
       AND existing_campaign.include_email = p_include_email THEN
      RETURN existing_campaign;
    END IF;
    RAISE EXCEPTION 'Campaign operation key was already used with different values'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.notification_campaigns(
    operation_key, category, title, message, action_url, include_email,
    created_by
  ) VALUES (
    p_operation_key, upper(btrim(p_category)), btrim(p_title),
    btrim(p_message), NULLIF(btrim(p_action_url), ''), p_include_email,
    actor_id
  ) RETURNING * INTO campaign;

  INSERT INTO public.notifications(
    member_id, type, title, message, action_url, source_type, source_id,
    related_id, dedupe_key
  )
  SELECT member.id, campaign.category, campaign.title, campaign.message,
         campaign.action_url, 'CAMPAIGN', campaign.id::TEXT,
         campaign.id::TEXT, 'campaign:' || campaign.id::TEXT
  FROM public.members AS member
  WHERE member.member_status = 'ACTIVE'
  ON CONFLICT (member_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  UPDATE public.notification_campaigns
  SET recipient_count = inserted_count
  WHERE id = campaign.id
  RETURNING * INTO campaign;

  IF p_include_email THEN
    INSERT INTO public.notification_email_outbox(
      notification_id, member_id, recipient_email, subject, text_body
    )
    SELECT notification.id, member.id, member.email,
           notification.title, notification.message
    FROM public.notifications AS notification
    JOIN public.members AS member ON member.id = notification.member_id
    JOIN public.member_notification_preferences AS preference
      ON preference.member_id = member.id
    WHERE notification.source_type = 'CAMPAIGN'
      AND notification.source_id = campaign.id::TEXT
      AND private.notification_category_email_enabled(
        preference, notification.type
      )
    ON CONFLICT (notification_id) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'NOTIFICATION_CAMPAIGN_PUBLISHED', 'notification_campaign',
    campaign.id::TEXT,
    jsonb_build_object(
      'category', campaign.category,
      'recipient_count', campaign.recipient_count,
      'include_email', campaign.include_email
    )
  );
  RETURN campaign;
END
$$;

CREATE OR REPLACE FUNCTION public.publish_notification_campaign(
  p_category TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT,
  p_include_email BOOLEAN,
  p_operation_key UUID
)
RETURNS public.notification_campaigns
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.publish_notification_campaign(
    p_category, p_title, p_message, p_action_url, p_include_email,
    p_operation_key
  )
$$;

CREATE OR REPLACE FUNCTION private.set_notification_email_delivery(
  p_enabled BOOLEAN
)
RETURNS public.notification_delivery_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  saved public.notification_delivery_config;
BEGIN
  UPDATE public.notification_delivery_config
  SET email_delivery_enabled = p_enabled,
      updated_by = actor_id,
      updated_at = pg_catalog.clock_timestamp()
  WHERE singleton
  RETURNING * INTO saved;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'NOTIFICATION_EMAIL_DELIVERY_CHANGED',
    'notification_delivery_config', 'singleton',
    jsonb_build_object('email_delivery_enabled', p_enabled)
  );
  RETURN saved;
END
$$;

CREATE OR REPLACE FUNCTION public.set_notification_email_delivery(
  p_enabled BOOLEAN
)
RETURNS public.notification_delivery_config
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_notification_email_delivery(p_enabled)
$$;

CREATE OR REPLACE FUNCTION private.claim_notification_email_batch(
  p_limit INTEGER
)
RETURNS SETOF public.notification_email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_delivery_config
    WHERE singleton AND email_delivery_enabled
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.notification_email_outbox
    WHERE status = 'QUEUED'
      AND next_attempt_at <= pg_catalog.now()
    ORDER BY next_attempt_at, created_at, id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  )
  UPDATE public.notification_email_outbox AS outbox
  SET status = 'PROCESSING',
      attempt_count = attempt_count + 1,
      claimed_at = pg_catalog.clock_timestamp(),
      updated_at = pg_catalog.clock_timestamp()
  FROM candidates
  WHERE outbox.id = candidates.id
  RETURNING outbox.*;
END
$$;

CREATE OR REPLACE FUNCTION public.claim_notification_email_batch(
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.notification_email_outbox
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM private.claim_notification_email_batch(p_limit)
$$;

CREATE OR REPLACE FUNCTION private.complete_notification_email(
  p_outbox_id UUID,
  p_provider_message_id TEXT
)
RETURNS public.notification_email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed public.notification_email_outbox;
BEGIN
  UPDATE public.notification_email_outbox
  SET status = 'SENT', sent_at = pg_catalog.clock_timestamp(),
      provider_message_id = btrim(p_provider_message_id), last_error = NULL,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_outbox_id AND status = 'PROCESSING'
  RETURNING * INTO changed;
  IF changed.id IS NULL THEN
    RAISE EXCEPTION 'Processing outbox item not found';
  END IF;
  RETURN changed;
END
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_email(
  p_outbox_id UUID,
  p_provider_message_id TEXT
)
RETURNS public.notification_email_outbox
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.complete_notification_email(p_outbox_id, p_provider_message_id)
$$;

CREATE OR REPLACE FUNCTION private.fail_notification_email(
  p_outbox_id UUID,
  p_error TEXT,
  p_retryable BOOLEAN
)
RETURNS public.notification_email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed public.notification_email_outbox;
BEGIN
  UPDATE public.notification_email_outbox
  SET status = CASE
        WHEN p_retryable AND attempt_count < 5 THEN 'QUEUED'
        ELSE 'FAILED'
      END,
      next_attempt_at = CASE
        WHEN p_retryable AND attempt_count < 5
          THEN pg_catalog.clock_timestamp()
            + make_interval(mins => LEAST(60, attempt_count * attempt_count))
        ELSE next_attempt_at
      END,
      claimed_at = NULL,
      last_error = left(COALESCE(NULLIF(btrim(p_error), ''), 'Unknown provider error'), 1000),
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_outbox_id AND status = 'PROCESSING'
  RETURNING * INTO changed;
  IF changed.id IS NULL THEN
    RAISE EXCEPTION 'Processing outbox item not found';
  END IF;
  RETURN changed;
END
$$;

CREATE OR REPLACE FUNCTION public.fail_notification_email(
  p_outbox_id UUID,
  p_error TEXT,
  p_retryable BOOLEAN DEFAULT TRUE
)
RETURNS public.notification_email_outbox
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.fail_notification_email(p_outbox_id, p_error, p_retryable)
$$;

-- Immutable history triggers translate domain events into deduplicated inbox
-- records. These triggers never contact an external email provider.
CREATE OR REPLACE FUNCTION private.notify_redemption_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  redemption public.redemptions;
  reward public.rewards;
BEGIN
  SELECT * INTO redemption FROM public.redemptions WHERE id = NEW.redemption_id;
  SELECT * INTO reward FROM public.rewards WHERE id = redemption.reward_id;
  PERFORM private.create_member_notification(
    redemption.member_id, 'REWARD',
    CASE NEW.to_status
      WHEN 'PENDING' THEN 'Redemption submitted'
      WHEN 'APPROVED' THEN 'Redemption approved'
      WHEN 'FULFILLED' THEN 'Reward fulfilled'
      WHEN 'REJECTED' THEN 'Redemption rejected'
      ELSE 'Redemption cancelled'
    END,
    COALESCE(reward.name, 'Reward') || ' is now ' || lower(NEW.to_status) || '.',
    '/member/rewards', 'REDEMPTION', redemption.id::TEXT,
    'redemption-history:' || NEW.id::TEXT, TRUE
  );
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.notify_attendance_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  attendance public.event_attendance;
  event_row public.events;
BEGIN
  SELECT * INTO attendance FROM public.event_attendance WHERE id = NEW.attendance_id;
  SELECT * INTO event_row FROM public.events WHERE id = attendance.event_id;
  PERFORM private.create_member_notification(
    attendance.member_id, 'ATTENDANCE',
    CASE NEW.to_status
      WHEN 'REGISTERED' THEN 'Attendance record imported'
      WHEN 'CHECKED_IN' THEN 'Event check-in recorded'
      WHEN 'CONFIRMED' THEN 'Attendance confirmed'
      WHEN 'NO_SHOW' THEN 'Attendance marked no-show'
      ELSE 'Attendance record cancelled'
    END,
    COALESCE(event_row.title, 'GDG HAU event') || ': ' || lower(NEW.to_status) || '.',
    '/member/events', 'ATTENDANCE', attendance.id::TEXT,
    'attendance-history:' || NEW.id::TEXT, TRUE
  );
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.notify_badge_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  award public.member_badges;
  badge public.badges;
BEGIN
  SELECT * INTO award FROM public.member_badges WHERE id = NEW.member_badge_id;
  SELECT * INTO badge FROM public.badges WHERE id = award.badge_id;
  PERFORM private.create_member_notification(
    award.member_id, 'CREDENTIAL',
    CASE NEW.to_status WHEN 'AWARDED' THEN 'Badge awarded' ELSE 'Badge revoked' END,
    COALESCE(badge.name, 'Badge') || ' was ' || lower(NEW.to_status) || '.',
    '/member/credentials', 'BADGE_AWARD', award.id::TEXT,
    'badge-history:' || NEW.id::TEXT, TRUE
  );
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.notify_certificate_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  certificate public.certificates;
BEGIN
  SELECT * INTO certificate FROM public.certificates WHERE id = NEW.certificate_id;
  IF NEW.to_status IN ('ISSUED', 'REVOKED') THEN
    PERFORM private.create_member_notification(
      certificate.member_id, 'CREDENTIAL',
      CASE NEW.to_status WHEN 'ISSUED' THEN 'Certificate issued' ELSE 'Certificate revoked' END,
      certificate.title || ' is now ' || lower(NEW.to_status) || '.',
      '/member/credentials', 'CERTIFICATE', certificate.id::TEXT,
      'certificate-history:' || NEW.id::TEXT, TRUE
    );
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.notify_manual_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.source_type IN ('MANUAL_AWARD', 'MANUAL_DEDUCTION') THEN
    PERFORM private.create_member_notification(
      NEW.member_id, 'GYROCOIN',
      CASE WHEN NEW.points > 0 THEN 'Gyrocoins awarded' ELSE 'Gyrocoins deducted' END,
      abs(NEW.points)::TEXT || ' Gyrocoins were ' ||
        CASE WHEN NEW.points > 0 THEN 'added to' ELSE 'deducted from' END ||
        ' your wallet. New balance: ' || NEW.balance_after::TEXT || '.',
      '/member/wallet', 'POINTS_LEDGER', NEW.id::TEXT,
      'points-ledger:' || NEW.id::TEXT, TRUE
    );
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER notify_redemption_history_insert
AFTER INSERT ON public.redemption_status_history
FOR EACH ROW EXECUTE FUNCTION private.notify_redemption_history();
CREATE TRIGGER notify_attendance_history_insert
AFTER INSERT ON public.event_attendance_status_history
FOR EACH ROW EXECUTE FUNCTION private.notify_attendance_history();
CREATE TRIGGER notify_badge_history_insert
AFTER INSERT ON public.badge_award_status_history
FOR EACH ROW EXECUTE FUNCTION private.notify_badge_history();
CREATE TRIGGER notify_certificate_history_insert
AFTER INSERT ON public.certificate_status_history
FOR EACH ROW EXECUTE FUNCTION private.notify_certificate_history();
CREATE TRIGGER notify_manual_points_insert
AFTER INSERT ON public.points_ledger
FOR EACH ROW EXECUTE FUNCTION private.notify_manual_points();

REVOKE ALL ON FUNCTION private.notification_category_email_enabled(
  public.member_notification_preferences, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.create_member_notification(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.set_notification_state(UUID, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.mark_all_notifications_read()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.update_current_notification_preferences(
  BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.publish_notification_campaign(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.set_notification_email_delivery(BOOLEAN)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.claim_notification_email_batch(INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.complete_notification_email(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.fail_notification_email(UUID, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_redemption_history()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.notify_attendance_history()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.notify_badge_history()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.notify_certificate_history()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.notify_manual_points()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.set_notification_state(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.mark_all_notifications_read()
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_current_notification_preferences(
  BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.publish_notification_campaign(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_notification_email_delivery(BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_notification_email_batch(INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.complete_notification_email(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION private.fail_notification_email(UUID, TEXT, BOOLEAN)
  TO service_role;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.dismiss_notification(UUID)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read()
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.update_current_notification_preferences(
  BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.publish_notification_campaign(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID
) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.set_notification_email_delivery(BOOLEAN)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.claim_notification_email_batch(INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_notification_email(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_notification_email(UUID, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_current_notification_preferences(
  BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_notification_campaign(
  TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_email_delivery(BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_email_batch(INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_notification_email(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_notification_email(UUID, TEXT, BOOLEAN)
  TO service_role;
