import Link from "next/link";
import { redirect } from "next/navigation";
import { getMemberForAuthUser, getUser } from "@hau/auth";
import { SUPPORT_EMAIL_HREF } from "@/lib/site";

const statusContent = {
  PENDING: {
    title: "Membership pending",
    message: "Your membership is still waiting for administrator approval.",
  },
  REJECTED: {
    title: "Membership not approved",
    message: "Your membership application was not approved.",
  },
  SUSPENDED: {
    title: "Membership suspended",
    message: "Portal access is temporarily suspended for this account.",
  },
  INACTIVE: {
    title: "Membership inactive",
    message: "This membership is inactive and cannot access the portal.",
  },
  ALUMNI: {
    title: "Alumni membership",
    message: "Alumni portal access has not been enabled for this account.",
  },
} as const;

export default async function AccountStatusPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const member = await getMemberForAuthUser(user.id, user.email, {
    allowUnlinkedEmail: true,
  });
  if (member?.member_status === "ACTIVE" && member.auth_id === user.id) {
    redirect(
      member.role === "ADMIN" ? "/admin/dashboard" : "/member/dashboard",
    );
  }

  const content =
    member?.member_status === "ACTIVE"
      ? {
          title: "Account activation incomplete",
          message:
            "Your membership is active, but this Auth account has not completed the invitation flow.",
        }
      : member
        ? statusContent[member.member_status]
        : {
            title: "Member record not found",
            message: "No GDG HAU member record is linked to this account.",
          };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          Account status
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">
          {content.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {content.message} Contact the GDG HAU team if you believe this is a
          mistake.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={SUPPORT_EMAIL_HREF}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Contact support
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
