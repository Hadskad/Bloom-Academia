-- Quick verification queries to confirm setup

-- 1. Count Grade 3 Math lessons (should be 13)
SELECT COUNT(*) as grade3_math_lessons FROM lessons WHERE subject = 'math' AND grade_level = 3;

-- 2. Count prerequisites (should be 10)
SELECT COUNT(*) as prerequisites FROM lesson_prerequisites
WHERE lesson_id IN (SELECT id FROM lessons WHERE grade_level = 3 AND subject = 'math');

-- 3. Check curriculum path exists (should be 1)
SELECT COUNT(*) as curriculum_paths FROM curriculum_paths WHERE subject = 'math' AND grade_level = 3;
