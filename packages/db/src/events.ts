import "server-only";
import { createAdminClient } from "./admin";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventAttendanceRow =
  Database["public"]["Tables"]["event_attendance"]["Row"];
export type AttendanceImportBatchRow =
  Database["public"]["Tables"]["attendance_import_batches"]["Row"];
export type EventAttendanceHistoryRow =
  Database["public"]["Tables"]["event_attendance_status_history"]["Row"];
export type BevySyncArgs =
  Database["public"]["Functions"]["sync_bevy_event"]["Args"];

export type AdminEventAttendance = EventAttendanceRow & {
  member: {
    id: string;
    full_name: string;
    email: string;
    gdg_id: string;
  } | null;
};

export type MemberEventAttendance = EventAttendanceRow & {
  event: EventRow | null;
};

export interface AttendanceImportSummary {
  batch_id: string;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  ineligible_rows: number;
  ignored_rows: number;
  duplicate_rows: number;
  review_rows: Array<{
    row_number: number;
    email: string;
    outcome: "NO_MEMBER_MATCH" | "INELIGIBLE_MEMBER";
  }>;
}

const PUBLIC_EVENT_STATUSES = ["PUBLISHED", "COMPLETED", "CANCELLED"] as const;

export async function listPublicEvents() {
  const supabase = await createServerClientInstance();
  return supabase
    .from("events")
    .select("*")
    .in("status", [...PUBLIC_EVENT_STATUSES])
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
}

export async function getPublicEvent(eventId: string) {
  const supabase = await createServerClientInstance();
  return supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .in("status", [...PUBLIC_EVENT_STATUSES])
    .maybeSingle();
}

export async function listAdminEvents() {
  const supabase = await createServerClientInstance();
  return supabase
    .from("events")
    .select("*")
    .order("start_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true });
}

export async function setEventLumaUrl(eventId: string, lumaUrl: string) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("set_event_luma_url", {
    p_event_id: eventId,
    p_luma_url: lumaUrl,
  });
}

export async function setEventAttendancePoints(
  eventId: string,
  points: number,
) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("set_event_attendance_points", {
    p_event_id: eventId,
    p_points: points,
  });
}

export async function importLumaAttendanceCsv(args: {
  eventId: string;
  fileName: string;
  fileSha256: string;
  rows: Database["public"]["Functions"]["import_luma_attendance_csv"]["Args"]["p_rows"];
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  const result = await supabase.rpc("import_luma_attendance_csv", {
    p_event_id: args.eventId,
    p_file_name: args.fileName,
    p_file_sha256: args.fileSha256,
    p_rows: args.rows,
    p_operation_key: args.operationKey,
  });
  return {
    data: result.data as AttendanceImportSummary | null,
    error: result.error,
  };
}

export async function recordManualEventCheckIn(args: {
  eventId: string;
  memberId: string;
  checkedInAt: string | null;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("record_manual_event_check_in", {
    p_event_id: args.eventId,
    p_member_id: args.memberId,
    p_checked_in_at: args.checkedInAt,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function confirmEventAttendance(args: {
  attendanceId: string;
  note: string | null;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("confirm_event_attendance", {
    p_attendance_id: args.attendanceId,
    p_note: args.note,
    p_operation_key: args.operationKey,
  });
}

export async function correctEventAttendance(args: {
  attendanceId: string;
  status: "CHECKED_IN" | "CANCELLED" | "NO_SHOW";
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("correct_event_attendance", {
    p_attendance_id: args.attendanceId,
    p_status: args.status,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function getAdminEventAttendance(eventId: string) {
  const supabase = await createServerClientInstance();
  const [eventResult, attendanceResult, batchesResult, membersResult] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase
        .from("event_attendance")
        .select("*")
        .eq("event_id", eventId)
        .order("registered_at", { ascending: false })
        .order("id", { ascending: true }),
      supabase
        .from("attendance_import_batches")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("members")
        .select("id, full_name, email, gdg_id")
        .eq("member_status", "ACTIVE")
        .order("full_name", { ascending: true }),
    ]);

  const firstError =
    eventResult.error ??
    attendanceResult.error ??
    batchesResult.error ??
    membersResult.error;
  if (firstError) {
    return {
      event: eventResult.data as EventRow | null,
      attendance: [] as AdminEventAttendance[],
      batches: [] as AttendanceImportBatchRow[],
      activeMembers: [],
      error: firstError,
    };
  }

  const memberMap = new Map(
    (membersResult.data ?? []).map((member) => [member.id, member]),
  );
  return {
    event: eventResult.data as EventRow | null,
    attendance: ((attendanceResult.data ?? []) as EventAttendanceRow[]).map(
      (attendance) => ({
        ...attendance,
        member: memberMap.get(attendance.member_id) ?? null,
      }),
    ),
    batches: (batchesResult.data ?? []) as AttendanceImportBatchRow[],
    activeMembers: membersResult.data ?? [],
    error: null,
  };
}

export async function listCurrentMemberEventAttendance(limit = 100) {
  const supabase = await createServerClientInstance();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const { data: memberId, error: memberError } =
    await supabase.rpc("current_member_id");

  if (memberError || !memberId) {
    return {
      data: [] as MemberEventAttendance[],
      error: memberError ?? new Error("Active member was not found."),
    };
  }

  const { data: attendance, error } = await supabase
    .from("event_attendance")
    .select("*")
    .eq("member_id", memberId)
    .order("registered_at", { ascending: false })
    .limit(safeLimit);

  if (error || !attendance?.length) {
    return { data: [] as MemberEventAttendance[], error };
  }

  const eventIds = Array.from(
    new Set(attendance.map((record) => record.event_id)),
  );
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds);

  if (eventError)
    return { data: [] as MemberEventAttendance[], error: eventError };
  const eventMap = new Map(
    ((events ?? []) as EventRow[]).map((event) => [event.id, event]),
  );

  return {
    data: (attendance as EventAttendanceRow[]).map((record) => ({
      ...record,
      event: eventMap.get(record.event_id) ?? null,
    })),
    error: null,
  };
}

export async function syncBevyEvent(args: BevySyncArgs) {
  const supabase = createAdminClient();
  return supabase.rpc("sync_bevy_event", args);
}
