import Link from "next/link";
import { listCurrentMemberEventAttendance } from "@hau/db";
import { formatEventDate } from "@/lib/events";

const statusClass: Record<string, string> = {
  REGISTERED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CHECKED_IN: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  CONFIRMED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  NO_SHOW:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export default async function MemberEventsPage() {
  const { data: records, error } = await listCurrentMemberEventAttendance();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Event history
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Attendance snapshots imported from Luma and confirmed by GDG HAU.
        </p>
      </header>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        Luma remains the source for current registrations, cancellations, and
        tickets. This page shows only attendance information imported into Axis.
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Event history is temporarily unavailable.
        </div>
      ) : records.length ? (
        <div className="space-y-3">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link
                    href={`/member/events/${record.event_id}`}
                    className="font-semibold text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {record.event?.title ?? "Event"}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatEventDate(record.event?.start_at ?? null)}
                  </p>
                  {record.checked_in_at && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Check-in evidence: {formatEventDate(record.checked_in_at)}
                    </p>
                  )}
                  {record.status === "CONFIRMED" && (
                    <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {record.award_points > 0
                        ? `${record.award_points} Gyrocoins awarded`
                        : "Attendance confirmed"}
                    </p>
                  )}
                </div>
                <span
                  className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[record.status]}`}
                >
                  {record.status.replace("_", " ")}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No event attendance has been imported for your account yet.
          </p>
          <Link
            href="/events"
            className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Browse community events
          </Link>
        </div>
      )}
    </div>
  );
}
