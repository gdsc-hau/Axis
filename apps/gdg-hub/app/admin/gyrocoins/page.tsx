import { randomUUID } from "node:crypto";
import {
  listAdminGyrocoinAccounts,
  listAdminGyrocoinTransactions,
} from "@hau/db";
import {
  formatGyrocoins,
  formatSignedGyrocoins,
  getGyrocoinSourceLabel,
} from "@hau/points";
import { GyrocoinAdjustmentForm } from "./GyrocoinAdjustmentForm";

function formatDate(value: string | null) {
  if (!value) return "No transactions";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function GyrocoinsPage() {
  const [accountResult, transactionResult] = await Promise.all([
    listAdminGyrocoinAccounts(),
    listAdminGyrocoinTransactions(50),
  ]);
  const accounts = accountResult.data ?? [];
  const transactions = transactionResult.data;
  const loadingError = accountResult.error ?? transactionResult.error;
  const totalBalance = accounts.reduce(
    (total, account) => total + account.current_balance,
    0,
  );
  const fundedAccounts = accounts.filter(
    (account) => account.current_balance > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Gyrocoins
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Review the append-only ledger and record audited manual adjustments.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        Reward redemptions now create automatic ledger debits and refunds. Event
        attendance awards remain deferred to a later phase.
      </div>

      {loadingError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Gyrocoin data could not be loaded. Apply and verify the Phase 4
          migration, then refresh this page.
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              ["Active accounts", formatGyrocoins(accounts.length)],
              ["Funded wallets", formatGyrocoins(fundedAccounts)],
              ["Total circulating", formatGyrocoins(totalBalance)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-white">
                  Active member balances
                </h2>
              </div>
              <div className="max-h-[34rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-left dark:bg-zinc-800">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Member
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Balance
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Entries
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {accounts.map((account) => (
                      <tr key={account.member_id}>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {account.full_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {account.email} · {account.gdg_id}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-zinc-900 dark:text-white">
                          {formatGyrocoins(account.current_balance)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-zinc-500">
                          {formatGyrocoins(account.transaction_count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="font-semibold text-zinc-900 dark:text-white">
                Manual adjustment
              </h2>
              <p className="mb-5 mt-1 text-xs text-zinc-500">
                Every submission requires a reason and creates an audit record.
              </p>
              <GyrocoinAdjustmentForm
                accounts={accounts}
                initialOperationKey={randomUUID()}
              />
            </aside>
          </div>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-white">
                Recent ledger entries
              </h2>
            </div>
            {transactions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left dark:bg-zinc-800">
                    <tr>
                      {[
                        "Member",
                        "Source",
                        "Reason",
                        "Date",
                        "Amount",
                        "Balance",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {transaction.member_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {transaction.member_email}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">
                          {getGyrocoinSourceLabel(transaction.source_type)}
                        </td>
                        <td className="max-w-xs truncate px-5 py-3.5 text-zinc-500">
                          {transaction.note ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-zinc-500">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-semibold ${
                            transaction.points > 0
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {formatSignedGyrocoins(transaction.points)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-zinc-900 dark:text-white">
                          {formatGyrocoins(transaction.balance_after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-zinc-500">
                No Gyrocoin transactions have been recorded yet.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
