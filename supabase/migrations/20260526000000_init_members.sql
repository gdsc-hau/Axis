-- Create members table with Privacy + Search optimizations
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,      -- Captured via Barcode (Private)
  email TEXT NOT NULL UNIQUE,           -- Manual Input (Public/Search)
  hau_id TEXT NOT NULL UNIQUE,          -- Displayed ID (e.g. GDG-HAU-26-0001)
  full_name TEXT NOT NULL,
  program TEXT NOT NULL,                -- BS IT, BS CS, etc.
  department TEXT NOT NULL,             -- SOC, SEA, etc.
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_members_student_id ON members(student_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
