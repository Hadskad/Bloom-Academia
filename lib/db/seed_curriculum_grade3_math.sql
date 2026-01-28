-- =====================================================
-- CURRICULUM SEED DATA: Grade 3 Mathematics
-- =====================================================
-- This script seeds:
-- 1. Grade 3 math lessons in logical progression
-- 2. Lesson prerequisites with required mastery levels
-- 3. Curriculum path for Math Grade 3
--
-- Reference: Implementation_Roadmap_2.md - Days 19-22
-- =====================================================

-- =====================================================
-- GRADE 3 MATH LESSONS
-- =====================================================
-- Insert lessons in order of difficulty/sequence
-- Using ON CONFLICT DO NOTHING to allow re-running script

INSERT INTO lessons (title, subject, grade_level, learning_objective, estimated_duration, difficulty)
VALUES
  -- Level 1: Foundation (No prerequisites)
  ('Counting to 100', 'math', 3, 'Master counting from 1 to 100 and recognize number patterns', 25, 'easy'),
  ('Place Value Basics', 'math', 3, 'Understand ones, tens, and hundreds places', 30, 'easy'),

  -- Level 2: Basic Operations (Requires counting/place value)
  ('Addition Basics', 'math', 3, 'Learn single and double-digit addition without regrouping', 35, 'easy'),
  ('Subtraction Basics', 'math', 3, 'Master subtraction without borrowing', 35, 'easy'),
  ('Addition with Regrouping', 'math', 3, 'Add multi-digit numbers with carrying', 40, 'medium'),
  ('Subtraction with Borrowing', 'math', 3, 'Subtract multi-digit numbers with borrowing', 40, 'medium'),

  -- Level 3: Intermediate Operations (Requires addition/subtraction)
  ('Introduction to Multiplication', 'math', 3, 'Understand multiplication as repeated addition', 40, 'medium'),
  ('Multiplication Tables 1-5', 'math', 3, 'Memorize and apply times tables 1 through 5', 45, 'medium'),
  ('Multiplication Tables 6-10', 'math', 3, 'Memorize and apply times tables 6 through 10', 45, 'medium'),

  -- Level 4: Advanced Operations (Requires multiplication)
  ('Introduction to Division', 'math', 3, 'Understand division as splitting into equal groups', 40, 'medium'),
  ('Division with Remainders', 'math', 3, 'Learn to divide with remainders and interpret results', 45, 'hard'),

  -- Level 5: Fractions (Requires division understanding)
  ('Understanding Fractions', 'math', 3, 'Learn what fractions represent using visual models', 35, 'medium'),
  ('Comparing Fractions', 'math', 3, 'Compare fractions with same denominators using models', 40, 'hard')

ON CONFLICT (title, subject, grade_level) DO NOTHING;

-- =====================================================
-- LESSON PREREQUISITES
-- =====================================================
-- Define prerequisite relationships
-- Format: (lesson, requires prerequisite, mastery level needed)

-- Get lesson IDs for prerequisites (using subqueries)
-- Note: These run after lessons are inserted

-- Addition with Regrouping requires Addition Basics
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Addition Basics' AND grade_level = 3 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Addition Basics' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Subtraction with Borrowing requires Subtraction Basics
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Subtraction with Borrowing' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Subtraction Basics' AND grade_level = 3 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Subtraction with Borrowing' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Subtraction Basics' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Introduction to Multiplication requires Addition with Regrouping
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Introduction to Multiplication' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3 LIMIT 1),
  75.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Introduction to Multiplication' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Multiplication Tables 1-5 requires Introduction to Multiplication
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Introduction to Multiplication' AND grade_level = 3 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Introduction to Multiplication' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Multiplication Tables 6-10 requires Multiplication Tables 1-5
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Multiplication Tables 6-10' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3 LIMIT 1),
  85.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Multiplication Tables 6-10' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Introduction to Division requires Multiplication Tables 1-5
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Introduction to Division' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Introduction to Division' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Division with Remainders requires Introduction to Division
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Division with Remainders' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Introduction to Division' AND grade_level = 3 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Division with Remainders' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Introduction to Division' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Understanding Fractions requires Division with Remainders
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Understanding Fractions' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Division with Remainders' AND grade_level = 3 LIMIT 1),
  75.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Understanding Fractions' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Division with Remainders' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- Comparing Fractions requires Understanding Fractions
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Comparing Fractions' AND grade_level = 3 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Understanding Fractions' AND grade_level = 3 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Comparing Fractions' AND grade_level = 3)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Understanding Fractions' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- CURRICULUM PATH: Math Grade 3
-- =====================================================
-- Create ordered lesson sequence for Grade 3 Math
-- This enables automatic next-lesson assignment

-- First, build the lesson sequence array
WITH lesson_sequence AS (
  SELECT ARRAY[
    (SELECT id FROM lessons WHERE title = 'Counting to 100' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Place Value Basics' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Addition Basics' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Subtraction Basics' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Subtraction with Borrowing' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Introduction to Multiplication' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Multiplication Tables 1-5' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Multiplication Tables 6-10' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Introduction to Division' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Division with Remainders' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Understanding Fractions' AND grade_level = 3 LIMIT 1),
    (SELECT id FROM lessons WHERE title = 'Comparing Fractions' AND grade_level = 3 LIMIT 1)
  ] AS sequence
)
INSERT INTO curriculum_paths (subject, grade_level, lesson_sequence, total_lessons, estimated_duration_weeks, description)
SELECT
  'math',
  3,
  sequence,
  array_length(sequence, 1),
  8,  -- 13 lessons * ~40 min avg = ~520 minutes = ~8.5 hours, spread over 8 weeks
  'Complete Grade 3 Mathematics curriculum covering counting, addition, subtraction, multiplication, division, and basic fractions'
FROM lesson_sequence
WHERE (SELECT sequence FROM lesson_sequence) IS NOT NULL
ON CONFLICT (subject, grade_level)
DO UPDATE SET
  lesson_sequence = EXCLUDED.lesson_sequence,
  total_lessons = EXCLUDED.total_lessons,
  estimated_duration_weeks = EXCLUDED.estimated_duration_weeks,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- =====================================================

-- Verify lessons were inserted
-- SELECT title, subject, grade_level, difficulty
-- FROM lessons
-- WHERE grade_level = 3 AND subject = 'math'
-- ORDER BY created_at;

-- Verify prerequisites were created
-- SELECT
--   l1.title AS lesson,
--   l2.title AS requires_prerequisite,
--   lp.required_mastery_level
-- FROM lesson_prerequisites lp
-- JOIN lessons l1 ON lp.lesson_id = l1.id
-- JOIN lessons l2 ON lp.prerequisite_lesson_id = l2.id
-- WHERE l1.grade_level = 3
-- ORDER BY l1.title;

-- Verify curriculum path was created
-- SELECT
--   subject,
--   grade_level,
--   total_lessons,
--   estimated_duration_weeks,
--   array_length(lesson_sequence, 1) as lesson_count
-- FROM curriculum_paths
-- WHERE subject = 'math' AND grade_level = 3;
