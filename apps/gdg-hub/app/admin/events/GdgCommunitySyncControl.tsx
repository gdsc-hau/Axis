"use client";

import { useState, useTransition } from "react";
import { importGdgCommunityEvent, syncGdgCommunityEvents } from "./actions";

export function GdgCommunitySyncControl() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function importEvent(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await importGdgCommunityEvent(formData);
      setMessage(
        "error" in result
          ? (result.error ?? "The event could not be imported.")
          : `Event ${result.outcome}.`,
      );
    });
  }

  function syncChapter() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncGdgCommunityEvents();
      if ("error" in result) {
        setMessage(result.error ?? "The chapter could not be synchronized.");
        return;
      }
      const summary = result.summary;
      const firstError = summary.errors[0] ? ` ${summary.errors[0]}` : "";
      setMessage(
        `Sync complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.unchanged} unchanged, ${summary.failed} failed.${firstError}`,
      );
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          GDG Community synchronization
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Import public HAU events without storing a GDG login or attendee data.
        </p>
      </div>

      <form action={importEvent} className="space-y-2">
        <label
          htmlFor="gdg-event-url"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
        >
          Public GDG Community event URL
        </label>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            id="gdg-event-url"
            name="eventUrl"
            type="url"
            required
            placeholder="https://gdg.community.dev/events/details/.../"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            Import event
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={isPending}
          onClick={syncChapter}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {isPending ? "Synchronizing..." : "Sync all chapter events"}
        </button>
        <p className="text-xs text-zinc-500" aria-live="polite">
          {message ??
            "Only public events belonging to the configured HAU chapter are accepted."}
        </p>
      </div>
    </section>
  );
}
