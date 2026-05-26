-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hau_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  course TEXT NOT NULL,
  year_level INTEGER NOT NULL CHECK (year_level >= 1 AND year_level <= 5),
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for hau_id for faster searches
CREATE INDEX IF NOT EXISTS idx_members_hau_id ON members(hau_id);
