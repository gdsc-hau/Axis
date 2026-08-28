export type BadgeAwardStatus = "AWARDED" | "REVOKED";
export type BadgeAwardSource = "MANUAL" | "EVENT_ATTENDANCE";

export function getBadgeAwardStatusLabel(status: BadgeAwardStatus) {
  return status === "AWARDED" ? "Awarded" : "Revoked";
}

export function getBadgeAwardSourceLabel(source: BadgeAwardSource) {
  return source === "EVENT_ATTENDANCE"
    ? "Confirmed attendance"
    : "Manual award";
}
