export interface Event {
  id: string; // UUID
  title: string;
  description: string | null;
  location: string | null;
  luma_url: string | null;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  event_type: string | null;
  start_at: string | null;
  end_at: string | null;
  source_provider: "MANUAL" | "BEVY";
  source_event_id: string | null;
  source_chapter_id: string | null;
  source_url: string | null;
  image_url: string | null;
  source_status: "Draft" | "Published" | "Canceled" | null;
  source_updated_at: string | null;
  last_synced_at: string | null;
  source_payload_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventAttendance {
  id: string; // UUID
  event_id: string;
  member_id: string;
  status: string;
  checked_in_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}
