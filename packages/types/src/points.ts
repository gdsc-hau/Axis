export interface PointsLedger {
  id: string; // UUID
  ledger_sequence: number;
  member_id: string;
  source_type: string;
  source_id: string;
  points: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}
