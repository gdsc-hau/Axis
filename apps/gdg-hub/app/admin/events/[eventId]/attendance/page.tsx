import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventIdSchema } from "@hau/contracts";
import { getAdminEventAttendance } from "@hau/db";
import { formatEventDate } from "@/lib/events";
import { AttendanceRowActions } from "./AttendanceActions";
import { AttendanceReportDownload } from "./AttendanceReportDownload";
import {
  AttendancePointsForm,
  LumaCsvImportForm,
  ManualCheckInForm,
} from "./AttendanceControls";

const statusClass: Record<string, string> = {
  REGISTERED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CHECKED_IN: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  CONFIRMED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  NO_SHOW:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

export default async function AdminEventAttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!EventIdSchema.safeParse(eventId).success) notFound();

  const { event, attendance, batches, activeMembers, error } =
    await getAdminEventAttendance(eventId);
  if (!event) notFound();

  const counts: Record<string, number> = {};
  for (const record of attendance) {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/events"
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to events
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Attendance — {event.title}
        </h1>
        <p className="text-sm text-zinc-500">
          {formatEventDate(event.start_at)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </header>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        Luma remains the registration and door check-in system. Import a Luma
        CSV snapshot here only after staff check-in is complete. Importing does
        not award Gyrocoins; an administrator must confirm each checked-in
        member below.
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Attendance data could not be loaded. Apply the Phase 6 migration and
          refresh this page.
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["All records", attendance.length],
          ["Registered", counts.REGISTERED ?? 0],
          ["Checked in", counts.CHECKED_IN ?? 0],
          ["Confirmed", counts.CONFIRMED ?? 0],
          [
            "No-show / cancelled",
            (counts.NO_SHOW ?? 0) + (counts.CANCELLED ?? 0),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            Award configuration
          </h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-zinc-500">
            This value is snapshotted when attendance is confirmed and becomes
            locked after the first confirmation.
          </p>
          <AttendancePointsForm
            eventId={event.id}
            points={event.attendance_points}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            Import from Luma
          </h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-zinc-500">
            {event.luma_url ? (
              <a
                href={event.luma_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Open the connected Luma event
              </a>
            ) : (
              "Attach a Luma URL from the Events page first."
            )}
          </p>
          <LumaCsvImportForm
            eventId={event.id}
            initialOperationKey={randomUUID()}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            Manual exception
          </h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-zinc-500">
            Use only for a documented door check-in that is missing from Luma.
          </p>
          <ManualCheckInForm
            eventId={event.id}
            members={activeMembers}
            initialOperationKey={randomUUID()}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Attendance review
          </h2>
          <AttendanceReportDownload
            eventTitle={event.title}
            rows={attendance.map((record) => ({
              gdgId: record.member?.gdg_id ?? "",
              fullName: record.member?.full_name ?? "Unknown member",
              email: record.member?.email ?? "",
              status: record.status,
              source: record.attendance_source,
              registeredAt: record.registered_at,
              checkedInAt: record.checked_in_at,
              confirmedAt: record.confirmed_at,
              awardPoints: record.award_points,
            }))}
          />
        </div>
        {attendance.length ? (
          <div className="space-y-3">
            {attendance.map((record) => (
              <article
                key={record.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {record.member?.full_name ?? "Unknown member"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {record.member?.email} · {record.member?.gdg_id}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {record.attendance_source === "LUMA_CSV"
                        ? "Luma CSV"
                        : "Manual exception"}
                      {record.checked_in_at
                        ? ` · checked in ${formatEventDate(record.checked_in_at)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.award_points > 0 && (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {record.award_points} GC
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass[record.status]}`}
                    >
                      {record.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <AttendanceRowActions
                  eventId={event.id}
                  attendance={record}
                  configuredAwardPoints={event.attendance_points}
                  initialOperationKey={randomUUID()}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700">
            No attendance evidence has been imported or entered for this event.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Import history
        </h2>
        {batches.length ? (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Imported</th>
                  <th className="px-4 py-3">Matched</th>
                  <th className="px-4 py-3">Review</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-medium">{batch.file_name}</td>
                    <td className="px-4 py-3">
                      {formatEventDate(batch.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {batch.matched_rows} / {batch.total_rows}
                    </td>
                    <td className="px-4 py-3">
                      {batch.unmatched_rows} unmatched · {batch.ineligible_rows}{" "}
                      inactive · {batch.ignored_rows} ignored ·{" "}
                      {batch.duplicate_rows} duplicates
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No CSV imports recorded yet.</p>
        )}
      </section>
    </div>
  );
}
