import type { MarketplaceRedemptionStatus } from "./redemption";

export function canFulfillRedemption(status: MarketplaceRedemptionStatus) {
  return status === "APPROVED";
}

export function isRedemptionClosed(status: MarketplaceRedemptionStatus) {
  return ["FULFILLED", "REJECTED", "CANCELLED"].includes(status);
}
