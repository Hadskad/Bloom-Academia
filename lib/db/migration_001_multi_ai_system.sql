-- Bloom Academia Database Migration 001
-- Multi-AI System + Curriculum Sequencing + Assessment Tables
-- Run this in Supabase SQL Editor
-- Date: January 2026
-- Roadmap: Days 15-25 (Implementation_Roadmap_2.md)

-- =====================================================
-- MULTI-AI SYSTEM TABLES (Days 15-18)
-- =====================================================

-- AI Agents Table: Stores all AI agents (Coordinator + Specialists)
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,                    -- 'coordinator', 'math_specialist', etc.
  role TEXT NOT NULL CHECK (role IN ('coordinator', 'subject', 'support')),
  model TEXT NOT NULL DEFAULT 'gemini-3-flash-preview',
  system_prompt TEXT NOT NULL,                  -- Specialized prompt for this agent
  subjects TEXT[] DEFAULT '{}',                 -- For subject agents: ['mathematics']
  capabilities JSONB DEFAULT '{}',              -- What this agent can do
  performance_metrics JSONB DEFAULT '{
    "total_interactions": 0,
    "avg_effectiveness": 0,
    "success_rate": 0
  }',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Interactions Table: Tracks which agent handled each interaction
CREATE TABLE IF NOT EXISTS agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  routing_reason TEXT,                          -- Why this agent was chosen
  handoff_from UUID REFERENCES ai_agents(id),   -- If handed off from another agent
  effectiveness_score FLOAT CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  response_time_ms INTEGER,                     -- How long the response took
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for agent queries
CREATE INDEX IF NOT EXISTS idx_ai_agents_name ON ai_agents(name);
CREATE INDEX IF NOT EXISTS idx_ai_agents_role ON ai_agents(role);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_session ON agent_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent ON agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_timestamp ON agent_interactions(timestamp DESC);

-- Trigger to auto-update updated_at for ai_agents
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CURRICULUM SEQUENCING TABLES (Days 19-22)
-- =====================================================

-- Lesson Prerequisites Table: Defines which lessons must be completed first
CREATE TABLE IF NOT EXISTS lesson_prerequisites (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prerequisite_lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  required_mastery_level FLOAT DEFAULT 80.0 CHECK (required_mastery_level >= 0 AND required_mastery_level <= 100),
  PRIMARY KEY (lesson_id, prerequisite_lesson_id),
  -- Prevent a lesson from being its own prerequisite
  CHECK (lesson_id != prerequisite_lesson_id)
);

-- Curriculum Paths Table: Ordered lesson sequences per subject/grade
CREATE TABLE IF NOT EXISTS curriculum_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('math', 'science', 'english', 'history', 'art', 'other')),
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  lesson_sequence UUID[] NOT NULL,              -- Ordered array of lesson IDs
  total_lessons INTEGER NOT NULL,
  estimated_duration_weeks INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, grade_level)
);

-- Student Curriculum Progress Table: Tracks each student's progress through curriculum
CREATE TABLE IF NOT EXISTS student_curriculum_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'science', 'english', 'history', 'art', 'other')),
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  current_lesson_id UUID REFERENCES lessons(id),
  next_lesson_id UUID REFERENCES lessons(id),
  lessons_completed INTEGER DEFAULT 0 CHECK (lessons_completed >= 0),
  lessons_mastered INTEGER DEFAULT 0 CHECK (lessons_mastered >= 0),  -- Scored 80%+
  total_lessons INTEGER DEFAULT 0,
  overall_mastery_score FLOAT DEFAULT 0.0 CHECK (overall_mastery_score >= 0 AND overall_mastery_score <= 100),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject, grade_level)
);

-- Indexes for curriculum queries
CREATE INDEX IF NOT EXISTS idx_lesson_prereqs_lesson ON lesson_prerequisites(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_prereqs_prereq ON lesson_prerequisites(prerequisite_lesson_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_paths_subject ON curriculum_paths(subject);
CREATE INDEX IF NOT EXISTS idx_curriculum_paths_grade ON curriculum_paths(grade_level);
CREATE INDEX IF NOT EXISTS idx_curriculum_progress_user ON student_curriculum_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_progress_subject ON student_curriculum_progress(subject);

-- Trigger for curriculum_paths updated_at
CREATE TRIGGER update_curriculum_paths_updated_at
  BEFORE UPDATE ON curriculum_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ASSESSMENT SYSTEM TABLES (Days 23-25)
-- =====================================================

-- Assessments Table: Pre-written assessments linked to lessons
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,                     -- Array of question objects
  passing_score FLOAT DEFAULT 80.0 CHECK (passing_score >= 0 AND passing_score <= 100),
  time_limit_minutes INTEGER CHECK (time_limit_minutes > 0),
  max_attempts INTEGER DEFAULT 3 CHECK (max_attempts > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment Attempts Table: Records each student's assessment attempt
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  answers JSONB NOT NULL,                       -- Student's answers with question IDs
  score FLOAT NOT NULL CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN NOT NULL,
  time_taken_seconds INTEGER CHECK (time_taken_seconds >= 0),
  feedback JSONB,                               -- Per-question feedback from AI
  attempt_number INTEGER DEFAULT 1 CHECK (attempt_number > 0),
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assessment queries
CREATE INDEX IF NOT EXISTS idx_assessments_lesson ON assessments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_session ON assessment_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_attempted ON assessment_attempts(attempted_at DESC);

-- Trigger for assessments updated_at
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- UPDATE EXISTING PROGRESS TABLE (Add assessment columns)
-- =====================================================

-- Add assessment-related columns to progress table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'progress' AND column_name = 'assessment_score'
  ) THEN
    ALTER TABLE progress ADD COLUMN assessment_score FLOAT CHECK (assessment_score >= 0 AND assessment_score <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'progress' AND column_name = 'assessment_passed'
  ) THEN
    ALTER TABLE progress ADD COLUMN assessment_passed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'progress' AND column_name = 'assessment_attempts_count'
  ) THEN
    ALTER TABLE progress ADD COLUMN assessment_attempts_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_curriculum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;

-- AI Agents: Everyone can read (needed for routing)
CREATE POLICY "Anyone can view active agents"
  ON ai_agents FOR SELECT
  USING (status = 'active');

-- Agent Interactions: Users can only see their own session interactions
CREATE POLICY "Users can view own agent interactions"
  ON agent_interactions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agent interactions"
  ON agent_interactions FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Lesson Prerequisites: Everyone can read
CREATE POLICY "Anyone can view lesson prerequisites"
  ON lesson_prerequisites FOR SELECT
  TO authenticated
  USING (true);

-- Curriculum Paths: Everyone can read
CREATE POLICY "Anyone can view curriculum paths"
  ON curriculum_paths FOR SELECT
  TO authenticated
  USING (true);

-- Student Curriculum Progress: Users can only access their own
CREATE POLICY "Users can view own curriculum progress"
  ON student_curriculum_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own curriculum progress"
  ON student_curriculum_progress FOR ALL
  USING (user_id = auth.uid());

-- Assessments: Everyone can read
CREATE POLICY "Anyone can view assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (true);

-- Assessment Attempts: Users can only access their own
CREATE POLICY "Users can view own assessment attempts"
  ON assessment_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own assessment attempts"
  ON assessment_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Check if student has completed all prerequisites for a lesson
CREATE OR REPLACE FUNCTION has_completed_prerequisites(
  p_user_id UUID,
  p_lesson_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  prereq RECORD;
  user_progress RECORD;
BEGIN
  -- Get all prerequisites for this lesson
  FOR prereq IN
    SELECT prerequisite_lesson_id, required_mastery_level
    FROM lesson_prerequisites
    WHERE lesson_id = p_lesson_id
  LOOP
    -- Check if user has completed this prerequisite with required mastery
    SELECT mastery_level, completed INTO user_progress
    FROM progress
    WHERE user_id = p_user_id AND lesson_id = prereq.prerequisite_lesson_id;

    -- If no progress record or mastery not met, return false
    IF user_progress IS NULL OR
       user_progress.completed = FALSE OR
       user_progress.mastery_level < prereq.required_mastery_level THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  -- All prerequisites met (or no prerequisites exist)
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Get next lesson for a student in a subject
CREATE OR REPLACE FUNCTION get_next_lesson(
  p_user_id UUID,
  p_subject TEXT,
  p_grade_level INTEGER
)
RETURNS UUID AS $$
DECLARE
  curriculum RECORD;
  lesson_id UUID;
  is_completed BOOLEAN;
  prereqs_met BOOLEAN;
BEGIN
  -- Get curriculum path for this subject/grade
  SELECT lesson_sequence INTO curriculum
  FROM curriculum_paths
  WHERE subject = p_subject AND grade_level = p_grade_level;

  IF curriculum IS NULL THEN
    RETURN NULL; -- No curriculum defined
  END IF;

  -- Iterate through lesson sequence
  FOREACH lesson_id IN ARRAY curriculum.lesson_sequence
  LOOP
    -- Check if lesson is already completed
    SELECT completed INTO is_completed
    FROM progress
    WHERE user_id = p_user_id AND lesson_id = lesson_id;

    IF is_completed = TRUE THEN
      CONTINUE; -- Skip completed lessons
    END IF;

    -- Check prerequisites
    prereqs_met := has_completed_prerequisites(p_user_id, lesson_id);

    IF prereqs_met THEN
      RETURN lesson_id; -- This is the next lesson
    END IF;
  END LOOP;

  -- All lessons completed or no accessible lessons
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate average mastery for a user in a subject
CREATE OR REPLACE FUNCTION calculate_subject_mastery(
  p_user_id UUID,
  p_subject TEXT
)
RETURNS FLOAT AS $$
DECLARE
  avg_mastery FLOAT;
BEGIN
  SELECT AVG(p.mastery_level) INTO avg_mastery
  FROM progress p
  JOIN lessons l ON p.lesson_id = l.id
  WHERE p.user_id = p_user_id AND l.subject = p_subject AND p.completed = TRUE;

  RETURN COALESCE(avg_mastery, 0.0);
END;
$$ LANGUAGE plpgsql;

-- Function: Count assessment attempts for a user on an assessment
CREATE OR REPLACE FUNCTION count_assessment_attempts(
  p_user_id UUID,
  p_assessment_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM assessment_attempts
  WHERE user_id = p_user_id AND assessment_id = p_assessment_id;

  RETURN attempt_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS FOR SERVICE ROLE ACCESS
-- =====================================================

-- Grant access to new tables for authenticated users
GRANT SELECT ON ai_agents TO authenticated;
GRANT SELECT, INSERT ON agent_interactions TO authenticated;
GRANT SELECT ON lesson_prerequisites TO authenticated;
GRANT SELECT ON curriculum_paths TO authenticated;
GRANT ALL ON student_curriculum_progress TO authenticated;
GRANT SELECT ON assessments TO authenticated;
GRANT SELECT, INSERT ON assessment_attempts TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Migration 001 Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - ai_agents (Multi-AI system)';
  RAISE NOTICE '  - agent_interactions (Agent tracking)';
  RAISE NOTICE '  - lesson_prerequisites (Curriculum sequencing)';
  RAISE NOTICE '  - curriculum_paths (Lesson ordering)';
  RAISE NOTICE '  - student_curriculum_progress (Student tracking)';
  RAISE NOTICE '  - assessments (Assessment questions)';
  RAISE NOTICE '  - assessment_attempts (Student attempts)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added columns to progress table:';
  RAISE NOTICE '  - assessment_score';
  RAISE NOTICE '  - assessment_passed';
  RAISE NOTICE '  - assessment_attempts_count';
  RAISE NOTICE '';
  RAISE NOTICE 'Created helper functions:';
  RAISE NOTICE '  - has_completed_prerequisites()';
  RAISE NOTICE '  - get_next_lesson()';
  RAISE NOTICE '  - calculate_subject_mastery()';
  RAISE NOTICE '  - count_assessment_attempts()';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies and indexes created.';
  RAISE NOTICE '=========================================';
END $$;
