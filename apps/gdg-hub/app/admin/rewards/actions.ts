"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import {
  FulfillRewardRedemptionSchema,
  ReviewRewardRedemptionSchema,
} from "@hau/contracts";
import {
  fulfillMarketplaceRedemption,
  reviewMarketplaceRedemption,
} from "@hau/db";

function redemptionError(message: string) {
  if (message.includes("Only pending redemptions can be reviewed")) {
    return "This request has already moved beyond pending review.";
  }
  if (message.includes("Only approved redemptions can be fulfilled")) {
    return "Only an approved request can be marked fulfilled.";
  }
  if (message.includes("Redemption not found")) {
    return "This redemption no longer exists.";
  }
  if (message.toLowerCase().includes("operation key")) {
    return "This action conflicts with an earlier submission. Refresh and try again.";
  }
  return "The redemption could not be updated.";
}

function revalidateRedemptions() {
  revalidatePath("/admin/rewards");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  revalidatePath("/member/rewards");
  revalidatePath("/member/wallet");
}

export async function reviewRedemption(formData: FormData) {
  const parsed = ReviewRewardRedemptionSchema.safeParse({
    redemptionId: formData.get("redemptionId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") || undefined,
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid review." };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const { data, error } = await reviewMarketplaceRedemption({
    ...parsed.data,
    reason: parsed.data.reason || null,
  });
  if (error || !data) {
    return { error: redemptionError(error?.message ?? "Unknown error") };
  }

  revalidateRedemptions();
  return { success: true, status: data.status };
}

export async function fulfillRedemption(formData: FormData) {
  const parsed = FulfillRewardRedemptionSchema.safeParse({
    redemptionId: formData.get("redemptionId"),
    note: formData.get("note") || undefined,
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid fulfillment.",
    };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const { data, error } = await fulfillMarketplaceRedemption({
    ...parsed.data,
    note: parsed.data.note || null,
  });
  if (error || !data) {
    return { error: redemptionError(error?.message ?? "Unknown error") };
  }

  revalidateRedemptions();
  return { success: true, status: data.status };
}
