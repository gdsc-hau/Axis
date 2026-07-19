-- Migration: Add auth_id to members
-- Description: Links the public.members table to the Supabase auth.users table 

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Reload the PostgREST schema cache after the column change.
NOTIFY pgrst, 'reload schema';
