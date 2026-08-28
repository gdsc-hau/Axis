"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import { AdminGyrocoinAdjustmentSchema } from "@hau/contracts";
import { adjustMemberGyrocoins } from "@hau/db";
import { toSignedGyrocoinAmount } from "@hau/points";

export async function adjustGyrocoins(formData: FormData) {
  const parsed = AdminGyrocoinAdjustmentSchema.safeParse({
    memberId: formData.get("memberId"),
    adjustmentKind: formData.get("adjustmentKind"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid Gyrocoin adjustment.",
    };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const signedPoints = toSignedGyrocoinAmount(
    parsed.data.adjustmentKind,
    parsed.data.amount,
  );
  const { data, error } = await adjustMemberGyrocoins({
    memberId: parsed.data.memberId,
    signedPoints,
    reason: parsed.data.reason,
    operationKey: parsed.data.operationKey,
  });

  if (error) {
    if (error.message.includes("Insufficient Gyrocoin balance")) {
      return { error: "This deduction would make the balance negative." };
    }
    if (error.message.includes("Active member not found")) {
      return { error: "The selected member is no longer active." };
    }
    if (
      error.message.includes("Operation key") ||
      error.message.includes("operation key")
    ) {
      return {
        error:
          "This adjustment request conflicts with an earlier submission. Refresh and try again.",
      };
    }
    return { error: "The Gyrocoin adjustment could not be recorded." };
  }

  revalidatePath("/admin/gyrocoins");
  revalidatePath("/member/wallet");
  revalidatePath("/member/leaderboard");

  return {
    success: true,
    memberId: parsed.data.memberId,
    balanceAfter: data.balance_after,
  };
}
