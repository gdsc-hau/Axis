import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AdminGyrocoinAdjustmentSchema } from "../packages/contracts/src/index.ts";
import {
  formatSignedGyrocoins,
  getGyrocoinSourceLabel,
} from "../packages/points/src/ledger.ts";
import { summarizeGyrocoinLedger } from "../packages/points/src/balance.ts";
import {
  canApplyGyrocoinAdjustment,
  toSignedGyrocoinAmount,
} from "../packages/points/src/rules.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20260821104059_gyrocoin_ledger_wallet.sql",
  import.meta.url,
);
const orderingFixMigrationUrl = new URL(
  "../supabase/migrations/20260821125016_gyrocoin_ledger_ordering_fix.sql",
  import.meta.url,
);
const actionUrl = new URL(
  "../apps/gdg-hub/app/admin/gyrocoins/actions.ts",
  import.meta.url,
);
const adjustmentFormUrl = new URL(
  "../apps/gdg-hub/app/admin/gyrocoins/GyrocoinAdjustmentForm.tsx",
  import.meta.url,
);

test("validates manual Gyrocoin adjustment requests", () => {
  const valid = AdminGyrocoinAdjustmentSchema.parse({
    memberId: "00000000-0000-4000-8000-000000000001",
    adjustmentKind: "AWARD",
    amount: "125",
    reason: "Community contribution award",
    operationKey: "a1150000-0000-4000-8000-000000000001",
  });

  assert.equal(valid.amount, 125);
  assert.equal(valid.adjustmentKind, "AWARD");
  assert.equal(
    AdminGyrocoinAdjustmentSchema.safeParse({
      ...valid,
      amount: 0,
    }).success,
    false,
  );
  assert.equal(
    AdminGyrocoinAdjustmentSchema.safeParse({
      ...valid,
      reason: "x",
    }).success,
    false,
  );
});

test("applies adjustment direction and balance rules", () => {
  assert.equal(toSignedGyrocoinAmount("AWARD", 50), 50);
  assert.equal(toSignedGyrocoinAmount("DEDUCT", 50), -50);
  assert.equal(canApplyGyrocoinAdjustment(75, -75), true);
  assert.equal(canApplyGyrocoinAdjustment(75, -76), false);
  assert.throws(() => toSignedGyrocoinAmount("AWARD", 0), RangeError);
});

test("summarizes and labels immutable ledger entries", () => {
  const summary = summarizeGyrocoinLedger([
    {
      id: "00000000-0000-4000-8000-000000000001",
      ledger_sequence: 1,
      points: 100,
      balance_after: 100,
      created_at: "2026-08-21T01:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      ledger_sequence: 2,
      points: -25,
      balance_after: 75,
      created_at: "2026-08-21T01:00:00Z",
    },
  ]);

  assert.deepEqual(summary, {
    currentBalance: 75,
    totalEarned: 100,
    totalSpent: 25,
    transactionCount: 2,
  });
  assert.equal(getGyrocoinSourceLabel("MANUAL_AWARD"), "Manual award");
  assert.equal(formatSignedGyrocoins(25), "+25");
  assert.equal(formatSignedGyrocoins(-25), "-25");
});

test("keeps Gyrocoin writes ordered, idempotent, audited, and separate from RSVP", async () => {
  const [migration, orderingFixMigration, action, adjustmentForm] =
    await Promise.all([
      readFile(migrationUrl, "utf8"),
      readFile(orderingFixMigrationUrl, "utf8"),
      readFile(actionUrl, "utf8"),
      readFile(adjustmentFormUrl, "utf8"),
    ]);

  assert.match(migration, /points_ledger_source_identity_idx/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /private\.adjust_member_gyrocoins/);
  assert.match(migration, /private\.require_active_admin\(\)/);
  assert.match(migration, /GYROCOIN_MANUAL_AWARD/);
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.points_ledger\s+FROM authenticated/,
  );
  assert.doesNotMatch(migration, /INSERT INTO public\.event_attendance/);

  assert.match(
    orderingFixMigration,
    /ledger_sequence BIGINT GENERATED ALWAYS AS IDENTITY/,
  );
  assert.match(
    orderingFixMigration,
    /CREATE TRIGGER enforce_points_ledger_running_balance/,
  );
  assert.match(orderingFixMigration, /ORDER BY ledger_sequence DESC/);
  assert.doesNotMatch(
    orderingFixMigration,
    /ORDER BY created_at DESC, id DESC/,
  );

  assert.match(action, /"use server"/);
  assert.match(action, /getActiveAdmin/);
  assert.match(action, /AdminGyrocoinAdjustmentSchema/);
  assert.match(action, /adjustMemberGyrocoins/);
  assert.match(action, /memberId: parsed\.data\.memberId/);

  assert.doesNotMatch(adjustmentForm, /\.reset\(\)/);
  assert.doesNotMatch(adjustmentForm, /<form action=\{submit\}/);
  assert.match(adjustmentForm, /event\.preventDefault\(\)/);
  assert.match(adjustmentForm, /setSelectedMemberId\(result\.memberId\)/);
  assert.match(adjustmentForm, /Adjustment recorded for/);
  assert.match(adjustmentForm, /amountInputRef\.current\.value = ""/);
  assert.match(adjustmentForm, /reasonInputRef\.current\.value = ""/);
});
