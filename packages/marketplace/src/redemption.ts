export type MarketplaceRedemptionStatus =
  "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";

const statusLabels: Record<MarketplaceRedemptionStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  FULFILLED: "Fulfilled",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function getRedemptionStatusLabel(status: MarketplaceRedemptionStatus) {
  return statusLabels[status];
}

export function canCancelRedemption(status: MarketplaceRedemptionStatus) {
  return status === "PENDING";
}

export function canReviewRedemption(status: MarketplaceRedemptionStatus) {
  return status === "PENDING";
}
