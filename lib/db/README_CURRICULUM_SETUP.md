# Curriculum System Database Setup

This guide explains how to set up the curriculum sequencing system in Supabase.

## Database Files

### Core Schema
- `schema.sql` - Original database schema with users, lessons, sessions, progress
- `migration_001_multi_ai_system.sql` - Multi-AI agents + curriculum tables

### Seed Data
- `seed_ai_agents.sql` - Seeds 8 AI agents (Coordinator + 5 Subject + 2 Support)
- `seed_curriculum_grade3_math.sql` - **NEW** Grade 3 math lessons + prerequisites + curriculum path
- `seed_prerequisites_grade5.sql` - **NEW** Prerequisites for existing Grade 5 lessons

## Setup Instructions

### Step 1: Verify Core Tables Exist
The following tables should already exist from previous migrations:
- `users`
- `lessons`
- `sessions`
- `interactions`
- `progress`
- `ai_agents`
- `agent_interactions`
- `lesson_prerequisites`
- `curriculum_paths`
- `student_curriculum_progress`

### Step 2: Seed Grade 3 Math Curriculum (MVP)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `seed_curriculum_grade3_math.sql`
3. Paste and execute
4. Verify results:

```sql
-- Should show 13 lessons
SELECT COUNT(*) FROM lessons WHERE grade_level = 3 AND subject = 'math';

-- Should show 10 prerequisite relationships
SELECT COUNT(*) FROM lesson_prerequisites
WHERE lesson_id IN (SELECT id FROM lessons WHERE grade_level = 3);

-- Should show 1 curriculum path
SELECT * FROM curriculum_paths WHERE subject = 'math' AND grade_level = 3;
```

### Step 3: Seed Grade 5 Prerequisites (Optional)

1. Copy contents of `seed_prerequisites_grade5.sql`
2. Paste and execute in SQL Editor
3. Verify:

```sql
-- Should show prerequisite relationships for Grade 5
SELECT
  l1.title AS lesson,
  l2.title AS requires,
  lp.required_mastery_level
FROM lesson_prerequisites lp
JOIN lessons l1 ON lp.lesson_id = l1.id
JOIN lessons l2 ON lp.prerequisite_lesson_id = l2.id
WHERE l1.grade_level = 5
ORDER BY l1.subject, l1.title;
```

## Grade 3 Math Curriculum Structure

The seeded curriculum follows this progression:

### Level 1: Foundation (No Prerequisites)
1. Counting to 100
2. Place Value Basics

### Level 2: Basic Operations
3. Addition Basics
4. Subtraction Basics
5. Addition with Regrouping (requires Addition Basics 80%)
6. Subtraction with Borrowing (requires Subtraction Basics 80%)

### Level 3: Intermediate Operations
7. Introduction to Multiplication (requires Addition with Regrouping 75%)
8. Multiplication Tables 1-5 (requires Intro to Multiplication 80%)
9. Multiplication Tables 6-10 (requires Tables 1-5 85%)

### Level 4: Advanced Operations
10. Introduction to Division (requires Tables 1-5 80%)
11. Division with Remainders (requires Intro to Division 80%)

### Level 5: Fractions
12. Understanding Fractions (requires Division with Remainders 75%)
13. Comparing Fractions (requires Understanding Fractions 80%)

## Curriculum Path

The `curriculum_paths` table contains the ordered lesson sequence:
- **Subject**: math
- **Grade Level**: 3
- **Total Lessons**: 13
- **Estimated Duration**: 8 weeks
- **Lesson Sequence**: Array of lesson IDs in learning order

## Testing the System

### Test 1: Check Prerequisites
```sql
-- Get all prerequisites for "Division with Remainders"
SELECT
  l.title AS prerequisite_lesson,
  lp.required_mastery_level
FROM lesson_prerequisites lp
JOIN lessons l ON lp.prerequisite_lesson_id = l.id
WHERE lp.lesson_id = (
  SELECT id FROM lessons
  WHERE title = 'Division with Remainders' AND grade_level = 3
);
```

### Test 2: View Complete Prerequisite Chain
```sql
-- See entire prerequisite tree
WITH RECURSIVE prereq_tree AS (
  -- Start with a lesson
  SELECT
    l.id,
    l.title,
    0 AS level
  FROM lessons l
  WHERE l.title = 'Comparing Fractions' AND l.grade_level = 3

  UNION ALL

  -- Find prerequisites recursively
  SELECT
    l.id,
    l.title,
    pt.level + 1
  FROM lesson_prerequisites lp
  JOIN lessons l ON lp.prerequisite_lesson_id = l.id
  JOIN prereq_tree pt ON lp.lesson_id = pt.id
)
SELECT
  REPEAT('  ', level) || title AS prerequisite_chain,
  level
FROM prereq_tree
ORDER BY level DESC;
```

### Test 3: Curriculum Path Lessons
```sql
-- View all lessons in the curriculum path in order
SELECT
  ROW_NUMBER() OVER () AS sequence_number,
  l.title,
  l.difficulty,
  l.estimated_duration
FROM curriculum_paths cp
CROSS JOIN UNNEST(cp.lesson_sequence) WITH ORDINALITY AS seq(lesson_id, ord)
JOIN lessons l ON l.id = seq.lesson_id
WHERE cp.subject = 'math' AND cp.grade_level = 3
ORDER BY seq.ord;
```

## Expanding to Other Subjects

To add curriculum for other subjects (Science, English, etc.), follow this template:

### 1. Create New Seed File
Copy `seed_curriculum_grade3_math.sql` and modify:
- Change subject to 'science', 'english', etc.
- Update lesson titles and objectives
- Define appropriate prerequisites
- Create curriculum path

### 2. File Naming Convention
```
seed_curriculum_[subject]_grade[N].sql
```

Examples:
- `seed_curriculum_science_grade3.sql`
- `seed_curriculum_english_grade4.sql`

### 3. Key Changes Needed
```sql
-- Update subject in INSERT statements
INSERT INTO lessons (title, subject, grade_level, ...)
VALUES
  ('Lesson Title', 'science', 3, ...),  -- Change 'math' to your subject
  ...

-- Update curriculum path
INSERT INTO curriculum_paths (subject, grade_level, ...)
SELECT
  'science',  -- Change subject here
  3,
  ...
```

## Re-Running Seeds

All seed scripts use `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`, making them safe to re-run:
- Lessons: Won't duplicate if title+subject+grade already exists
- Prerequisites: Won't duplicate (primary key constraint)
- Curriculum paths: Will update if subject+grade exists

## Next Steps

After seeding data:
1. Test prerequisite checker: `lib/curriculum/prerequisite-checker.ts`
2. Test next lesson API: `app/api/curriculum/next-lesson/route.ts`
3. Update frontend to use curriculum system
4. Initialize student curriculum progress when users start

## Troubleshooting

### No lessons found
```sql
-- Check if lessons were inserted
SELECT * FROM lessons WHERE grade_level = 3 AND subject = 'math';
```

### Prerequisites not linking
```sql
-- Check if both lessons exist first
SELECT id, title FROM lessons
WHERE title IN ('Division with Remainders', 'Introduction to Division')
AND grade_level = 3;
```

### Curriculum path empty
```sql
-- Check curriculum path
SELECT
  subject,
  grade_level,
  total_lessons,
  array_length(lesson_sequence, 1) as actual_lesson_count
FROM curriculum_paths
WHERE subject = 'math' AND grade_level = 3;
```

If `actual_lesson_count` is NULL or doesn't match `total_lessons`, re-run the curriculum path section of the seed script.
