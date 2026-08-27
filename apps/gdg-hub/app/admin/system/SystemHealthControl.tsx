"use client";

import { useState, useTransition } from "react";
import { executeSystemHealthCheck } from "./actions";

export function SystemHealthControl() {
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await executeSystemHealthCheck(formData);
          if ("error" in result) {
            setMessage(result.error);
            return;
          }
          setMessage(
            result.status === "PASS"
              ? "All system checks passed."
              : `Health check completed with ${result.warningChecks} warning(s) and ${result.failedChecks} failure(s).`,
          );
          setOperationKey(crypto.randomUUID());
        })
      }
      className="flex flex-col items-start gap-2 sm:items-end"
    >
      <input type="hidden" name="operationKey" value={operationKey} />
      <input type="hidden" name="applicationVersion" value="axis-phase-12" />
      <button
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Running checks..." : "Run system health check"}
      </button>
      <p className="min-h-5 text-xs text-zinc-500" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
