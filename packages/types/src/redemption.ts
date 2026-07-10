export interface Redemption {
  id: string; // UUID
  member_id: string;
  status: string;
  total_cost: number;
  approved_by: string | null;
  fulfilled_at: string | null;
  created_at: string;
}
