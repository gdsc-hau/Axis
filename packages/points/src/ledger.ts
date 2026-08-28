import type { GyrocoinSourceType } from "@hau/contracts";

export type GyrocoinDirection = "CREDIT" | "DEBIT";

const sourceLabels: Record<GyrocoinSourceType, string> = {
  MANUAL_AWARD: "Manual award",
  MANUAL_DEDUCTION: "Manual deduction",
  EVENT_ATTENDANCE: "Event attendance",
  EVENT_ATTENDANCE_REVERSAL: "Attendance correction",
  MARKETPLACE_REDEMPTION: "Reward redemption",
  MARKETPLACE_REFUND: "Redemption refund",
};

export function getGyrocoinSourceLabel(sourceType: GyrocoinSourceType) {
  return sourceLabels[sourceType];
}

export function getGyrocoinDirection(points: number): GyrocoinDirection {
  return points < 0 ? "DEBIT" : "CREDIT";
}

export function formatGyrocoins(points: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(points);
}

export function formatSignedGyrocoins(points: number) {
  const sign = points > 0 ? "+" : "";
  return `${sign}${formatGyrocoins(points)}`;
}
