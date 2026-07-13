-- Migration: Add auth_id to members
-- Description: Links the public.members table to the Supabase auth.users table 

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Also issue a NOTIFY to reload the schema cache so postgREST picks up member_profiles and auth_id changes
NOTIFY pgrst, 'reload schema';
