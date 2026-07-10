export interface Badge {
  id: string; // UUID
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface MemberBadge {
  id: string; // UUID
  member_id: string;
  badge_id: string;
  earned_at: string;
}
