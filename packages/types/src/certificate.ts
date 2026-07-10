export interface Certificate {
  id: string; // UUID
  member_id: string;
  event_id: string | null;
  title: string;
  certificate_number: string;
  pdf_url: string | null;
  status: string;
  issued_at: string;
  created_at: string;
}
