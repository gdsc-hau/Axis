"use client";

import { useState, useTransition } from "react";
import type { PortalSettingsValue } from "@hau/contracts";
import { savePortalSettings } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

export function PortalSettingsForm({
  version,
  value,
}: {
  version: number;
  value: PortalSettingsValue;
}) {
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await savePortalSettings(formData);
          if ("error" in result) {
            setMessage(result.error);
            return;
          }
          setMessage(`Portal settings saved as version ${result.version}.`);
          setOperationKey(crypto.randomUUID());
        })
      }
      className="space-y-4"
    >
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-sm font-medium">
        Organization name
        <input
          name="organizationName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={value.organization_name}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Support email (optional)
        <input
          name="supportEmail"
          type="email"
          maxLength={254}
          defaultValue={value.support_email}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Member dashboard message
        <textarea
          name="dashboardMessage"
          maxLength={500}
          rows={3}
          defaultValue={value.dashboard_message}
          className={inputClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Default report days
          <input
            name="defaultReportDays"
            type="number"
            min={1}
            max={366}
            defaultValue={value.default_report_days}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Leaderboard rows
          <input
            name="leaderboardLimit"
            type="number"
            min={10}
            max={100}
            defaultValue={value.leaderboard_limit}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Administrative change reason
        <input
          name="reason"
          required
          minLength={5}
          maxLength={500}
          className={inputClass}
        />
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save portal settings"}
      </button>
      <p className="min-h-5 text-sm text-zinc-500" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
