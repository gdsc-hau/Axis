"use client";

import { useRef, useState, useTransition } from "react";
import type { AttendanceImportSummary } from "@hau/db";
import {
  importAttendanceCsv,
  recordManualCheckIn,
  updateAttendancePoints,
} from "./actions";

type ActionMessage = { kind: "success" | "error"; text: string } | undefined;

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

export function AttendancePointsForm({
  eventId,
  points,
}: {
  eventId: string;
  points: number;
}) {
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await updateAttendancePoints(formData);
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error ?? "Save failed." });
        return;
      }
      setMessage({
        kind: "success",
        text: `Attendance award set to ${result.points} Gyrocoins.`,
      });
    });
  }

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Gyrocoins per confirmed attendee
        <input
          name="points"
          type="number"
          min={0}
          max={1_000_000}
          step={1}
          required
          defaultValue={points}
          disabled={isPending}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save attendance award"}
      </button>
      <p
        aria-live="polite"
        className={
          message?.kind === "error"
            ? "text-xs text-red-500"
            : "text-xs text-emerald-600"
        }
      >
        {message?.text}
      </p>
    </form>
  );
}

export function LumaCsvImportForm({
  eventId,
  initialOperationKey,
}: {
  eventId: string;
  initialOperationKey: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [summary, setSummary] = useState<AttendanceImportSummary>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(undefined);
    setSummary(undefined);
    startTransition(async () => {
      const result = await importAttendanceCsv(formData);
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error ?? "Import failed." });
        return;
      }
      setSummary(result.summary);
      setMessage({ kind: "success", text: "Luma CSV import completed." });
      setOperationKey(crypto.randomUUID());
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Luma guest export (.csv, maximum 2 MB)
        <input
          name="csv"
          type="file"
          accept=".csv,text/csv"
          required
          disabled={isPending}
          className={inputClass}
        />
      </label>
      <p className="text-xs leading-5 text-zinc-500">
        Prefer Luma&apos;s filtered Checked In export. Axis reads only email,
        approval status, registration time, and check-in fields; payment, phone,
        QR, and custom answers are discarded.
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending ? "Importing..." : "Import attendance snapshot"}
      </button>
      <p
        aria-live="polite"
        className={
          message?.kind === "error"
            ? "text-xs text-red-500"
            : "text-xs text-emerald-600"
        }
      >
        {message?.text}
      </p>
      {summary && (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-700">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <span>Total: {summary.total_rows}</span>
            <span>Matched: {summary.matched_rows}</span>
            <span>Unmatched: {summary.unmatched_rows}</span>
            <span>Inactive: {summary.ineligible_rows}</span>
            <span>Ignored: {summary.ignored_rows}</span>
            <span>Duplicates: {summary.duplicate_rows}</span>
          </div>
          {summary.review_rows.length > 0 && (
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                Rows requiring review
              </p>
              <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto text-zinc-600 dark:text-zinc-300">
                {summary.review_rows.map((row) => (
                  <li key={`${row.row_number}-${row.email}`}>
                    Row {row.row_number}: {row.email} —{" "}
                    {row.outcome === "NO_MEMBER_MATCH"
                      ? "not in members"
                      : "member is not active"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

export function ManualCheckInForm({
  eventId,
  members,
  initialOperationKey,
}: {
  eventId: string;
  members: Array<{
    id: string;
    full_name: string;
    email: string;
    gdg_id: string;
  }>;
  initialOperationKey: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (!confirm("Record this manual check-in?")) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await recordManualCheckIn(formData);
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error ?? "Check-in failed." });
        return;
      }
      setMessage({ kind: "success", text: "Manual check-in recorded." });
      setOperationKey(crypto.randomUUID());
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Active member
        <select
          name="memberId"
          required
          disabled={isPending}
          className={inputClass}
        >
          <option value="">Select a member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name} ({member.gdg_id})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Check-in time (optional; defaults to now)
        <input
          name="checkedInAt"
          type="datetime-local"
          disabled={isPending}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Required reason
        <textarea
          name="reason"
          minLength={3}
          maxLength={500}
          rows={2}
          required
          disabled={isPending}
          placeholder="Example: Luma scanner was unavailable at the door."
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        {isPending ? "Recording..." : "Record manual check-in"}
      </button>
      <p
        aria-live="polite"
        className={
          message?.kind === "error"
            ? "text-xs text-red-500"
            : "text-xs text-emerald-600"
        }
      >
        {message?.text}
      </p>
    </form>
  );
}
