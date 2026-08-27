import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type GyrocoinLedgerRow =
  Database["public"]["Tables"]["points_ledger"]["Row"];
export type GyrocoinWalletSummary =
  Database["public"]["Functions"]["current_gyrocoin_wallet_summary"]["Returns"][number];
export type GyrocoinAccount =
  Database["public"]["Functions"]["list_gyrocoin_accounts"]["Returns"][number];

export type AdminGyrocoinTransaction = GyrocoinLedgerRow & {
  member_name: string;
  member_email: string;
};

export async function getCurrentGyrocoinWallet(transactionLimit = 50) {
  const supabase = await createServerClientInstance();
  const safeLimit = Math.min(Math.max(Math.trunc(transactionLimit), 1), 100);
  const { data: summaries, error: summaryError } = await supabase.rpc(
    "current_gyrocoin_wallet_summary",
  );

  if (summaryError || !summaries?.[0]) {
    return {
      summary: null,
      transactions: [] as GyrocoinLedgerRow[],
      error: summaryError ?? new Error("Active member wallet was not found."),
    };
  }

  const summary = summaries[0];
  const { data: transactions, error } = await supabase
    .from("points_ledger")
    .select(
      "id, ledger_sequence, member_id, source_type, source_id, points, balance_after, note, created_at",
    )
    .eq("member_id", summary.member_id)
    .order("ledger_sequence", { ascending: false })
    .limit(safeLimit);

  return {
    summary,
    transactions: (transactions ?? []) as GyrocoinLedgerRow[],
    error,
  };
}

export async function listAdminGyrocoinAccounts() {
  const supabase = await createServerClientInstance();
  return supabase.rpc("list_gyrocoin_accounts");
}

export async function listAdminGyrocoinTransactions(transactionLimit = 50) {
  const supabase = await createServerClientInstance();
  const safeLimit = Math.min(Math.max(Math.trunc(transactionLimit), 1), 100);
  const { data: transactions, error } = await supabase
    .from("points_ledger")
    .select(
      "id, ledger_sequence, member_id, source_type, source_id, points, balance_after, note, created_at",
    )
    .order("ledger_sequence", { ascending: false })
    .limit(safeLimit);

  if (error || !transactions?.length) {
    return {
      data: [] as AdminGyrocoinTransaction[],
      error,
    };
  }

  const memberIds = Array.from(
    new Set(transactions.map((transaction) => transaction.member_id)),
  );
  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, email")
    .in("id", memberIds);

  if (memberError) {
    return { data: [] as AdminGyrocoinTransaction[], error: memberError };
  }

  const membersById = new Map(
    (members ?? []).map((member) => [member.id, member]),
  );

  return {
    data: transactions.map((transaction) => {
      const member = membersById.get(transaction.member_id);
      return {
        ...(transaction as GyrocoinLedgerRow),
        member_name: member?.full_name ?? "Unknown member",
        member_email: member?.email ?? "",
      };
    }),
    error: null,
  };
}

export async function adjustMemberGyrocoins(args: {
  memberId: string;
  signedPoints: number;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("adjust_member_gyrocoins", {
    p_member_id: args.memberId,
    p_points: args.signedPoints,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}
