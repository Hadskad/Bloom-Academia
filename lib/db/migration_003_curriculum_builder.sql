-- Bloom Academia Database Migration 003
-- Curriculum Builder System: Rules-Based Mastery Detection
-- Run this in Supabase SQL Editor AFTER migration_001 and migration_002
-- Date: February 2026
-- Phase 1: Foundation - Subject-level configuration only

-- =====================================================
-- CURRICULUM BUILDER TABLES (Phase 1)
-- =====================================================

-- Subject Configurations Table: Default mastery rules per subject/grade
-- Teachers can configure these via admin UI
CREATE TABLE IF NOT EXISTS subject_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('math', 'science', 'english', 'history', 'art', 'other')),
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),

  -- Mastery detection rules (JSON object with rule values)
  default_mastery_rules JSONB NOT NULL DEFAULT '{
    "minCorrectAnswers": 3,
    "minExplanationQuality": 70,
    "minApplicationAttempts": 2,
    "minOverallQuality": 75,
    "maxStruggleRatio": 0.3,
    "minTimeSpentMinutes": 5
  }',

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One configuration per subject/grade combination
  UNIQUE(subject, grade_level)
);

-- Mastery Evidence Table: Records student learning evidence
-- Used by rules-based mastery detection system
CREATE TABLE IF NOT EXISTS mastery_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Evidence type: correct_answer, incorrect_answer, explanation, application, struggle
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'correct_answer',
    'incorrect_answer',
    'explanation',
    'application',
    'struggle'
  )),

  -- The actual content (student's response or behavior)
  content TEXT NOT NULL,

  -- Metadata for analysis
  metadata JSONB DEFAULT '{}',  -- quality_score, confidence, context

  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Subject configurations lookup
CREATE INDEX IF NOT EXISTS idx_subject_configs_subject_grade
  ON subject_configurations(subject, grade_level);

-- Mastery evidence queries (frequently accessed)
CREATE INDEX IF NOT EXISTS idx_mastery_evidence_user_lesson
  ON mastery_evidence(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_mastery_evidence_session
  ON mastery_evidence(session_id);

CREATE INDEX IF NOT EXISTS idx_mastery_evidence_type
  ON mastery_evidence(evidence_type);

CREATE INDEX IF NOT EXISTS idx_mastery_evidence_recorded
  ON mastery_evidence(recorded_at DESC);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Auto-update updated_at for subject_configurations
CREATE TRIGGER update_subject_configurations_updated_at
  BEFORE UPDATE ON subject_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE subject_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_evidence ENABLE ROW LEVEL SECURITY;

-- Subject Configurations: Everyone can read (needed for teaching)
CREATE POLICY "Anyone can view subject configurations"
  ON subject_configurations FOR SELECT
  TO authenticated
  USING (true);

-- Subject Configurations: Only authenticated users can modify (admin check in API)
CREATE POLICY "Authenticated users can manage subject configurations"
  ON subject_configurations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Mastery Evidence: Users can only see their own evidence
CREATE POLICY "Users can view own mastery evidence"
  ON mastery_evidence FOR SELECT
  USING (user_id = auth.uid());

-- Mastery Evidence: System can insert evidence for any user
CREATE POLICY "System can record mastery evidence"
  ON mastery_evidence FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- SEED DATA: Grade 3 Math Default Configuration
-- =====================================================

-- Insert default configuration for Grade 3 Math
INSERT INTO subject_configurations (subject, grade_level, default_mastery_rules)
VALUES (
  'math',
  3,
  '{
    "minCorrectAnswers": 3,
    "minExplanationQuality": 70,
    "minApplicationAttempts": 2,
    "minOverallQuality": 75,
    "maxStruggleRatio": 0.3,
    "minTimeSpentMinutes": 5
  }'::jsonb
)
ON CONFLICT (subject, grade_level)
DO UPDATE SET
  default_mastery_rules = EXCLUDED.default_mastery_rules,
  updated_at = NOW();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get effective mastery rules for a subject/grade
-- Returns configured rules or system defaults if not configured
CREATE OR REPLACE FUNCTION get_effective_mastery_rules(
  p_subject TEXT,
  p_grade_level INTEGER
)
RETURNS JSONB AS $$
DECLARE
  rules JSONB;
BEGIN
  -- Try to get configured rules
  SELECT default_mastery_rules INTO rules
  FROM subject_configurations
  WHERE subject = p_subject AND grade_level = p_grade_level;

  -- If no configuration exists, return system defaults
  IF rules IS NULL THEN
    rules := '{
      "minCorrectAnswers": 3,
      "minExplanationQuality": 70,
      "minApplicationAttempts": 2,
      "minOverallQuality": 75,
      "maxStruggleRatio": 0.3,
      "minTimeSpentMinutes": 5
    }'::jsonb;
  END IF;

  RETURN rules;
END;
$$ LANGUAGE plpgsql;

-- Function: Count evidence of a specific type for a lesson
CREATE OR REPLACE FUNCTION count_evidence_by_type(
  p_user_id UUID,
  p_lesson_id UUID,
  p_evidence_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  evidence_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO evidence_count
  FROM mastery_evidence
  WHERE user_id = p_user_id
    AND lesson_id = p_lesson_id
    AND evidence_type = p_evidence_type;

  RETURN COALESCE(evidence_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Get all evidence for a lesson (for mastery calculation)
CREATE OR REPLACE FUNCTION get_lesson_evidence(
  p_user_id UUID,
  p_lesson_id UUID
)
RETURNS TABLE(
  evidence_type TEXT,
  content TEXT,
  metadata JSONB,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.evidence_type,
    me.content,
    me.metadata,
    me.recorded_at
  FROM mastery_evidence me
  WHERE me.user_id = p_user_id
    AND me.lesson_id = p_lesson_id
  ORDER BY me.recorded_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS FOR SERVICE ROLE ACCESS
-- =====================================================

-- Grant access to new tables
GRANT ALL ON subject_configurations TO authenticated;
GRANT ALL ON mastery_evidence TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Migration 003 Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - subject_configurations (Teacher-configurable mastery rules)';
  RAISE NOTICE '  - mastery_evidence (Student learning evidence tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created helper functions:';
  RAISE NOTICE '  - get_effective_mastery_rules()';
  RAISE NOTICE '  - count_evidence_by_type()';
  RAISE NOTICE '  - get_lesson_evidence()';
  RAISE NOTICE '';
  RAISE NOTICE 'Seed data:';
  RAISE NOTICE '  - Grade 3 Math configuration inserted';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies and indexes created.';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 1: Foundation complete!';
  RAISE NOTICE 'Next: Create backend APIs and frontend UI';
  RAISE NOTICE '=========================================';
END $$;
