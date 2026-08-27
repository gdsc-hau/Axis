import {
  getAdminReportMetrics,
  getPortalSettings,
  listAdminEventParticipationReport,
} from "@hau/db";
import { PortalSettingsValueSchema } from "@hau/contracts";
import { ReportDownload } from "./ReportDownload";

type SearchParams = Promise<{ from?: string; to?: string }>;

function dateInput(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function parseRange(from?: string, to?: string, defaultDays = 30) {
  const now = new Date();
  const defaultStart = new Date(
    now.getTime() - (defaultDays - 1) * 24 * 60 * 60 * 1000,
  );
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const defaultFrom = dateInput(defaultStart);
  const defaultTo = dateInput(now);
  const fromValue = validDate.test(from ?? "") ? from! : defaultFrom;
  const toValue = validDate.test(to ?? "") ? to! : defaultTo;
  const startAt = new Date(`${fromValue}T00:00:00+08:00`);
  const inclusiveEnd = new Date(`${toValue}T00:00:00+08:00`);
  const endAt = new Date(inclusiveEnd.getTime() + 24 * 60 * 60 * 1000);

  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    startAt >= endAt ||
    endAt.getTime() - startAt.getTime() > 366 * 24 * 60 * 60 * 1000
  ) {
    return {
      fromValue: defaultFrom,
      toValue: defaultTo,
      startAt: new Date(`${defaultFrom}T00:00:00+08:00`),
      endAt: new Date(
        new Date(`${defaultTo}T00:00:00+08:00`).getTime() + 86400000,
      ),
    };
  }

  return { fromValue, toValue, startAt, endAt };
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const portalResult = await getPortalSettings();
  const portal = PortalSettingsValueSchema.safeParse(portalResult.data?.value);
  const range = parseRange(
    query.from,
    query.to,
    portal.success ? portal.data.default_report_days : 30,
  );
  const [metricsResult, eventsResult] = await Promise.all([
    getAdminReportMetrics(range.startAt, range.endAt),
    listAdminEventParticipationReport({
      startAt: range.startAt,
      endAt: range.endAt,
      limit: 500,
    }),
  ]);
  const metrics = metricsResult.data ?? [];
  const events = eventsResult.data ?? [];
  const sections = Array.from(new Set(metrics.map((item) => item.section)));
  const error = metricsResult.error ?? eventsResult.error;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports and analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Read-only operational totals derived from authoritative Axis
            records.
          </p>
        </div>
        <ReportDownload
          from={range.fromValue}
          to={range.toValue}
          metrics={metrics}
          events={events}
        />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">From</span>
          <input
            type="date"
            name="from"
            defaultValue={range.fromValue}
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">To</span>
          <input
            type="date"
            name="to"
            defaultValue={range.toValue}
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Apply range
        </button>
        <p className="text-xs text-zinc-500">
          Dates use Asia/Manila time. Maximum 366 days.
        </p>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          Reports could not be loaded. Apply and verify the Phase 10 migration
          first.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {label(section)}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {metrics
                    .filter((item) => item.section === section)
                    .map((item) => (
                      <div
                        key={`${item.section}-${item.metric}`}
                        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <p className="text-xs capitalize text-zinc-500">
                          {label(item.metric)}
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                          {Number(item.value).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Event participation</h2>
              <p className="text-sm text-zinc-500">
                One aggregate row per event; attendee identity stays in the
                event attendance workspace.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    {[
                      "Event",
                      "Date",
                      "Registered",
                      "Checked in",
                      "Confirmed",
                      "No show",
                      "Cancelled",
                      "Net points",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {events.map((event) => (
                    <tr key={event.event_id}>
                      <td className="px-4 py-3 font-medium">{event.title}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Intl.DateTimeFormat("en-PH", {
                          dateStyle: "medium",
                          timeZone: "Asia/Manila",
                        }).format(new Date(event.start_at))}
                      </td>
                      <td className="px-4 py-3">{event.registered_count}</td>
                      <td className="px-4 py-3">{event.checked_in_count}</td>
                      <td className="px-4 py-3">{event.confirmed_count}</td>
                      <td className="px-4 py-3">{event.no_show_count}</td>
                      <td className="px-4 py-3">{event.cancelled_count}</td>
                      <td className="px-4 py-3">{event.net_points_awarded}</td>
                    </tr>
                  ))}
                  {!events.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-zinc-500"
                      >
                        No events fall inside this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
