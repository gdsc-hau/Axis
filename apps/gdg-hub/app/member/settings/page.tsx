import Link from "next/link";
import { PortalSettingsValueSchema } from "@hau/contracts";
import { getCurrentMemberPortalData } from "@hau/db";

export default async function SettingsPage() {
  const { member, settings, error } = await getCurrentMemberPortalData();
  if (error || !member)
    return (
      <div className="text-red-500">
        Account settings are unavailable. Apply Phase 11 first.
      </div>
    );
  const parsed = PortalSettingsValueSchema.safeParse(settings?.value);
  const supportEmail = parsed.success ? parsed.data.support_email : "";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Security and communication controls for {member.email}.
        </p>
      </div>
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="font-semibold">Notifications and email</h2>
          <p className="text-sm text-zinc-500">
            Choose in-app categories and opt in to email copies.
          </p>
          <Link
            href="/member/notifications"
            className="mt-2 inline-block text-sm font-medium text-blue-500"
          >
            Manage notification preferences →
          </Link>
        </div>
        <div className="border-t pt-4 dark:border-zinc-800">
          <h2 className="font-semibold">Password</h2>
          <p className="text-sm text-zinc-500">
            Password recovery sends a single-use link through Supabase Auth.
          </p>
          <Link
            href="/forgot-password"
            className="mt-2 inline-block text-sm font-medium text-blue-500"
          >
            Request a password reset →
          </Link>
        </div>
        <div className="border-t pt-4 dark:border-zinc-800">
          <h2 className="font-semibold">Registry support</h2>
          <p className="text-sm text-zinc-500">
            Name, email, student ID, program, and department are registry-owned.
          </p>
          {supportEmail ? (
            <a
              href={`mailto:${supportEmail}`}
              className="mt-2 inline-block text-sm font-medium text-blue-500"
            >
              Contact {supportEmail}
            </a>
          ) : (
            <p className="mt-2 text-sm text-amber-500">
              No support email has been configured yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
