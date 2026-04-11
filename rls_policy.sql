-- ============================================
-- RLS POLICY FIX for LFCAS
-- Run this in Supabase SQL Editor to fix advocate profile and case creation
-- ============================================

-- ============= ADVOCATES TABLE POLICIES =============

-- Allow users to create their own advocate profile
CREATE POLICY "Users can create own advocate profile" ON advocates
    FOR INSERT 
    WITH CHECK (
        auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
    );

-- Allow users to view their own advocate profile
CREATE POLICY "Users can view own advocate profile" ON advocates
    FOR SELECT 
    USING (
        auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
    );

-- Allow users to update their own advocate profile
CREATE POLICY "Users can update own advocate profile" ON advocates
    FOR UPDATE 
    USING (
        auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
    );

-- Allow anyone to view approved advocates (for selection)
CREATE POLICY "Anyone can view approved advocates" ON advocates
    FOR SELECT 
    USING (status = 'approved');


-- ============= CASES TABLE POLICIES =============

-- Allow clients to create cases
CREATE POLICY "Clients can create own cases" ON cases
    FOR INSERT 
    WITH CHECK (
        auth.uid() = (SELECT auth_user_id FROM users WHERE id = client_id)
    );

-- Allow clients to view their own cases
CREATE POLICY "Clients can view own cases" ON cases
    FOR SELECT 
    USING (
        auth.uid() = (SELECT auth_user_id FROM users WHERE id = client_id)
    );

-- Allow advocates to view their assigned cases
CREATE POLICY "Advocates can view assigned cases" ON cases
    FOR SELECT 
    USING (
        advocate_id IN (
            SELECT a.id FROM advocates a 
            JOIN users u ON a.user_id = u.id 
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Allow clients to update their own cases
CREATE POLICY "Clients can update own cases" ON cases
    FOR UPDATE 
    USING (
        auth.uid() = (SELECT auth_user_id FROM users WHERE id = client_id)
    );

-- Allow advocates to update their assigned cases
CREATE POLICY "Advocates can update assigned cases" ON cases
    FOR UPDATE 
    USING (
        advocate_id IN (
            SELECT a.id FROM advocates a 
            JOIN users u ON a.user_id = u.id 
            WHERE u.auth_user_id = auth.uid()
        )
    );


-- ============= HEARINGS TABLE POLICIES =============

-- Allow advocates to create hearings for their cases
CREATE POLICY "Advocates can create hearings for their cases" ON hearings
    FOR INSERT 
    WITH CHECK (
        case_id IN (
            SELECT c.id FROM cases c
            JOIN advocates a ON c.advocate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Allow clients and advocates to view hearings for their cases
CREATE POLICY "Users can view hearings for their cases" ON hearings
    FOR SELECT 
    USING (
        case_id IN (
            SELECT id FROM cases WHERE client_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
        OR
        case_id IN (
            SELECT c.id FROM cases c
            JOIN advocates a ON c.advocate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Allow advocates to update hearings for their cases
CREATE POLICY "Advocates can update hearings for their cases" ON hearings
    FOR UPDATE 
    USING (
        case_id IN (
            SELECT c.id FROM cases c
            JOIN advocates a ON c.advocate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );


-- ============= DOCUMENTS TABLE POLICIES =============

-- Allow users to upload documents to their cases
CREATE POLICY "Users can upload documents to their cases" ON documents
    FOR INSERT 
    WITH CHECK (
        case_id IN (
            SELECT id FROM cases WHERE client_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
        OR
        case_id IN (
            SELECT c.id FROM cases c
            JOIN advocates a ON c.advocate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Allow users to view documents for their cases
CREATE POLICY "Users can view documents for their cases" ON documents
    FOR SELECT 
    USING (
        case_id IN (
            SELECT id FROM cases WHERE client_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
        OR
        case_id IN (
            SELECT c.id FROM cases c
            JOIN advocates a ON c.advocate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );


-- ============= MESSAGES TABLE POLICIES =============

-- Allow users to send messages in their cases
CREATE POLICY "Users can send messages in their cases" ON messages
    FOR INSERT 
    WITH CHECK (
        case_id IN (
            SELECT id FROM cases WHERE client_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
        )
        OR
        case_id IN (
            SELECT c.id FROM cases c
            JOIN advocates a ON c.advocate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Allow users to view messages in their cases
CREATE POLICY "Users can view messages in their cases" ON messages
    FOR SELECT 
    USING (
        sender_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR
        receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- Allow users to update read status of their received messages
CREATE POLICY "Users can update their received messages" ON messages
    FOR UPDATE 
    USING (
        receiver_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );


-- ============= RATINGS TABLE POLICIES =============

-- Allow clients to create ratings for their closed cases
CREATE POLICY "Clients can rate their closed cases" ON ratings
    FOR INSERT 
    WITH CHECK (
        client_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- Allow users to view ratings
CREATE POLICY "Users can view ratings" ON ratings
    FOR SELECT 
    USING (true);  -- Anyone can view ratings (they're public)


-- ============= GROQ AI LOGS POLICIES =============

-- Allow users to create AI logs
CREATE POLICY "Users can create AI logs" ON groq_ai_logs
    FOR INSERT 
    WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- Allow users to view their own AI logs
CREATE POLICY "Users can view own AI logs" ON groq_ai_logs
    FOR SELECT 
    USING (
        user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );


-- ============================================
-- VERIFICATION QUERY
-- Run this to check if policies were created
-- ============================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
