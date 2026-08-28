import { listPublicEvents } from "@hau/db";
import { isPastEvent } from "@/lib/events";
import { EventCard } from "./EventCard";

export default async function EventsPage() {
  const { data: events, error } = await listPublicEvents();
  const upcoming = events?.filter((event) => !isPastEvent(event)) ?? [];
  const past = events?.filter(isPastEvent).reverse() ?? [];

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-16 dark:bg-zinc-950 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-14">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            GDG on Campus HAU
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Community events
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Event information is synchronized from the official GDG Community
            page. Registration opens externally on Luma when a link is
            available.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Events are temporarily unavailable.
          </div>
        ) : (
          <>
            <section className="space-y-5">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Upcoming
              </h2>
              {upcoming.length ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-zinc-500 dark:border-zinc-700">
                  No upcoming events have been published yet.
                </p>
              )}
            </section>

            {past.length > 0 && (
              <section className="space-y-5">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Past events
                </h2>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
