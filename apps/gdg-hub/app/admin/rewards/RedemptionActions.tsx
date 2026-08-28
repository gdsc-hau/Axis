"use client";

import { useRef, useState, useTransition } from "react";
import { fulfillRedemption, reviewRedemption } from "./actions";

type ActionMessage = { kind: "success" | "error"; text: string } | undefined;

export function RedemptionReviewForm({
  redemptionId,
  initialOperationKey,
}: {
  redemptionId: string;
  initialOperationKey: string;
}) {
  const reasonRef = useRef<HTMLInputElement>(null);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const decision = formData.get("decision");
    if (
      !confirm(
        `${decision === "APPROVE" ? "Approve" : "Reject"} this redemption?`,
      )
    ) {
      return;
    }
    setMessage(undefined);
    startTransition(async () => {
      const result = await reviewRedemption(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "The review could not be recorded.",
        });
        return;
      }
      setMessage({
        kind: "success",
        text: `Redemption ${result.status?.toLowerCase()}.`,
      });
      setOperationKey(crypto.randomUUID());
      if (reasonRef.current) reasonRef.current.value = "";
    });
  }

  return (
    <form action={submit} className="mt-3 space-y-2">
      <input type="hidden" name="redemptionId" value={redemptionId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <input
        ref={reasonRef}
        name="reason"
        maxLength={500}
        disabled={isPending}
        placeholder="Reason required only when rejecting"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          name="decision"
          value="APPROVE"
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          name="decision"
          value="REJECT"
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          Reject and refund
        </button>
      </div>
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

export function RedemptionFulfillmentForm({
  redemptionId,
  initialOperationKey,
}: {
  redemptionId: string;
  initialOperationKey: string;
}) {
  const noteRef = useRef<HTMLInputElement>(null);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (!confirm("Confirm that this reward has been handed to the member?")) {
      return;
    }
    setMessage(undefined);
    startTransition(async () => {
      const result = await fulfillRedemption(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "Fulfillment could not be recorded.",
        });
        return;
      }
      setMessage({ kind: "success", text: "Reward marked fulfilled." });
      setOperationKey(crypto.randomUUID());
      if (noteRef.current) noteRef.current.value = "";
    });
  }

  return (
    <form action={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="redemptionId" value={redemptionId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <input
        ref={noteRef}
        name="note"
        maxLength={500}
        disabled={isPending}
        placeholder="Optional handoff note"
        className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Mark fulfilled"}
      </button>
      <span
        aria-live="polite"
        className={
          message?.kind === "error"
            ? "text-xs text-red-500"
            : "text-xs text-emerald-600"
        }
      >
        {message?.text}
      </span>
    </form>
  );
}
