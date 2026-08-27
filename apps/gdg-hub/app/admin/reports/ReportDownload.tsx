"use client";

import type { AdminEventParticipationRow, AdminReportMetric } from "@hau/db";

function field(value: string | number) {
  const text = String(value);
  const spreadsheetSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${spreadsheetSafe.replaceAll('"', '""')}"`;
}

export function ReportDownload({
  from,
  to,
  metrics,
  events,
}: {
  from: string;
  to: string;
  metrics: AdminReportMetric[];
  events: AdminEventParticipationRow[];
}) {
  function download() {
    const rows: Array<Array<string | number>> = [
      ["Axis report", `${from} to ${to}`],
      [],
      ["section", "metric", "value"],
      ...metrics.map((item) => [item.section, item.metric, item.value]),
      [],
      [
        "event_id",
        "title",
        "start_at",
        "status",
        "registered",
        "checked_in",
        "confirmed",
        "no_show",
        "cancelled",
        "net_points_awarded",
      ],
      ...events.map((event) => [
        event.event_id,
        event.title,
        event.start_at,
        event.event_status,
        event.registered_count,
        event.checked_in_count,
        event.confirmed_count,
        event.no_show_count,
        event.cancelled_count,
        event.net_points_awarded,
      ]),
    ];
    const content = rows.map((row) => row.map(field).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `axis-report-${from}-to-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={!metrics.length && !events.length}
      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      Download CSV
    </button>
  );
}
