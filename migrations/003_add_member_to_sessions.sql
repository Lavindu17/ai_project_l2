-- Migration: Add team_member_id to conversation_sessions
-- Description: Links chat sessions to specific team members to enable history restoration

-- Add team_member_id column
ALTER TABLE conversation_sessions 
ADD COLUMN team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_conversation_sessions_member_id ON conversation_sessions(team_member_id);

-- Update RLS policies to allow users to see their own sessions based on member_id if needed
-- (Current policies are open or token-based, which is fine for now as long as the backend manages access)
