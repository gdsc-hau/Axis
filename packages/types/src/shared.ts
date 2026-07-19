export interface Notification {
  id: string; // UUID
  member_id: string;
  type: string;
  message: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string; // UUID
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}
