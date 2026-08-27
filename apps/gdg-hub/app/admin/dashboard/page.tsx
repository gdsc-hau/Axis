import { createServerClientInstance } from "@hau/db";
import Link from "next/link";

async function getStats() {
  const supabase = await createServerClientInstance();

  const [
    { count: totalMembers },
    { count: pendingMembers },
    { count: totalEvents },
    { count: pendingRedemptions },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("member_status", "PENDING"),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("redemptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
  ]);

  return {
    totalMembers: totalMembers ?? 0,
    pendingMembers: pendingMembers ?? 0,
    totalEvents: totalEvents ?? 0,
    pendingRedemptions: pendingRedemptions ?? 0,
  };
}

async function getRecentMembers() {
  const supabase = await createServerClientInstance();
  const { data } = await supabase
    .from("members")
    .select("id, full_name, email, member_status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string;
    member_status: string;
    created_at: string;
  }>;
}

const statCards = [
  {
    label: "Total Members",
    key: "totalMembers" as const,
    gradient: "from-blue-500 to-blue-600",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    label: "Pending Approvals",
    key: "pendingMembers" as const,
    gradient: "from-amber-500 to-orange-500",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    label: "Total Events",
    key: "totalEvents" as const,
    gradient: "from-emerald-500 to-green-600",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
    ),
  },
  {
    label: "Pending Redemptions",
    key: "pendingRedemptions" as const,
    gradient: "from-violet-500 to-purple-600",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
    ),
  },
];

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const recentMembers = await getRecentMembers();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Overview of your GDG HAU community.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">
                  {stats[card.key]}
                </p>
              </div>
              <div
                className={`p-2.5 rounded-lg bg-gradient-to-br ${card.gradient} text-white shadow-lg`}
              >
                {card.icon}
              </div>
            </div>
            {/* Decorative gradient bar at the bottom */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient}`}
            />
          </div>
        ))}
      </div>

      {/* Attention Cards */}
      {stats.pendingMembers > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-500/20">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {stats.pendingMembers} member
                {stats.pendingMembers !== 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400/70 mt-0.5">
                Review and approve pending membership applications.
              </p>
            </div>
          </div>
          <Link
            href="/admin/members"
            className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 border border-amber-300 dark:border-amber-500/30 px-4 py-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors whitespace-nowrap"
          >
            Review →
          </Link>
        </div>
      )}

      {/* Recent Members */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Recent Members
          </h2>
          <Link
            href="/admin/members"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all →
          </Link>
        </div>
        {recentMembers.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No members found yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {member.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    member.member_status === "ACTIVE"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : member.member_status === "PENDING"
                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                  }`}
                >
                  {member.member_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
