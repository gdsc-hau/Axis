import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationPreferenceRow =
  Database["public"]["Tables"]["member_notification_preferences"]["Row"];
export type NotificationCampaignRow =
  Database["public"]["Tables"]["notification_campaigns"]["Row"];
export type NotificationDeliveryConfigRow =
  Database["public"]["Tables"]["notification_delivery_config"]["Row"];
export type NotificationEmailOutboxRow =
  Database["public"]["Tables"]["notification_email_outbox"]["Row"];

const notificationColumns =
  "id, member_id, type, title, message, action_url, source_type, source_id, related_id, dedupe_key, read, read_at, dismissed_at, created_at, updated_at";

export async function listCurrentMemberNotifications() {
  const supabase = await createServerClientInstance();
  const { data: memberId, error: memberError } =
    await supabase.rpc("current_member_id");
  if (memberError || !memberId) {
    return {
      notifications: [] as NotificationRow[],
      preferences: null as NotificationPreferenceRow | null,
      error: memberError ?? new Error("Active member was not found."),
    };
  }

  const [notificationsResult, preferencesResult] = await Promise.all([
    supabase
      .from("notifications")
      .select(notificationColumns)
      .eq("member_id", memberId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("member_notification_preferences")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle(),
  ]);

  return {
    notifications: (notificationsResult.data ?? []) as NotificationRow[],
    preferences:
      (preferencesResult.data as NotificationPreferenceRow | null) ?? null,
    error: notificationsResult.error ?? preferencesResult.error,
  };
}

export async function listAdminCommunicationsData() {
  const supabase = await createServerClientInstance();
  const [campaignsResult, outboxResult, configResult] = await Promise.all([
    supabase
      .from("notification_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notification_email_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notification_delivery_config")
      .select("*")
      .eq("singleton", true)
      .maybeSingle(),
  ]);

  return {
    campaigns: (campaignsResult.data ?? []) as NotificationCampaignRow[],
    outbox: (outboxResult.data ?? []) as NotificationEmailOutboxRow[],
    config: (configResult.data as NotificationDeliveryConfigRow | null) ?? null,
    error: campaignsResult.error ?? outboxResult.error ?? configResult.error,
  };
}

export async function markMemberNotificationRead(notificationId: string) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
}

export async function dismissMemberNotification(notificationId: string) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("dismiss_notification", {
    p_notification_id: notificationId,
  });
}

export async function markAllMemberNotificationsRead() {
  const supabase = await createServerClientInstance();
  return supabase.rpc("mark_all_notifications_read");
}

export async function updateMemberNotificationPreferences(args: {
  emailEnabled: boolean;
  accountEnabled: boolean;
  eventEnabled: boolean;
  attendanceEnabled: boolean;
  gyrocoinEnabled: boolean;
  rewardEnabled: boolean;
  credentialEnabled: boolean;
  announcementEnabled: boolean;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("update_current_notification_preferences", {
    p_email_enabled: args.emailEnabled,
    p_account_enabled: args.accountEnabled,
    p_event_enabled: args.eventEnabled,
    p_attendance_enabled: args.attendanceEnabled,
    p_gyrocoin_enabled: args.gyrocoinEnabled,
    p_reward_enabled: args.rewardEnabled,
    p_credential_enabled: args.credentialEnabled,
    p_announcement_enabled: args.announcementEnabled,
  });
}

export async function publishNotificationCampaign(args: {
  category: "ANNOUNCEMENT" | "EVENT" | "SYSTEM";
  title: string;
  message: string;
  actionUrl: string | null;
  includeEmail: boolean;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("publish_notification_campaign", {
    p_category: args.category,
    p_title: args.title,
    p_message: args.message,
    p_action_url: args.actionUrl,
    p_include_email: args.includeEmail,
    p_operation_key: args.operationKey,
  });
}

export async function setNotificationEmailDelivery(enabled: boolean) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("set_notification_email_delivery", {
    p_enabled: enabled,
  });
}
