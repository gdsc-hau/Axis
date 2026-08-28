import "server-only";
import type { Database, Json } from "./database.types";
import { createServerClientInstance } from "./server";

export type MemberProfileRevisionRow =
  Database["public"]["Tables"]["member_profile_revisions"]["Row"];
export type PortalSettingRow =
  Database["public"]["Tables"]["app_settings"]["Row"];
export type PortalSettingRevisionRow =
  Database["public"]["Tables"]["app_setting_revisions"]["Row"];
export type MemberDashboardSummary =
  Database["public"]["Functions"]["get_current_member_dashboard_summary"]["Returns"][number];

const memberAccountColumns =
  "id, student_id, gdg_id, full_name, email, program, department, role, member_status, bio, phone_number, links, profile_completed_at, profile_version, created_at, updated_at";

export async function getCurrentMemberPortalData() {
  const supabase = await createServerClientInstance();
  const { data: memberId, error: identityError } =
    await supabase.rpc("current_member_id");
  if (identityError || !memberId) {
    return {
      member: null,
      revisions: [] as MemberProfileRevisionRow[],
      settings: null as PortalSettingRow | null,
      summary: null as MemberDashboardSummary | null,
      error: identityError ?? new Error("Active member was not found."),
    };
  }

  const [memberResult, revisionsResult, settingsResult, summaryResult] =
    await Promise.all([
      supabase
        .from("members")
        .select(memberAccountColumns)
        .eq("id", memberId)
        .single(),
      supabase
        .from("member_profile_revisions")
        .select("*")
        .eq("member_id", memberId)
        .order("revision_number", { ascending: false })
        .limit(10),
      supabase.rpc("get_portal_settings"),
      supabase.rpc("get_current_member_dashboard_summary"),
    ]);

  return {
    member: memberResult.data,
    revisions: (revisionsResult.data ?? []) as MemberProfileRevisionRow[],
    settings: (settingsResult.data as PortalSettingRow | null) ?? null,
    summary: summaryResult.data?.[0] ?? null,
    error:
      memberResult.error ??
      revisionsResult.error ??
      settingsResult.error ??
      summaryResult.error,
  };
}

export async function getAdminPortalSettingsData() {
  const supabase = await createServerClientInstance();
  const [settingsResult, revisionsResult] = await Promise.all([
    supabase.rpc("get_portal_settings"),
    supabase
      .from("app_setting_revisions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return {
    settings: (settingsResult.data as PortalSettingRow | null) ?? null,
    revisions: (revisionsResult.data ?? []) as PortalSettingRevisionRow[],
    error: settingsResult.error ?? revisionsResult.error,
  };
}

export async function updateCurrentMemberProfile(args: {
  expectedVersion: number;
  bio: string;
  phoneNumber: string | null;
  links: Json;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("update_current_member_profile", {
    p_expected_version: args.expectedVersion,
    p_bio: args.bio,
    p_phone_number: args.phoneNumber,
    p_links: args.links,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function updatePortalSettings(args: {
  expectedVersion: number;
  organizationName: string;
  supportEmail: string;
  dashboardMessage: string;
  defaultReportDays: number;
  leaderboardLimit: number;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("update_portal_settings", {
    p_expected_version: args.expectedVersion,
    p_organization_name: args.organizationName,
    p_support_email: args.supportEmail,
    p_dashboard_message: args.dashboardMessage,
    p_default_report_days: args.defaultReportDays,
    p_leaderboard_limit: args.leaderboardLimit,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function getPortalSettings() {
  const supabase = await createServerClientInstance();
  return supabase.rpc("get_portal_settings");
}
