export interface PointsLedger {
  id: string; // UUID
  member_id: string;
  source_type: string;
  source_id: string | null;
  points: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}
