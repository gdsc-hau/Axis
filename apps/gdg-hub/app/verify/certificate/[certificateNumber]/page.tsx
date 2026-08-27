import { notFound } from "next/navigation";
import { CertificateNumberSchema } from "@hau/contracts";
import { getPublicCertificateVerification } from "@hau/db";

function date(value: string | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function CertificateVerificationPage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const rawNumber = decodeURIComponent((await params).certificateNumber);
  const parsed = CertificateNumberSchema.safeParse(rawNumber);
  if (!parsed.success) notFound();

  const { data: certificate, error } = await getPublicCertificateVerification(
    parsed.data,
  );
  if (error || !certificate) notFound();

  const valid = certificate.certificate_status === "ISSUED";
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-white">
      <article className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-400">GDG HAU Axis</p>
            <h1 className="mt-2 text-2xl font-bold">
              Certificate verification
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${valid ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
          >
            {valid ? "Valid" : "Revoked"}
          </span>
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          {[
            ["Recipient", certificate.member_full_name],
            ["GDG ID", certificate.member_gdg_id],
            ["Credential", certificate.certificate_title],
            ["Event", certificate.event_title],
            ["Event date", date(certificate.event_start_at)],
            ["Issued", date(certificate.issued_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">
                {label}
              </dt>
              <dd className="mt-1 font-medium text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Certificate number
          </p>
          <p className="mt-1 break-all font-mono text-sm text-zinc-200">
            {certificate.certificate_number}
          </p>
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          This public result intentionally excludes the member&apos;s email
          address and private PDF location.
        </p>
      </article>
    </main>
  );
}
