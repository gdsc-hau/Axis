import { getBadgeAwardSourceLabel } from "@hau/badges";
import { listCurrentMemberCredentials } from "@hau/db";

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
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${award.status === "AWARDED" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                      >
                        {award.status}
                      </span>
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
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                You have not earned a badge yet.
              </p>
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
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${certificate.status === "ISSUED" ? "bg-emerald-500/10 text-emerald-500" : certificate.status === "REVOKED" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}
                    >
                      {certificate.status}
                    </span>
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
              <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No certificates have been issued to you yet.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
