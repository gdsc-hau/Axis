"use client";

import { useState, useTransition } from "react";
import { Alert, Button, FormField, Textarea } from "@hau/axis-ui";
import { sendInvites } from "./actions";

type InviteResult = {
  email: string;
  status: "sent" | "skipped" | "error";
  reason?: string;
};

export default function AdminInvitePage() {
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setResults(null);
    setFormError(null);

    startTransition(async () => {
      const response = await sendInvites(formData);
      if (response.error) {
        setFormError(response.error);
      } else if (response.results) {
        setResults(response.results);
      }
    });
  }

  const sentCount = results?.filter((r) => r.status === "sent").length ?? 0;
  const skippedCount = results?.filter((r) => r.status !== "sent").length ?? 0;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Invite Members
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Send activation emails to approved members. Each recipient must exist
          in the member registry and must not already have an active account.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
        <form action={handleSubmit} className="space-y-5">
          <FormField
            label="Email Addresses"
            htmlFor="emails"
            hint="Enter one email per line, or separate with commas."
          >
            <Textarea
              id="emails"
              name="emails"
              rows={5}
              required
              placeholder={`student1@hau.edu.ph\nstudent2@hau.edu.ph\nstudent3@hau.edu.ph`}
              className="resize-none font-mono"
            />
          </FormField>

          {formError && <Alert variant="error">{formError}</Alert>}

          <Button
            type="submit"
            size="lg"
            loading={isPending}
            loadingLabel="Sending…"
          >
            Send Invitations
          </Button>
        </form>
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Summary bar */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Results
            </span>
            {sentCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {sentCount} sent
              </span>
            )}
            {skippedCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {skippedCount} skipped
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {results.map((r) => (
              <div
                key={r.email}
                className="flex items-start justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {r.status === "sent" ? (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  ) : (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-amber-600 dark:text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 9v4m0 4h.01"
                        />
                      </svg>
                    </span>
                  )}
                  <span className="text-sm text-zinc-800 dark:text-zinc-200 font-mono truncate">
                    {r.email}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-medium ${
                      r.status === "sent"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : r.status === "error"
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {r.status === "sent"
                      ? "Invitation sent"
                      : r.status === "error"
                        ? "Error"
                        : "Skipped"}
                  </span>
                  {r.reason && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {r.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
