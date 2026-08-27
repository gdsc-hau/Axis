export type GyrocoinBalanceEntry = {
  id: string;
  ledger_sequence: number;
  points: number;
  balance_after: number;
  created_at: string;
};

export type GyrocoinBalanceSummary = {
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  transactionCount: number;
};

export function summarizeGyrocoinLedger(
  entries: readonly GyrocoinBalanceEntry[],
): GyrocoinBalanceSummary {
  const latest = [...entries].sort(
    (left, right) => right.ledger_sequence - left.ledger_sequence,
  )[0];

  return entries.reduce<GyrocoinBalanceSummary>(
    (summary, entry) => ({
      currentBalance: latest?.balance_after ?? 0,
      totalEarned: summary.totalEarned + (entry.points > 0 ? entry.points : 0),
      totalSpent: summary.totalSpent + (entry.points < 0 ? -entry.points : 0),
      transactionCount: summary.transactionCount + 1,
    }),
    {
      currentBalance: latest?.balance_after ?? 0,
      totalEarned: 0,
      totalSpent: 0,
      transactionCount: 0,
    },
  );
}
