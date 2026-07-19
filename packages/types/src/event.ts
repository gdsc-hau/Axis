export interface Event {
  id: string; // UUID
  title: string;
  description: string | null;
  location: string | null;
  luma_url: string | null;
  status: string;
  event_type: string | null;
  start_at: string | null;
  end_at: string | null;
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
