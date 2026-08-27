"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import {
  AttendanceOperationKeySchema,
  ConfirmEventAttendanceSchema,
  CorrectEventAttendanceSchema,
  EventIdSchema,
  ManualEventCheckInSchema,
  SetEventAttendancePointsSchema,
} from "@hau/contracts";
import type { Json } from "@hau/db";
import {
  confirmEventAttendance,
  correctEventAttendance,
  importLumaAttendanceCsv,
  recordManualEventCheckIn,
  setEventAttendancePoints,
} from "@hau/db";
import { parseLumaGuestCsv } from "@hau/events";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

function attendanceError(message: string) {
  if (message.includes("Attach the event Luma URL")) {
    return "Attach this event's Luma URL before importing its guest CSV.";
  }
  if (message.includes("Attendance points cannot change")) {
    return "The award cannot change after attendance has been confirmed.";
  }
  if (message.includes("Only checked-in attendance")) {
    return "Only a checked-in member can be confirmed.";
  }
  if (message.includes("wallet has insufficient balance")) {
    return "This correction would overdraw the member's wallet. Restore enough Gyrocoins before reversing the attendance award.";
  }
  if (message.includes("Corrected attendance cannot be confirmed again")) {
    return "Corrected attendance cannot be awarded again automatically.";
  }
  if (message.includes("Operation key") || message.includes("operation key")) {
    return "This action conflicts with an earlier submission. Refresh and try again.";
  }
  if (message.includes("not found"))
    return "The event or attendance record no longer exists.";
  return "The attendance operation could not be completed.";
}

function revalidateAttendance(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/attendance`);
  revalidatePath("/admin/events");
  revalidatePath("/admin/dashboard");
  revalidatePath("/member/events");
  revalidatePath("/member/wallet");
}

async function requireAdmin() {
  const access = await getActiveAdmin();
  return access ? null : { error: "Active administrator access required." };
}

export async function updateAttendancePoints(formData: FormData) {
  const parsed = SetEventAttendancePointsSchema.safeParse({
    eventId: formData.get("eventId"),
    points: formData.get("points"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid award." };
  }
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await setEventAttendancePoints(
    parsed.data.eventId,
    parsed.data.points,
  );
  if (error || !data) {
    return { error: attendanceError(error?.message ?? "Unknown error") };
  }

  revalidateAttendance(parsed.data.eventId);
  return { success: true, points: data.attendance_points };
}

export async function importAttendanceCsv(formData: FormData) {
  const eventId = EventIdSchema.safeParse(formData.get("eventId"));
  const operationKey = AttendanceOperationKeySchema.safeParse(
    formData.get("operationKey"),
  );
  const file = formData.get("csv");

  if (!eventId.success || !operationKey.success) {
    return { error: "The attendance import request is invalid." };
  }
  if (!(file instanceof File) || !file.name || file.size === 0) {
    return { error: "Choose a non-empty Luma CSV file." };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { error: "The Luma CSV must not exceed 2 MB." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: "Choose a .csv file exported from Luma." };
  }

  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = parseLumaGuestCsv(bytes.toString("utf8"));
    const fileSha256 = createHash("sha256").update(bytes).digest("hex");
    const { data, error } = await importLumaAttendanceCsv({
      eventId: eventId.data,
      fileName: file.name,
      fileSha256,
      rows: parsed.rows as unknown as Json,
      operationKey: operationKey.data,
    });

    if (error || !data) {
      return { error: attendanceError(error?.message ?? "Unknown error") };
    }

    revalidateAttendance(eventId.data);
    return { success: true, summary: data };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The Luma CSV could not be read.",
    };
  }
}

export async function recordManualCheckIn(formData: FormData) {
  const rawTimestamp = String(formData.get("checkedInAt") ?? "").trim();
  let checkedInAt: string | undefined;
  if (rawTimestamp) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawTimestamp)) {
      return { error: "Enter a valid check-in time." };
    }
    const timestamp = new Date(`${rawTimestamp}:00+08:00`);
    if (Number.isNaN(timestamp.getTime())) {
      return { error: "Enter a valid check-in time." };
    }
    checkedInAt = timestamp.toISOString();
  }
  const parsed = ManualEventCheckInSchema.safeParse({
    eventId: formData.get("eventId"),
    memberId: formData.get("memberId"),
    checkedInAt,
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid check-in." };
  }
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await recordManualEventCheckIn(parsed.data);
  if (error || !data) {
    return { error: attendanceError(error?.message ?? "Unknown error") };
  }

  revalidateAttendance(parsed.data.eventId);
  return { success: true, attendanceId: data.id };
}

export async function confirmAttendance(formData: FormData) {
  const parsed = ConfirmEventAttendanceSchema.safeParse({
    attendanceId: formData.get("attendanceId"),
    note: formData.get("note") || undefined,
    operationKey: formData.get("operationKey"),
  });
  const eventId = EventIdSchema.safeParse(formData.get("eventId"));
  if (!parsed.success || !eventId.success) {
    return {
      error: parsed.success
        ? "Invalid event."
        : parsed.error.issues[0]?.message,
    };
  }
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await confirmEventAttendance(parsed.data);
  if (error || !data) {
    return { error: attendanceError(error?.message ?? "Unknown error") };
  }

  revalidateAttendance(eventId.data);
  return { success: true, status: data.status, awardPoints: data.award_points };
}

export async function correctAttendance(formData: FormData) {
  const parsed = CorrectEventAttendanceSchema.safeParse({
    attendanceId: formData.get("attendanceId"),
    status: formData.get("status"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  const eventId = EventIdSchema.safeParse(formData.get("eventId"));
  if (!parsed.success || !eventId.success) {
    return {
      error: parsed.success
        ? "Invalid event."
        : parsed.error.issues[0]?.message,
    };
  }
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await correctEventAttendance(parsed.data);
  if (error || !data) {
    return { error: attendanceError(error?.message ?? "Unknown error") };
  }

  revalidateAttendance(eventId.data);
  return { success: true, status: data.status };
}
