import { PortalSettingsValueSchema } from "@hau/contracts";
import { getAdminPortalSettingsData } from "@hau/db";
import { PortalSettingsForm } from "./PortalSettingsForm";

export default async function AdminSettingsPage() {
  const { settings, revisions, error } = await getAdminPortalSettingsData();
  const parsed = PortalSettingsValueSchema.safeParse(settings?.value);
  if (error || !settings || !parsed.success)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
        Portal settings are unavailable. Apply and verify the Phase 11 migration
        first.
      </div>
    );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Portal settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Versioned operational defaults used by member and administrator pages.
        </p>
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <PortalSettingsForm version={settings.version} value={parsed.data} />
      </section>
      <section>
        <h2 className="text-lg font-semibold">Recent setting revisions</h2>
        <div className="mt-3 divide-y overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {revisions.map((revision) => (
            <div
              key={revision.id}
              className="bg-white p-4 text-sm dark:bg-zinc-900"
            >
              <div className="flex justify-between gap-4">
                <span className="font-medium">
                  Version {revision.from_version} → {revision.to_version}
                </span>
                <time className="text-zinc-500">
                  {new Intl.DateTimeFormat("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Manila",
                  }).format(new Date(revision.created_at))}
                </time>
              </div>
              <p className="mt-1 text-zinc-500">{revision.reason}</p>
            </div>
          ))}
          {!revisions.length && (
            <p className="bg-white p-8 text-center text-sm text-zinc-500 dark:bg-zinc-900">
              No settings changes have been recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
