export type RewardAvailability = "AVAILABLE" | "SOLD_OUT" | "INACTIVE";

export function getRewardAvailability(reward: {
  active: boolean;
  stock_quantity: number;
}): RewardAvailability {
  if (!reward.active) return "INACTIVE";
  return reward.stock_quantity > 0 ? "AVAILABLE" : "SOLD_OUT";
}

export function getRewardMaxAffordableQuantity(
  balance: number,
  pointCost: number,
  stockQuantity: number,
) {
  if (balance < 0 || pointCost <= 0 || stockQuantity <= 0) return 0;
  return Math.min(Math.floor(balance / pointCost), stockQuantity, 100);
}

export function canRedeemReward(
  balance: number,
  reward: { active: boolean; point_cost: number; stock_quantity: number },
  quantity: number,
) {
  return (
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 100 &&
    getRewardAvailability(reward) === "AVAILABLE" &&
    reward.stock_quantity >= quantity &&
    balance >= reward.point_cost * quantity
  );
}
