-- ============================================
-- LFCAS CRITICAL SCHEMA FIX MIGRATION
-- This fixes all database schema mismatches
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add missing 'current_stage' column to cases table
-- The backend code uses 'current_stage' but DB only has 'stage'
ALTER TABLE cases ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'INITIATED';

-- Step 2: Copy existing 'stage' values to 'current_stage' for data consistency
UPDATE cases SET current_stage = stage WHERE current_stage IS NULL OR current_stage = '';

-- Step 3: Create meetings table (referenced in backend but doesn't exist)
CREATE TABLE IF NOT EXISTS meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_request_id UUID REFERENCES meeting_requests(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) NOT NULL,
    advocate_id UUID REFERENCES users(id) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    meeting_mode VARCHAR(20) DEFAULT 'online' CHECK (meeting_mode IN ('online', 'in_person')),
    meeting_link TEXT,
    meeting_location TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'completed', 'cancelled', 'no_show')
    ),
    advocate_decision VARCHAR(20) DEFAULT 'pending' CHECK (
        advocate_decision IN ('pending', 'accepted', 'rejected')
    ),
    decision_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add indexes for meetings table
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_request_id ON meetings(meeting_request_id);
CREATE INDEX IF NOT EXISTS idx_meetings_client_id ON meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_advocate_id ON meetings(advocate_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_date ON meetings(scheduled_date);

-- Step 5: Add updated_at trigger for meetings
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Fix advocates table schema mismatch
-- Backend expects 'specialization' but 001_initial.sql has 'specializations'
ALTER TABLE advocates RENAME COLUMN specializations TO specialization;

-- Step 7: Add missing 'status' column to advocates table if using SQL.sql schema
ALTER TABLE advocates ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending_approval' 
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'suspended'));

-- Step 8: Add meeting_id to cases table (backend expects it)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

-- Step 9: RLS Policies for meetings table
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Allow backend (service role) full access
CREATE POLICY "Backend full access meetings"
ON meetings FOR ALL
USING (true)
WITH CHECK (true);

-- Step 10: Update RLS policies for better compatibility
-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Service role full access advocates" ON advocates;
DROP POLICY IF EXISTS "Service role full access cases" ON cases;
DROP POLICY IF EXISTS "Service role full access meeting_requests" ON meeting_requests;

-- Create universal backend access policies
CREATE POLICY "Backend full access advocates"
ON advocates FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Backend full access cases"
ON cases FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Backend full access meeting_requests"
ON meeting_requests FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if current_stage column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cases' AND column_name IN ('stage', 'current_stage');

-- Check if meetings table was created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'meetings';

-- Check advocates table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advocates' AND column_name IN ('specialization', 'specializations', 'status');

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('meetings', 'advocates', 'cases', 'meeting_requests')
ORDER BY tablename;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ LFCAS Schema Migration Complete!';
    RAISE NOTICE '✅ Added current_stage column to cases table';
    RAISE NOTICE '✅ Created meetings table';
    RAISE NOTICE '✅ Fixed advocates table schema';
    RAISE NOTICE '✅ Updated RLS policies';
    RAISE NOTICE '🚀 Your backend should now work without 500 errors!';
END $$;
