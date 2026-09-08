"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResponsiveSidebar, cn } from "@hau/axis-ui";
import { signOutAction } from "@/app/auth/signout/actions";

const memberNavigation = [
  ["Dashboard", "/member/dashboard"],
  ["Events", "/member/events"],
  ["Wallet", "/member/wallet"],
  ["Rewards", "/member/rewards"],
  ["Credentials", "/member/credentials"],
  ["Notifications", "/member/notifications"],
  ["Leaderboard", "/member/leaderboard"],
  ["Profile", "/member/profile"],
  ["Settings", "/member/settings"],
] as const;

export function MemberSidebar() {
  const pathname = usePathname();

  return (
    <ResponsiveSidebar
      mobileLabel="Toggle member navigation"
      brand={
        <Link href="/member/dashboard" className="font-bold">
          <span className="block text-base text-zinc-900 dark:text-white">
            Member Portal
          </span>
          <span className="block text-xs font-normal text-zinc-500">
            GDG on Campus HAU
          </span>
        </Link>
      }
      navigation={
        <ul className="space-y-1">
          {memberNavigation.map(([label, href]) => {
            const active =
              pathname === href ||
              (href !== "/member/dashboard" && pathname.startsWith(`${href}/`));

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                  )}
                >
                  {label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-blue-500"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      }
      footer={
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Sign out
          </button>
        </form>
      }
    />
  );
}
