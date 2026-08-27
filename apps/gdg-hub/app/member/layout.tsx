import Link from "next/link";
import { redirect } from "next/navigation";
import { getMemberForAuthUser, getUser } from "@hau/auth";
import { signOutAction } from "@/app/auth/signout/actions";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const member = await getMemberForAuthUser(user.id, user.email);

  if (!member || member.member_status !== "ACTIVE") {
    redirect("/account-status");
  }

  if (!member.profile_completed_at) {
    // If their profile is incomplete, force them to complete it via the verify route
    redirect("/verify");
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      {/* Member Sidebar would go here */}
      <aside className="hidden w-64 flex-col border-r bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="p-4 border-b dark:border-zinc-800">
          <h2 className="text-lg font-bold">Member Portal</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            ["Dashboard", "/member/dashboard"],
            ["Events", "/member/events"],
            ["Wallet", "/member/wallet"],
            ["Rewards", "/member/rewards"],
            ["Credentials", "/member/credentials"],
            ["Notifications", "/member/notifications"],
            ["Leaderboard", "/member/leaderboard"],
            ["Profile", "/member/profile"],
            ["Settings", "/member/settings"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <form
          action={signOutAction}
          className="border-t p-4 dark:border-zinc-800"
        >
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
