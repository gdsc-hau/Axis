import { getBadgeAwardSourceLabel } from "@hau/badges";
import { listCurrentMemberCredentials } from "@hau/db";
import { EmptyState, StatusBadge } from "@hau/axis-ui";

function date(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function MemberCredentialsPage() {
  const { badges, certificates, error } = await listCurrentMemberCredentials();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Credentials</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your GDG HAU badges and attendance-backed certificates.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
          Credentials could not be loaded. Ask an administrator to verify the
          Phase 7 migration.
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Badges</h2>
            {badges.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((award) => (
                  <article
                    key={award.id}
                    className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-lg">
                        ★
                      </div>
                      <StatusBadge
                        tone={award.status === "AWARDED" ? "success" : "danger"}
                      >
                        {award.status}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-4 font-semibold">
                      {award.badge?.name ?? "Archived badge"}
                    </h3>
                    {award.badge?.description && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {award.badge.description}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-zinc-500">
                      {getBadgeAwardSourceLabel(award.source)} ·{" "}
                      {date(award.earned_at)}
                    </p>
                    {award.revocation_reason && (
                      <p className="mt-2 text-xs text-red-500">
                        {award.revocation_reason}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No badges yet"
                description="Badges awarded by an administrator will appear here."
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Certificates</h2>
            {certificates.length ? (
              certificates.map((certificate) => (
                <article
                  key={certificate.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{certificate.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {certificate.event?.title ?? "GDG HAU event"} ·{" "}
                        {date(certificate.event?.start_at ?? null)}
                      </p>
                      <p className="mt-2 font-mono text-xs text-zinc-500">
                        {certificate.certificate_number}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        certificate.status === "ISSUED"
                          ? "success"
                          : certificate.status === "REVOKED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {certificate.status}
                    </StatusBadge>
                  </div>
                  {certificate.status === "ISSUED" && (
                    <div className="mt-4 flex flex-wrap gap-4">
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
                        Verify publicly
                      </a>
                    </div>
                  )}
                  {certificate.failure_reason && (
                    <p className="mt-3 text-xs text-red-500">
                      Generation failed: {certificate.failure_reason}
                    </p>
                  )}
                  {certificate.revocation_reason && (
                    <p className="mt-3 text-xs text-red-500">
                      Revoked: {certificate.revocation_reason}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <EmptyState
                title="No certificates yet"
                description="Attendance-backed certificates will appear here after they are issued."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
