"use client";

import { useRef, useState, useTransition } from "react";
import { changeEmailDelivery, publishCampaign } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

export function CampaignForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  return (
    <form
      ref={formRef}
      action={(data) =>
        startTransition(async () => {
          const result = await publishCampaign(data);
          if ("error" in result) {
            setMessage(result.error);
            return;
          }
          setMessage(`Published to ${result.recipientCount} active member(s).`);
          formRef.current?.reset();
          setOperationKey(crypto.randomUUID());
        })
      }
      className="space-y-3"
    >
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-xs font-medium">
        Category
        <select
          name="category"
          defaultValue="ANNOUNCEMENT"
          className={inputClass}
        >
          <option value="ANNOUNCEMENT">Announcement</option>
          <option value="EVENT">Event</option>
          <option value="SYSTEM">System</option>
        </select>
      </label>
      <label className="block text-xs font-medium">
        Title
        <input name="title" required maxLength={160} className={inputClass} />
      </label>
      <label className="block text-xs font-medium">
        Message
        <textarea
          name="message"
          required
          maxLength={1000}
          rows={4}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium">
        Internal action path (optional)
        <input
          name="actionUrl"
          placeholder="/member/events"
          maxLength={500}
          className={inputClass}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="includeEmail" type="checkbox" className="mt-1" />
        <span>
          Queue email for opted-in members
          <span className="block text-xs text-zinc-500">
            This does not bypass the database or worker delivery gates.
          </span>
        </span>
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Publishing..." : "Publish campaign"}
      </button>
      <p className="min-h-4 text-xs text-zinc-500" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

export function EmailDeliveryControl({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const next = !enabled;
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("enabled", String(next));
            const result = await changeEmailDelivery(data);
            setMessage(
              "error" in result
                ? result.error
                : `Database delivery gate ${next ? "enabled" : "disabled"}.`,
            );
          })
        }
        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${enabled ? "bg-red-600" : "bg-emerald-600"}`}
      >
        {pending
          ? "Updating..."
          : enabled
            ? "Disable database gate"
            : "Enable database gate"}
      </button>
      <p className="mt-2 min-h-4 text-xs text-zinc-500" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
