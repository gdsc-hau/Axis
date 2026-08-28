import type { GyrocoinAdjustmentKind } from "@hau/contracts";

export const MAX_GYROCOIN_ADJUSTMENT = 1_000_000;

export function toSignedGyrocoinAmount(
  adjustmentKind: GyrocoinAdjustmentKind,
  amount: number,
) {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new RangeError("Gyrocoin amount must be a positive whole number.");
  }
  if (amount > MAX_GYROCOIN_ADJUSTMENT) {
    throw new RangeError(
      `Gyrocoin amount must not exceed ${MAX_GYROCOIN_ADJUSTMENT}.`,
    );
  }

  return adjustmentKind === "DEDUCT" ? -amount : amount;
}

export function canApplyGyrocoinAdjustment(
  currentBalance: number,
  signedAmount: number,
) {
  return (
    Number.isSafeInteger(currentBalance) &&
    Number.isSafeInteger(signedAmount) &&
    signedAmount !== 0 &&
    currentBalance + signedAmount >= 0
  );
}
