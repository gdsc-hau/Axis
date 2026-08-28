export type RedemptionStatus =
  "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";

export interface Reward {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointCost: number;
  stockQuantity: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Redemption {
  id: string;
  memberId: string;
  rewardId: string;
  status: RedemptionStatus;
  quantity: number;
  unitCost: number;
  totalCost: number;
  approvedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  fulfilledBy: string | null;
  fulfilledAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}
