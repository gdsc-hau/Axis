import assert from "node:assert/strict";
import test from "node:test";
import {
  NotificationPreferencesSchema,
  PublishNotificationCampaignSchema,
} from "../packages/contracts/src/index.ts";

test("notification campaign accepts internal Axis action paths", () => {
  const result = PublishNotificationCampaignSchema.parse({
    category: "ANNOUNCEMENT",
    title: "Community update",
    message: "The portal has been updated.",
    actionUrl: "/member/notifications?source=campaign",
    includeEmail: false,
    operationKey: "a1180000-0000-4000-8000-000000000001",
  });
  assert.equal(result.actionUrl, "/member/notifications?source=campaign");
});

test("notification campaign rejects external and protocol-relative URLs", () => {
  for (const actionUrl of ["https://example.com", "//example.com/path"]) {
    assert.equal(
      PublishNotificationCampaignSchema.safeParse({
        category: "EVENT",
        title: "Event update",
        message: "Open the event page.",
        actionUrl,
        includeEmail: true,
        operationKey: "a1180000-0000-4000-8000-000000000002",
      }).success,
      false,
    );
  }
});

test("email preferences require explicit boolean opt-in", () => {
  const preferences = NotificationPreferencesSchema.parse({
    emailEnabled: false,
    accountEnabled: true,
    eventEnabled: true,
    attendanceEnabled: true,
    gyrocoinEnabled: true,
    rewardEnabled: true,
    credentialEnabled: true,
    announcementEnabled: true,
  });
  assert.equal(preferences.emailEnabled, false);
});
