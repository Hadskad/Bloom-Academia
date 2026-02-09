-- =====================================================
-- MIGRATION 007: REMEDIATION SYSTEM
-- =====================================================
-- Purpose: Add diagnostic remediation capabilities for failed assessments
--
-- Features:
-- 1. Concept tagging for assessment questions
-- 2. Remediation plans storage for targeted reteaching
-- 3. Indexes for performance optimization
--
-- Criterion 5: Failure → Remediation (1/10 → 10/10)
-- Reference: ROADMAP_TO_100_PERCENT.md - Steps 1 & 2
-- =====================================================

-- =====================================================
-- 1. Add Concept Tags to Assessments Table
-- =====================================================
-- Allows tagging questions with concept identifiers for diagnostic analysis
-- Format: JSONB array of concept mappings
-- Example: [
--   {"concept": "numerator_denominator", "questions": ["q1", "q2", "q5"]},
--   {"concept": "fraction_visualization", "questions": ["q3", "q6"]}
-- ]

ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS concept_tags JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN assessments.concept_tags IS
'Maps concepts to question IDs for diagnostic analysis. Format: [{"concept": "concept_name", "questions": ["q1", "q2"]}]';

-- =====================================================
-- 2. Create Remediation Plans Table
-- =====================================================
-- Stores generated remediation content for students who fail assessments
-- Each plan contains:
-- - Diagnostic analysis of concept gaps
-- - AI-generated mini-lessons for specific concepts
-- - Completion tracking

CREATE TABLE IF NOT EXISTS remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

  -- Diagnostic Result (from diagnostic-analyzer.ts)
  -- Format: {
  --   failedConcepts: [{concept, questionsFailedCount, totalQuestionsForConcept, severity}],
  --   remediationNeeded: boolean,
  --   recommendedActions: string[]
  -- }
  diagnosis JSONB NOT NULL,

  -- Generated Remediation Content (from content-generator.ts)
  -- Format: [{
  --   concept: string,
  --   severity: 'critical' | 'moderate' | 'minor',
  --   lesson: {title, explanation, examples, practiceProblems, svg}
  -- }]
  remediation_content JSONB NOT NULL,

  -- Tracking
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE remediation_plans IS
'Stores diagnostic analysis and targeted remediation content for students who fail assessments';

COMMENT ON COLUMN remediation_plans.diagnosis IS
'Diagnostic analysis result identifying specific concept gaps';

COMMENT ON COLUMN remediation_plans.remediation_content IS
'AI-generated mini-lessons for each failed concept';

-- =====================================================
-- 3. Create Indexes for Performance
-- =====================================================
-- Optimize common queries for remediation system

-- Find all remediation plans for a user
CREATE INDEX IF NOT EXISTS idx_remediation_plans_user
ON remediation_plans(user_id, created_at DESC);

-- Find remediation plans for specific lesson
CREATE INDEX IF NOT EXISTS idx_remediation_plans_lesson
ON remediation_plans(lesson_id);

-- Find incomplete remediation plans
CREATE INDEX IF NOT EXISTS idx_remediation_plans_incomplete
ON remediation_plans(user_id, completed)
WHERE completed = FALSE;

-- Find recent remediation plans for analytics
CREATE INDEX IF NOT EXISTS idx_remediation_plans_recent
ON remediation_plans(created_at DESC)
WHERE created_at >= NOW() - INTERVAL '30 days';

-- =====================================================
-- 4. Create Updated_At Trigger
-- =====================================================
-- Automatically update updated_at timestamp on changes

CREATE OR REPLACE FUNCTION update_remediation_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_remediation_plans_updated_at
  BEFORE UPDATE ON remediation_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_remediation_plans_updated_at();

-- =====================================================
-- 5. Create Helper View for Analytics
-- =====================================================
-- Provides easy access to remediation statistics

CREATE OR REPLACE VIEW remediation_analytics AS
SELECT
  rp.user_id,
  u.name AS user_name,
  l.subject,
  l.grade_level,
  COUNT(*) AS total_remediations,
  SUM(CASE WHEN rp.completed THEN 1 ELSE 0 END) AS completed_remediations,
  AVG(CASE WHEN rp.completed THEN 1 ELSE 0 END) AS completion_rate,
  jsonb_array_length(rp.diagnosis->'failedConcepts') AS avg_concepts_per_remediation,
  MAX(rp.created_at) AS last_remediation_date
FROM remediation_plans rp
JOIN users u ON rp.user_id = u.id
JOIN lessons l ON rp.lesson_id = l.id
GROUP BY rp.user_id, u.name, l.subject, l.grade_level;

COMMENT ON VIEW remediation_analytics IS
'Aggregated statistics for remediation system performance and student progress';

-- =====================================================
-- 6. Grant Permissions (if using RLS)
-- =====================================================
-- Enable Row Level Security
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own remediation plans
CREATE POLICY remediation_plans_user_policy ON remediation_plans
  FOR ALL
  USING (user_id = auth.uid());

-- Policy: Allow authenticated users to insert their own plans
CREATE POLICY remediation_plans_insert_policy ON remediation_plans
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. Run this migration: psql -f migration_007_remediation_system.sql
-- 2. Tag existing assessments with concepts (migration_007_concept_tags.sql)
-- 3. Implement diagnostic-analyzer.ts
-- 4. Implement content-generator.ts
-- 5. Implement remediation API endpoint
-- =====================================================
