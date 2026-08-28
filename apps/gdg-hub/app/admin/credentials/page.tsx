import { listAdminRecognitionData } from "@hau/db";
import {
  BadgeCreateForm,
  EventCredentialForms,
  ManualBadgeAwardForm,
  RevokeBadgeForm,
  RevokeCertificateForm,
} from "./CredentialActions";

function date(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function AdminCredentialsPage() {
  const data = await listAdminRecognitionData();
  const activeBadges = data.badges.filter((badge) => badge.active);
  const eventOptions = data.events.map((event) => ({
    id: event.id,
    label: `${event.title} (${event.status})`,
  }));
  const memberOptions = data.activeMembers.map((member) => ({
    id: member.id,
    label: `${member.full_name} · ${member.gdg_id}`,
  }));
  const badgeOptions = activeBadges.map((badge) => ({
    id: badge.id,
    label: badge.name,
  }));
  const eventMap = new Map(data.events.map((event) => [event.id, event]));
  const memberMap = new Map(
    data.activeMembers.map((member) => [member.id, member]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Credentials and recognition
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage reversible badge awards and issue private, verifiable event
          certificates.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        Certificate artwork is a controlled placeholder until UI/UX supplies the
        final template. PDFs are private and downloadable through short-lived
        links. Email delivery is not part of Phase 7.
      </div>

      {data.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Credential data could not be loaded. Apply and verify the Phase 7
          migration first.
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            {[
              ["Badge definitions", data.badges.length],
              [
                "Active badge awards",
                data.awards.filter((award) => award.status === "AWARDED")
                  .length,
              ],
              [
                "Issued certificates",
                data.certificates.filter(
                  (certificate) => certificate.status === "ISSUED",
                ).length,
              ],
              ["Certificate batches", data.certificateBatches.length],
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
                Create badge definition
              </h2>
              <BadgeCreateForm />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-semibold">Manual badge award</h2>
              <ManualBadgeAwardForm
                badges={badgeOptions}
                members={memberOptions}
              />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <EventCredentialForms badges={badgeOptions} events={eventOptions} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recent badge awards</h2>
            {data.awards.length ? (
              data.awards.map((award) => (
                <article
                  key={award.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {award.badge?.name ?? "Unknown badge"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {award.member?.full_name ?? award.member_id} ·{" "}
                        {award.source} · {date(award.earned_at)}
                      </p>
                      {award.reason && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {award.reason}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${award.status === "AWARDED" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                    >
                      {award.status}
                    </span>
                  </div>
                  {award.status === "AWARDED" && (
                    <RevokeBadgeForm awardId={award.id} />
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No badge awards yet.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recent certificates</h2>
            {data.certificates.length ? (
              data.certificates.map((certificate) => {
                const member = memberMap.get(certificate.member_id);
                const event = eventMap.get(certificate.event_id);
                return (
                  <article
                    key={certificate.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{certificate.title}</p>
                        <p className="text-sm text-zinc-500">
                          {member?.full_name ?? certificate.member_id} ·{" "}
                          {event?.title ?? certificate.event_id}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {certificate.certificate_number}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-500">
                        {certificate.status}
                      </span>
                    </div>
                    {certificate.status === "ISSUED" && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <a
                          href={`/api/certificates/${certificate.id}/download`}
                          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Download PDF
                        </a>
                        <a
                          href={`/verify/certificate/${certificate.certificate_number}`}
                          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Public verification
                        </a>
                      </div>
                    )}
                    {certificate.status === "ISSUED" && (
                      <RevokeCertificateForm certificateId={certificate.id} />
                    )}
                    {certificate.failure_reason && (
                      <p className="mt-2 text-xs text-red-500">
                        {certificate.failure_reason}
                      </p>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No certificates yet.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Certificate batches</h2>
            {data.certificateBatches.map((batch) => (
              <div
                key={batch.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">{batch.title}</span>
                  <span>{batch.status}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Eligible {batch.eligible_count} · Prepared{" "}
                  {batch.prepared_count} · Issued {batch.issued_count} · Failed{" "}
                  {batch.failed_count}
                </p>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
