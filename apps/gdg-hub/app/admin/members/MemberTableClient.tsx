"use client";

import { useState, useTransition } from "react";
import { approveMember, rejectMember, updateMemberRole } from "./actions";

type Member = {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  gdg_id: string;
  program: string;
  department: string;
  role: string;
  is_accepted: boolean;
  created_at: string;
};

type TabFilter = "all" | "pending" | "approved";

export function MemberTableClient({ members }: { members: Member[] }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.student_id.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      tab === "all" ||
      (tab === "pending" && !m.is_accepted) ||
      (tab === "approved" && m.is_accepted);

    return matchesSearch && matchesTab;
  });

  const pendingCount = members.filter((m) => !m.is_accepted).length;
  const approvedCount = members.filter((m) => m.is_accepted).length;

  function handleApprove(memberId: string) {
    startTransition(async () => {
      const result = await approveMember(memberId);
      if (result.error) alert(result.error);
    });
  }

  function handleReject(memberId: string) {
    if (!confirm("Are you sure you want to reject this member?")) return;
    startTransition(async () => {
      const result = await rejectMember(memberId);
      if (result.error) alert(result.error);
    });
  }

  function handleRoleChange(memberId: string, newRole: string) {
    if (!confirm(`Change this member's role to ${newRole}?`)) return;
    startTransition(async () => {
      const result = await updateMemberRole(memberId, newRole);
      if (result.error) alert(result.error);
    });
  }

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All Members", count: members.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
  ];

  return (
    <div className="space-y-4">
      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Tab pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                ${
                  tab === t.key
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }
              `}
            >
              {t.label}
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.key
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="pl-9 pr-4 py-2 w-full sm:w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isPending && <div className="h-0.5 bg-blue-500 animate-pulse" />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Member
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">
                  Student ID
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                  Program
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-zinc-400 dark:text-zinc-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-8 h-8 text-zinc-300 dark:text-zinc-600"
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
                      <p className="text-sm">No members found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Member Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                          {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                        {member.student_id}
                      </span>
                    </td>

                    {/* Program */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">
                        {member.program}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <select
                        defaultValue={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value)
                        }
                        disabled={isPending}
                        className={`
                          text-xs font-semibold px-2 py-1 rounded-md border cursor-pointer
                          focus:outline-none focus:ring-2 focus:ring-blue-500/50
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${
                            member.role === "ADMIN"
                              ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400"
                              : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                          }
                        `}
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          member.is_accepted
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.is_accepted
                              ? "bg-emerald-500"
                              : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        {member.is_accepted ? "Approved" : "Pending"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!member.is_accepted && (
                          <button
                            onClick={() => handleApprove(member.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Approve
                          </button>
                        )}
                        {!member.is_accepted && (
                          <button
                            onClick={() => handleReject(member.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Showing {filtered.length} of {members.length} member
            {members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
