-- =====================================================
-- MIGRATION 005: ADAPTATION TRACKING SYSTEM
-- =====================================================
-- Purpose: Track AI teaching adaptations for analytics and verification
-- Creates: adaptation_logs table
-- Used by: lib/ai/adaptation-logger.ts
-- Reference: ROADMAP_TO_100_PERCENT.md - Criterion 2 Implementation
--
-- This migration enables:
-- 1. Verification that AI actually adapts behavior (Criterion 2 proof)
-- 2. Analytics dashboard showing adaptation patterns
-- 3. Teacher insights into how students are being taught
-- 4. Debugging and quality assurance for adaptive teaching
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- Adaptation Logs Table: Records every adaptation decision
CREATE TABLE IF NOT EXISTS adaptation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Adaptation details
  mastery_level INTEGER NOT NULL CHECK (mastery_level >= 0 AND mastery_level <= 100),
  learning_style TEXT,  -- 'visual', 'auditory', 'kinesthetic', etc.
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('simplified', 'standard', 'accelerated')),
  scaffolding_level TEXT NOT NULL CHECK (scaffolding_level IN ('minimal', 'standard', 'high')),

  -- Response verification
  response_preview TEXT,  -- First 200 chars of response for debugging
  has_svg BOOLEAN NOT NULL DEFAULT false,  -- Critical for verifying visual learner adaptation
  directive_count INTEGER NOT NULL DEFAULT 0,  -- Number of directives applied

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User-based queries (student analytics)
CREATE INDEX IF NOT EXISTS idx_adaptation_logs_user
  ON adaptation_logs(user_id);

-- Lesson-based queries (lesson analytics)
CREATE INDEX IF NOT EXISTS idx_adaptation_logs_lesson
  ON adaptation_logs(lesson_id);

-- Session-based queries (session tracking)
CREATE INDEX IF NOT EXISTS idx_adaptation_logs_session
  ON adaptation_logs(session_id);

-- Learning style queries (verification: do visual learners get more SVGs?)
CREATE INDEX IF NOT EXISTS idx_adaptation_logs_learning_style
  ON adaptation_logs(learning_style);

-- Difficulty analysis
CREATE INDEX IF NOT EXISTS idx_adaptation_logs_difficulty
  ON adaptation_logs(difficulty_level);

-- Time-series analysis
CREATE INDEX IF NOT EXISTS idx_adaptation_logs_created
  ON adaptation_logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS for adaptation_logs
ALTER TABLE adaptation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own adaptation logs
CREATE POLICY select_own_adaptation_logs
  ON adaptation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert adaptation logs (service role)
-- Note: Inserts happen server-side via API routes, not directly from client
CREATE POLICY insert_adaptation_logs
  ON adaptation_logs FOR INSERT
  WITH CHECK (true);  -- Server-side inserts only

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant access to authenticated users (via RLS policies)
GRANT SELECT ON adaptation_logs TO authenticated;
GRANT INSERT ON adaptation_logs TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (For Testing)
-- =====================================================

-- Verify visual learners get more SVGs than other learners
-- Expected: visual_svg_rate should be 2-3x higher than other_svg_rate
--
-- SELECT
--   learning_style,
--   COUNT(*) as total_adaptations,
--   SUM(CASE WHEN has_svg THEN 1 ELSE 0 END) as svg_count,
--   ROUND(
--     SUM(CASE WHEN has_svg THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100,
--     1
--   ) as svg_percentage
-- FROM adaptation_logs
-- WHERE learning_style IS NOT NULL
-- GROUP BY learning_style
-- ORDER BY svg_percentage DESC;

-- Check adaptation distribution by difficulty level
--
-- SELECT
--   difficulty_level,
--   COUNT(*) as count,
--   ROUND(AVG(mastery_level), 1) as avg_mastery,
--   ROUND(
--     COUNT(*)::numeric / (SELECT COUNT(*) FROM adaptation_logs)::numeric * 100,
--     1
--   ) as percentage
-- FROM adaptation_logs
-- GROUP BY difficulty_level
-- ORDER BY
--   CASE difficulty_level
--     WHEN 'simplified' THEN 1
--     WHEN 'standard' THEN 2
--     WHEN 'accelerated' THEN 3
--   END;

-- Recent adaptations for debugging
--
-- SELECT
--   a.created_at,
--   u.name as student_name,
--   l.title as lesson_title,
--   a.mastery_level,
--   a.learning_style,
--   a.difficulty_level,
--   a.scaffolding_level,
--   a.has_svg,
--   LEFT(a.response_preview, 100) as preview
-- FROM adaptation_logs a
-- JOIN users u ON a.user_id = u.id
-- JOIN lessons l ON a.lesson_id = l.id
-- ORDER BY a.created_at DESC
-- LIMIT 10;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 005: Adaptation Tracking System - COMPLETE';
  RAISE NOTICE '  - Created: adaptation_logs table';
  RAISE NOTICE '  - Created: 6 indexes for performance';
  RAISE NOTICE '  - Enabled: Row Level Security';
  RAISE NOTICE '  - Ready for: Criterion 2 verification (AI Adapts)';
END $$;
