-- =====================================================
-- Migration 008: Pending Corrections Table
-- =====================================================
-- Purpose: Store validator-rejected responses for deferred self-correction
-- Date: February 2026
-- Depends on: migration_001_multi_ai_system.sql, migration_004_validation_failures.sql
--
-- When the validator rejects a specialist response, the correction is stored
-- here instead of blocking delivery. On the student's NEXT interaction,
-- the specialist reads this table and naturally self-corrects:
-- "Sorry, I made a mistake earlier when I said X. The correct answer is Y."
--
-- Flow:
-- 1. Specialist responds → Validator runs in background
-- 2. Validator rejects → savePendingCorrection() inserts row
-- 3. Next student interaction → loadTeachingContext() reads pending correction
-- 4. Specialist self-corrects in response → markCorrectionDelivered()
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session context
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Which specialist needs to self-correct
  specialist_name VARCHAR(50) NOT NULL,

  -- The original incorrect response (for specialist reference)
  original_response JSONB NOT NULL, -- { audioText, displayText, svg }

  -- What the validator found wrong
  validation_issues TEXT[] NOT NULL,       -- e.g., ['Incorrect calculation: 3*4=11']
  required_fixes TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['3*4=12, not 11']

  -- Delivery tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Waiting to be delivered in next interaction
    'delivered'   -- Correction was injected and specialist self-corrected
  )),
  delivered_at TIMESTAMP WITH TIME ZONE, -- When the correction was delivered

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query patterns used by getPendingCorrection()
-- Primary query: WHERE session_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1
CREATE INDEX idx_pending_corrections_session_status
  ON pending_corrections (session_id, status);

CREATE INDEX idx_pending_corrections_created
  ON pending_corrections (created_at ASC);

-- Add comment for documentation
COMMENT ON TABLE pending_corrections IS 'Stores validator-rejected responses for deferred self-correction by specialists in subsequent interactions';

-- Enable Row Level Security (RLS)
ALTER TABLE pending_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can read/write (backend-only table)
CREATE POLICY "Pending corrections readable by service role"
  ON pending_corrections
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Pending corrections insertable by service role"
  ON pending_corrections
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Pending corrections updatable by service role"
  ON pending_corrections
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Verification Query
-- =====================================================
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pending_corrections'
ORDER BY ordinal_position;
