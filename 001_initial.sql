-- LFCAS Database Migration - Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'advocate', 'admin')),
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advocates extended profile
CREATE TABLE IF NOT EXISTS advocates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    bar_council_id VARCHAR(100),
    specializations TEXT[] DEFAULT '{}',
    court_categories TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    total_cases INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    consultation_fee INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Queries
CREATE TABLE IF NOT EXISTS ai_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    query_text TEXT NOT NULL,
    legal_summary TEXT,
    legal_category VARCHAR(100),
    recommended_specializations TEXT[] DEFAULT '{}',
    urgency_level VARCHAR(20) DEFAULT 'medium',
    key_issues TEXT[] DEFAULT '{}',
    next_steps TEXT[] DEFAULT '{}',
    ai_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting Requests
CREATE TABLE IF NOT EXISTS meeting_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES users(id) NOT NULL,
    advocate_id UUID REFERENCES users(id) NOT NULL,
    ai_query_id UUID REFERENCES ai_queries(id),
    subject VARCHAR(500) NOT NULL,
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending','accepted','rejected','scheduled','completed','case_accepted','case_rejected')
    ),
    rejection_reason TEXT,
    proposed_datetime TIMESTAMPTZ,
    scheduled_datetime TIMESTAMPTZ,
    meeting_link TEXT,
    meeting_notes TEXT,
    advocate_decision_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases
CREATE TABLE IF NOT EXISTS cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES users(id) NOT NULL,
    advocate_id UUID REFERENCES users(id) NOT NULL,
    meeting_request_id UUID REFERENCES meeting_requests(id),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    case_type VARCHAR(100) NOT NULL,
    stage VARCHAR(50) NOT NULL DEFAULT 'INITIATED' CHECK (
        stage IN ('INITIATED','PETITION_FILED','COURT_REVIEW','HEARING_SCHEDULED','HEARING_DONE','JUDGMENT_PENDING','CLOSED')
    ),
    court_name VARCHAR(255),
    case_number VARCHAR(100),
    next_hearing_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case Stage History
CREATE TABLE IF NOT EXISTS case_stages_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    old_stage VARCHAR(50),
    new_stage VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES users(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    public_id TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_id UUID,
    related_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES users(id) NOT NULL,
    advocate_id UUID REFERENCES users(id) NOT NULL,
    case_id UUID REFERENCES cases(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, advocate_id, case_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_advocates_user_id ON advocates(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_client_id ON ai_queries(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_client_id ON meeting_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_advocate_id ON meeting_requests(advocate_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_advocate_id ON cases(advocate_id);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON cases(stage);
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_requests_updated_at BEFORE UPDATE ON meeting_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
