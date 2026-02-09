-- =====================================================
-- Migration 004: Validation Failures Table
-- =====================================================
-- Purpose: Track validation failures for teacher dashboard review
-- Date: February 2026
-- Depends on: migration_001_multi_ai_system.sql
--
-- This table stores responses that failed validation by the Validator agent.
-- Teachers can review these to:
-- 1. Identify patterns in agent hallucinations
-- 2. Improve agent prompts
-- 3. Ensure quality control
-- =====================================================

-- Create validation_failures table
CREATE TABLE IF NOT EXISTS validation_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session context
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  specialist_name VARCHAR(50) NOT NULL, -- e.g., 'math_specialist'

  -- Original response that failed validation
  original_response JSONB NOT NULL, -- { audioText, displayText, svg }

  -- Validation result details
  validation_result JSONB NOT NULL, -- { approved, confidenceScore, issues, requiredFixes }

  -- Retry tracking
  retry_count INT NOT NULL DEFAULT 0, -- How many regeneration attempts (0-2)

  -- Final outcome
  final_action VARCHAR(50) NOT NULL CHECK (final_action IN (
    'approved_after_retry',           -- Passed validation after regeneration
    'delivered_with_disclaimer',      -- Failed after 2 retries, delivered with warning
    'failed_validation'              -- Failed validation (fallback state)
  )),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for dashboard queries
  INDEX idx_validation_failures_session (session_id),
  INDEX idx_validation_failures_agent (agent_id),
  INDEX idx_validation_failures_specialist (specialist_name),
  INDEX idx_validation_failures_created (created_at DESC)
);

-- Add comment for documentation
COMMENT ON TABLE validation_failures IS 'Tracks responses that failed validation by the Validator agent for quality control and teacher review';

-- Enable Row Level Security (RLS)
ALTER TABLE validation_failures ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can view validation failures
CREATE POLICY "Validation failures viewable by authenticated users"
  ON validation_failures
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only system can insert validation failures
CREATE POLICY "Validation failures insertable by service role"
  ON validation_failures
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the table was created correctly:
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'validation_failures'
ORDER BY ordinal_position;

-- =====================================================
-- Sample Query for Teacher Dashboard
-- =====================================================
-- Get validation failures for a specific agent, grouped by issue type
/*
SELECT
  specialist_name,
  COUNT(*) as failure_count,
  jsonb_array_length(validation_result->'issues') as avg_issues_per_failure,
  jsonb_agg(DISTINCT jsonb_array_elements_text(validation_result->'issues')) as common_issues
FROM validation_failures
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY specialist_name
ORDER BY failure_count DESC;
*/
