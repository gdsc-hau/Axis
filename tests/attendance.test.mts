import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ConfirmEventAttendanceSchema,
  CorrectEventAttendanceSchema,
  ManualEventCheckInSchema,
  SetEventAttendancePointsSchema,
} from "../packages/contracts/src/index.ts";
import { parseLumaGuestCsv } from "../packages/events/src/attendance.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20260825154838_event_attendance_luma_csv.sql",
  import.meta.url,
);
const fixtureUrl = new URL("./fixtures/luma-guest-export.csv", import.meta.url);
const actionsUrl = new URL(
  "../apps/gdg-hub/app/admin/events/[eventId]/attendance/actions.ts",
  import.meta.url,
);
const legacyRouteUrl = new URL(
  "../apps/gdg-hub/app/api/attendance/confirm/route.ts",
  import.meta.url,
);

test("parses only the minimal Luma attendance fields", async () => {
  const parsed = parseLumaGuestCsv(await readFile(fixtureUrl, "utf8"));

  assert.equal(parsed.rows.length, 4);
  assert.deepEqual(Object.keys(parsed.rows[0]!).sort(), [
    "checked_in_at",
    "email",
    "registered_at",
    "registration_status",
    "row_number",
  ]);
  const memberOneRows = parsed.rows.filter(
    (row) => row.email === "member.one@example.com",
  );
  assert.equal(memberOneRows.length, 2);
  assert.equal(memberOneRows[0]?.registration_status, "CHECKED_IN");
  assert.equal(parsed.rows[0]?.registration_status, "CHECKED_IN");
  assert.equal(parsed.rows.at(-1)?.registration_status, "IGNORED");
  assert.equal(JSON.stringify(parsed.rows).includes("private answer"), false);
  assert.equal(JSON.stringify(parsed.rows).includes("+639"), false);
});

test("rejects malformed or unsupported Luma CSV input", () => {
  assert.throws(
    () => parseLumaGuestCsv("name,status\nUnknown,approved\n"),
    /email column/,
  );
  assert.throws(
    () => parseLumaGuestCsv("email\nmember@example.com\n"),
    /approval status or check-in column/,
  );
  assert.throws(
    () =>
      parseLumaGuestCsv(
        'email,approval_status\n"broken@example.com,approved\n',
      ),
    /unterminated quoted field/,
  );
});

test("validates administrator attendance actions", () => {
  const operationKey = "a1160000-0000-4000-8000-000000000001";
  const eventId = "00000000-0000-4000-8000-000000000001";

  assert.equal(
    SetEventAttendancePointsSchema.safeParse({ eventId, points: "25" }).success,
    true,
  );
  assert.equal(
    SetEventAttendancePointsSchema.safeParse({ eventId, points: -1 }).success,
    false,
  );
  assert.equal(
    ManualEventCheckInSchema.safeParse({
      eventId,
      memberId: eventId,
      reason: "Door scanner outage",
      operationKey,
    }).success,
    true,
  );
  assert.equal(
    ConfirmEventAttendanceSchema.safeParse({
      attendanceId: eventId,
      note: "Verified by organizer",
      operationKey,
    }).success,
    true,
  );
  assert.equal(
    CorrectEventAttendanceSchema.safeParse({
      attendanceId: eventId,
      status: "CONFIRMED",
      reason: "Not a correction target",
      operationKey,
    }).success,
    false,
  );
});

test("keeps attendance imports, confirmation, correction, and awards atomic", async () => {
  const [migration, actions] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(actionsUrl, "utf8"),
  ]);

  assert.match(migration, /private\.import_luma_attendance_csv/);
  assert.match(migration, /private\.record_manual_event_check_in/);
  assert.match(migration, /private\.confirm_event_attendance/);
  assert.match(migration, /private\.correct_event_attendance/);
  assert.match(migration, /EVENT_ATTENDANCE_REVERSAL/);
  assert.match(migration, /event_attendance_award_ledger_uidx/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /event_attendance_status_history/);
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.event_attendance/,
  );
  assert.doesNotMatch(migration, /https:\/\/public-api\.luma\.com/);

  assert.match(actions, /"use server"/);
  assert.match(actions, /getActiveAdmin/);
  assert.match(actions, /parseLumaGuestCsv/);
  assert.match(actions, /createHash\("sha256"\)/);
  assert.match(actions, /revalidatePath/);
  await assert.rejects(readFile(legacyRouteUrl, "utf8"), { code: "ENOENT" });
});
