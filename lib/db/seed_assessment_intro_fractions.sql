-- =====================================================
-- ASSESSMENT SEED DATA: Introduction to Fractions
-- =====================================================
-- This script seeds an MCQ assessment for Introduction to Fractions lesson
-- 12 multiple choice questions covering basic fraction concepts
--
-- Lesson: Introduction to Fractions (Grade 5 Math)
-- Topics: Understanding fractions, visual representation, numerator/denominator
-- =====================================================

-- =====================================================
-- ASSESSMENT: Introduction to Fractions
-- =====================================================
INSERT INTO assessments (lesson_id, title, description, questions, passing_score, max_attempts)
SELECT
  '0d27645e-54b0-418f-b62f-e848087d7db9'::uuid,  -- Your lesson ID
  'Introduction to Fractions - Mastery Check',
  'Test your understanding of basic fraction concepts and visual representation',
  '[
    {
      "id": "q1",
      "text": "What does the numerator of a fraction represent?",
      "type": "multiple_choice",
      "options": [
        "The total number of equal parts",
        "The number of parts you have",
        "The size of each part",
        "The whole number"
      ],
      "correct_answer": "The number of parts you have",
      "points": 8.33,
      "hint": "Think about what the top number tells you"
    },
    {
      "id": "q2",
      "text": "In the fraction 3/4, what number is the denominator?",
      "type": "multiple_choice",
      "options": ["3", "4", "7", "12"],
      "correct_answer": "4",
      "points": 8.33,
      "hint": "The denominator is the bottom number"
    },
    {
      "id": "q3",
      "text": "If a pizza is cut into 8 equal slices and you eat 3 slices, what fraction of the pizza did you eat?",
      "type": "multiple_choice",
      "options": ["3/8", "8/3", "5/8", "3/5"],
      "correct_answer": "3/8",
      "points": 8.33,
      "hint": "Put the number of slices you ate over the total number of slices"
    },
    {
      "id": "q4",
      "text": "Which fraction represents one whole?",
      "type": "multiple_choice",
      "options": ["1/2", "2/2", "1/4", "0/1"],
      "correct_answer": "2/2",
      "points": 8.33,
      "hint": "When the numerator and denominator are equal, you have the whole"
    },
    {
      "id": "q5",
      "text": "What does the denominator of a fraction tell you?",
      "type": "multiple_choice",
      "options": [
        "How many parts you have",
        "How many equal parts make up the whole",
        "The size of the whole",
        "How many wholes there are"
      ],
      "correct_answer": "How many equal parts make up the whole",
      "points": 8.33,
      "hint": "The bottom number shows how many pieces the whole is divided into"
    },
    {
      "id": "q6",
      "text": "If you shade 2 out of 5 equal parts of a rectangle, what fraction is shaded?",
      "type": "multiple_choice",
      "options": ["5/2", "2/5", "3/5", "2/3"],
      "correct_answer": "2/5",
      "points": 8.34,
      "hint": "Shaded parts go on top, total parts go on bottom"
    },
    {
      "id": "q7",
      "text": "Which fraction is larger: 1/2 or 1/4?",
      "type": "multiple_choice",
      "options": [
        "1/2",
        "1/4",
        "They are equal",
        "Cannot be determined"
      ],
      "correct_answer": "1/2",
      "points": 8.34,
      "hint": "Imagine cutting a pizza into 2 pieces vs 4 pieces - which piece is bigger?"
    },
    {
      "id": "q8",
      "text": "In the fraction 5/6, how many parts make up the whole?",
      "type": "multiple_choice",
      "options": ["5", "6", "11", "1"],
      "correct_answer": "6",
      "points": 8.34,
      "hint": "Look at the denominator"
    },
    {
      "id": "q9",
      "text": "If a chocolate bar has 10 pieces and you have 7 pieces, what fraction represents how much is left?",
      "type": "multiple_choice",
      "options": ["7/10", "3/10", "10/7", "10/3"],
      "correct_answer": "3/10",
      "points": 8.34,
      "hint": "How many pieces are remaining out of the total?"
    },
    {
      "id": "q10",
      "text": "Which of these fractions represents half?",
      "type": "multiple_choice",
      "options": ["1/2", "2/1", "1/4", "2/4"],
      "correct_answer": "1/2",
      "points": 8.34,
      "hint": "Half means 1 out of 2 equal parts"
    },
    {
      "id": "q11",
      "text": "If you have 4/4 of something, how much do you have?",
      "type": "multiple_choice",
      "options": [
        "Nothing",
        "Half",
        "The whole thing",
        "Four things"
      ],
      "correct_answer": "The whole thing",
      "points": 8.34,
      "hint": "When you have all the parts, you have the whole"
    },
    {
      "id": "q12",
      "text": "What fraction of this circle is shaded if 3 out of 6 equal parts are colored?",
      "type": "multiple_choice",
      "options": ["6/3", "3/6", "3/9", "6/6"],
      "correct_answer": "3/6",
      "points": 8.32,
      "hint": "Shaded parts / Total parts"
    }
  ]'::jsonb,
  70.0,  -- 70% passing score (9 out of 12 questions correct)
  3      -- 3 attempts allowed
WHERE NOT EXISTS (
  SELECT 1 FROM assessments
  WHERE lesson_id = '0d27645e-54b0-418f-b62f-e848087d7db9'::uuid
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Assessment Seed Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Added: Introduction to Fractions assessment';
  RAISE NOTICE 'Questions: 12 multiple choice';
  RAISE NOTICE 'Passing score: 70%%';
  RAISE NOTICE 'Max attempts: 3';
  RAISE NOTICE '=========================================';
END $$;
