-- Read-only preflight for
-- 20260827014255_release_advisor_foreign_key_indexes.sql.

WITH expected_constraints(constraint_name) AS (
  VALUES
    ('app_settings_updated_by_fkey'),
    ('article_categories_created_by_fkey'),
    ('article_categories_updated_by_fkey'),
    ('article_category_revisions_actor_id_fkey'),
    ('attendance_import_batches_created_by_fkey'),
    ('badge_award_batches_badge_id_fkey'),
    ('badge_award_batches_created_by_fkey'),
    ('badge_award_status_history_actor_id_fkey'),
    ('badges_created_by_fkey'),
    ('certificate_issuance_batches_created_by_fkey'),
    ('certificate_status_history_actor_id_fkey'),
    ('certificates_issued_by_fkey'),
    ('certificates_revoked_by_fkey'),
    ('event_attendance_checked_in_by_fkey'),
    ('event_attendance_status_history_actor_id_fkey'),
    ('member_badges_awarded_by_fkey'),
    ('member_badges_revoked_by_fkey'),
    ('notification_campaigns_created_by_fkey'),
    ('notification_delivery_config_updated_by_fkey'),
    ('rewards_created_by_fkey'),
    ('rewards_updated_by_fkey')
),
expected_indexes(index_name) AS (
  VALUES
    ('app_settings_updated_by_idx'),
    ('article_categories_created_by_idx'),
    ('article_categories_updated_by_idx'),
    ('article_category_revisions_actor_idx'),
    ('attendance_import_batches_created_by_idx'),
    ('badge_award_batches_badge_idx'),
    ('badge_award_batches_created_by_idx'),
    ('badge_award_history_actor_idx'),
    ('badges_created_by_idx'),
    ('certificate_batches_created_by_idx'),
    ('certificate_history_actor_idx'),
    ('certificates_issued_by_idx'),
    ('certificates_revoked_by_idx'),
    ('event_attendance_checked_in_by_idx'),
    ('event_attendance_history_actor_idx'),
    ('member_badges_awarded_by_idx'),
    ('member_badges_revoked_by_idx'),
    ('notification_campaigns_created_by_idx'),
    ('notification_delivery_config_updated_by_idx'),
    ('rewards_created_by_idx'),
    ('rewards_updated_by_idx')
),
checks AS (
  SELECT
    10 AS sort_order,
    'phase_12_deployed'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260826170000'
    ) AS passed,
    'Phase 12 system readiness must already be recorded'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'advisor_hardening_not_deployed',
    NOT EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260827014255'
    ),
    'the release Advisor hardening migration should not already be recorded'

  UNION ALL

  SELECT
    30,
    'advisor_foreign_keys_present',
    count(*) = 21,
    format('found %s of 21 Advisor-reported foreign keys', count(*))
  FROM pg_constraint AS constraint_record
  JOIN pg_namespace AS namespace_record
    ON namespace_record.oid = constraint_record.connamespace
  JOIN expected_constraints AS expected
    ON expected.constraint_name = constraint_record.conname
  WHERE namespace_record.nspname = 'public'
    AND constraint_record.contype = 'f'

  UNION ALL

  SELECT
    40,
    'planned_index_names_available',
    count(*) = 0,
    format('found %s planned index names already present', count(*))
  FROM pg_class AS index_relation
  JOIN pg_namespace AS namespace_record
    ON namespace_record.oid = index_relation.relnamespace
  JOIN expected_indexes AS expected
    ON expected.index_name = index_relation.relname
  WHERE namespace_record.nspname = 'public'
    AND index_relation.relkind = 'i'
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
