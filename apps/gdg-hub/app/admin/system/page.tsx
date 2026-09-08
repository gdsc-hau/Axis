import type { SystemHealthResult, SystemHealthRun } from "@hau/db";
import { getAdminSystemHealthData } from "@hau/db";
import { StatusBadge, type StatusBadgeTone } from "@hau/axis-ui";
import { SystemHealthControl } from "./SystemHealthControl";

const statusTone: Record<SystemHealthRun["status"], StatusBadgeTone> = {
  PASS: "success",
  WARN: "warning",
  FAIL: "danger",
  RUNNING: "info",
};

function formatDate(value: string | null) {
  if (!value) return "In progress";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function CheckResult({ result }: { result: SystemHealthResult }) {
  return (
    <article className="flex flex-col gap-3 border-b border-zinc-200 p-4 last:border-0 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-medium">{result.check_key.replaceAll("_", " ")}</h3>
        <p className="mt-1 text-sm text-zinc-500">{result.details}</p>
      </div>
      <StatusBadge tone={statusTone[result.status]} className="shrink-0">
        {result.status}
      </StatusBadge>
    </article>
  );
}

function RunHistory({ run }: { run: SystemHealthRun }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 text-sm dark:bg-zinc-900">
      <div>
        <p className="font-medium">{formatDate(run.completed_at)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {run.application_version} · {run.total_checks} checks
        </p>
      </div>
      <StatusBadge tone={statusTone[run.status]}>{run.status}</StatusBadge>
    </div>
  );
}

export default async function AdminSystemHealthPage() {
  const { runs, latestRun, results, error } = await getAdminSystemHealthData();
  const categories = results.reduce<Record<string, SystemHealthResult[]>>(
    (grouped, result) => {
      (grouped[result.category] ??= []).push(result);
      return grouped;
    },
    {},
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold">System health</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Read-only cross-system checks for release readiness. Runs are
            immutable and every execution is recorded in the audit log.
          </p>
        </div>
        <SystemHealthControl />
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          System health data is unavailable. Apply and verify the Phase 12
          migration first.
        </div>
      )}

      {!error && !latestRun && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-500">
          No health check has been recorded yet. Run the first check before
          treating this workspace as release-ready.
        </div>
      )}

      {latestRun && (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Latest run</h2>
                <p className="text-sm text-zinc-500">
                  {formatDate(latestRun.completed_at)} ·{" "}
                  {latestRun.application_version}
                </p>
              </div>
              <StatusBadge tone={statusTone[latestRun.status]}>
                {latestRun.status}
              </StatusBadge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Total checks"
                value={latestRun.total_checks}
              />
              <SummaryCard label="Passed" value={latestRun.passed_checks} />
              <SummaryCard label="Warnings" value={latestRun.warning_checks} />
              <SummaryCard label="Failures" value={latestRun.failed_checks} />
            </div>
          </section>

          <section className="space-y-6">
            {Object.entries(categories).map(([category, categoryResults]) => (
              <div key={category}>
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-500">
                  {category.replaceAll("_", " ")}
                </h2>
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  {categoryResults.map((result) => (
                    <CheckResult key={result.id} result={result} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {!!runs.length && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent runs</h2>
          <div className="divide-y overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {runs.map((run) => (
              <RunHistory key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
