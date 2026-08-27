"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { GyrocoinAccount } from "@hau/db";
import { formatGyrocoins } from "@hau/points";
import { adjustGyrocoins } from "./actions";

export function GyrocoinAdjustmentForm({
  accounts,
  initialOperationKey,
}: {
  accounts: GyrocoinAccount[];
  initialOperationKey: string;
}) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedMemberId, setSelectedMemberId] = useState(
    accounts[0]?.member_id ?? "",
  );
  const [adjustmentKind, setAdjustmentKind] = useState<"AWARD" | "DEDUCT">(
    "AWARD",
  );
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<
    | {
        kind: "success";
        text: string;
        memberId: string;
        balanceAfter: number;
      }
    | { kind: "error"; text: string }
    | undefined
  >();
  const [isPending, startTransition] = useTransition();

  const selectedAccount =
    accounts.find((account) => account.member_id === selectedMemberId) ??
    accounts[0];
  const displayedBalance =
    message?.kind === "success" && message.memberId === selectedMemberId
      ? message.balanceAfter
      : (selectedAccount?.current_balance ?? 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(new FormData(event.currentTarget));
  }

  function submit(formData: FormData) {
    const submittedMemberId = String(formData.get("memberId") ?? "");
    const submittedAccount = accounts.find(
      (account) => account.member_id === submittedMemberId,
    );

    if (
      formData.get("adjustmentKind") === "DEDUCT" &&
      !confirm(
        `Deduct ${formData.get("amount")} Gyrocoins from ${submittedAccount?.full_name ?? "this member"}?`,
      )
    ) {
      return;
    }

    setMessage(undefined);
    startTransition(async () => {
      const result = await adjustGyrocoins(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "The adjustment could not be recorded.",
        });
        return;
      }

      const adjustedAccount = accounts.find(
        (account) => account.member_id === result.memberId,
      );
      setSelectedMemberId(result.memberId);
      setMessage({
        kind: "success",
        memberId: result.memberId,
        balanceAfter: result.balanceAfter,
        text: `Adjustment recorded for ${adjustedAccount?.full_name ?? "the selected member"} (${adjustedAccount?.gdg_id ?? result.memberId}). New balance: ${formatGyrocoins(result.balanceAfter)} Gyrocoins.`,
      });
      setOperationKey(crypto.randomUUID());
      if (amountInputRef.current) amountInputRef.current.value = "";
      if (reasonInputRef.current) reasonInputRef.current.value = "";
      setAdjustmentKind("AWARD");
    });
  }

  if (!accounts.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
        No active members are available for an adjustment.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="operationKey" value={operationKey} />

      <div>
        <label
          htmlFor="gyrocoin-member"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Active member
        </label>
        <select
          id="gyrocoin-member"
          name="memberId"
          value={selectedMemberId}
          onChange={(event) => {
            setSelectedMemberId(event.target.value);
            setMessage(undefined);
          }}
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        >
          {accounts.map((account) => (
            <option key={account.member_id} value={account.member_id}>
              {account.full_name} ({account.gdg_id})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-zinc-500">
          Current balance: {formatGyrocoins(displayedBalance)}
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Adjustment
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["AWARD", "DEDUCT"] as const).map((kind) => (
            <label
              key={kind}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors ${
                adjustmentKind === kind
                  ? kind === "AWARD"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="adjustmentKind"
                value={kind}
                checked={adjustmentKind === kind}
                onChange={() => {
                  setAdjustmentKind(kind);
                  setMessage(undefined);
                }}
                className="sr-only"
              />
              {kind === "AWARD" ? "Award" : "Deduct"}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="gyrocoin-amount"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Amount
        </label>
        <input
          ref={amountInputRef}
          id="gyrocoin-amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={1_000_000}
          step={1}
          required
          disabled={isPending}
          placeholder="100"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div>
        <label
          htmlFor="gyrocoin-reason"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Administrator reason
        </label>
        <textarea
          ref={reasonInputRef}
          id="gyrocoin-reason"
          name="reason"
          minLength={3}
          maxLength={500}
          required
          disabled={isPending}
          rows={3}
          placeholder="Explain why this adjustment is being made."
          className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      {adjustmentKind === "DEDUCT" && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Deductions are rejected if they would make the member&apos;s balance
          negative.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Recording..." : "Record adjustment"}
      </button>

      <p
        aria-live="polite"
        className={`min-h-5 text-sm ${
          message?.kind === "error" ? "text-red-500" : "text-emerald-600"
        }`}
      >
        {message?.text}
      </p>
    </form>
  );
}
