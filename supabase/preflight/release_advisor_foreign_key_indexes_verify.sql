-- Read-only verification for
-- 20260827014255_release_advisor_foreign_key_indexes.sql.

WITH expected_indexes(index_name, table_name, column_name) AS (
  VALUES
    ('app_settings_updated_by_idx', 'app_settings', 'updated_by'),
    ('article_categories_created_by_idx', 'article_categories', 'created_by'),
    ('article_categories_updated_by_idx', 'article_categories', 'updated_by'),
    ('article_category_revisions_actor_idx', 'article_category_revisions', 'actor_id'),
    ('attendance_import_batches_created_by_idx', 'attendance_import_batches', 'created_by'),
    ('badge_award_batches_badge_idx', 'badge_award_batches', 'badge_id'),
    ('badge_award_batches_created_by_idx', 'badge_award_batches', 'created_by'),
    ('badge_award_history_actor_idx', 'badge_award_status_history', 'actor_id'),
    ('badges_created_by_idx', 'badges', 'created_by'),
    ('certificate_batches_created_by_idx', 'certificate_issuance_batches', 'created_by'),
    ('certificate_history_actor_idx', 'certificate_status_history', 'actor_id'),
    ('certificates_issued_by_idx', 'certificates', 'issued_by'),
    ('certificates_revoked_by_idx', 'certificates', 'revoked_by'),
    ('event_attendance_checked_in_by_idx', 'event_attendance', 'checked_in_by'),
    ('event_attendance_history_actor_idx', 'event_attendance_status_history', 'actor_id'),
    ('member_badges_awarded_by_idx', 'member_badges', 'awarded_by'),
    ('member_badges_revoked_by_idx', 'member_badges', 'revoked_by'),
    ('notification_campaigns_created_by_idx', 'notification_campaigns', 'created_by'),
    ('notification_delivery_config_updated_by_idx', 'notification_delivery_config', 'updated_by'),
    ('rewards_created_by_idx', 'rewards', 'created_by'),
    ('rewards_updated_by_idx', 'rewards', 'updated_by')
),
index_matches AS (
  SELECT
    expected.index_name,
    index_metadata.indisvalid,
    index_metadata.indisready,
    split_part(index_metadata.indkey::TEXT, ' ', 1)::SMALLINT
      = table_column.attnum AS leading_column_matches
  FROM expected_indexes AS expected
  JOIN pg_namespace AS namespace_record
    ON namespace_record.nspname = 'public'
  JOIN pg_class AS table_relation
    ON table_relation.relnamespace = namespace_record.oid
   AND table_relation.relname = expected.table_name
   AND table_relation.relkind IN ('r', 'p')
  JOIN pg_attribute AS table_column
    ON table_column.attrelid = table_relation.oid
   AND table_column.attname = expected.column_name
   AND NOT table_column.attisdropped
  JOIN pg_class AS index_relation
    ON index_relation.relnamespace = namespace_record.oid
   AND index_relation.relname = expected.index_name
   AND index_relation.relkind = 'i'
  JOIN pg_index AS index_metadata
    ON index_metadata.indexrelid = index_relation.oid
   AND index_metadata.indrelid = table_relation.oid
),
checks AS (
  SELECT
    10 AS sort_order,
    'migration_recorded'::TEXT AS check_name,
    EXISTS (
      SELECT 1
      FROM supabase_migrations.schema_migrations
      WHERE version = '20260827014255'
    ) AS passed,
    'the release Advisor hardening migration must exist in remote history'::TEXT AS details

  UNION ALL

  SELECT
    20,
    'advisor_foreign_key_indexes_present',
    count(*) = 21,
    format('found %s of 21 Advisor-requested indexes', count(*))
  FROM index_matches

  UNION ALL

  SELECT
    30,
    'advisor_foreign_key_indexes_valid',
    count(*) = 21
      AND bool_and(indisvalid AND indisready AND leading_column_matches),
    format(
      'valid and correctly ordered indexes=%s of 21',
      count(*) FILTER (
        WHERE indisvalid AND indisready AND leading_column_matches
      )
    )
  FROM index_matches
)
SELECT check_name, passed, details
FROM checks
ORDER BY sort_order;
