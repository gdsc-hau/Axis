import type { EventRow } from "@hau/db";

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function formatEventDate(value: string | null) {
  if (!value) return "Date to be announced";
  return EVENT_DATE_FORMATTER.format(new Date(value));
}

export function isPastEvent(event: Pick<EventRow, "start_at" | "end_at">) {
  const comparisonDate = event.end_at ?? event.start_at;
  return comparisonDate
    ? new Date(comparisonDate).getTime() < Date.now()
    : false;
}
