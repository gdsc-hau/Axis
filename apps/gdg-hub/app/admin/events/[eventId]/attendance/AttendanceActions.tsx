"use client";

import { useRef, useState, useTransition } from "react";
import type { EventAttendanceRow } from "@hau/db";
import { confirmAttendance, correctAttendance } from "./actions";

type ActionMessage = { kind: "success" | "error"; text: string } | undefined;

export function AttendanceRowActions({
  eventId,
  attendance,
  configuredAwardPoints,
  initialOperationKey,
}: {
  eventId: string;
  attendance: EventAttendanceRow;
  configuredAwardPoints: number;
  initialOperationKey: string;
}) {
  const noteRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function nextOperation() {
    setOperationKey(crypto.randomUUID());
    if (noteRef.current) noteRef.current.value = "";
    if (reasonRef.current) reasonRef.current.value = "";
  }

  function confirmRecord(formData: FormData) {
    if (
      !confirm(
        `Confirm attendance and award ${configuredAwardPoints} Gyrocoins?`,
      )
    ) {
      return;
    }
    setMessage(undefined);
    startTransition(async () => {
      const result = await confirmAttendance(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "Confirmation failed.",
        });
        return;
      }
      setMessage({
        kind: "success",
        text: `Attendance confirmed; ${result.awardPoints} Gyrocoins awarded.`,
      });
      nextOperation();
    });
  }

  function correctRecord(formData: FormData) {
    const status = formData.get("status");
    if (!confirm(`Change this attendance record to ${status}?`)) return;
    setMessage(undefined);
    startTransition(async () => {
      const result = await correctAttendance(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "Correction failed.",
        });
        return;
      }
      setMessage({
        kind: "success",
        text: `Attendance changed to ${result.status}.`,
      });
      nextOperation();
    });
  }

  const inputClass =
    "min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <div className="mt-3 space-y-2">
      {attendance.status === "CHECKED_IN" && (
        <form
          action={confirmRecord}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="attendanceId" value={attendance.id} />
          <input type="hidden" name="operationKey" value={operationKey} />
          <input
            ref={noteRef}
            name="note"
            maxLength={500}
            disabled={isPending}
            placeholder="Optional confirmation note"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Confirm attendance
          </button>
        </form>
      )}

      <form action={correctRecord} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="attendanceId" value={attendance.id} />
        <input type="hidden" name="operationKey" value={operationKey} />
        <input
          ref={reasonRef}
          name="reason"
          required
          minLength={3}
          maxLength={500}
          disabled={isPending}
          placeholder="Required correction reason"
          className={inputClass}
        />
        <select
          name="status"
          required
          disabled={isPending}
          defaultValue=""
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="" disabled>
            Correction status
          </option>
          {attendance.status !== "CHECKED_IN" && (
            <option value="CHECKED_IN">Checked in</option>
          )}
          {attendance.status !== "NO_SHOW" && (
            <option value="NO_SHOW">No-show</option>
          )}
          {attendance.status !== "CANCELLED" && (
            <option value="CANCELLED">Cancelled</option>
          )}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-500/10"
        >
          Apply correction
        </button>
      </form>

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
    </div>
  );
}
