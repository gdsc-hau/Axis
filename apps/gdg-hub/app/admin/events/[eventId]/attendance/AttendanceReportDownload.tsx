"use client";

interface AttendanceReportRow {
  gdgId: string;
  fullName: string;
  email: string;
  status: string;
  source: string;
  registeredAt: string;
  checkedInAt: string | null;
  confirmedAt: string | null;
  awardPoints: number;
}

function csvField(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function AttendanceReportDownload({
  eventTitle,
  rows,
}: {
  eventTitle: string;
  rows: AttendanceReportRow[];
}) {
  function download() {
    const header = [
      "gdg_id",
      "full_name",
      "email",
      "status",
      "source",
      "registered_at",
      "checked_in_at",
      "confirmed_at",
      "award_points",
    ];
    const content = [
      header.map(csvField).join(","),
      ...rows.map((row) =>
        [
          row.gdgId,
          row.fullName,
          row.email,
          row.status,
          row.source,
          row.registeredAt,
          row.checkedInAt,
          row.confirmedAt,
          row.awardPoints,
        ]
          .map(csvField)
          .join(","),
      ),
    ].join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    anchor.href = url;
    anchor.download = `${safeTitle || "event"}-axis-attendance.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      Download Axis attendance report
    </button>
  );
}
