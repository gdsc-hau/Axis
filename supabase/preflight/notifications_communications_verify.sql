-- Hosted verification for Phase 8 notifications and communications.
-- Run in the Supabase SQL Editor after pushing the migration.

WITH checks AS (
  SELECT 10 AS sort_order, 'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826001721'
    ) AS passed,
    'the Phase 8 communications migration must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT 20, 'communications_tables_present', count(*) = 4,
    format('found %s of 4 Phase 8 communications tables', count(*))
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'member_notification_preferences', 'notification_campaigns',
      'notification_delivery_config', 'notification_email_outbox'
    )

  UNION ALL

  SELECT 25, 'policy_cleanup_recorded',
    EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations
      WHERE version = '20260826004121'
    ),
    'the Phase 8 legacy notification-policy cleanup must exist in remote history'

  UNION ALL

  SELECT 30, 'notification_columns_present', count(*) = 15,
    format('found %s of 15 hardened notification columns', count(*))
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name IN (
      'id', 'member_id', 'type', 'title', 'message', 'action_url',
      'source_type', 'source_id', 'related_id', 'dedupe_key', 'read',
      'read_at', 'dismissed_at', 'created_at', 'updated_at'
    )

  UNION ALL

  SELECT 40, 'notification_constraints_validated', count(*) = 14,
    format('found %s of 14 required validated constraints', count(*))
  FROM pg_constraint AS constraint_record
  JOIN pg_class AS relation ON relation.oid = constraint_record.conrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN (
      'notifications', 'member_notification_preferences',
      'notification_campaigns', 'notification_delivery_config',
      'notification_email_outbox'
    )
    AND constraint_record.convalidated
    AND constraint_record.conname IN (
      'notifications_type_check', 'notifications_title_check',
      'notifications_message_check', 'notifications_action_url_check',
      'notifications_source_check', 'notifications_dedupe_key_check',
      'notifications_read_consistency_check',
      'notifications_timestamp_check',
      'member_notification_preferences_timestamp_check',
      'notification_campaigns_category_check',
      'notification_campaigns_title_check',
      'notification_campaigns_message_check',
      'notification_email_outbox_status_check',
      'notification_email_outbox_state_check'
    )

  UNION ALL

  SELECT 50, 'communications_indexes_present', count(*) = 8,
    format('found %s of 8 required communications indexes', count(*))
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'notifications_member_dedupe_idx', 'notifications_member_inbox_idx',
      'notifications_member_unread_idx',
      'notification_campaigns_created_idx',
      'notification_email_outbox_claim_idx',
      'notification_email_outbox_member_idx',
      'notification_email_outbox_status_idx',
      'notification_email_outbox_notification_id_key'
    )

  UNION ALL

  SELECT 60, 'communications_read_policies_present', count(*) = 5,
    format('found %s of 5 required communications read policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'notifications_authorized_read',
      'member_notification_preferences_own_read',
      'notification_campaigns_admin_read',
      'notification_delivery_config_admin_read',
      'notification_email_outbox_admin_read'
    )

  UNION ALL

  SELECT 70, 'communications_write_policies_absent', count(*) = 0,
    format('found %s direct communications write policies', count(*))
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'notifications', 'member_notification_preferences',
      'notification_campaigns', 'notification_delivery_config',
      'notification_email_outbox'
    )
    AND cmd <> 'SELECT'

  UNION ALL

  SELECT 80, 'direct_communications_writes_revoked',
    NOT has_table_privilege('authenticated', 'public.notifications', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.notification_campaigns', 'INSERT')
      AND NOT has_table_privilege('service_role', 'public.notification_email_outbox', 'UPDATE'),
    'browser and service roles must use self-authorizing communications functions for writes'

  UNION ALL

  SELECT 90, 'domain_notification_triggers_enabled', count(*) = 5,
    format('found %s of 5 enabled domain notification triggers', count(*))
  FROM pg_trigger
  WHERE NOT tgisinternal
    AND tgenabled <> 'D'
    AND tgname IN (
      'notify_redemption_history_insert',
      'notify_attendance_history_insert',
      'notify_badge_history_insert',
      'notify_certificate_history_insert',
      'notify_manual_points_insert'
    )

  UNION ALL

  SELECT 100, 'private_notification_helpers_hardened', count(*) = 15,
    format('found %s of 15 hardened private notification helpers', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'private'
    AND procedure.proname IN (
      'notification_category_email_enabled', 'create_member_notification',
      'set_notification_state', 'mark_all_notifications_read',
      'update_current_notification_preferences',
      'publish_notification_campaign', 'set_notification_email_delivery',
      'claim_notification_email_batch', 'complete_notification_email',
      'fail_notification_email', 'notify_redemption_history',
      'notify_attendance_history', 'notify_badge_history',
      'notify_certificate_history', 'notify_manual_points'
    )
    AND procedure.prosecdef = (procedure.proname <> 'notification_category_email_enabled')
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL

  SELECT 110, 'public_notification_rpcs_security_invoker', count(*) = 9,
    format('found %s of 9 security-invoker public notification RPCs', count(*))
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname IN (
      'mark_notification_read', 'dismiss_notification',
      'mark_all_notifications_read',
      'update_current_notification_preferences',
      'publish_notification_campaign', 'set_notification_email_delivery',
      'claim_notification_email_batch', 'complete_notification_email',
      'fail_notification_email'
    )
    AND NOT procedure.prosecdef
    AND procedure.proconfig @> ARRAY['search_path=""']::TEXT[]

  UNION ALL

  SELECT 120, 'communications_rpc_execution_restricted',
    NOT has_function_privilege('anon', 'public.mark_notification_read(uuid)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.mark_notification_read(uuid)', 'EXECUTE')
      AND NOT has_function_privilege('authenticated', 'public.claim_notification_email_batch(integer)', 'EXECUTE')
      AND has_function_privilege('service_role', 'public.claim_notification_email_batch(integer)', 'EXECUTE'),
    'member/admin mutations require authentication and email-worker RPCs are service-role only'

  UNION ALL

  SELECT 130, 'email_delivery_disabled_by_default',
    count(*) = 1
      AND bool_and(NOT email_delivery_enabled),
    'the database delivery gate must remain disabled until an administrator explicitly enables it'
  FROM public.notification_delivery_config
  WHERE singleton

  UNION ALL

  SELECT 140, 'notification_rows_valid',
    count(*) FILTER (
      WHERE read <> (read_at IS NOT NULL)
        OR title IS NULL OR title = ''
        OR message IS NULL OR message = ''
        OR (action_url IS NOT NULL AND action_url !~ '^/[^/]')
    ) = 0,
    format(
      'notifications=%s; invalid rows=%s', count(*),
      count(*) FILTER (
        WHERE read <> (read_at IS NOT NULL)
          OR title IS NULL OR title = ''
          OR message IS NULL OR message = ''
          OR (action_url IS NOT NULL AND action_url !~ '^/[^/]')
      )
    )
  FROM public.notifications
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
