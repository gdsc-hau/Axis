import { getCurrentMemberPortalData } from "@hau/db";
import { ProfileForm } from "./ProfileForm";

function profileLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export default async function ProfilePage() {
  const { member, revisions, error } = await getCurrentMemberPortalData();
  if (error || !member)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
        Profile operations are unavailable. Apply and verify the Phase 11
        migration first.
      </div>
    );
  const links = profileLinks(member.links);
  const identity = [
    ["Registered name", member.full_name],
    ["GDG ID", member.gdg_id],
    ["Email", member.email],
    ["Student ID", member.student_id],
    ["Program", member.program],
    ["Department", member.department],
    ["Role", member.role],
    ["Member status", member.member_status],
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Registry identity is read-only. Only your contact and presentation
          fields can be revised.
        </p>
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Registry identity</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {identity.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase text-zinc-500">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Editable profile</h2>
        <p className="mb-5 mt-1 text-sm text-zinc-500">
          Every save creates an immutable revision and audit record.
        </p>
        <ProfileForm
          version={member.profile_version}
          bio={member.bio ?? ""}
          phoneNumber={member.phone_number ?? ""}
          linkedinUrl={typeof links.linkedin === "string" ? links.linkedin : ""}
          githubUrl={typeof links.github === "string" ? links.github : ""}
        />
      </section>
      <section>
        <h2 className="text-lg font-semibold">Recent revisions</h2>
        <div className="mt-3 divide-y overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {revisions.map((revision) => (
            <div
              key={revision.id}
              className="bg-white p-4 text-sm dark:bg-zinc-900"
            >
              <div className="flex justify-between gap-4">
                <span className="font-medium">
                  Revision {revision.revision_number}
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
        </div>
      </section>
    </div>
  );
}
