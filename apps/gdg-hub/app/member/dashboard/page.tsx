import Link from "next/link";
import { PortalSettingsValueSchema } from "@hau/contracts";
import { getCurrentMemberPortalData } from "@hau/db";

export default async function MemberDashboardPage() {
  const { member, settings, summary, error } =
    await getCurrentMemberPortalData();
  if (error || !member || !summary)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
        The member dashboard is unavailable. Apply and verify the Phase 11
        migration first.
      </div>
    );
  const portal = PortalSettingsValueSchema.safeParse(settings?.value);
  const message = portal.success
    ? portal.data.dashboard_message
    : "Welcome back to the member portal.";
  const metrics = [
    ["Gyrocoin balance", summary.current_balance, "/member/wallet"],
    ["Confirmed events", summary.confirmed_attendance_count, "/member/events"],
    ["Badges", summary.active_badge_count, "/member/credentials"],
    ["Certificates", summary.issued_certificate_count, "/member/credentials"],
    ["Open redemptions", summary.open_redemption_count, "/member/rewards"],
    [
      "Unread notifications",
      summary.unread_notification_count,
      "/member/notifications",
    ],
    ["Upcoming events", summary.upcoming_event_count, "/member/events"],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm font-medium text-blue-500">{member.gdg_id}</p>
        <h1 className="mt-1 text-3xl font-bold">Welcome, {member.full_name}</h1>
        <p className="mt-2 text-zinc-500">{message}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs uppercase text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">
              {Number(value).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold">Account status</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Your registry account is {member.member_status.toLowerCase()} with the{" "}
          {member.role.toLowerCase()} role. Manage editable contact details from
          your profile; registry identity changes must be handled by an
          administrator.
        </p>
      </section>
    </div>
  );
}
