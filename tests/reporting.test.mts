import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260826090000_reporting_analytics_leaderboard.sql",
    import.meta.url,
  ),
  "utf8",
);

test("reporting RPCs use hardened private helpers and invoker wrappers", () => {
  assert.equal((migration.match(/SECURITY DEFINER/g) ?? []).length, 3);
  assert.equal((migration.match(/SECURITY INVOKER/g) ?? []).length, 3);
  assert.equal((migration.match(/SET search_path = ''/g) ?? []).length, 6);
  assert.match(migration, /private\.require_active_admin\(\)/);
  assert.match(migration, /private\.current_member_id\(\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.list_member_leaderboard/);
  assert.match(migration, /FROM PUBLIC, anon/);
});

test("leaderboard ranks current balances without private identity fields", () => {
  const signature = migration.match(
    /CREATE OR REPLACE FUNCTION public\.list_member_leaderboard[\s\S]*?LANGUAGE SQL/,
  )?.[0];
  assert.ok(signature);
  assert.doesNotMatch(signature, /email|student_id|note/);
  assert.match(migration, /dense_rank\(\) OVER/);
  assert.match(migration, /ledger_sequence DESC/);
  assert.match(migration, /member\.member_status = 'ACTIVE'/);
});

test("administrative reports are bounded and derived from source tables", () => {
  assert.match(migration, /Reporting ranges may not exceed 366 days/g);
  assert.match(migration, /FROM public\.event_attendance/);
  assert.match(migration, /FROM public\.points_ledger/);
  assert.match(migration, /FROM public\.redemptions/);
  assert.match(migration, /FROM public\.certificates/);
  assert.match(migration, /FROM public\.articles/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(leaderboard|report)/);
});

test("report CSV escapes spreadsheet fields", () => {
  const component = readFileSync(
    new URL(
      "../apps/gdg-hub/app/admin/reports/ReportDownload.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(component, /\^\[=\+\\-@\]/);
  assert.match(component, /replaceAll\('\"', '\"\"'\)/);
  assert.match(component, /text\/csv;charset=utf-8/);
});
