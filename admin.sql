-- ============================================
-- ADMIN PANEL - DATABASE SCHEMA EXTENSION
-- Legal Family Case Advisor System (LFCAS)
-- ============================================

-- ============= NEW ENUMS =============

-- Report status enum
CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed');

-- Warning severity enum
CREATE TYPE warning_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- ============= REPORTS TABLE =============
-- User complaints/reports against advocates
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advocate_id UUID NOT NULL REFERENCES advocates(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status report_status DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= WARNINGS TABLE =============
-- Admin warnings issued to advocates
CREATE TABLE warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advocate_id UUID NOT NULL REFERENCES advocates(id) ON DELETE CASCADE,
    issued_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    severity warning_severity NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= INDEXES FOR NEW TABLES =============
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_advocate_id ON reports(advocate_id);
CREATE INDEX idx_reports_case_id ON reports(case_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

CREATE INDEX idx_warnings_advocate_id ON warnings(advocate_id);
CREATE INDEX idx_warnings_issued_by ON warnings(issued_by);
CREATE INDEX idx_warnings_severity ON warnings(severity);
CREATE INDEX idx_warnings_created_at ON warnings(created_at DESC);

-- ============= TRIGGERS =============
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============= AUTO-SUSPENSION FUNCTION =============
-- Automatically suspend advocate after 3 high/critical warnings
CREATE OR REPLACE FUNCTION check_auto_suspend_advocate()
RETURNS TRIGGER AS $$
DECLARE
    warning_count INTEGER;
BEGIN
    -- Count warnings with severity high or critical for this advocate
    SELECT COUNT(*) INTO warning_count
    FROM warnings
    WHERE advocate_id = NEW.advocate_id
    AND severity IN ('high', 'critical');
    
    -- If 3 or more warnings, auto-suspend
    IF warning_count >= 3 THEN
        UPDATE advocates
        SET status = 'suspended'
        WHERE id = NEW.advocate_id
        AND status != 'suspended';  -- Only if not already suspended
        
        -- Log the auto-suspension
        INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
        VALUES (
            NEW.issued_by,
            'auto_suspend_advocate',
            'advocate',
            NEW.advocate_id,
            jsonb_build_object(
                'reason', 'Automatic suspension after 3 warnings',
                'warning_count', warning_count,
                'trigger_warning_id', NEW.id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for auto-suspension after warning insert
CREATE TRIGGER trigger_check_auto_suspend
    AFTER INSERT ON warnings
    FOR EACH ROW
    WHEN (NEW.severity IN ('high', 'critical'))
    EXECUTE FUNCTION check_auto_suspend_advocate();

-- ============= ROW LEVEL SECURITY (RLS) =============
-- Enable RLS on new tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY \"Backend full access reports\"
ON reports FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for warnings
CREATE POLICY \"Backend full access warnings\"
ON warnings FOR ALL
USING (true)
WITH CHECK (true);

-- ============= VIEWS FOR ANALYTICS =============

-- View: Advocate performance with warning counts
CREATE OR REPLACE VIEW advocate_performance AS
SELECT 
    a.id as advocate_id,
    a.user_id,
    u.full_name,
    u.email,
    a.status,
    a.rating,
    a.total_cases,
    a.active_cases,
    a.specialization,
    a.location,
    COALESCE(w.warning_count, 0) as warning_count,
    COALESCE(w.critical_warnings, 0) as critical_warnings,
    COALESCE(r.report_count, 0) as report_count,
    COALESCE(r.pending_reports, 0) as pending_reports,
    a.created_at
FROM advocates a
JOIN users u ON a.user_id = u.id
LEFT JOIN (
    SELECT 
        advocate_id,
        COUNT(*) as warning_count,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_warnings
    FROM warnings
    GROUP BY advocate_id
) w ON a.id = w.advocate_id
LEFT JOIN (
    SELECT 
        advocate_id,
        COUNT(*) as report_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_reports
    FROM reports
    GROUP BY advocate_id
) r ON a.id = r.advocate_id;

-- View: Recent admin activities
CREATE OR REPLACE VIEW recent_admin_activities AS
SELECT 
    al.id,
    al.action,
    al.target_type,
    al.target_id,
    al.details,
    al.created_at,
    u.full_name as admin_name,
    u.email as admin_email
FROM admin_logs al
JOIN users u ON al.admin_id = u.id
ORDER BY al.created_at DESC
LIMIT 100;

-- ============= COMMENTS =============
COMMENT ON TABLE reports IS 'User complaints and reports against advocates';
COMMENT ON TABLE warnings IS 'Admin warnings issued to advocates with auto-suspension logic';
COMMENT ON VIEW advocate_performance IS 'Comprehensive advocate performance metrics including warnings and reports';

-- ============= VERIFICATION QUERIES =============
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('reports', 'warnings')
ORDER BY table_name;

-- Check if enums were created
SELECT typname FROM pg_type 
WHERE typname IN ('report_status', 'warning_severity')
ORDER BY typname;

-- Check if views were created
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('advocate_performance', 'recent_admin_activities')
ORDER BY table_name;
