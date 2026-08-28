"use client";

import { useState, useTransition } from "react";
import { updateEventLumaUrl } from "./actions";

export function EventLumaForm({
  eventId,
  initialUrl,
}: {
  eventId: string;
  initialUrl: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateEventLumaUrl(formData);
      setMessage(
        "error" in result
          ? (result.error ?? "The registration link could not be saved.")
          : "Registration link saved.",
      );
    });
  }

  return (
    <form action={submit} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <label
        htmlFor={`luma-${eventId}`}
        className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
      >
        Luma registration URL
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`luma-${eventId}`}
          name="lumaUrl"
          type="url"
          defaultValue={initialUrl ?? ""}
          placeholder="https://luma.com/your-event"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
      <p
        className={`text-xs ${message?.startsWith("Failed") || message?.startsWith("Use") || message?.startsWith("Active") ? "text-red-500" : "text-zinc-500"}`}
        aria-live="polite"
      >
        {message ?? "Leave blank to remove the Luma redirect."}
      </p>
    </form>
  );
}
