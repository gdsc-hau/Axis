import Link from "next/link";
import { listCurrentMemberNotifications } from "@hau/db";
import {
  MarkAllReadButton,
  NotificationItemActions,
  NotificationPreferencesForm,
} from "./NotificationControls";

function date(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function NotificationsPage() {
  const { notifications, preferences, error } =
    await listCurrentMemberNotifications();
  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            System updates from your Axis account, events, rewards, wallet, and
            credentials.
          </p>
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          Notifications could not be loaded. Apply and verify the Phase 8
          migration first.
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inbox</h2>
            <span className="text-sm text-zinc-500">{unreadCount} unread</span>
          </div>
          {notifications.length ? (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 ${notification.read ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" : "border-blue-300 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-500/10 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        {notification.type}
                      </span>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold">{notification.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {date(notification.created_at)}
                    </p>
                  </div>
                  {notification.action_url && (
                    <Link
                      href={notification.action_url}
                      className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open
                    </Link>
                  )}
                </div>
                <div className="mt-3">
                  <NotificationItemActions
                    notificationId={notification.id}
                    read={notification.read}
                  />
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Your inbox is empty.
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Email preferences</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-500">
          Email is opt-in and is currently controlled separately from your
          in-app inbox.
        </p>
        <NotificationPreferencesForm preferences={preferences} />
      </section>
    </div>
  );
}
