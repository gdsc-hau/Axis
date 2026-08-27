import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type MemberLeaderboardRow =
  Database["public"]["Functions"]["list_member_leaderboard"]["Returns"][number];
export type AdminReportMetric =
  Database["public"]["Functions"]["get_admin_report_metrics"]["Returns"][number];
export type AdminEventParticipationRow =
  Database["public"]["Functions"]["list_admin_event_participation_report"]["Returns"][number];

export async function listMemberLeaderboard(limit = 50, offset = 0) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("list_member_leaderboard", {
    p_limit: Math.min(Math.max(Math.trunc(limit), 1), 100),
    p_offset: Math.min(Math.max(Math.trunc(offset), 0), 10000),
  });
}

export async function getAdminReportMetrics(startAt: Date, endAt: Date) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("get_admin_report_metrics", {
    p_start_at: startAt.toISOString(),
    p_end_at: endAt.toISOString(),
  });
}

export async function listAdminEventParticipationReport(args: {
  startAt: Date;
  endAt: Date;
  eventId?: string | null;
  limit?: number;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("list_admin_event_participation_report", {
    p_start_at: args.startAt.toISOString(),
    p_end_at: args.endAt.toISOString(),
    p_event_id: args.eventId ?? null,
    p_limit: Math.min(Math.max(Math.trunc(args.limit ?? 100), 1), 500),
  });
}
