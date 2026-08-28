import Link from "next/link";
import {
  listAdminMarketplaceRewards,
  type MarketplaceRewardRow,
} from "@hau/db";
import { formatGyrocoins } from "@hau/points";
import { RewardEditorForm } from "./RewardEditorForm";

export default async function ProductsPage() {
  const { data, error } = await listAdminMarketplaceRewards();
  const rewards = (data ?? []) as MarketplaceRewardRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Reward catalog
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create inventory records and control which rewards active members
            can see.
          </p>
        </div>
        <Link
          href="/admin/rewards"
          className="text-sm font-semibold text-blue-600 hover:text-blue-500"
        >
          Open redemption queue →
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          The catalog could not be loaded. Apply and verify the Phase 5
          migration, then refresh this page.
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">
          New reward
        </h2>
        <RewardEditorForm />
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">
          Catalog items ({rewards.length})
        </h2>
        <div className="space-y-3">
          {rewards.map((reward) => (
            <details
              key={reward.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {reward.name}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      /{reward.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {formatGyrocoins(reward.point_cost)} GC
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {reward.stock_quantity} in stock
                    </span>
                    <span
                      className={
                        reward.active ? "text-emerald-600" : "text-zinc-400"
                      }
                    >
                      {reward.active ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>
              </summary>
              <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                <RewardEditorForm reward={reward} />
              </div>
            </details>
          ))}
          {!rewards.length && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No rewards have been created. New rewards default to hidden.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
