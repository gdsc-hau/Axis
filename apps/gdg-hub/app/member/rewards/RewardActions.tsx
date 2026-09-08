"use client";

import { useRef, useState, useTransition } from "react";
import { ConfirmationDialog } from "@hau/axis-ui";
import { formatGyrocoins } from "@hau/points";
import { cancelRewardRedemption, requestRewardRedemption } from "./actions";

type ActionMessage = { kind: "success" | "error"; text: string } | undefined;

export function RewardRedemptionForm({
  rewardId,
  rewardName,
  pointCost,
  maxQuantity,
  initialOperationKey,
}: {
  rewardId: string;
  rewardName: string;
  pointCost: number;
  maxQuantity: number;
  initialOperationKey: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (
      !confirm(
        `Redeem ${quantity} × ${rewardName} for ${formatGyrocoins(pointCost * quantity)} Gyrocoins?`,
      )
    ) {
      return;
    }

    setMessage(undefined);
    startTransition(async () => {
      const result = await requestRewardRedemption(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "The redemption could not be submitted.",
        });
        return;
      }
      setMessage({
        kind: "success",
        text: "Redemption submitted and Gyrocoins reserved.",
      });
      setOperationKey(crypto.randomUUID());
      setQuantity(1);
    });
  }

  if (maxQuantity < 1) {
    return (
      <p className="mt-4 rounded-lg bg-zinc-100 p-3 text-xs text-zinc-500 dark:bg-zinc-800">
        You need more Gyrocoins or the reward is out of stock.
      </p>
    );
  }

  return (
    <form action={submit} className="mt-4 space-y-3">
      <input type="hidden" name="rewardId" value={rewardId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Quantity
        <input
          name="quantity"
          type="number"
          min={1}
          max={maxQuantity}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          disabled={isPending}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending
          ? "Submitting..."
          : `Redeem for ${formatGyrocoins(pointCost * quantity)}`}
      </button>
      <p
        aria-live="polite"
        className={`min-h-4 text-xs ${
          message?.kind === "error" ? "text-red-500" : "text-emerald-600"
        }`}
      >
        {message?.text}
      </p>
    </form>
  );
}

export function CancelRedemptionForm({
  redemptionId,
  initialOperationKey,
}: {
  redemptionId: string;
  initialOperationKey: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const [operationKey, setOperationKey] = useState(initialOperationKey);
  const [message, setMessage] = useState<ActionMessage>();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await cancelRewardRedemption(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "The cancellation could not be completed.",
        });
        return;
      }
      setMessage({
        kind: "success",
        text: "Redemption cancelled and refunded.",
      });
      setOperationKey(crypto.randomUUID());
      if (reasonRef.current) reasonRef.current.value = "";
    });
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmationOpen(true);
        }}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input type="hidden" name="redemptionId" value={redemptionId} />
        <input type="hidden" name="operationKey" value={operationKey} />
        <input
          ref={reasonRef}
          name="reason"
          minLength={3}
          maxLength={500}
          required
          disabled={isPending}
          placeholder="Cancellation reason"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:hover:bg-red-500/10"
        >
          {isPending ? "Cancelling..." : "Cancel and refund"}
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
      <ConfirmationDialog
        open={confirmationOpen}
        title="Cancel redemption?"
        description="The pending redemption will be cancelled and its reserved Gyrocoins will be returned to your wallet."
        confirmLabel="Cancel and refund"
        pending={isPending}
        onOpenChange={setConfirmationOpen}
        onConfirm={() => {
          const form = formRef.current;
          if (!form) return;
          setConfirmationOpen(false);
          submit(new FormData(form));
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Reason: {reasonRef.current?.value}
        </p>
      </ConfirmationDialog>
    </>
  );
}
