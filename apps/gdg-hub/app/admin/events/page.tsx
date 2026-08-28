import Link from "next/link";
import { listAdminEvents } from "@hau/db";
import { formatEventDate } from "@/lib/events";
import { EventLumaForm } from "./EventLumaForm";

export default async function AdminEventsPage() {
  const { data: events, error } = await listAdminEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Events
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Event content is read-only and synchronized from GDG Community.
          Administrators manage only the Luma registration destination here.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        The Bevy receiver is implemented but inactive until the database
        migration is applied and a public HTTPS Hub URL is configured in Bevy.
        No invitations, RSVPs, or attendee records are sent by this page.
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Events could not be loaded. Apply the Phase 3 migration, then refresh
          this page.
        </div>
      ) : events?.length ? (
        <div className="space-y-4">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {event.status}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {event.source_provider ?? "MANUAL"}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {event.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatEventDate(event.start_at)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  {event.source_url && (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open authoritative GDG event
                    </a>
                  )}
                  <p className="text-xs text-zinc-400">
                    Last synchronized: {formatEventDate(event.last_synced_at)}
                  </p>
                </div>
                <div className="w-full lg:max-w-xl">
                  <EventLumaForm
                    eventId={event.id}
                    initialUrl={event.luma_url}
                  />
                  <Link
                    href={`/admin/events/${event.id}/attendance`}
                    className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Manage attendance →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            No mirrored events yet
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Events will appear after a valid HAU Bevy event webhook is received.
          </p>
        </div>
      )}
    </div>
  );
}
