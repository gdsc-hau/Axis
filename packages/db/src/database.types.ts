export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      members: Table<{
        id: string; auth_id: string | null; student_id: string; gdg_id: string; full_name: string;
        email: string; program: string; department: string; role: 'MEMBER' | 'ADMIN'; is_accepted: boolean;
        bio: string | null; phone_number: string | null; links: Json | null; status_message: string | null;
        created_at: string; updated_at: string;
      }, {
        id?: string; auth_id?: string | null; student_id: string; gdg_id: string; full_name: string;
        email: string; program: string; department: string; role?: 'MEMBER' | 'ADMIN'; is_accepted?: boolean;
        bio?: string | null; phone_number?: string | null; links?: Json | null; status_message?: string | null;
        created_at?: string; updated_at?: string;
      }>;
      events: Table<{
        id: string; title: string; description: string | null; location: string | null; luma_url: string | null;
        status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'; event_type: string | null;
        start_at: string | null; end_at: string | null; created_at: string; updated_at: string;
      }, {
        id?: string; title: string; description?: string | null; location?: string | null; luma_url?: string | null;
        status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'; event_type?: string | null;
        start_at?: string | null; end_at?: string | null; created_at?: string; updated_at?: string;
      }>;
      event_attendance: Table<{
        id: string; event_id: string; member_id: string; status: 'REGISTERED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW';
        checked_in_at: string | null; confirmed_by: string | null; created_at: string; updated_at: string;
      }, {
        id?: string; event_id: string; member_id: string; status?: 'REGISTERED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW';
        checked_in_at?: string | null; confirmed_by?: string | null; created_at?: string; updated_at?: string;
      }>;
      points_ledger: Table<{
        id: string; member_id: string; source_type: string; source_id: string | null; points: number;
        balance_after: number; note: string | null; created_at: string;
      }, {
        id?: string; member_id: string; source_type: string; source_id?: string | null; points: number;
        balance_after: number; note?: string | null; created_at?: string;
      }>;
      badges: Table<{
        id: string; slug: string; name: string; description: string | null; active: boolean; created_at: string;
      }, { id?: string; slug: string; name: string; description?: string | null; active?: boolean; created_at?: string }>;
      member_badges: Table<{
        id: string; member_id: string; badge_id: string; earned_at: string;
      }, { id?: string; member_id: string; badge_id: string; earned_at?: string }>;
      certificates: Table<{
        id: string; member_id: string; event_id: string | null; title: string; certificate_number: string;
        pdf_url: string | null; status: string; issued_at: string; created_at: string;
      }, {
        id?: string; member_id: string; event_id?: string | null; title: string; certificate_number: string;
        pdf_url?: string | null; status?: string; issued_at?: string; created_at?: string;
      }>;
      redemptions: Table<{
        id: string; member_id: string; status: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED';
        total_cost: number; approved_by: string | null; fulfilled_at: string | null; created_at: string;
      }, {
        id?: string; member_id: string; status?: 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED';
        total_cost: number; approved_by?: string | null; fulfilled_at?: string | null; created_at?: string;
      }>;
      notifications: Table<{
        id: string; member_id: string; type: string; message: string; related_id: string | null; read: boolean; created_at: string;
      }, { id?: string; member_id: string; type: string; message: string; related_id?: string | null; read?: boolean; created_at?: string }>;
      id_qr_codes: Table<{
        id: string; member_id: string; qr_value: string; expires_at: string; is_active: boolean; created_at: string;
      }, { id?: string; member_id: string; qr_value: string; expires_at: string; is_active?: boolean; created_at?: string }>;
      member_credentials: Table<{
        id: string; member_id: string; credential_type: string; credential_number: string | null; issued_at: string | null;
        expires_at: string | null; status: string; created_at: string; updated_at: string;
      }, {
        id?: string; member_id: string; credential_type: string; credential_number?: string | null; issued_at?: string | null;
        expires_at?: string | null; status?: string; created_at?: string; updated_at?: string;
      }>;
      member_verifications: Table<{
        id: string; member_id: string; verified_by: string | null; verification_type: string; notes: string | null; created_at: string;
      }, { id?: string; member_id: string; verified_by?: string | null; verification_type: string; notes?: string | null; created_at?: string }>;
      verification_logs: Table<{
        id: string; member_id: string; verified_by: string; action: string; metadata: Json | null; created_at: string;
      }, { id?: string; member_id: string; verified_by: string; action: string; metadata?: Json | null; created_at?: string }>;
      app_settings: Table<{
        id: string; key: string; value: Json; updated_at: string;
      }, { id?: string; key: string; value: Json; updated_at?: string }>;
      audit_logs: Table<{
        id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null;
        metadata: Json | null; created_at: string;
      }, {
        id?: string; actor_id?: string | null; action: string; entity_type: string; entity_id?: string | null;
        metadata?: Json | null; created_at?: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      award_points: {
        Args: { p_member_id: string; p_points: number; p_source_type: string; p_source_id?: string; p_note?: string };
        Returns: Database['public']['Tables']['points_ledger']['Row'];
      };
      confirm_event_attendance: {
        Args: { p_event_id: string; p_member_id: string };
        Returns: Database['public']['Tables']['event_attendance']['Row'];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
