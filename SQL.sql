-- Legal Family Case Advisor System (LFCAS) - Supabase PostgreSQL Schema
-- This schema converts the original MongoDB collections to PostgreSQL tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============= ENUMS =============
CREATE TYPE user_role AS ENUM ('client', 'advocate', 'platform_manager');
CREATE TYPE case_type AS ENUM ('divorce', 'alimony', 'child_custody', 'dowry', 'domestic_violence', 'other');
CREATE TYPE case_status AS ENUM ('pending', 'in_progress', 'hearing_scheduled', 'awaiting_judgment', 'closed');
CREATE TYPE advocate_status AS ENUM ('pending_approval', 'approved', 'rejected', 'suspended');
CREATE TYPE message_type AS ENUM ('text', 'document', 'system');
CREATE TYPE notification_type AS ENUM ('case_update', 'hearing_reminder', 'new_message', 'document_uploaded', 'advocate_assigned', 'system');

-- ============= USERS TABLE =============
-- Note: Supabase Auth handles authentication, but we store additional user profile data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- Reference to Supabase auth.users
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'client',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= ADVOCATES TABLE =============
CREATE TABLE advocates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bar_council_id TEXT NOT NULL UNIQUE,
    specialization case_type[] NOT NULL,
    experience_years INTEGER NOT NULL CHECK (experience_years >= 0),
    location TEXT NOT NULL,
    bio TEXT,
    status advocate_status DEFAULT 'pending_approval',
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_cases INTEGER DEFAULT 0,
    active_cases INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= CASES TABLE =============
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advocate_id UUID REFERENCES advocates(id) ON DELETE SET NULL,
    case_type case_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    status case_status DEFAULT 'pending',
    ai_analysis JSONB,
    required_documents TEXT[],
    legal_sections TEXT[],
    procedural_guidance TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= HEARINGS TABLE =============
CREATE TABLE hearings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    hearing_date TIMESTAMPTZ NOT NULL,
    court_name TEXT NOT NULL,
    court_room TEXT,
    notes TEXT,
    outcome TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= DOCUMENTS TABLE =============
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    cloudinary_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    description TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= MESSAGES TABLE =============
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= NOTIFICATIONS TABLE =============
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= RATINGS TABLE =============
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advocate_id UUID NOT NULL REFERENCES advocates(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(case_id) -- One rating per case
);

-- ============= ADMIN LOGS TABLE =============
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= GROQ AI LOGS TABLE =============
CREATE TABLE groq_ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    response JSONB NOT NULL,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= INDEXES FOR PERFORMANCE =============
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

CREATE INDEX idx_advocates_user_id ON advocates(user_id);
CREATE INDEX idx_advocates_status ON advocates(status);
CREATE INDEX idx_advocates_location ON advocates(location);

CREATE INDEX idx_cases_client_id ON cases(client_id);
CREATE INDEX idx_cases_advocate_id ON cases(advocate_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_type ON cases(case_type);

CREATE INDEX idx_hearings_case_id ON hearings(case_id);
CREATE INDEX idx_hearings_date ON hearings(hearing_date);

CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

CREATE INDEX idx_messages_case_id ON messages(case_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_ratings_advocate_id ON ratings(advocate_id);
CREATE INDEX idx_ratings_client_id ON ratings(client_id);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

CREATE INDEX idx_groq_logs_user_id ON groq_ai_logs(user_id);
CREATE INDEX idx_groq_logs_case_id ON groq_ai_logs(case_id);

-- ============= TRIGGERS FOR UPDATED_AT =============
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advocates_updated_at BEFORE UPDATE ON advocates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hearings_updated_at BEFORE UPDATE ON hearings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============= ROW LEVEL SECURITY (RLS) POLICIES =============
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE advocates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE groq_ai_logs ENABLE ROW LEVEL SECURITY;

-- Users: Can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Service role can do everything (for backend API)
CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access advocates" ON advocates
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access cases" ON cases
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access hearings" ON hearings
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access documents" ON documents
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access messages" ON messages
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access notifications" ON notifications
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access ratings" ON ratings
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access admin_logs" ON admin_logs
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access groq_logs" ON groq_ai_logs
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============= FUNCTIONS FOR BUSINESS LOGIC =============

-- Function to update advocate rating
CREATE OR REPLACE FUNCTION update_advocate_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE advocates
    SET rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM ratings
        WHERE advocate_id = NEW.advocate_id
    )
    WHERE id = NEW.advocate_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_advocate_rating
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_advocate_rating();

-- Function to increment advocate case counts
CREATE OR REPLACE FUNCTION increment_advocate_cases()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.advocate_id IS NOT NULL AND (OLD.advocate_id IS NULL OR OLD.advocate_id != NEW.advocate_id) THEN
        UPDATE advocates
        SET active_cases = active_cases + 1,
            total_cases = total_cases + 1
        WHERE id = NEW.advocate_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_advocate_cases
    AFTER UPDATE OF advocate_id ON cases
    FOR EACH ROW
    EXECUTE FUNCTION increment_advocate_cases();

-- Function to decrement advocate active cases on case closure
CREATE OR REPLACE FUNCTION decrement_advocate_active_cases()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.advocate_id IS NOT NULL THEN
        UPDATE advocates
        SET active_cases = GREATEST(active_cases - 1, 0)
        WHERE id = NEW.advocate_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_advocate_active_cases
    AFTER UPDATE OF status ON cases
    FOR EACH ROW
    EXECUTE FUNCTION decrement_advocate_active_cases();

-- ============= INITIAL DATA (OPTIONAL) =============
-- You can add seed data here if needed

COMMENT ON TABLE users IS 'User profiles with additional data beyond Supabase Auth';
COMMENT ON TABLE advocates IS 'Advocate professional profiles';
COMMENT ON TABLE cases IS 'Legal cases managed in the system';
COMMENT ON TABLE hearings IS 'Court hearing schedules';
COMMENT ON TABLE documents IS 'Case-related documents stored in Cloudinary';
COMMENT ON TABLE messages IS 'Real-time case communication';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE ratings IS 'Advocate ratings and reviews';
COMMENT ON TABLE admin_logs IS 'Platform manager activity logs';
COMMENT ON TABLE groq_ai_logs IS 'AI query logs for analytics';
