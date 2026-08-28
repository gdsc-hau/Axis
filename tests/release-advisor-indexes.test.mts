import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260827014255_release_advisor_foreign_key_indexes.sql",
    import.meta.url,
  ),
  "utf8",
);

const preflight = readFileSync(
  new URL(
    "../supabase/preflight/release_advisor_foreign_key_indexes_preflight.sql",
    import.meta.url,
  ),
  "utf8",
);

const verification = readFileSync(
  new URL(
    "../supabase/preflight/release_advisor_foreign_key_indexes_verify.sql",
    import.meta.url,
  ),
  "utf8",
);

const expectedIndexes = [
  "app_settings_updated_by_idx",
  "article_categories_created_by_idx",
  "article_categories_updated_by_idx",
  "article_category_revisions_actor_idx",
  "attendance_import_batches_created_by_idx",
  "badge_award_batches_badge_idx",
  "badge_award_batches_created_by_idx",
  "badge_award_history_actor_idx",
  "badges_created_by_idx",
  "certificate_batches_created_by_idx",
  "certificate_history_actor_idx",
  "certificates_issued_by_idx",
  "certificates_revoked_by_idx",
  "event_attendance_checked_in_by_idx",
  "event_attendance_history_actor_idx",
  "member_badges_awarded_by_idx",
  "member_badges_revoked_by_idx",
  "notification_campaigns_created_by_idx",
  "notification_delivery_config_updated_by_idx",
  "rewards_created_by_idx",
  "rewards_updated_by_idx",
] as const;

test("release hardening creates every Advisor-requested foreign-key index", () => {
  assert.equal((migration.match(/CREATE INDEX /g) ?? []).length, 21);
  for (const indexName of expectedIndexes) {
    assert.match(migration, new RegExp(`CREATE INDEX ${indexName}\\b`));
    assert.match(preflight, new RegExp(`'${indexName}'`));
    assert.match(verification, new RegExp(`'${indexName}'`));
  }
});

test("release hardening is schema-only and bounded", () => {
  assert.match(migration, /SET LOCAL lock_timeout = '5s'/);
  assert.match(migration, /SET LOCAL statement_timeout = '2min'/);
  assert.doesNotMatch(migration, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/);
  assert.doesNotMatch(
    migration,
    /CREATE OR REPLACE FUNCTION|CREATE POLICY|GRANT /,
  );
});

test("preflight and verification bind to the tracked migration", () => {
  assert.match(preflight, /version = '20260827014255'/);
  assert.match(preflight, /found %s of 21 Advisor-reported foreign keys/);
  assert.match(verification, /version = '20260827014255'/);
  assert.match(verification, /valid and correctly ordered indexes=%s of 21/);
});
