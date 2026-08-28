import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ConfirmInvitationSchema,
  InviteMemberEmailsSchema,
  MemberStatusSchema,
  PublicMemberProfileSchema,
  SearchRequestSchema,
  UpdateMemberRoleSchema,
  UpdateMemberStatusSchema,
} from "../packages/contracts/src/index.ts";
import {
  createVerificationToken,
  verifyVerificationToken,
} from "../apps/gdg-id/src/lib/verification-token.ts";
import { validatePassword } from "../apps/gdg-hub/lib/password.ts";

test("public member profiles expose only card and verification fields", () => {
  const profile = PublicMemberProfileSchema.parse({
    gdgId: "GDG-HAU-26-0001",
    fullName: "Example Member",
    program: "BS Computer Science",
    email: "private@example.com",
    department: "SOC",
    studentId: "12345678",
  });

  assert.deepEqual(profile, {
    gdgId: "GDG-HAU-26-0001",
    fullName: "Example Member",
    program: "BS Computer Science",
    email: "private@example.com",
  });
});

test("search requests accept only supported lookup types", () => {
  assert.equal(
    SearchRequestSchema.safeParse({
      type: "email",
      value: "member@example.com",
    }).success,
    true,
  );
  assert.equal(
    SearchRequestSchema.safeParse({ type: "name", value: "Example Member" })
      .success,
    false,
  );
  assert.equal(
    SearchRequestSchema.safeParse({ type: "barcode", value: "" }).success,
    false,
  );
  assert.equal(
    SearchRequestSchema.safeParse({ type: "email", value: "not-an-email" })
      .success,
    false,
  );
  assert.equal(
    SearchRequestSchema.safeParse({ type: "barcode", value: "x".repeat(129) })
      .success,
    false,
  );
  assert.equal(
    SearchRequestSchema.parse({ type: "email", value: " Member@Example.com " })
      .value,
    "member@example.com",
  );
});

test("member lifecycle contracts reject booleans and unsupported states", () => {
  assert.equal(MemberStatusSchema.safeParse("ACTIVE").success, true);
  assert.equal(MemberStatusSchema.safeParse("INACTIVE").success, true);
  assert.equal(MemberStatusSchema.safeParse("INVITED").success, false);
  assert.equal(MemberStatusSchema.safeParse(true).success, false);
  assert.equal(MemberStatusSchema.safeParse("APPROVED").success, false);
  assert.equal(
    UpdateMemberStatusSchema.safeParse({
      memberId: "f8af9370-9f5c-4ec5-a184-e7fdbf7b4822",
      memberStatus: "SUSPENDED",
      reason: "Policy review",
    }).success,
    true,
  );
  assert.equal(
    UpdateMemberStatusSchema.safeParse({
      memberId: "f8af9370-9f5c-4ec5-a184-e7fdbf7b4822",
      memberStatus: "SUSPENDED",
    }).success,
    false,
  );
  assert.equal(
    UpdateMemberRoleSchema.safeParse({
      memberId: "f8af9370-9f5c-4ec5-a184-e7fdbf7b4822",
      role: "OWNER",
    }).success,
    false,
  );
});

test("invitation contracts normalize batches and validate manual OTP input", () => {
  assert.deepEqual(
    InviteMemberEmailsSchema.parse(
      " Member@One.test,second@example.test\nmember@one.test ",
    ),
    ["member@one.test", "second@example.test"],
  );
  assert.equal(
    InviteMemberEmailsSchema.safeParse("valid@example.test,not-an-email")
      .success,
    false,
  );
  assert.equal(
    InviteMemberEmailsSchema.safeParse(
      Array.from(
        { length: 26 },
        (_, index) => `member${index}@example.test`,
      ).join(","),
    ).success,
    false,
  );
  assert.equal(
    ConfirmInvitationSchema.safeParse({
      email: " Member@Example.test ",
      token: "123456",
    }).success,
    true,
  );
  assert.equal(
    ConfirmInvitationSchema.safeParse({
      email: "member@example.test",
      token: "12345a",
    }).success,
    false,
  );
});

test("member lifecycle migration enforces status at the database boundary", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260820123815_member_status_lifecycle.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /member_status = 'ACTIVE'/);
  assert.match(
    migration,
    /REVOKE UPDATE ON TABLE public\.members FROM authenticated/,
  );
  assert.match(migration, /MEMBER_STATUS_CHANGED/);
  assert.match(migration, /last active administrator cannot be deactivated/i);
  assert.match(migration, /CREATE TRIGGER sync_member_acceptance_compat/);
});

test("password login safely links verified legacy Auth accounts", () => {
  const loginAction = readFileSync(
    new URL("../apps/gdg-hub/app/(auth)/login/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(loginAction, /allowUnlinkedEmail:\s*true/);
  assert.match(loginAction, /member\.member_status !== "ACTIVE"/);
  assert.match(loginAction, /"link_current_member_account"/);
  assert.match(loginAction, /member = await getMemberForAuthUser/);
});

test("profile completion is verified, role-aware, and idempotent", () => {
  const action = readFileSync(
    new URL("../apps/gdg-hub/app/(auth)/verify/actions.ts", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../apps/gdg-hub/app/(auth)/verify/page.tsx", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260821081201_make_profile_completion_idempotent.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(action, /revalidatePath\("\/member", "layout"\)/);
  assert.match(action, /completedMember\?\.profile_completed_at/);
  assert.match(action, /dashboardForRole\(completedMember\.role\)/);
  assert.match(page, /member\.profile_completed_at/);
  assert.match(page, /member\.role === "ADMIN"/);
  assert.match(
    migration,
    /IF target_member\.profile_completed_at IS NOT NULL THEN\s+RETURN;/,
  );
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /MEMBER_PROFILE_COMPLETED/);
});

test("profile completion preserves the registry-owned full name", () => {
  const action = readFileSync(
    new URL("../apps/gdg-hub/app/(auth)/verify/actions.ts", import.meta.url),
    "utf8",
  );
  const form = readFileSync(
    new URL(
      "../apps/gdg-hub/app/(auth)/verify/VerifyForm.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const page = readFileSync(
    new URL("../apps/gdg-hub/app/(auth)/verify/page.tsx", import.meta.url),
    "utf8",
  );
  const authMemberLookup = readFileSync(
    new URL("../packages/auth/src/roles.ts", import.meta.url),
    "utf8",
  );
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260821182815_lock_registry_name_during_profile_completion.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(form, /name="fullName"/);
  assert.match(form, /Registered full name/);
  assert.match(page, /fullName=\{member\.full_name\}/);
  assert.doesNotMatch(action, /formData\.get\("fullName"\)/);
  assert.match(action, /p_full_name: access\.member\.full_name/);
  assert.match(authMemberLookup, /email, full_name, role/);
  assert.doesNotMatch(migration, /SET\s+full_name\s*=/i);
  assert.match(
    migration,
    /Registered full name cannot be changed during profile completion/,
  );
  assert.match(migration, /jsonb_build_array\('bio', 'links'\)/);
});

test("portal navigation exposes a server-side sign-out action", () => {
  const action = readFileSync(
    new URL("../apps/gdg-hub/app/auth/signout/actions.ts", import.meta.url),
    "utf8",
  );
  const sidebar = readFileSync(
    new URL("../apps/gdg-hub/app/admin/AdminSidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(action, /"use server"/);
  assert.match(action, /supabase\.auth\.signOut\(\)/);
  assert.match(action, /redirect\("\/login"\)/);
  assert.match(sidebar, /action=\{signOutAction\}/);
  assert.match(sidebar, /Sign out/);
});

test("post-lifecycle hardening resolves database advisor findings", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260820144434_post_member_status_advisor_hardening.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION private\.is_admin\(\)[\s\S]*?SECURITY DEFINER/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.is_admin\(\)[\s\S]*?SECURITY INVOKER/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.award_points\([\s\S]*?SECURITY INVOKER/,
  );
  assert.match(
    migration,
    /CREATE INDEX IF NOT EXISTS id_qr_codes_member_id_idx/,
  );
  assert.match(migration, /CREATE POLICY points_ledger_authorized_read/);
  assert.match(migration, /SET search_path = ''/);
});

test("member invitations are registry-gated, batch-resolved, and scanner resistant", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260821083404_member_invitation_guardrails.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const inviteAction = readFileSync(
    new URL("../apps/gdg-hub/app/admin/invite/actions.ts", import.meta.url),
    "utf8",
  );
  const confirmAction = readFileSync(
    new URL(
      "../apps/gdg-hub/app/(auth)/confirm-invite/actions.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const inviteTemplate = readFileSync(
    new URL("../supabase/templates/invite.html", import.meta.url),
    "utf8",
  );
  const activateAction = readFileSync(
    new URL("../apps/gdg-hub/app/(auth)/activate/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /hook_restrict_member_account_creation/);
  assert.match(migration, /TO supabase_auth_admin/);
  assert.match(migration, /member_status = 'ACTIVE'/);
  assert.match(migration, /auth_id IS NULL/);
  assert.match(migration, /MEMBER_INVITATION_RESENT/);
  assert.match(migration, /reason is required for restricted member statuses/i);
  assert.match(migration, /reason must not exceed 500 characters/i);
  assert.match(inviteAction, /\.in\("email", emails\)/);
  assert.match(inviteAction, /redirectTo/);
  assert.doesNotMatch(inviteAction, /member\.role === "ADMIN"/);
  assert.match(confirmAction, /type: "invite"/);
  assert.match(inviteTemplate, /{{ \.Token }}/);
  assert.match(inviteTemplate, /{{ \.RedirectTo }}/);
  assert.match(activateAction, /member\.activated_at/);
});

test("verification tokens are signed, expire, and reject tampering", () => {
  const secret = "test-secret-that-is-at-least-32-characters-long";
  const now = Date.parse("2026-07-19T00:00:00.000Z");
  const issued = createVerificationToken("Member@Example.com", secret, now, 60);

  assert.equal(
    verifyVerificationToken(issued.token, secret, now)?.email,
    "member@example.com",
  );
  assert.equal(
    verifyVerificationToken(`${issued.token}tampered`, secret, now),
    null,
  );
  assert.equal(
    verifyVerificationToken(issued.token, secret, now + 61_000),
    null,
  );
});

test("password policy rejects weak or oversized passwords", () => {
  assert.equal(validatePassword("StrongPass1"), null);
  assert.match(validatePassword("short") ?? "", /at least 8/);
  assert.match(validatePassword("alllowercase1") ?? "", /upper- and lowercase/);
  assert.match(validatePassword("NoNumbersHere") ?? "", /number/);
  assert.match(
    validatePassword(`Aa1${"x".repeat(126)}`) ?? "",
    /no more than 128/,
  );
});
