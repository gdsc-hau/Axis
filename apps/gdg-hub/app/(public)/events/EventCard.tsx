import type { EventRow } from "@hau/db";
import { getEventRegistrationLink } from "@hau/events";
import { formatEventDate } from "@/lib/events";

export function EventCard({ event }: { event: EventRow }) {
  const registration = getEventRegistrationLink(event);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          {event.event_type ?? "GDG Event"}
        </span>
        {event.status === "CANCELLED" && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
            Cancelled
          </span>
        )}
      </div>

      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
        {event.title}
      </h3>
      <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {formatEventDate(event.start_at)}
      </p>
      {event.location && (
        <p className="mt-1 text-sm text-zinc-500">{event.location}</p>
      )}
      {event.description && (
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {event.description}
        </p>
      )}

      <div className="mt-auto pt-6">
        {registration ? (
          <a
            href={registration.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {registration.label}
          </a>
        ) : (
          <span className="text-sm text-zinc-500">
            Registration link coming soon
          </span>
        )}
      </div>
    </article>
  );
}
