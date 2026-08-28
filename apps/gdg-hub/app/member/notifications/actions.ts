"use server";

import { revalidatePath } from "next/cache";
import { getActiveMember } from "@hau/auth";
import {
  NotificationIdSchema,
  NotificationPreferencesSchema,
} from "@hau/contracts";
import {
  dismissMemberNotification,
  markAllMemberNotificationsRead,
  markMemberNotificationRead,
  updateMemberNotificationPreferences,
} from "@hau/db";

function refreshNotifications() {
  revalidatePath("/member/notifications");
  revalidatePath("/member/dashboard");
}

async function requireMember() {
  return Boolean(await getActiveMember());
}

export async function markNotificationRead(formData: FormData) {
  const parsed = NotificationIdSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) return { error: "Invalid notification." };
  if (!(await requireMember()))
    return { error: "Active member access required." };
  const { error } = await markMemberNotificationRead(
    parsed.data.notificationId,
  );
  if (error) return { error: "The notification could not be marked read." };
  refreshNotifications();
  return { success: true };
}

export async function dismissNotification(formData: FormData) {
  const parsed = NotificationIdSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) return { error: "Invalid notification." };
  if (!(await requireMember()))
    return { error: "Active member access required." };
  const { error } = await dismissMemberNotification(parsed.data.notificationId);
  if (error) return { error: "The notification could not be dismissed." };
  refreshNotifications();
  return { success: true };
}

export async function markAllNotificationsRead() {
  if (!(await requireMember()))
    return { error: "Active member access required." };
  const { data, error } = await markAllMemberNotificationsRead();
  if (error) return { error: "Notifications could not be marked read." };
  refreshNotifications();
  return { success: true, changedCount: data ?? 0 };
}

export async function saveNotificationPreferences(formData: FormData) {
  const parsed = NotificationPreferencesSchema.safeParse({
    emailEnabled: formData.get("emailEnabled") === "on",
    accountEnabled: formData.get("accountEnabled") === "on",
    eventEnabled: formData.get("eventEnabled") === "on",
    attendanceEnabled: formData.get("attendanceEnabled") === "on",
    gyrocoinEnabled: formData.get("gyrocoinEnabled") === "on",
    rewardEnabled: formData.get("rewardEnabled") === "on",
    credentialEnabled: formData.get("credentialEnabled") === "on",
    announcementEnabled: formData.get("announcementEnabled") === "on",
  });
  if (!parsed.success) return { error: "Invalid notification preferences." };
  if (!(await requireMember()))
    return { error: "Active member access required." };
  const { error } = await updateMemberNotificationPreferences(parsed.data);
  if (error) return { error: "Notification preferences could not be saved." };
  refreshNotifications();
  return { success: true };
}
