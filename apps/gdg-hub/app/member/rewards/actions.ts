"use server";

import { revalidatePath } from "next/cache";
import { getActiveMember } from "@hau/auth";
import {
  CancelRewardRedemptionSchema,
  RequestRewardRedemptionSchema,
} from "@hau/contracts";
import {
  cancelMarketplaceRedemption,
  requestMarketplaceRedemption,
} from "@hau/db";

function marketplaceError(message: string) {
  if (message.includes("Insufficient Gyrocoin balance")) {
    return "Your wallet does not have enough Gyrocoins for this reward.";
  }
  if (message.includes("Insufficient reward stock")) {
    return "The requested quantity is no longer in stock.";
  }
  if (message.includes("Active reward not found")) {
    return "This reward is no longer available.";
  }
  if (message.includes("Only pending redemptions can be cancelled")) {
    return "This redemption can no longer be cancelled.";
  }
  if (message.toLowerCase().includes("operation key")) {
    return "This request conflicts with an earlier submission. Refresh and try again.";
  }
  return "The reward request could not be completed.";
}

function revalidateMarketplace() {
  revalidatePath("/member/rewards");
  revalidatePath("/member/wallet");
  revalidatePath("/admin/rewards");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}

export async function requestRewardRedemption(formData: FormData) {
  const parsed = RequestRewardRedemptionSchema.safeParse({
    rewardId: formData.get("rewardId"),
    quantity: formData.get("quantity"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid reward request.",
    };
  }

  const access = await getActiveMember();
  if (!access) return { error: "Active member access required." };

  const { data, error } = await requestMarketplaceRedemption(parsed.data);
  if (error || !data) {
    return { error: marketplaceError(error?.message ?? "Unknown error") };
  }

  revalidateMarketplace();
  return { success: true, redemptionId: data.id };
}

export async function cancelRewardRedemption(formData: FormData) {
  const parsed = CancelRewardRedemptionSchema.safeParse({
    redemptionId: formData.get("redemptionId"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid cancellation request.",
    };
  }

  const access = await getActiveMember();
  if (!access) return { error: "Active member access required." };

  const { data, error } = await cancelMarketplaceRedemption(parsed.data);
  if (error || !data) {
    return { error: marketplaceError(error?.message ?? "Unknown error") };
  }

  revalidateMarketplace();
  return { success: true };
}
