import { randomUUID } from "node:crypto";
import Link from "next/link";
import { listAdminMarketplaceRedemptions } from "@hau/db";
import {
  canFulfillRedemption,
  canReviewRedemption,
  getRedemptionStatusLabel,
} from "@hau/marketplace";
import { formatGyrocoins } from "@hau/points";
import {
  RedemptionFulfillmentForm,
  RedemptionReviewForm,
} from "./RedemptionActions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function RewardsPage() {
  const { data: redemptions, error } = await listAdminMarketplaceRedemptions();
  const pending = redemptions.filter(
    (item) => item.status === "PENDING",
  ).length;
  const approved = redemptions.filter(
    (item) => item.status === "APPROVED",
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Reward redemptions
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review reserved requests and record completed reward handoffs.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-sm font-semibold text-blue-600 hover:text-blue-500"
        >
          Manage catalog →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase text-zinc-500">Pending review</p>
          <p className="mt-1 text-2xl font-bold">{pending}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase text-zinc-500">Awaiting handoff</p>
          <p className="mt-1 text-2xl font-bold">{approved}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase text-zinc-500">Recent records</p>
          <p className="mt-1 text-2xl font-bold">{redemptions.length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Redemptions could not be loaded. Apply and verify the Phase 5
          migration, then refresh this page.
        </div>
      )}

      <div className="space-y-4">
        {redemptions.map((redemption) => (
          <article
            key={redemption.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    {redemption.reward?.name ?? "Archived reward"}
                  </h2>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {getRedemptionStatusLabel(redemption.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {redemption.member?.full_name ?? "Unknown member"} ·{" "}
                  {redemption.member?.gdg_id ?? "No GDG ID"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {redemption.member?.email} · {redemption.quantity} ×{" "}
                  {formatGyrocoins(redemption.unit_cost)} ={" "}
                  {formatGyrocoins(redemption.total_cost)} Gyrocoins ·{" "}
                  {formatDate(redemption.created_at)}
                </p>
                {(redemption.rejection_reason ||
                  redemption.cancellation_reason) && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {redemption.rejection_reason ??
                      redemption.cancellation_reason}
                  </p>
                )}
              </div>
              <code className="text-xs text-zinc-400">{redemption.id}</code>
            </div>

            {canReviewRedemption(redemption.status) && (
              <RedemptionReviewForm
                redemptionId={redemption.id}
                initialOperationKey={randomUUID()}
              />
            )}
            {canFulfillRedemption(redemption.status) && (
              <RedemptionFulfillmentForm
                redemptionId={redemption.id}
                initialOperationKey={randomUUID()}
              />
            )}
          </article>
        ))}
        {!redemptions.length && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No reward redemptions have been submitted.
          </div>
        )}
      </div>
    </div>
  );
}
