-- Add summary_data column to responses table
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS summary_data JSONB;

-- Add comment
COMMENT ON COLUMN responses.summary_data IS 'Structured AI-generated summary of the conversation';
