import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type MarketplaceRewardRow =
  Database["public"]["Tables"]["rewards"]["Row"];
export type MarketplaceRedemptionRow =
  Database["public"]["Tables"]["redemptions"]["Row"];
export type RedemptionStatusHistoryRow =
  Database["public"]["Tables"]["redemption_status_history"]["Row"];

export type MemberMarketplaceRedemption = MarketplaceRedemptionRow & {
  reward: MarketplaceRewardRow | null;
};

export type AdminMarketplaceRedemption = MemberMarketplaceRedemption & {
  member: {
    id: string;
    full_name: string;
    email: string;
    gdg_id: string;
  } | null;
};

const rewardColumns =
  "id, slug, name, description, image_url, point_cost, stock_quantity, active, sort_order, created_by, updated_by, created_at, updated_at";
const redemptionColumns =
  "id, member_id, reward_id, status, quantity, unit_cost, total_cost, request_operation_key, debit_ledger_id, refund_ledger_id, approved_by, reviewed_by, reviewed_at, rejection_reason, cancellation_reason, fulfilled_by, fulfilled_at, created_at, updated_at";

export async function listMemberMarketplaceRewards() {
  const supabase = await createServerClientInstance();
  return supabase
    .from("rewards")
    .select(rewardColumns)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function listAdminMarketplaceRewards() {
  const supabase = await createServerClientInstance();
  return supabase
    .from("rewards")
    .select(rewardColumns)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

async function rewardsById(rewardIds: string[]) {
  if (!rewardIds.length) return new Map<string, MarketplaceRewardRow>();
  const supabase = await createServerClientInstance();
  const { data } = await supabase
    .from("rewards")
    .select(rewardColumns)
    .in("id", rewardIds);
  return new Map(
    ((data ?? []) as MarketplaceRewardRow[]).map((reward) => [
      reward.id,
      reward,
    ]),
  );
}

export async function listCurrentMemberRedemptions(limit = 50) {
  const supabase = await createServerClientInstance();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const { data: memberId, error: memberError } =
    await supabase.rpc("current_member_id");

  if (memberError || !memberId) {
    return {
      data: [] as MemberMarketplaceRedemption[],
      error: memberError ?? new Error("Active member was not found."),
    };
  }

  const { data, error } = await supabase
    .from("redemptions")
    .select(redemptionColumns)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error || !data?.length) {
    return { data: [] as MemberMarketplaceRedemption[], error };
  }

  const rows = data as MarketplaceRedemptionRow[];
  const rewardMap = await rewardsById(
    Array.from(new Set(rows.map((redemption) => redemption.reward_id))),
  );

  return {
    data: rows.map((redemption) => ({
      ...redemption,
      reward: rewardMap.get(redemption.reward_id) ?? null,
    })),
    error: null,
  };
}

export async function listAdminMarketplaceRedemptions(limit = 100) {
  const supabase = await createServerClientInstance();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const { data, error } = await supabase
    .from("redemptions")
    .select(redemptionColumns)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error || !data?.length) {
    return { data: [] as AdminMarketplaceRedemption[], error };
  }

  const rows = data as MarketplaceRedemptionRow[];
  const memberIds = Array.from(
    new Set(rows.map((redemption) => redemption.member_id)),
  );
  const rewardIds = Array.from(
    new Set(rows.map((redemption) => redemption.reward_id)),
  );

  const [{ data: members, error: memberError }, rewardMap] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, email, gdg_id")
      .in("id", memberIds),
    rewardsById(rewardIds),
  ]);

  if (memberError) {
    return { data: [] as AdminMarketplaceRedemption[], error: memberError };
  }

  const memberMap = new Map(
    (members ?? []).map((member) => [member.id, member]),
  );
  return {
    data: rows.map((redemption) => ({
      ...redemption,
      reward: rewardMap.get(redemption.reward_id) ?? null,
      member: memberMap.get(redemption.member_id) ?? null,
    })),
    error: null,
  };
}

export async function createMarketplaceReward(args: {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointCost: number;
  stockQuantity: number;
  active: boolean;
  sortOrder: number;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("create_marketplace_reward", {
    p_slug: args.slug,
    p_name: args.name,
    p_description: args.description,
    p_image_url: args.imageUrl,
    p_point_cost: args.pointCost,
    p_stock_quantity: args.stockQuantity,
    p_active: args.active,
    p_sort_order: args.sortOrder,
  });
}

export async function updateMarketplaceReward(args: {
  rewardId: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointCost: number;
  stockQuantity: number;
  active: boolean;
  sortOrder: number;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("update_marketplace_reward", {
    p_reward_id: args.rewardId,
    p_slug: args.slug,
    p_name: args.name,
    p_description: args.description,
    p_image_url: args.imageUrl,
    p_point_cost: args.pointCost,
    p_stock_quantity: args.stockQuantity,
    p_active: args.active,
    p_sort_order: args.sortOrder,
  });
}

export async function requestMarketplaceRedemption(args: {
  rewardId: string;
  quantity: number;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("request_reward_redemption", {
    p_reward_id: args.rewardId,
    p_quantity: args.quantity,
    p_operation_key: args.operationKey,
  });
}

export async function cancelMarketplaceRedemption(args: {
  redemptionId: string;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("cancel_reward_redemption", {
    p_redemption_id: args.redemptionId,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function reviewMarketplaceRedemption(args: {
  redemptionId: string;
  decision: "APPROVE" | "REJECT";
  reason: string | null;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("review_reward_redemption", {
    p_redemption_id: args.redemptionId,
    p_decision: args.decision,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function fulfillMarketplaceRedemption(args: {
  redemptionId: string;
  note: string | null;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("fulfill_reward_redemption", {
    p_redemption_id: args.redemptionId,
    p_note: args.note,
    p_operation_key: args.operationKey,
  });
}
