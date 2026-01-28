-- =====================================================
-- LESSON PREREQUISITES: Grade 5
-- =====================================================
-- Add prerequisite relationships for existing Grade 5 lessons
-- This demonstrates the prerequisite system with current data
--
-- Reference: Implementation_Roadmap_2.md - Days 19-22
-- =====================================================

-- Grade 5 Math Prerequisites
-- Adding and Subtracting Fractions requires Introduction to Fractions
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Adding and Subtracting Fractions' AND grade_level = 5 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Introduction to Fractions' AND grade_level = 5 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Adding and Subtracting Fractions' AND grade_level = 5)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Introduction to Fractions' AND grade_level = 5)
ON CONFLICT DO NOTHING;

-- Multiplying Fractions requires Adding and Subtracting Fractions
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Multiplying Fractions' AND grade_level = 5 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Adding and Subtracting Fractions' AND grade_level = 5 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Multiplying Fractions' AND grade_level = 5)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Adding and Subtracting Fractions' AND grade_level = 5)
ON CONFLICT DO NOTHING;

-- Dividing Fractions requires Multiplying Fractions
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Dividing Fractions' AND grade_level = 5 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Multiplying Fractions' AND grade_level = 5 LIMIT 1),
  80.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Dividing Fractions' AND grade_level = 5)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Multiplying Fractions' AND grade_level = 5)
ON CONFLICT DO NOTHING;

-- Grade 5 English Prerequisites
-- Sentence Structure requires Parts of Speech
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Sentence Structure' AND grade_level = 5 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Parts of Speech' AND grade_level = 5 LIMIT 1),
  75.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Sentence Structure' AND grade_level = 5)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Parts of Speech' AND grade_level = 5)
ON CONFLICT DO NOTHING;

-- Reading Comprehension Strategies requires Sentence Structure
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT
  (SELECT id FROM lessons WHERE title = 'Reading Comprehension Strategies' AND grade_level = 5 LIMIT 1),
  (SELECT id FROM lessons WHERE title = 'Sentence Structure' AND grade_level = 5 LIMIT 1),
  75.0
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Reading Comprehension Strategies' AND grade_level = 5)
  AND EXISTS (SELECT 1 FROM lessons WHERE title = 'Sentence Structure' AND grade_level = 5)
ON CONFLICT DO NOTHING;
