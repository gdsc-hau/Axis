import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { RunSystemHealthCheckSchema } from "../packages/contracts/src/index.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260826170000_system_readiness_health.sql",
    import.meta.url,
  ),
  "utf8",
);

test("system health requests require an idempotency key and bounded version", () => {
  const parsed = RunSystemHealthCheckSchema.parse({
    operationKey: "a1120000-0000-4000-8000-000000000001",
    applicationVersion: "axis-phase-12",
  });
  assert.equal(parsed.applicationVersion, "axis-phase-12");
  assert.equal(
    RunSystemHealthCheckSchema.safeParse({
      ...parsed,
      applicationVersion: "invalid version with spaces",
    }).success,
    false,
  );
});

test("health history is admin-readable and RPC-only for writes", () => {
  assert.match(
    migration,
    /ALTER TABLE public\.system_health_runs ENABLE ROW LEVEL SECURITY/,
  );
  assert.match(migration, /system_health_runs_admin_read/);
  assert.match(migration, /system_health_results_admin_read/);
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE, TRUNCATE[\s\S]*public\.system_health_runs/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.run_system_health_check/,
  );
  assert.match(migration, /SYSTEM_HEALTH_CHECK_COMPLETED/);
});

test("health runner checks every completed backend domain", () => {
  for (const source of [
    "public.members",
    "auth.users",
    "public.events",
    "public.points_ledger",
    "public.redemptions",
    "public.event_attendance",
    "public.member_badges",
    "public.certificates",
    "public.notification_email_outbox",
    "public.articles",
    "public.member_profile_revisions",
  ]) {
    assert.match(migration, new RegExp(source.replace(".", "\\.")));
  }
  assert.equal((migration.match(/RETURN NEXT/g) ?? []).length, 15);
});

test("security-definer helpers use empty search paths and restricted grants", () => {
  assert.equal((migration.match(/SECURITY DEFINER/g) ?? []).length, 2);
  assert.equal((migration.match(/SECURITY INVOKER/g) ?? []).length, 1);
  assert.equal((migration.match(/SET search_path = ''/g) ?? []).length, 3);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION private\.collect_system_health_checks\(\)/,
  );
  assert.match(migration, /FROM PUBLIC, anon, authenticated, service_role/);
});
