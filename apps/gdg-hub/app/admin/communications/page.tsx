import { listAdminCommunicationsData } from "@hau/db";
import { CampaignForm, EmailDeliveryControl } from "./CommunicationControls";

function date(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function AdminCommunicationsPage() {
  const data = await listAdminCommunicationsData();
  const queued = data.outbox.filter((item) => item.status === "QUEUED").length;
  const failed = data.outbox.filter((item) => item.status === "FAILED").length;
  const sent = data.outbox.filter((item) => item.status === "SENT").length;
  const deliveryEnabled = data.config?.email_delivery_enabled ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Publish in-app announcements and monitor the opt-in email outbox.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Email has two independent gates: this database switch and the Edge
        Function environment variable. Phase 8 ships both disabled. In-app
        notifications work immediately after migration.
      </div>

      {data.error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          Communications data could not be loaded. Apply and verify the Phase 8
          migration first.
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            {[
              ["Campaigns", data.campaigns.length],
              ["Queued emails", queued],
              ["Sent emails", sent],
              ["Failed emails", failed],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-semibold">
                Publish announcement
              </h2>
              <CampaignForm />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">Email delivery gate</h2>
              <p className="mb-4 mt-1 text-sm text-zinc-500">
                Database status:{" "}
                <strong>{deliveryEnabled ? "enabled" : "disabled"}</strong>.
                Keep this disabled until the provider secrets, verified sender,
                and worker secret are configured.
              </p>
              <EmailDeliveryControl enabled={deliveryEnabled} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recent campaigns</h2>
            {data.campaigns.length ? (
              data.campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{campaign.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {campaign.message}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-500">
                      {campaign.category}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    {campaign.recipient_count} recipients ·{" "}
                    {campaign.include_email ? "email requested" : "in-app only"}{" "}
                    · {date(campaign.created_at)}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No campaigns published yet.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recent email outbox</h2>
            {data.outbox.length ? (
              data.outbox.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.subject}</p>
                      <p className="text-xs text-zinc-500">
                        {item.recipient_email} · attempt {item.attempt_count}
                      </p>
                    </div>
                    <span className="font-semibold">{item.status}</span>
                  </div>
                  {item.last_error && (
                    <p className="mt-2 text-xs text-red-500">
                      {item.last_error}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No email has been queued. Members must opt in first.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
