"use client";

import { useRef, useState, useTransition } from "react";
import type { MarketplaceRewardRow } from "@hau/db";
import { createReward, updateReward } from "./actions";

export function RewardEditorForm({
  reward,
}: {
  reward?: MarketplaceRewardRow;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | undefined
  >();
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(undefined);
    startTransition(async () => {
      const result = reward
        ? await updateReward(formData)
        : await createReward(formData);
      if ("error" in result) {
        setMessage({
          kind: "error",
          text: result.error ?? "The reward could not be saved.",
        });
        return;
      }
      setMessage({ kind: "success", text: "Reward saved." });
      if (!reward) formRef.current?.reset();
    });
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      {reward && <input type="hidden" name="rewardId" value={reward.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Name
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={reward?.name}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Slug
          <input
            name="slug"
            required
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={reward?.slug}
            placeholder="gdg-shirt"
            className={fieldClass}
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Description
        <textarea
          name="description"
          maxLength={5000}
          rows={3}
          defaultValue={reward?.description ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        HTTPS image URL (optional)
        <input
          name="imageUrl"
          type="url"
          maxLength={2048}
          defaultValue={reward?.image_url ?? ""}
          className={fieldClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Gyrocoin cost
          <input
            name="pointCost"
            type="number"
            min={1}
            max={1_000_000}
            step={1}
            required
            defaultValue={reward?.point_cost ?? 100}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Available stock
          <input
            name="stockQuantity"
            type="number"
            min={0}
            max={1_000_000}
            step={1}
            required
            defaultValue={reward?.stock_quantity ?? 0}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Sort order
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={1_000_000}
            step={1}
            required
            defaultValue={reward?.sort_order ?? 0}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
        <input
          name="active"
          type="checkbox"
          defaultChecked={reward?.active ?? false}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Visible to active members
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {isPending ? "Saving..." : reward ? "Save changes" : "Create reward"}
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
