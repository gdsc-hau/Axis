"use client";

import { useState, useTransition } from "react";
import type { MemberStatus } from "@hau/contracts";
import { updateMemberRole, updateMemberStatus } from "./actions";

type Member = {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  gdg_id: string;
  program: string;
  department: string;
  role: string;
  member_status: MemberStatus;
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
};

type TabFilter = "all" | "pending" | "active" | "restricted";

const memberStatuses: MemberStatus[] = [
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
  "INACTIVE",
  "ALUMNI",
];

const statusStyles: Record<MemberStatus, string> = {
  PENDING:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  ACTIVE:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  SUSPENDED:
    "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  INACTIVE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ALUMNI: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
};

export function MemberTableClient({ members }: { members: Member[] }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = members.filter((member) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      member.full_name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      member.student_id.toLowerCase().includes(term) ||
      member.gdg_id.toLowerCase().includes(term);
    const matchesTab =
      tab === "all" ||
      (tab === "pending" && member.member_status === "PENDING") ||
      (tab === "active" && member.member_status === "ACTIVE") ||
      (tab === "restricted" &&
        !["PENDING", "ACTIVE"].includes(member.member_status));

    return matchesSearch && matchesTab;
  });

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: members.length },
    {
      key: "pending",
      label: "Pending",
      count: members.filter((member) => member.member_status === "PENDING")
        .length,
    },
    {
      key: "active",
      label: "Active",
      count: members.filter((member) => member.member_status === "ACTIVE")
        .length,
    },
    {
      key: "restricted",
      label: "Restricted",
      count: members.filter(
        (member) => !["PENDING", "ACTIVE"].includes(member.member_status),
      ).length,
    },
  ];

  function handleStatusChange(member: Member, nextStatus: MemberStatus) {
    if (nextStatus === member.member_status) return;

    let reason: string | undefined;
    if (!["PENDING", "ACTIVE"].includes(nextStatus)) {
      const response = prompt(
        `Required administrator reason for ${nextStatus.toLowerCase()} status:`,
      );
      if (response === null) return;
      reason = response.trim() || undefined;
      if (!reason) {
        alert("A reason is required for restricted member statuses.");
        return;
      }
    } else if (
      !confirm(
        `Change ${member.full_name}'s status from ${member.member_status} to ${nextStatus}?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await updateMemberStatus(member.id, nextStatus, reason);
      if (result.error) alert(result.error);
    });
  }

  function handleRoleChange(member: Member, nextRole: string) {
    if (nextRole === member.role) return;
    if (!confirm(`Change ${member.full_name}'s role to ${nextRole}?`)) return;

    startTransition(async () => {
      const result = await updateMemberRole(member.id, nextRole);
      if (result.error) alert(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === item.key
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {item.label}
              <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] dark:bg-zinc-600">
                {item.count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, student, or GDG ID"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 sm:w-80"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isPending && <div className="h-0.5 animate-pulse bg-blue-500" />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-800/50">
                {[
                  "Member",
                  "Student ID",
                  "Program",
                  "Role",
                  "Status",
                  "Lifecycle",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-zinc-500"
                  >
                    No members match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {member.full_name}
                      </p>
                      <p className="text-xs text-zinc-500">{member.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-600 dark:text-zinc-300">
                      {member.student_id}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">
                      {member.program}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleRoleChange(member, event.target.value)
                        }
                        disabled={isPending}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        <option value="MEMBER">MEMBER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[member.member_status]}`}
                      >
                        {member.member_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={member.member_status}
                        onChange={(event) =>
                          handleStatusChange(
                            member,
                            event.target.value as MemberStatus,
                          )
                        }
                        disabled={isPending}
                        aria-label={`Change status for ${member.full_name}`}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        {memberStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {member.activated_at
                          ? "Account activated"
                          : member.invited_at
                            ? "Invite sent"
                            : "Not invited"}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/30">
          Showing {filtered.length} of {members.length} members
        </div>
      </div>
    </div>
  );
}
