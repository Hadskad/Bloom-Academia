-- =====================================================
-- ASSESSMENT SEED DATA: Grade 3 Mathematics
-- =====================================================
-- This script seeds assessments for the first 5 Grade 3 Math lessons
-- Each assessment has 3 questions with varied types
--
-- Reference: Implementation_Roadmap_2.md - Day 23
-- =====================================================

-- =====================================================
-- ASSESSMENT 1: Counting to 100
-- =====================================================
INSERT INTO assessments (lesson_id, title, description, questions, passing_score, max_attempts)
SELECT
  (SELECT id FROM lessons WHERE title = 'Counting to 100' AND grade_level = 3 LIMIT 1),
  'Counting Mastery Check',
  'Quick check to verify counting skills from 1 to 100',
  '[
    {
      "id": "q1",
      "text": "What number comes after 49?",
      "type": "number",
      "correct_answer": "50",
      "points": 33.33,
      "hint": "Think about what follows 49 when counting"
    },
    {
      "id": "q2",
      "text": "If you count by tens starting from 10, what are the first five numbers you say?",
      "type": "sequence",
      "correct_answer": "10, 20, 30, 40, 50",
      "points": 33.33,
      "hint": "Start at 10 and add 10 each time"
    },
    {
      "id": "q3",
      "text": "True or false: 78 comes before 87 when counting",
      "type": "true_false",
      "correct_answer": "true",
      "points": 33.34,
      "hint": "Compare the tens place first"
    }
  ]'::jsonb,
  80.0,
  3
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Counting to 100' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSESSMENT 2: Place Value Basics
-- =====================================================
INSERT INTO assessments (lesson_id, title, description, questions, passing_score, max_attempts)
SELECT
  (SELECT id FROM lessons WHERE title = 'Place Value Basics' AND grade_level = 3 LIMIT 1),
  'Place Value Understanding Check',
  'Assess understanding of ones, tens, and hundreds places',
  '[
    {
      "id": "q1",
      "text": "In the number 345, what digit is in the tens place?",
      "type": "number",
      "correct_answer": "4",
      "points": 33.33,
      "hint": "The tens place is in the middle of a 3-digit number"
    },
    {
      "id": "q2",
      "text": "What is the value of the 7 in the number 273?",
      "type": "number",
      "correct_answer": "70",
      "points": 33.33,
      "hint": "Look at which place the 7 is in"
    },
    {
      "id": "q3",
      "text": "True or false: In the number 582, the 5 represents 5 hundreds",
      "type": "true_false",
      "correct_answer": "true",
      "points": 33.34,
      "hint": "The first digit in a 3-digit number is the hundreds place"
    }
  ]'::jsonb,
  80.0,
  3
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Place Value Basics' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSESSMENT 3: Addition Basics
-- =====================================================
INSERT INTO assessments (lesson_id, title, description, questions, passing_score, max_attempts)
SELECT
  (SELECT id FROM lessons WHERE title = 'Addition Basics' AND grade_level = 3 LIMIT 1),
  'Addition Skills Check',
  'Test basic addition without regrouping',
  '[
    {
      "id": "q1",
      "text": "What is 23 plus 45?",
      "type": "number",
      "correct_answer": "68",
      "points": 33.33,
      "hint": "Add the ones place first, then the tens place"
    },
    {
      "id": "q2",
      "text": "If you have 12 apples and your friend gives you 15 more, how many apples do you have in total?",
      "type": "number",
      "correct_answer": "27",
      "points": 33.33,
      "hint": "This is an addition word problem"
    },
    {
      "id": "q3",
      "text": "What is 30 plus 20?",
      "type": "number",
      "correct_answer": "50",
      "points": 33.34,
      "hint": "Add the tens: 3 tens plus 2 tens"
    }
  ]'::jsonb,
  80.0,
  3
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Addition Basics' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSESSMENT 4: Subtraction Basics
-- =====================================================
INSERT INTO assessments (lesson_id, title, description, questions, passing_score, max_attempts)
SELECT
  (SELECT id FROM lessons WHERE title = 'Subtraction Basics' AND grade_level = 3 LIMIT 1),
  'Subtraction Skills Check',
  'Test basic subtraction without borrowing',
  '[
    {
      "id": "q1",
      "text": "What is 58 minus 23?",
      "type": "number",
      "correct_answer": "35",
      "points": 33.33,
      "hint": "Subtract ones first, then tens"
    },
    {
      "id": "q2",
      "text": "You have 47 candies and you eat 15 of them. How many candies do you have left?",
      "type": "number",
      "correct_answer": "32",
      "points": 33.33,
      "hint": "This is a subtraction word problem"
    },
    {
      "id": "q3",
      "text": "What is 90 minus 40?",
      "type": "number",
      "correct_answer": "50",
      "points": 33.34,
      "hint": "Subtract the tens: 9 tens minus 4 tens"
    }
  ]'::jsonb,
  80.0,
  3
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Subtraction Basics' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSESSMENT 5: Addition with Regrouping
-- =====================================================
INSERT INTO assessments (lesson_id, title, description, questions, passing_score, max_attempts)
SELECT
  (SELECT id FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3 LIMIT 1),
  'Regrouping Addition Check',
  'Test addition with carrying/regrouping',
  '[
    {
      "id": "q1",
      "text": "What is 37 plus 28?",
      "type": "number",
      "correct_answer": "65",
      "points": 33.33,
      "hint": "Add ones: 7 + 8 = 15. Write 5, carry 1. Then add tens: 3 + 2 + 1"
    },
    {
      "id": "q2",
      "text": "What is 156 plus 87?",
      "type": "number",
      "correct_answer": "243",
      "points": 33.33,
      "hint": "Be careful to regroup when adding each place value"
    },
    {
      "id": "q3",
      "text": "True or false: When adding 49 plus 53, you need to regroup in the ones place",
      "type": "true_false",
      "correct_answer": "true",
      "points": 33.34,
      "hint": "Look at the ones place: 9 + 3 = 12, which is more than 10"
    }
  ]'::jsonb,
  80.0,
  3
WHERE EXISTS (SELECT 1 FROM lessons WHERE title = 'Addition with Regrouping' AND grade_level = 3)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERY (Optional - for testing)
-- =====================================================
-- Uncomment to verify assessments were created:
/*
SELECT
  a.title,
  l.title AS lesson_title,
  jsonb_array_length(a.questions) AS question_count,
  a.passing_score,
  a.max_attempts
FROM assessments a
JOIN lessons l ON a.lesson_id = l.id
WHERE l.grade_level = 3 AND l.subject = 'math'
ORDER BY l.created_at;
*/
