-- Migration: Merge Profiles to Members
-- Description: Flattens the database structure by moving profile fields into the members table and dropping member_profiles

-- 1. Add profile columns to members table
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS links JSONB,
  ADD COLUMN IF NOT EXISTS status_message TEXT;

-- 2. Data migration skipped.
-- We are skipping data migration because the member_profiles table is empty and has schema mismatches (member_id vs memberId).

-- 3. Drop the old member_profiles table
DROP TABLE IF EXISTS public.member_profiles CASCADE;

-- 4. Reload schema cache for postgREST
NOTIFY pgrst, 'reload schema';
