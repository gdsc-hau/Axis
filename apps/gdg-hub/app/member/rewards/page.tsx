import { randomUUID } from "node:crypto";
import {
  getCurrentGyrocoinWallet,
  listCurrentMemberRedemptions,
  listMemberMarketplaceRewards,
  type MarketplaceRewardRow,
} from "@hau/db";
import {
  canCancelRedemption,
  getRedemptionStatusLabel,
  getRewardMaxAffordableQuantity,
} from "@hau/marketplace";
import { formatGyrocoins } from "@hau/points";
import { CancelRedemptionForm, RewardRedemptionForm } from "./RewardActions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

const statusClasses = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  FULFILLED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  CANCELLED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export default async function RewardsPage() {
  const [wallet, rewardsResult, redemptionsResult] = await Promise.all([
    getCurrentGyrocoinWallet(1),
    listMemberMarketplaceRewards(),
    listCurrentMemberRedemptions(),
  ]);

  const balance = wallet.summary?.current_balance ?? 0;
  const rewards = (rewardsResult.data ?? []) as MarketplaceRewardRow[];
  const redemptions = redemptionsResult.data;
  const loadingError =
    wallet.error || rewardsResult.error || redemptionsResult.error;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Rewards
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Redeem available community rewards using your Gyrocoins.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Available balance
          </p>
          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {formatGyrocoins(balance)}
          </p>
        </div>
      </div>

      {loadingError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Marketplace data could not be loaded. Apply and verify the Phase 5
          migration, then refresh this page.
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Catalog
          </h2>
          <span className="text-xs text-zinc-500">
            Stock and wallet balance are checked again when you submit.
          </span>
        </div>
        {rewards.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => {
              const maxQuantity = getRewardMaxAffordableQuantity(
                balance,
                reward.point_cost,
                reward.stock_quantity,
              );
              return (
                <article
                  key={reward.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {reward.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {reward.stock_quantity} available
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {formatGyrocoins(reward.point_cost)} GC
                    </span>
                  </div>
                  <p className="mt-4 min-h-10 text-sm text-zinc-600 dark:text-zinc-300">
                    {reward.description ?? "Reward details will be added soon."}
                  </p>
                  <RewardRedemptionForm
                    rewardId={reward.id}
                    rewardName={reward.name}
                    pointCost={reward.point_cost}
                    maxQuantity={maxQuantity}
                    initialOperationKey={randomUUID()}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No active rewards are available yet.
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          Your redemptions
        </h2>
        <div className="space-y-3">
          {redemptions.map((redemption) => (
            <article
              key={redemption.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {redemption.reward?.name ?? "Archived reward"}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {redemption.quantity} ×{" "}
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
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[redemption.status]}`}
                >
                  {getRedemptionStatusLabel(redemption.status)}
                </span>
              </div>
              {canCancelRedemption(redemption.status) && (
                <CancelRedemptionForm
                  redemptionId={redemption.id}
                  initialOperationKey={randomUUID()}
                />
              )}
            </article>
          ))}
          {!redemptions.length && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              You have not submitted a reward redemption yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
