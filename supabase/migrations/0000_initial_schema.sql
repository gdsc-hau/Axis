-- Standardized Database Schema for GDG Hub & GDG ID (snake_case)

-- Function to automatically update 'updated_at' column
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Members (Identity Core)
-- Note: the 'members' table already exists in the live database. 
-- We alter it to match the new schema structure smoothly.

ALTER TABLE IF EXISTS members 
  RENAME COLUMN hau_id TO gdg_id;

-- Add new columns safely
ALTER TABLE IF EXISTS members 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'MEMBER',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Attempt to link id to auth.users if not already linked (may fail if auth.users doesn't exist yet in local setup, so we wrap it or ignore it for now. Supabase handles this via UI easily)
-- ALTER TABLE IF EXISTS members ADD CONSTRAINT members_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON members FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 2. Member Profiles
CREATE TABLE IF NOT EXISTS member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  bio TEXT,
  phone_number TEXT,
  links JSONB, -- stores { github: "...", linkedin: "..." }
  status_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_member_profiles_updated_at ON member_profiles;
CREATE TRIGGER update_member_profiles_updated_at
BEFORE UPDATE ON member_profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 3. Member Credentials
CREATE TABLE IF NOT EXISTS member_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, -- e.g. 'STUDENT_ID', 'GOVERNMENT_ID'
  credential_number TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_member_credentials_updated_at ON member_credentials;
CREATE TRIGGER update_member_credentials_updated_at
BEFORE UPDATE ON member_credentials FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 4. Member Verifications
CREATE TABLE IF NOT EXISTS member_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES members(id) ON DELETE SET NULL,
  verification_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ID QR Codes
CREATE TABLE IF NOT EXISTS id_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  qr_value TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Verification Logs
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 8. Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  luma_url TEXT,
  status TEXT DEFAULT 'DRAFT',
  event_type TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 9. Event Attendance
CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'REGISTERED',
  checked_in_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

DROP TRIGGER IF EXISTS update_event_attendance_updated_at ON event_attendance;
CREATE TRIGGER update_event_attendance_updated_at
BEFORE UPDATE ON event_attendance FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 10. Points Ledger
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- e.g. 'EVENT_ATTENDANCE', 'MANUAL'
  source_id TEXT,
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Member Badges
CREATE TABLE IF NOT EXISTS member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, badge_id)
);

-- 13. Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  status TEXT DEFAULT 'ISSUED',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Redemptions
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING',
  total_cost INTEGER NOT NULL,
  approved_by UUID REFERENCES members(id) ON DELETE SET NULL,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Notifications (Shared)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Audit Logs (Shared)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES members(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
