-- Retained for migration-history compatibility. The auth_id column is created
-- idempotently by earlier migrations for both fresh and upgraded databases.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
