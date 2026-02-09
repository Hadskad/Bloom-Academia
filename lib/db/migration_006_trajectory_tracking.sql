-- =====================================================
-- MIGRATION 006: Trajectory Tracking Table
-- =====================================================
-- Purpose: Add trajectory_snapshots table to track learning trends over time
-- Criterion: ROADMAP_TO_100_PERCENT.md - Criterion 4 (Memory Persists)
-- Date: 2026-02-07
--
-- What this enables:
-- - Track student progress trends (improving/declining/stable)
-- - Historical trajectory analysis and charting
-- - Predictive insights for next lesson difficulty
-- - Analytics on learning patterns across subjects
--
-- Dependencies:
-- - Requires users table
-- - Requires sessions table
-- =====================================================

-- Create trajectory_snapshots table
CREATE TABLE IF NOT EXISTS trajectory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'science', 'english', 'history', 'art', 'other')),
  trend TEXT NOT NULL CHECK (trend IN ('improving', 'declining', 'stable', 'insufficient_data')),
  recent_average FLOAT NOT NULL CHECK (recent_average >= 0 AND recent_average <= 100),
  session_count INTEGER NOT NULL CHECK (session_count >= 0),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  score_delta FLOAT NOT NULL,
  volatility FLOAT NOT NULL CHECK (volatility >= 0),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trajectory queries
CREATE INDEX IF NOT EXISTS idx_trajectory_snapshots_user ON trajectory_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_trajectory_snapshots_subject ON trajectory_snapshots(subject);
CREATE INDEX IF NOT EXISTS idx_trajectory_snapshots_trend ON trajectory_snapshots(trend);
CREATE INDEX IF NOT EXISTS idx_trajectory_snapshots_analyzed ON trajectory_snapshots(analyzed_at DESC);

-- Composite index for user + subject + time queries
CREATE INDEX IF NOT EXISTS idx_trajectory_snapshots_user_subject_time
  ON trajectory_snapshots(user_id, subject, analyzed_at DESC);

-- Enable Row Level Security
ALTER TABLE trajectory_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own trajectory snapshots
CREATE POLICY "Users can view own trajectory snapshots"
  ON trajectory_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert trajectory snapshots
CREATE POLICY "System can insert trajectory snapshots"
  ON trajectory_snapshots FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Analytics View: Latest Trajectory Per Subject
-- =====================================================
CREATE OR REPLACE VIEW latest_trajectories AS
SELECT DISTINCT ON (user_id, subject)
  user_id,
  subject,
  trend,
  recent_average,
  session_count,
  confidence,
  analyzed_at
FROM trajectory_snapshots
ORDER BY user_id, subject, analyzed_at DESC;

-- =====================================================
-- Analytics View: User Progress Summary
-- =====================================================
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT
  u.id as user_id,
  u.name,
  u.grade_level,
  u.learning_style,
  COALESCE(
    (SELECT COUNT(*) FROM trajectory_snapshots WHERE user_id = u.id AND trend = 'improving'),
    0
  ) as improving_subjects,
  COALESCE(
    (SELECT COUNT(*) FROM trajectory_snapshots WHERE user_id = u.id AND trend = 'declining'),
    0
  ) as declining_subjects,
  COALESCE(
    (SELECT AVG(recent_average) FROM trajectory_snapshots WHERE user_id = u.id),
    0
  ) as overall_average
FROM users u;

-- =====================================================
-- Helper Function: Get Latest Trajectory
-- =====================================================
CREATE OR REPLACE FUNCTION get_latest_trajectory(
  p_user_id UUID,
  p_subject TEXT
)
RETURNS TABLE (
  trend TEXT,
  recent_average FLOAT,
  confidence FLOAT,
  analyzed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.trend,
    ts.recent_average,
    ts.confidence,
    ts.analyzed_at
  FROM trajectory_snapshots ts
  WHERE ts.user_id = p_user_id
    AND ts.subject = p_subject
  ORDER BY ts.analyzed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Helper Function: Cleanup Old Snapshots
-- =====================================================
-- Keep only last 30 snapshots per user per subject
CREATE OR REPLACE FUNCTION cleanup_old_trajectory_snapshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete snapshots beyond the 30 most recent per user/subject
  WITH ranked_snapshots AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, subject
        ORDER BY analyzed_at DESC
      ) as rn
    FROM trajectory_snapshots
  )
  DELETE FROM trajectory_snapshots
  WHERE id IN (
    SELECT id FROM ranked_snapshots WHERE rn > 30
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Grants for authenticated users
-- =====================================================
GRANT SELECT ON trajectory_snapshots TO authenticated;
GRANT SELECT ON latest_trajectories TO authenticated;
GRANT SELECT ON user_progress_summary TO authenticated;

-- =====================================================
-- Completion Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 006: Trajectory Tracking Table created successfully!';
  RAISE NOTICE '📊 Created table: trajectory_snapshots';
  RAISE NOTICE '📈 Created views: latest_trajectories, user_progress_summary';
  RAISE NOTICE '⚙️ Created functions: get_latest_trajectory, cleanup_old_trajectory_snapshots';
  RAISE NOTICE '🔒 Row Level Security enabled';
END $$;
