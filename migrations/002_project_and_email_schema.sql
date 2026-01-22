-- Sprint Retrospective System - Project & Email Enhancement Schema
-- Run this in your Supabase SQL Editor

-- =====================================================
-- Table: projects
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Add project_id to sprints table
-- =====================================================
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- =====================================================
-- Enhanced team_members table with email and access code
-- =====================================================
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS access_code VARCHAR(20) UNIQUE;

ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMP;

-- =====================================================
-- Table: sprint_goals
-- =====================================================
CREATE TABLE IF NOT EXISTS sprint_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    goal_text TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: sprint_outcomes (progress, what went right/wrong)
-- =====================================================
CREATE TABLE IF NOT EXISTS sprint_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    progress_summary TEXT,
    what_went_well TEXT,
    what_went_wrong TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT one_outcome_per_sprint UNIQUE (sprint_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_access_code ON team_members(access_code);
CREATE INDEX IF NOT EXISTS idx_sprint_goals_sprint_id ON sprint_goals(sprint_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_outcomes ENABLE ROW LEVEL SECURITY;

-- Projects policies (full access for now, can be restricted later)
CREATE POLICY "Full access to projects" ON projects FOR ALL USING (true);

-- Sprint goals policies
CREATE POLICY "Full access to sprint_goals" ON sprint_goals FOR ALL USING (true);

-- Sprint outcomes policies
CREATE POLICY "Full access to sprint_outcomes" ON sprint_outcomes FOR ALL USING (true);

-- Team members policies (allow reading by access code)
CREATE POLICY "Anyone can read team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Anyone can update team_members" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert team_members" ON team_members FOR INSERT WITH CHECK (true);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update project timestamp
CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update project timestamp
DROP TRIGGER IF EXISTS trigger_update_project_timestamp ON projects;
CREATE TRIGGER trigger_update_project_timestamp
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_project_timestamp();

-- Function to update sprint outcome timestamp
CREATE OR REPLACE FUNCTION update_outcome_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update outcome timestamp
DROP TRIGGER IF EXISTS trigger_update_outcome_timestamp ON sprint_outcomes;
CREATE TRIGGER trigger_update_outcome_timestamp
BEFORE UPDATE ON sprint_outcomes
FOR EACH ROW
EXECUTE FUNCTION update_outcome_timestamp();

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    code VARCHAR(8);
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Excluded I, O, 0, 1 to avoid confusion
    i INTEGER;
BEGIN
    code := '';
    FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;
