-- Sprint Retrospective System - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: sprints
-- =====================================================
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'collecting' CHECK (status IN ('collecting', 'analyzing', 'analyzed', 'closed')),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    share_token VARCHAR(100) UNIQUE NOT NULL,
    team_size INTEGER DEFAULT 0,
    
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- =====================================================
-- Table: team_members
-- =====================================================
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    has_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: responses
-- =====================================================
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    conversation JSONB NOT NULL,
    sentiment_score FLOAT,
    submitted_at TIMESTAMP DEFAULT NOW(),
    session_token VARCHAR(100) UNIQUE,
    
    CONSTRAINT valid_sentiment CHECK (sentiment_score IS NULL OR (sentiment_score >= -1 AND sentiment_score <= 1))
);

-- =====================================================
-- Table: analysis_reports
-- =====================================================
CREATE TABLE analysis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    themes JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    sentiment_summary JSONB,
    generated_at TIMESTAMP DEFAULT NOW(),
    analysis_duration_seconds INTEGER,
    
    CONSTRAINT one_report_per_sprint UNIQUE (sprint_id)
);

-- =====================================================
-- Table: action_items
-- =====================================================
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    report_id UUID REFERENCES analysis_reports(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    theme_related VARCHAR(255)
);

-- =====================================================
-- Table: sprint_comparisons
-- =====================================================
CREATE TABLE sprint_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    previous_sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    improvement_areas JSONB,
    regression_areas JSONB,
    new_issues JSONB,
    resolved_issues JSONB,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: conversation_sessions
-- For tracking active chat sessions
-- =====================================================
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    session_token VARCHAR(100) UNIQUE NOT NULL,
    conversation_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_responses_sprint_id ON responses(sprint_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_share_token ON sprints(share_token);
CREATE INDEX idx_team_members_sprint_id ON team_members(sprint_id);
CREATE INDEX idx_action_items_sprint_id ON action_items(sprint_id);
CREATE INDEX idx_conversation_sessions_sprint_id ON conversation_sessions(sprint_id);
CREATE INDEX idx_conversation_sessions_token ON conversation_sessions(session_token);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access for sprints (by share token)
CREATE POLICY "Public can view sprints by token" ON sprints
    FOR SELECT
    USING (true);

-- Anyone can insert responses
CREATE POLICY "Anyone can insert responses" ON responses
    FOR INSERT
    WITH CHECK (true);

-- Anyone can read their own session
CREATE POLICY "Anyone can read own session" ON conversation_sessions
    FOR SELECT
    USING (true);

-- Anyone can update own session
CREATE POLICY "Anyone can update own session" ON conversation_sessions
    FOR UPDATE
    USING (true);

-- Anyone can insert session
CREATE POLICY "Anyone can insert session" ON conversation_sessions
    FOR INSERT
    WITH CHECK (true);

-- Service role has full access (use service_role_key for admin operations)
-- Note: RLS is bypassed when using service_role_key

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update team_size automatically
CREATE OR REPLACE FUNCTION update_sprint_team_size()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sprints 
    SET team_size = (
        SELECT COUNT(*) 
        FROM team_members 
        WHERE sprint_id = NEW.sprint_id
    )
    WHERE id = NEW.sprint_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update team_size
CREATE TRIGGER trigger_update_team_size
AFTER INSERT OR DELETE ON team_members
FOR EACH ROW
EXECUTE FUNCTION update_sprint_team_size();

-- Function to update conversation session timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session timestamp
CREATE TRIGGER trigger_update_session_timestamp
BEFORE UPDATE ON conversation_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample sprint
/*
INSERT INTO sprints (name, start_date, end_date, share_token, created_by)
VALUES ('Sprint 1 - Test', '2026-01-13', '2026-01-24', 'test-token-123', 'Admin');
*/
