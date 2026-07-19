export interface Member {
  id: string; // UUID
  auth_id: string | null;
  student_id: string;
  gdg_id: string;
  full_name: string;
  email: string;
  program: string;
  department: string;
  role: string;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberProfile {
  /** @deprecated Profile fields now live directly on Member. */
  id: string;
  bio: string | null;
  phone_number: string | null;
  links: Record<string, string> | null;
  status_message: string | null;
  updated_at: string;
}

export interface MemberCredential {
  id: string; // UUID
  member_id: string;
  credential_type: string;
  credential_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MemberVerification {
  id: string; // UUID
  member_id: string;
  verified_by: string | null;
  verification_type: string;
  notes: string | null;
  created_at: string;
}

export interface IdQrCode {
  id: string; // UUID
  member_id: string;
  qr_value: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface VerificationLog {
  id: string; // UUID
  member_id: string;
  verified_by: string;
  action: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AppSetting {
  id: string; // UUID
  key: string;
  value: Record<string, any>;
  updated_at: string;
}
