"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import {
  CreateMarketplaceRewardSchema,
  UpdateMarketplaceRewardSchema,
} from "@hau/contracts";
import { createMarketplaceReward, updateMarketplaceReward } from "@hau/db";

function rewardFields(formData: FormData) {
  return {
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    pointCost: formData.get("pointCost"),
    stockQuantity: formData.get("stockQuantity"),
    active: formData.get("active") === "on",
    sortOrder: formData.get("sortOrder"),
  };
}

function catalogError(message: string) {
  if (
    message.includes("rewards_slug_key") ||
    message.includes("duplicate key")
  ) {
    return "Another reward already uses this slug.";
  }
  if (message.includes("Available plus reserved stock")) {
    return "Available stock plus outstanding reservations exceeds the supported limit.";
  }
  if (message.includes("Reward not found")) {
    return "This reward no longer exists.";
  }
  return "The reward catalog could not be updated.";
}

function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/rewards");
  revalidatePath("/member/rewards");
}

export async function createReward(formData: FormData) {
  const parsed = CreateMarketplaceRewardSchema.safeParse(
    rewardFields(formData),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reward." };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const { data, error } = await createMarketplaceReward(parsed.data);
  if (error || !data) {
    return { error: catalogError(error?.message ?? "Unknown error") };
  }

  revalidateCatalog();
  return { success: true, rewardId: data.id };
}

export async function updateReward(formData: FormData) {
  const parsed = UpdateMarketplaceRewardSchema.safeParse({
    ...rewardFields(formData),
    rewardId: formData.get("rewardId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reward." };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const { data, error } = await updateMarketplaceReward(parsed.data);
  if (error || !data) {
    return { error: catalogError(error?.message ?? "Unknown error") };
  }

  revalidateCatalog();
  return { success: true, rewardId: data.id };
}
