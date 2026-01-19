-- Bloom Academia Database Schema
-- Run this in Supabase SQL Editor to create all tables
-- Last Updated: 2026-01-13

-- =====================================================
-- USERS TABLE (Layer 1: Persistent Profile)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', NULL)),
  strengths TEXT[] DEFAULT '{}',
  struggles TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  total_learning_time INTEGER DEFAULT 0 CHECK (total_learning_time >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade_level);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LESSONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'science', 'english', 'history', 'art', 'other')),
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  learning_objective TEXT NOT NULL,
  estimated_duration INTEGER CHECK (estimated_duration > 0),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering lessons
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject);
CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade_level);
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty ON lessons(difficulty);

-- =====================================================
-- SESSIONS TABLE (Layer 2: Session Memory)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0 CHECK (interaction_count >= 0),
  effectiveness_score FLOAT CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  metadata JSONB DEFAULT '{}'
);

-- Index for user session history
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lesson ON sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);

-- =====================================================
-- INTERACTIONS TABLE (Layer 2: Conversation History)
-- =====================================================
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  was_helpful BOOLEAN,
  metadata JSONB DEFAULT '{}'
);

-- Index for session interaction queries
CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);

-- =====================================================
-- PROGRESS TABLE (Learning Progress Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  mastery_level FLOAT DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
  common_mistakes TEXT[] DEFAULT '{}',
  time_spent INTEGER DEFAULT 0 CHECK (time_spent >= 0),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, lesson_id)
);

-- Indexes for progress queries
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON progress(completed);
CREATE INDEX IF NOT EXISTS idx_progress_mastery ON progress(mastery_level DESC);

-- =====================================================
-- SEED DATA: Sample Lessons (Optional - for testing)
-- =====================================================
INSERT INTO lessons (title, subject, grade_level, learning_objective, estimated_duration, difficulty)
VALUES
  -- Grade 5 Math
  ('Introduction to Fractions', 'math', 5, 'Understand what fractions are and how to represent them visually', 30, 'easy'),
  ('Adding and Subtracting Fractions', 'math', 5, 'Learn to add and subtract fractions with like denominators', 45, 'medium'),
  ('Multiplying Fractions', 'math', 5, 'Master multiplication of fractions and simplification', 40, 'medium'),
  ('Dividing Fractions', 'math', 5, 'Understand fraction division using the reciprocal method', 45, 'hard'),

  -- Grade 5 Science
  ('The Water Cycle', 'science', 5, 'Understand evaporation, condensation, and precipitation', 35, 'easy'),
  ('States of Matter', 'science', 5, 'Learn about solids, liquids, gases and their properties', 40, 'easy'),
  ('Photosynthesis Basics', 'science', 5, 'Understand how plants make food using sunlight', 45, 'medium'),

  -- Grade 5 English
  ('Parts of Speech', 'english', 5, 'Identify nouns, verbs, adjectives, and adverbs', 30, 'easy'),
  ('Sentence Structure', 'english', 5, 'Learn to construct simple and compound sentences', 40, 'medium'),
  ('Reading Comprehension Strategies', 'english', 5, 'Develop skills to understand and analyze texts', 50, 'medium')
ON CONFLICT DO NOTHING;

-- =====================================================
-- HELPER VIEWS (Optional - for analytics)
-- =====================================================

-- View: User Learning Summary
CREATE OR REPLACE VIEW user_learning_summary AS
SELECT
  u.id as user_id,
  u.name,
  u.grade_level,
  u.learning_style,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT p.lesson_id) as lessons_attempted,
  SUM(CASE WHEN p.completed = true THEN 1 ELSE 0 END) as lessons_completed,
  ROUND(AVG(p.mastery_level)::numeric, 2) as avg_mastery,
  u.total_learning_time
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
LEFT JOIN progress p ON u.id = p.user_id
GROUP BY u.id, u.name, u.grade_level, u.learning_style, u.total_learning_time;

-- View: Active Sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT
  s.id as session_id,
  s.user_id,
  u.name as user_name,
  s.lesson_id,
  l.title as lesson_title,
  s.started_at,
  s.interaction_count,
  EXTRACT(EPOCH FROM (NOW() - s.started_at))/60 as duration_minutes
FROM sessions s
JOIN users u ON s.user_id = u.id
JOIN lessons l ON s.lesson_id = l.id
WHERE s.ended_at IS NULL
ORDER BY s.started_at DESC;

-- View: Lesson Popularity
CREATE OR REPLACE VIEW lesson_popularity AS
SELECT
  l.id,
  l.title,
  l.subject,
  l.grade_level,
  l.difficulty,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT s.user_id) as unique_students,
  ROUND(AVG(p.mastery_level)::numeric, 2) as avg_mastery,
  ROUND(AVG(s.effectiveness_score)::numeric, 2) as avg_effectiveness
FROM lessons l
LEFT JOIN sessions s ON l.id = s.lesson_id
LEFT JOIN progress p ON l.id = p.lesson_id
GROUP BY l.id, l.title, l.subject, l.grade_level, l.difficulty
ORDER BY total_sessions DESC;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Optional but Recommended
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only access their own interactions
CREATE POLICY "Users can view own interactions"
  ON interactions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM sessions WHERE id = session_id));

-- Policy: Users can only access their own progress
CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON progress FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Everyone can read lessons
CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function: Get or Create User Session
CREATE OR REPLACE FUNCTION get_or_create_session(
  p_user_id UUID,
  p_lesson_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check for active session
  SELECT id INTO v_session_id
  FROM sessions
  WHERE user_id = p_user_id
    AND lesson_id = p_lesson_id
    AND ended_at IS NULL
  LIMIT 1;

  -- Create new session if none exists
  IF v_session_id IS NULL THEN
    INSERT INTO sessions (user_id, lesson_id)
    VALUES (p_user_id, p_lesson_id)
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function: End Session and Calculate Effectiveness
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_interaction_count INTEGER;
  v_effectiveness FLOAT;
BEGIN
  -- Count interactions
  SELECT COUNT(*) INTO v_interaction_count
  FROM interactions
  WHERE session_id = p_session_id;

  -- Simple effectiveness calculation (can be enhanced)
  v_effectiveness := LEAST(100, v_interaction_count * 10);

  -- Update session
  UPDATE sessions
  SET
    ended_at = NOW(),
    interaction_count = v_interaction_count,
    effectiveness_score = v_effectiveness
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP AND MAINTENANCE
-- =====================================================

-- Function: Archive old sessions (older than 90 days)
CREATE OR REPLACE FUNCTION archive_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- This is a placeholder - implement archival logic as needed
  -- For now, just return count of old sessions
  SELECT COUNT(*) INTO archived_count
  FROM sessions
  WHERE ended_at < NOW() - INTERVAL '90 days';

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS (for service role and anon access)
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT ON lessons TO anon, authenticated;
GRANT ALL ON users, sessions, interactions, progress TO authenticated;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Bloom Academia database schema created successfully!';
  RAISE NOTICE '📊 Created tables: users, lessons, sessions, interactions, progress';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '📈 Analytics views created';
  RAISE NOTICE '⚙️ Helper functions added';
  RAISE NOTICE '🌱 Sample lessons inserted';
END $$;
