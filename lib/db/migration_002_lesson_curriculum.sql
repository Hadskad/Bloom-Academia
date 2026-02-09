-- Bloom Academia Database Migration 002
-- Lesson Curriculum Content Table
-- Run this in Supabase SQL Editor
-- Date: February 2026
-- Purpose: Move hardcoded curriculum from context-builder.ts to database

-- =====================================================
-- LESSON CURRICULUM TABLE
-- =====================================================
-- Stores detailed teaching curriculum/instructions for each lesson
-- This replaces the hardcoded curriculumLibrary in context-builder.ts

CREATE TABLE IF NOT EXISTS lesson_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

  -- Full curriculum content (the detailed teaching instructions)
  curriculum_content TEXT NOT NULL,

  -- Metadata for curriculum management
  version INTEGER DEFAULT 1,
  author TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each lesson can only have one curriculum
  UNIQUE(lesson_id)
);

-- Index for fast lesson lookups
CREATE INDEX IF NOT EXISTS idx_lesson_curriculum_lesson ON lesson_curriculum(lesson_id);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_lesson_curriculum_updated_at
  BEFORE UPDATE ON lesson_curriculum
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE lesson_curriculum ENABLE ROW LEVEL SECURITY;

-- Everyone can read curriculum (needed for teaching)
CREATE POLICY "Anyone can view lesson curriculum"
  ON lesson_curriculum FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT ON lesson_curriculum TO authenticated;

-- =====================================================
-- HELPER FUNCTION
-- =====================================================

-- Function: Get curriculum for a lesson (with fallback)
CREATE OR REPLACE FUNCTION get_lesson_curriculum(p_lesson_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_curriculum TEXT;
  v_lesson_title TEXT;
BEGIN
  -- Try to get curriculum from table
  SELECT curriculum_content INTO v_curriculum
  FROM lesson_curriculum
  WHERE lesson_id = p_lesson_id;

  -- If found, return it
  IF v_curriculum IS NOT NULL THEN
    RETURN v_curriculum;
  END IF;

  -- Fallback: Return generic curriculum template
  SELECT title INTO v_lesson_title
  FROM lessons
  WHERE id = p_lesson_id;

  RETURN format('
LESSON CURRICULUM: %s

Follow these teaching principles:
1. Start with an engaging introduction
2. Teach core concepts clearly
3. Provide visual examples when helpful
4. Check understanding with questions
5. Guide through practice problems
6. Summarize key learnings

Adapt your teaching to the student''s responses and comprehension level.
', COALESCE(v_lesson_title, 'Unknown Lesson'));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Migration 002 Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Created table: lesson_curriculum';
  RAISE NOTICE 'Created function: get_lesson_curriculum()';
  RAISE NOTICE 'RLS and indexes configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run seed_lesson_curriculum.sql';
  RAISE NOTICE '=========================================';
END $$;
