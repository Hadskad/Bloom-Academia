-- =====================================================
-- CONCEPT TAGGING: Introduction to Fractions Assessment
-- =====================================================
-- Purpose: Tag existing assessment questions with concept identifiers
--          for diagnostic remediation system
--
-- Assessment: Introduction to Fractions (Grade 5 Math)
-- Lesson ID: 0d27645e-54b0-418f-b62f-e848087d7db9
--
-- Concepts Identified:
-- 1. numerator_denominator - Understanding top/bottom numbers
-- 2. fraction_visualization - Visual representation and shading
-- 3. fraction_comparison - Comparing fraction sizes
-- 4. whole_fractions - Understanding complete wholes
--
-- Reference: ROADMAP_TO_100_PERCENT.md - Step 1 (Concept Tagging)
-- =====================================================

-- =====================================================
-- Update Fractions Assessment with Concept Tags
-- =====================================================

UPDATE assessments
SET concept_tags = '[
  {
    "concept": "numerator_denominator",
    "display_name": "Numerator & Denominator",
    "description": "Understanding what the top and bottom numbers of a fraction represent",
    "questions": ["q1", "q2", "q5", "q8"]
  },
  {
    "concept": "fraction_visualization",
    "display_name": "Visual Representation",
    "description": "Understanding fractions through diagrams and shaded parts",
    "questions": ["q3", "q6", "q9"]
  },
  {
    "concept": "fraction_comparison",
    "display_name": "Comparing Fractions",
    "description": "Determining which fraction is larger or smaller",
    "questions": ["q7", "q10"]
  },
  {
    "concept": "whole_fractions",
    "display_name": "Understanding Wholes",
    "description": "Recognizing when fractions represent complete wholes",
    "questions": ["q4", "q11", "q12"]
  }
]'::jsonb
WHERE lesson_id = '0d27645e-54b0-418f-b62f-e848087d7db9'::uuid;

-- =====================================================
-- Add Concept Tags to Individual Questions
-- =====================================================
-- Also add concept identifiers directly to each question object
-- This provides redundancy and makes diagnostic analysis easier

DO $$
DECLARE
  assessment_record RECORD;
  questions_array JSONB;
  question JSONB;
  updated_questions JSONB := '[]'::jsonb;
BEGIN
  -- Get the assessment
  SELECT * INTO assessment_record
  FROM assessments
  WHERE lesson_id = '0d27645e-54b0-418f-b62f-e848087d7db9'::uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fractions assessment not found';
  END IF;

  questions_array := assessment_record.questions;

  -- Update each question with concept tags
  FOR question IN SELECT * FROM jsonb_array_elements(questions_array)
  LOOP
    CASE question->>'id'
      -- Numerator/Denominator Questions
      WHEN 'q1' THEN
        question := jsonb_set(question, '{concepts}', '["numerator_denominator"]'::jsonb);
      WHEN 'q2' THEN
        question := jsonb_set(question, '{concepts}', '["numerator_denominator"]'::jsonb);
      WHEN 'q5' THEN
        question := jsonb_set(question, '{concepts}', '["numerator_denominator"]'::jsonb);
      WHEN 'q8' THEN
        question := jsonb_set(question, '{concepts}', '["numerator_denominator"]'::jsonb);

      -- Fraction Visualization Questions
      WHEN 'q3' THEN
        question := jsonb_set(question, '{concepts}', '["fraction_visualization"]'::jsonb);
      WHEN 'q6' THEN
        question := jsonb_set(question, '{concepts}', '["fraction_visualization"]'::jsonb);
      WHEN 'q9' THEN
        question := jsonb_set(question, '{concepts}', '["fraction_visualization"]'::jsonb);

      -- Fraction Comparison Questions
      WHEN 'q7' THEN
        question := jsonb_set(question, '{concepts}', '["fraction_comparison"]'::jsonb);
      WHEN 'q10' THEN
        question := jsonb_set(question, '{concepts}', '["fraction_comparison"]'::jsonb);

      -- Whole Fractions Questions
      WHEN 'q4' THEN
        question := jsonb_set(question, '{concepts}', '["whole_fractions"]'::jsonb);
      WHEN 'q11' THEN
        question := jsonb_set(question, '{concepts}', '["whole_fractions"]'::jsonb);
      WHEN 'q12' THEN
        question := jsonb_set(question, '{concepts}', '["whole_fractions"]'::jsonb);
    END CASE;

    updated_questions := updated_questions || jsonb_build_array(question);
  END LOOP;

  -- Update the assessment with tagged questions
  UPDATE assessments
  SET questions = updated_questions,
      updated_at = NOW()
  WHERE id = assessment_record.id;

  RAISE NOTICE 'Successfully tagged % questions with concepts', jsonb_array_length(updated_questions);
END $$;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify concept tags were applied correctly

SELECT
  a.id AS assessment_id,
  a.title,
  a.concept_tags,
  jsonb_array_length(a.questions) AS total_questions,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(a.questions) AS q
    WHERE q ? 'concepts'
  ) AS questions_with_concepts
FROM assessments a
WHERE a.lesson_id = '0d27645e-54b0-418f-b62f-e848087d7db9'::uuid;

-- =====================================================
-- Expected Output:
-- =====================================================
-- assessment_id | title | concept_tags (4 concepts) | total_questions: 12 | questions_with_concepts: 12
--
-- If questions_with_concepts = 12, tagging was successful!
-- =====================================================
