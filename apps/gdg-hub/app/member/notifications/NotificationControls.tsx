"use client";

import { useState, useTransition } from "react";
import type { NotificationPreferenceRow } from "@hau/db";
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
} from "./actions";

type Result = { success?: boolean; error?: string };

export function NotificationItemActions({
  notificationId,
  read,
}: {
  notificationId: string;
  read: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: (data: FormData) => Promise<Result>) {
    const data = new FormData();
    data.set("notificationId", notificationId);
    setError(undefined);
    startTransition(async () => {
      const result = await action(data);
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {!read && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(markNotificationRead)}
          className="font-semibold text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
        >
          Mark read
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(dismissNotification)}
        className="text-zinc-500 hover:text-red-500 disabled:opacity-50"
      >
        Dismiss
      </button>
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await markAllNotificationsRead();
            setMessage(
              "error" in result
                ? result.error
                : `${result.changedCount} notification(s) marked read.`,
            );
          })
        }
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Updating..." : "Mark all read"}
      </button>
      <p className="mt-1 min-h-4 text-xs text-zinc-500" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

const preferenceOptions = [
  ["accountEnabled", "Account and access"],
  ["eventEnabled", "Events"],
  ["attendanceEnabled", "Attendance"],
  ["gyrocoinEnabled", "Gyrocoins"],
  ["rewardEnabled", "Rewards"],
  ["credentialEnabled", "Badges and certificates"],
  ["announcementEnabled", "Announcements"],
] as const;

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferenceRow | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  return (
    <form
      action={(data) =>
        startTransition(async () => {
          const result = await saveNotificationPreferences(data);
          setMessage("error" in result ? result.error : "Preferences saved.");
        })
      }
      className="space-y-4"
    >
      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <input
          name="emailEnabled"
          type="checkbox"
          defaultChecked={preferences?.email_enabled ?? false}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-semibold">Email copies</span>
          <span className="block text-xs text-zinc-500">
            Opt in to email. Delivery also requires the administrator and worker
            gates to be enabled.
          </span>
        </span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {preferenceOptions.map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input
              name={name}
              type="checkbox"
              defaultChecked={preferences?.[snakeCase(name)] ?? true}
            />
            {label}
          </label>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        These category switches control email copies. Security-critical in-app
        notifications remain visible in your inbox.
      </p>
      <button
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save preferences"}
      </button>
      <p className="min-h-4 text-xs text-zinc-500" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

function snakeCase(name: (typeof preferenceOptions)[number][0]) {
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) as
    | "account_enabled"
    | "event_enabled"
    | "attendance_enabled"
    | "gyrocoin_enabled"
    | "reward_enabled"
    | "credential_enabled"
    | "announcement_enabled";
}
