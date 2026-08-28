import { getCurrentGyrocoinWallet } from "@hau/db";
import {
  formatGyrocoins,
  formatSignedGyrocoins,
  getGyrocoinSourceLabel,
} from "@hau/points";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function WalletPage() {
  const { summary, transactions, error } = await getCurrentGyrocoinWallet(50);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Gyrocoin Wallet
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your current balance and immutable transaction history.
        </p>
      </div>

      {error || !summary ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Your wallet could not be loaded. Ask an administrator to confirm that
          the Phase 4 migration is active.
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Current balance", formatGyrocoins(summary.current_balance)],
              ["Total earned", formatGyrocoins(summary.total_earned)],
              ["Total spent", formatGyrocoins(summary.total_spent)],
              ["Transactions", formatGyrocoins(summary.transaction_count)],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-900 ${
                  index === 0
                    ? "border-blue-300 dark:border-blue-500/40"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-white">
                Recent transactions
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Showing up to 50 of your latest ledger entries.
              </p>
            </div>

            {transactions.length ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {transactions.map((transaction) => (
                  <article
                    key={transaction.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {getGyrocoinSourceLabel(transaction.source_type)}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {transaction.note ?? "No additional note"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p
                        className={`text-lg font-bold ${
                          transaction.points > 0
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {formatSignedGyrocoins(transaction.points)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Balance {formatGyrocoins(transaction.balance_after)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <h2 className="font-semibold text-zinc-900 dark:text-white">
                  No transactions yet
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Your balance will update when an authorized Gyrocoin
                  transaction is recorded.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
