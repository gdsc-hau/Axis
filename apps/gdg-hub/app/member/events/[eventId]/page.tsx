import { notFound } from "next/navigation";
import { EventIdSchema } from "@hau/contracts";
import { getPublicEvent } from "@hau/db";
import { getEventRegistrationLink } from "@hau/events";
import { formatEventDate } from "@/lib/events";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!EventIdSchema.safeParse(eventId).success) notFound();

  const { data: event, error } = await getPublicEvent(eventId);
  if (error || !event) notFound();

  const registration = getEventRegistrationLink(event);

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {event.event_type ?? "GDG Event"}
          </span>
          {event.status === "CANCELLED" && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
              Cancelled
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {event.title}
        </h1>
        <div className="space-y-1 text-zinc-600 dark:text-zinc-300">
          <p>{formatEventDate(event.start_at)}</p>
          {event.location && <p>{event.location}</p>}
        </div>
      </header>

      {event.description && (
        <div className="whitespace-pre-line text-base leading-8 text-zinc-700 dark:text-zinc-300">
          {event.description}
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {registration && (
          <a
            href={registration.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {registration.label}
          </a>
        )}
        {event.source_url && event.source_url !== registration?.href && (
          <a
            href={event.source_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            View official GDG page
          </a>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Axis does not collect RSVPs for this event. Registration and tickets are
        handled by the external destination above.
      </p>
    </article>
  );
}
