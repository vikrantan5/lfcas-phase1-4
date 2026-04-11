-- ============================================
-- COMPLETE RLS POLICY FIX FOR LFCAS
-- This ensures the backend service can perform all operations
-- ============================================

-- ============= DISABLE THEN RE-ENABLE RLS WITH PROPER POLICIES =============

-- For development/testing: Temporarily disable RLS on all tables
-- IMPORTANT: Only use this in development. In production, use proper policies
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE advocates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE hearings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ratings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE groq_ai_logs DISABLE ROW LEVEL SECURITY;

-- ============= OR: FIX POLICIES TO ALLOW BACKEND ACCESS =============
-- This is the recommended approach for production

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Service role full access users" ON users;
DROP POLICY IF EXISTS "Service role full access advocates" ON advocates;
DROP POLICY IF EXISTS "Service role full access cases" ON cases;
DROP POLICY IF EXISTS "Service role full access hearings" ON hearings;
DROP POLICY IF EXISTS "Service role full access documents" ON documents;
DROP POLICY IF EXISTS "Service role full access messages" ON messages;
DROP POLICY IF EXISTS "Service role full access notifications" ON notifications;
DROP POLICY IF EXISTS "Service role full access ratings" ON ratings;
DROP POLICY IF EXISTS "Service role full access admin_logs" ON admin_logs;
DROP POLICY IF EXISTS "Service role full access groq_logs" ON groq_ai_logs;

-- Drop any anon/authenticated role policies that might exist
DROP POLICY IF EXISTS "Backend API full access users" ON users;
DROP POLICY IF EXISTS "Backend API full access advocates" ON advocates;
DROP POLICY IF EXISTS "Backend API full access cases" ON cases;
DROP POLICY IF EXISTS "Backend API full access hearings" ON hearings;
DROP POLICY IF EXISTS "Backend API full access documents" ON documents;
DROP POLICY IF EXISTS "Backend API full access messages" ON messages;
DROP POLICY IF EXISTS "Backend API full access notifications" ON notifications;
DROP POLICY IF EXISTS "Backend API full access ratings" ON ratings;
DROP POLICY IF EXISTS "Backend API full access admin_logs" ON admin_logs;
DROP POLICY IF EXISTS "Backend API full access groq_logs" ON groq_ai_logs;

-- Create NEW policies that allow backend (service_role) full access
-- USERS
CREATE POLICY "Backend full access users"
ON users FOR ALL
USING (true)
WITH CHECK (true);

-- ADVOCATES
CREATE POLICY "Backend full access advocates"
ON advocates FOR ALL
USING (true)
WITH CHECK (true);

-- CASES
CREATE POLICY "Backend full access cases"
ON cases FOR ALL
USING (true)
WITH CHECK (true);

-- HEARINGS
CREATE POLICY "Backend full access hearings"
ON hearings FOR ALL
USING (true)
WITH CHECK (true);

-- DOCUMENTS
CREATE POLICY "Backend full access documents"
ON documents FOR ALL
USING (true)
WITH CHECK (true);

-- MESSAGES
CREATE POLICY "Backend full access messages"
ON messages FOR ALL
USING (true)
WITH CHECK (true);

-- NOTIFICATIONS (This is the critical one causing the error)
CREATE POLICY "Backend full access notifications"
ON notifications FOR ALL
USING (true)
WITH CHECK (true);

-- RATINGS
CREATE POLICY "Backend full access ratings"
ON ratings FOR ALL
USING (true)
WITH CHECK (true);

-- ADMIN LOGS
CREATE POLICY "Backend full access admin_logs"
ON admin_logs FOR ALL
USING (true)
WITH CHECK (true);

-- GROQ AI LOGS
CREATE POLICY "Backend full access groq_logs"
ON groq_ai_logs FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'advocates', 'cases', 'hearings', 'documents', 'messages', 'notifications', 'ratings', 'admin_logs', 'groq_ai_logs');
