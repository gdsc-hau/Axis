import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PortalSettingsValueSchema,
  UpdateCurrentMemberProfileSchema,
  UpdatePortalSettingsSchema,
} from "../packages/contracts/src/index.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260826160000_member_portal_operations.sql",
    import.meta.url,
  ),
  "utf8",
);

test("member profile validation preserves a narrow editable surface", () => {
  const parsed = UpdateCurrentMemberProfileSchema.parse({
    expectedVersion: "1",
    bio: "Community builder",
    phoneNumber: "+63 900 000 0000",
    linkedinUrl: "https://linkedin.com/in/example",
    githubUrl: "",
    reason: "Updated contact details",
    operationKey: "a1110000-0000-4000-8000-000000000001",
  });
  assert.equal(parsed.expectedVersion, 1);
  assert.equal(parsed.githubUrl, null);
  assert.equal(
    UpdateCurrentMemberProfileSchema.safeParse({
      ...parsed,
      linkedinUrl: "http://example.com",
    }).success,
    false,
  );
  assert.equal("fullName" in parsed, false);
});

test("portal settings enforce bounded operational defaults", () => {
  const value = PortalSettingsValueSchema.parse({
    organization_name: "GDG on Campus HAU",
    support_email: "",
    dashboard_message: "Welcome",
    default_report_days: 30,
    leaderboard_limit: 100,
  });
  assert.equal(value.default_report_days, 30);
  assert.equal(
    UpdatePortalSettingsSchema.safeParse({
      expectedVersion: 1,
      organizationName: "GDG HAU",
      supportEmail: "",
      dashboardMessage: "Welcome",
      defaultReportDays: 367,
      leaderboardLimit: 100,
      reason: "Invalid range",
      operationKey: "a1110000-0000-4000-8000-000000000002",
    }).success,
    false,
  );
});

test("profile and settings writes are audited, versioned, and RPC-only", () => {
  assert.match(migration, /profile_version = profile_version \+ 1/);
  assert.match(migration, /MEMBER_PROFILE_UPDATED/);
  assert.match(migration, /PORTAL_SETTINGS_UPDATED/);
  assert.match(migration, /registry_identity_preserved/);
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public\.members/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.update_current_member_profile/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.update_portal_settings/,
  );
});

test("member dashboard aggregates authoritative domain tables", () => {
  assert.match(migration, /FROM public\.points_ledger/);
  assert.match(migration, /FROM public\.event_attendance/);
  assert.match(migration, /FROM public\.member_badges/);
  assert.match(migration, /FROM public\.certificates/);
  assert.match(migration, /FROM public\.redemptions/);
  assert.match(migration, /FROM public\.notifications/);
  assert.match(migration, /FROM public\.events/);
});
