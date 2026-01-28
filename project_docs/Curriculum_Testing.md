# Days 19-22 Curriculum Sequencing - Testing Guide

**Date**: January 24, 2026
**Purpose**: Systematic manual testing checklist for curriculum sequencing system
**Reference**: Implementation_Roadmap_2.md Days 19-22

---

## Pre-Testing Setup

### 1. Verify Database Schema Exists

**Command**:
```bash
# Option 1: Check via Supabase Dashboard
# Go to https://supabase.com/dashboard → Your Project → Table Editor
# Verify these tables exist:
# - lesson_prerequisites
# - curriculum_paths
# - student_curriculum_progress
```

**Command 2: Run SQL Migration** (if not already done):
```sql
-- Run this in Supabase SQL Editor
-- File: lib/db/migration_001_multi_ai_system.sql
-- (Copy and paste the entire migration file)
```

**Expected Result**:
- ✅ All 3 tables exist with correct columns
- ✅ Indexes created successfully
- ✅ Foreign key constraints in place

**Verification Query**:
```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lesson_prerequisites', 'curriculum_paths', 'student_curriculum_progress');

-- Should return 3 rows
```

---

### 2. Seed Curriculum Data

**Command**:
```bash
# Option 1: Run TypeScript seed script
npx ts-node scripts/seed-curriculum.ts
```

**Option 2: Run SQL seed file**:
```sql
-- In Supabase SQL Editor, run:
-- File: lib/db/seed_curriculum_grade3_math.sql
-- (Copy and paste entire file)
```

**Expected Result**:
- ✅ 13 Grade 3 Math lessons inserted
- ✅ 10 prerequisite relationships created
- ✅ 1 curriculum path for Math Grade 3 created

**Verification Queries**:
```sql
-- Check lessons seeded
SELECT COUNT(*) as lesson_count
FROM lessons
WHERE subject = 'math' AND grade_level = 3;
-- Expected: 13

-- Check prerequisites seeded
SELECT COUNT(*) as prereq_count
FROM lesson_prerequisites
WHERE lesson_id IN (
  SELECT id FROM lessons WHERE subject = 'math' AND grade_level = 3
);
-- Expected: 10

-- Check curriculum path exists
SELECT * FROM curriculum_paths
WHERE subject = 'math' AND grade_level = 3;
-- Expected: 1 row with lesson_sequence containing 13 UUIDs
```

---

### 3. Create Test User (if needed)

**Command** (Supabase SQL Editor):
```sql
-- Create a test user for testing
INSERT INTO users (name, age, grade_level, email)
VALUES
  ('Test Student', 9, 3, 'test@bloom.edu')
ON CONFLICT (email) DO NOTHING
RETURNING id, name, email;

-- Save the returned user ID for testing
```

**Expected Result**:
- ✅ User created with ID (save this UUID!)
- Example ID: `123e4567-e89b-12d3-a456-426614174000`

---

## DAY 19 TESTING: Database Schema + Prerequisites

### Test 1: Can check prerequisites for any lesson ✓

**Test Case 1.1**: Lesson with no prerequisites (Counting to 100)

**Steps**:
1. Get the lesson ID for "Counting to 100"
2. Call `hasCompletedPrerequisites()` with test user
3. Verify returns `true`

**SQL Verification**:
```sql
-- Get lesson ID
SELECT id, title FROM lessons
WHERE title = 'Counting to 100' AND grade_level = 3;
-- Save this ID

-- Check prerequisites (should be empty)
SELECT * FROM lesson_prerequisites
WHERE lesson_id = '<counting-lesson-id>';
-- Expected: 0 rows
```

**API Test** (via browser console or Postman):
```javascript
// Test via prerequisite-checker.ts function
// You can create a test API endpoint or test in browser console

const userId = 'YOUR_TEST_USER_ID'
const lessonId = 'COUNTING_LESSON_ID'

const result = await hasCompletedPrerequisites(userId, lessonId)
console.log('Can access Counting to 100:', result)
// Expected: true
```

**Expected Result**: ✅ Returns `true` (lesson has no prerequisites)

---

**Test Case 1.2**: Lesson with prerequisites (Division with Remainders)

**SQL Verification**:
```sql
-- Get lesson ID for Division with Remainders
SELECT id, title FROM lessons
WHERE title = 'Division with Remainders' AND grade_level = 3;

-- Check its prerequisites
SELECT
  l_main.title as lesson,
  l_prereq.title as prerequisite,
  lp.required_mastery_level
FROM lesson_prerequisites lp
JOIN lessons l_main ON lp.lesson_id = l_main.id
JOIN lessons l_prereq ON lp.prerequisite_lesson_id = l_prereq.id
WHERE l_main.title = 'Division with Remainders';

-- Expected: 1 row showing "Introduction to Division" as prerequisite with 80% mastery required
```

**Expected Result**: ✅ Can query prerequisites for any lesson

---

### Test 2: Returns false if prerequisites not met ✓

**Test Case 2.1**: User has NO progress on prerequisite

**Steps**:
1. Use test user with zero progress
2. Try to access "Addition with Regrouping" (requires "Addition Basics" at 80%)
3. Verify returns `false`

**SQL Verification**:
```sql
-- Verify user has NO progress
SELECT * FROM progress
WHERE user_id = '<test-user-id>';
-- Expected: 0 rows (or no rows for Addition Basics)

-- Check what prerequisite is required
SELECT
  l_main.title as lesson,
  l_main.id as lesson_id,
  l_prereq.title as requires,
  l_prereq.id as prereq_id,
  lp.required_mastery_level
FROM lesson_prerequisites lp
JOIN lessons l_main ON lp.lesson_id = l_main.id
JOIN lessons l_prereq ON lp.prerequisite_lesson_id = l_prereq.id
WHERE l_main.title = 'Addition with Regrouping';

-- Expected: Shows "Addition Basics" required at 80%
```

**Manual Function Test**:
```typescript
// Create a simple test file or test in API route
import { hasCompletedPrerequisites } from '@/lib/curriculum/prerequisite-checker'

const testUserId = 'YOUR_TEST_USER_ID'
const lessonId = 'ADDITION_WITH_REGROUPING_LESSON_ID'

const canAccess = await hasCompletedPrerequisites(testUserId, lessonId)
console.log('Can access without prerequisite:', canAccess)
// Expected: false
```

**Expected Result**: ✅ Returns `false` when user has no progress on prerequisite

---

**Test Case 2.2**: User has INSUFFICIENT mastery (below threshold)

**Steps**:
1. Create progress record with 70% mastery (below 80% requirement)
2. Try to access lesson requiring 80%
3. Verify returns `false`

**SQL Setup**:
```sql
-- Get lesson IDs
SELECT id, title FROM lessons WHERE title IN ('Addition Basics', 'Addition with Regrouping') AND grade_level = 3;

-- Insert low mastery progress (70%)
INSERT INTO progress (user_id, lesson_id, mastery_level, completed, time_spent, attempts)
VALUES (
  '<test-user-id>',
  '<addition-basics-lesson-id>',
  70.0,    -- Below 80% requirement
  false,
  15,
  1
)
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET mastery_level = 70.0, completed = false;

-- Verify inserted
SELECT * FROM progress WHERE user_id = '<test-user-id>';
```

**Function Test**:
```typescript
const canAccess = await hasCompletedPrerequisites(testUserId, additionWithRegroupingId)
console.log('Can access with 70% mastery (needs 80%):', canAccess)
// Expected: false
```

**Expected Result**: ✅ Returns `false` when mastery is below required level

---

### Test 3: Returns true if all prerequisites satisfied ✓

**Test Case 3.1**: User meets exact mastery requirement (80%)

**SQL Setup**:
```sql
-- Update progress to exactly 80%
UPDATE progress
SET mastery_level = 80.0, completed = true
WHERE user_id = '<test-user-id>'
  AND lesson_id = '<addition-basics-lesson-id>';

-- Verify
SELECT mastery_level, completed FROM progress
WHERE user_id = '<test-user-id>'
  AND lesson_id = '<addition-basics-lesson-id>';
```

**Function Test**:
```typescript
const canAccess = await hasCompletedPrerequisites(testUserId, additionWithRegroupingId)
console.log('Can access with 80% mastery (needs 80%):', canAccess)
// Expected: true
```

**Expected Result**: ✅ Returns `true` when mastery meets exact requirement

---

**Test Case 3.2**: User exceeds mastery requirement (95%)

**SQL Setup**:
```sql
-- Update progress to 95%
UPDATE progress
SET mastery_level = 95.0, completed = true
WHERE user_id = '<test-user-id>'
  AND lesson_id = '<addition-basics-lesson-id>';
```

**Function Test**:
```typescript
const canAccess = await hasCompletedPrerequisites(testUserId, additionWithRegroupingId)
console.log('Can access with 95% mastery (needs 80%):', canAccess)
// Expected: true
```

**Expected Result**: ✅ Returns `true` when mastery exceeds requirement

---

**Test Case 3.3**: Multiple prerequisites all satisfied

**Setup**: Test "Understanding Fractions" which requires "Division with Remainders" (which has its own prerequisites)

**SQL Setup**:
```sql
-- Get the prerequisite chain for Understanding Fractions
WITH RECURSIVE prereq_chain AS (
  SELECT
    lesson_id,
    prerequisite_lesson_id,
    required_mastery_level,
    1 as depth
  FROM lesson_prerequisites
  WHERE lesson_id = (SELECT id FROM lessons WHERE title = 'Understanding Fractions' AND grade_level = 3)

  UNION ALL

  SELECT
    lp.lesson_id,
    lp.prerequisite_lesson_id,
    lp.required_mastery_level,
    pc.depth + 1
  FROM lesson_prerequisites lp
  JOIN prereq_chain pc ON lp.lesson_id = pc.prerequisite_lesson_id
)
SELECT
  l_main.title as lesson,
  l_prereq.title as prerequisite,
  pc.required_mastery_level,
  pc.depth
FROM prereq_chain pc
JOIN lessons l_main ON pc.lesson_id = l_main.id
JOIN lessons l_prereq ON pc.prerequisite_lesson_id = l_prereq.id
ORDER BY pc.depth;

-- This shows the full chain of prerequisites
```

**Expected Result**: ✅ Returns `true` only when ALL prerequisites in chain are satisfied

---

### Test 4: Handles lessons with no prerequisites ✓

**Test Case 4.1**: Foundation lessons (Level 1)

**SQL Query**:
```sql
-- Find all lessons with NO prerequisites
SELECT
  l.id,
  l.title,
  l.difficulty
FROM lessons l
LEFT JOIN lesson_prerequisites lp ON l.id = lp.lesson_id
WHERE lp.lesson_id IS NULL
  AND l.subject = 'math'
  AND l.grade_level = 3
ORDER BY l.title;

-- Expected: "Counting to 100" and "Place Value Basics"
```

**Function Test**:
```typescript
// Test both foundation lessons
const countingId = 'COUNTING_LESSON_ID'
const placeValueId = 'PLACE_VALUE_LESSON_ID'

const canAccessCounting = await hasCompletedPrerequisites(testUserId, countingId)
const canAccessPlaceValue = await hasCompletedPrerequisites(testUserId, placeValueId)

console.log('Can access Counting:', canAccessCounting)  // Expected: true
console.log('Can access Place Value:', canAccessPlaceValue)  // Expected: true
```

**Expected Result**: ✅ All foundation lessons accessible to any user

---

### Test 5: getMissingPrerequisites() function ✓

**Test Case 5.1**: Show missing prerequisites for blocked lesson

**Function Test**:
```typescript
import { getMissingPrerequisites } from '@/lib/curriculum/prerequisite-checker'

// Test user has NO progress
const missingPrereqs = await getMissingPrerequisites(testUserId, 'DIVISION_WITH_REMAINDERS_ID')
console.log('Missing prerequisites:', missingPrereqs)
// Expected: Array with "Introduction to Division" lesson ID
```

**SQL Verification**:
```sql
-- Get the missing prerequisites manually
SELECT
  l_prereq.id,
  l_prereq.title
FROM lesson_prerequisites lp
JOIN lessons l_prereq ON lp.prerequisite_lesson_id = l_prereq.id
WHERE lp.lesson_id = '<division-with-remainders-id>'
  AND NOT EXISTS (
    SELECT 1 FROM progress p
    WHERE p.user_id = '<test-user-id>'
      AND p.lesson_id = lp.prerequisite_lesson_id
      AND p.mastery_level >= lp.required_mastery_level
  );
```

**Expected Result**: ✅ Returns array of lesson IDs that need to be completed

---

## DAY 19 COMPLETION CHECKLIST

- [ ] ✅ Can check prerequisites for any lesson
- [ ] ✅ Returns false if prerequisites not met (no progress)
- [ ] ✅ Returns false if prerequisites not met (low mastery)
- [ ] ✅ Returns true if all prerequisites satisfied (exact threshold)
- [ ] ✅ Returns true if all prerequisites satisfied (exceeds threshold)
- [ ] ✅ Returns true if all prerequisites satisfied (multiple prereqs)
- [ ] ✅ Handles lessons with no prerequisites
- [ ] ✅ getMissingPrerequisites() returns correct list
- [ ] ✅ Database schema deployed to production (Supabase)
- [ ] ✅ Seed data loaded in production database

**Status**: □ PENDING  □ IN PROGRESS  □ COMPLETE

---

## DAY 20 TESTING: Next Lesson Calculator

### Test 1: Returns correct next lesson based on prerequisites ✓

**Test Case 1.1**: Brand new user gets first lesson

**Setup**: User with ZERO progress

**Function Test**:
```typescript
import { getNextLesson } from '@/lib/curriculum/next-lesson'

const nextLesson = await getNextLesson(testUserId, 'math', 3)
console.log('Next lesson for new user:', nextLesson)
// Expected: "Counting to 100" (first lesson in sequence)
```

**SQL Verification**:
```sql
-- Get curriculum path
SELECT lesson_sequence FROM curriculum_paths
WHERE subject = 'math' AND grade_level = 3;

-- Get the first lesson in the sequence
-- lesson_sequence[1] in PostgreSQL (arrays are 1-indexed)
SELECT l.* FROM lessons l
WHERE l.id = (
  SELECT lesson_sequence[1]
  FROM curriculum_paths
  WHERE subject = 'math' AND grade_level = 3
);

-- Expected: "Counting to 100"
```

**Expected Result**: ✅ Returns first lesson in curriculum path

---

**Test Case 1.2**: User completed first lesson, gets second

**SQL Setup**:
```sql
-- Mark "Counting to 100" as complete with high mastery
INSERT INTO progress (user_id, lesson_id, mastery_level, completed, time_spent)
VALUES (
  '<test-user-id>',
  '<counting-lesson-id>',
  90.0,
  true,
  25
)
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET mastery_level = 90.0, completed = true;
```

**Function Test**:
```typescript
const nextLesson = await getNextLesson(testUserId, 'math', 3)
console.log('Next lesson after completing first:', nextLesson)
// Expected: "Place Value Basics" (second lesson in sequence)
```

**Expected Result**: ✅ Returns second lesson in sequence

---

### Test 2: Skips lessons with unmet prerequisites ✓

**Test Case 2.1**: Complete only lesson 1 and 2, should skip to lesson 3

**SQL Setup**:
```sql
-- Complete Counting to 100 and Place Value Basics
-- This should make Addition Basics the next lesson
-- (not Addition with Regrouping, which requires Addition Basics first)

-- Get lesson IDs
SELECT id, title FROM lessons
WHERE title IN ('Counting to 100', 'Place Value Basics', 'Addition Basics')
  AND grade_level = 3;

-- Mark first two as complete
INSERT INTO progress (user_id, lesson_id, mastery_level, completed)
VALUES
  ('<test-user-id>', '<counting-id>', 85.0, true),
  ('<test-user-id>', '<place-value-id>', 88.0, true)
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET mastery_level = EXCLUDED.mastery_level, completed = true;
```

**Function Test**:
```typescript
const nextLesson = await getNextLesson(testUserId, 'math', 3)
console.log('Next lesson:', nextLesson.title)
// Expected: "Addition Basics" (not "Addition with Regrouping")
```

**Expected Result**: ✅ Skips "Addition with Regrouping" because it requires "Addition Basics" at 80%

---

**Test Case 2.2**: Complex prerequisite chain

**Scenario**: User has completed lessons 1-4 (including Addition Basics at 85%). Should get lesson 5 (Addition with Regrouping) instead of lesson 7 (Intro to Multiplication)

**SQL Setup**:
```sql
-- Get all early lesson IDs
SELECT id, title FROM lessons
WHERE title IN (
  'Counting to 100',
  'Place Value Basics',
  'Addition Basics',
  'Subtraction Basics'
) AND grade_level = 3;

-- Complete first 4 lessons
INSERT INTO progress (user_id, lesson_id, mastery_level, completed)
VALUES
  ('<test-user-id>', '<counting-id>', 90.0, true),
  ('<test-user-id>', '<place-value-id>', 88.0, true),
  ('<test-user-id>', '<addition-basics-id>', 85.0, true),
  ('<test-user-id>', '<subtraction-basics-id>', 82.0, true)
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET mastery_level = EXCLUDED.mastery_level, completed = true;
```

**Function Test**:
```typescript
const nextLesson = await getNextLesson(testUserId, 'math', 3)
console.log('Next lesson:', nextLesson.title)
// Expected: "Addition with Regrouping"
// (because Addition Basics >= 80%, prerequisite met)
```

**Expected Result**: ✅ Returns first incomplete lesson with all prerequisites satisfied

---

### Test 3: Returns null when all lessons complete ✓

**Test Case 3.1**: Complete all 13 lessons

**SQL Setup**:
```sql
-- Get all 13 lesson IDs for Math Grade 3
SELECT id FROM lessons WHERE subject = 'math' AND grade_level = 3;

-- Mark ALL as complete (use actual IDs)
INSERT INTO progress (user_id, lesson_id, mastery_level, completed)
SELECT
  '<test-user-id>' as user_id,
  id as lesson_id,
  90.0 as mastery_level,
  true as completed
FROM lessons
WHERE subject = 'math' AND grade_level = 3
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET mastery_level = 90.0, completed = true;

-- Verify all 13 marked complete
SELECT COUNT(*) FROM progress
WHERE user_id = '<test-user-id>'
  AND completed = true
  AND lesson_id IN (SELECT id FROM lessons WHERE subject = 'math' AND grade_level = 3);
-- Expected: 13
```

**Function Test**:
```typescript
const nextLesson = await getNextLesson(testUserId, 'math', 3)
console.log('Next lesson (all complete):', nextLesson)
// Expected: null
```

**Expected Result**: ✅ Returns `null` when curriculum is fully complete

---

### Test 4: Works for different subjects ✓

**Test Case 4.1**: Math vs Science (once science curriculum added)

**Note**: For MVP, only Math Grade 3 is seeded. This test verifies the system SUPPORTS multiple subjects architecturally.

**SQL Verification**:
```sql
-- Check curriculum_paths supports multiple subjects
SELECT subject, grade_level, total_lessons
FROM curriculum_paths;

-- Current state: Only 'math' grade 3
-- Future state: Multiple subjects supported
```

**Function Test**:
```typescript
// Test math (should work)
const mathLesson = await getNextLesson(testUserId, 'math', 3)
console.log('Math lesson:', mathLesson)
// Expected: Returns lesson

// Test science (not seeded yet)
const scienceLesson = await getNextLesson(testUserId, 'science', 3)
console.log('Science lesson:', scienceLesson)
// Expected: Returns null or throws error gracefully
```

**Expected Result**: ✅ Function handles different subjects without crashing

---

### Test 5: API Route /api/curriculum/next-lesson ✓

**Test Case 5.1**: API returns lesson for new user

**HTTP Request** (use browser, Postman, or curl):
```bash
# Replace with actual user ID
curl "http://localhost:3000/api/curriculum/next-lesson?userId=<test-user-id>&subject=math&gradeLevel=3"
```

**Expected Response**:
```json
{
  "success": true,
  "lesson": {
    "id": "...",
    "title": "Counting to 100",
    "subject": "math",
    "grade_level": 3,
    "learning_objective": "Master counting from 1 to 100...",
    "estimated_duration": 25,
    "difficulty": "easy"
  },
  "progress": {
    "subject": "math",
    "gradeLevel": 3,
    "lessonsCompleted": 0,
    "totalLessons": 13,
    "percentComplete": 0,
    "overallMasteryScore": 0
  },
  "message": "Ready for: Counting to 100"
}
```

**Expected Result**: ✅ API returns proper JSON with lesson + progress

---

**Test Case 5.2**: API returns completion message when done

**HTTP Request** (after marking all lessons complete):
```bash
curl "http://localhost:3000/api/curriculum/next-lesson?userId=<test-user-id>&subject=math&gradeLevel=3"
```

**Expected Response**:
```json
{
  "completed": true,
  "message": "Congratulations! You've completed all 13 lessons for math Grade 3.",
  "progress": {
    "subject": "math",
    "gradeLevel": 3,
    "lessonsCompleted": 13,
    "totalLessons": 13,
    "percentComplete": 100,
    "overallMasteryScore": 90.0
  }
}
```

**Expected Result**: ✅ API returns completion message with progress summary

---

**Test Case 5.3**: API validates required parameters

**HTTP Request** (missing userId):
```bash
curl "http://localhost:3000/api/curriculum/next-lesson?subject=math&gradeLevel=3"
```

**Expected Response**:
```json
{
  "error": "Missing required parameters",
  "message": "userId, subject, and gradeLevel are required"
}
```

**Status Code**: 400 Bad Request

**Expected Result**: ✅ API validates inputs and returns proper error

---

## DAY 20 COMPLETION CHECKLIST

- [ ] ✅ Returns correct next lesson for new user
- [ ] ✅ Returns correct next lesson after completing first
- [ ] ✅ Skips lessons with unmet prerequisites (simple case)
- [ ] ✅ Skips lessons with unmet prerequisites (complex chain)
- [ ] ✅ Returns null when all lessons complete
- [ ] ✅ Works for different subjects (architectural support)
- [ ] ✅ API route returns lesson + progress
- [ ] ✅ API route returns completion message
- [ ] ✅ API route validates parameters
- [ ] ✅ Deploy to production

**Status**: □ PENDING  □ IN PROGRESS  □ COMPLETE

---

## DAY 21 TESTING: Frontend Auto Lesson Assignment

### Test 1: Student sees 'Today's Lesson' automatically ✓

**Test Case 1.1**: Dashboard loads and shows next lesson

**Steps**:
1. Log in to the application as test user
2. Navigate to `/dashboard`
3. Observe the "Today's Lesson" card

**Visual Checklist**:
- [ ] Dashboard loads without errors
- [ ] "Welcome back, [Name]!" greeting displays
- [ ] "Today's Lesson" card shows:
  - Lesson title
  - Subject and grade level
  - Estimated duration
  - "Continue Learning" button
- [ ] Loading state shows while fetching data
- [ ] No console errors in browser DevTools

**Browser Test**:
```javascript
// In browser console on /dashboard page
// Check if lesson data loaded
console.log('Next lesson data:', window.localStorage.getItem('nextLesson'))
```

**Expected Result**: ✅ Dashboard displays next lesson automatically

---

### Test 2: No browsing - system assigns next lesson ✓

**Test Case 2.1**: Cannot skip ahead to advanced lessons

**Steps**:
1. As new user, try to access `/learn/[advanced-lesson-id]` directly
2. System should block or redirect

**Implementation Check**:
```typescript
// In app/learn/[lessonId]/page.tsx
// Verify prerequisite check exists:

// Look for code like:
const hasPrereqs = await hasCompletedPrerequisites(userId, lessonId)
if (!hasPrereqs) {
  // Redirect to dashboard or show blocked message
}
```

**Expected Result**: ✅ Users cannot manually navigate to blocked lessons

---

### Test 3: Progress overview shows completion ✓

**Test Case 3.1**: ProgressOverview component displays correctly

**Visual Checklist** (on /dashboard):
- [ ] "Your Progress" section visible
- [ ] Shows progress for Math Grade 3
- [ ] Displays:
  - Subject and grade level
  - Progress bar (visual)
  - Fraction: "X / 13 lessons"
  - Mastery score: "X.X%"
  - Mastery badge color (green ≥80%, yellow ≥60%, red <60%)
- [ ] Last activity timestamp formatted correctly

**Browser Test**:
```javascript
// Check API response
fetch('/api/curriculum/progress?userId=<test-user-id>')
  .then(r => r.json())
  .then(data => console.log('Progress data:', data))
```

**Expected Response**:
```json
{
  "success": true,
  "progress": [
    {
      "subject": "math",
      "grade_level": 3,
      "lessons_completed": 2,
      "lessons_mastered": 1,
      "total_lessons": 13,
      "overall_mastery_score": 87.5,
      "percentComplete": 15,
      "masteryPercentage": 88,
      "last_activity": "2026-01-24T10:00:00Z"
    }
  ]
}
```

**Expected Result**: ✅ Progress displays accurate statistics

---

### Test 4: Can't access lessons with unmet prerequisites ✓

**Test Case 4.1**: Direct URL access blocked

**Steps**:
1. Get the lesson ID for "Division with Remainders"
2. As a new user, navigate to `/learn/[division-lesson-id]`
3. Verify access is blocked

**Expected Behavior** (one of these):
- Redirects to /dashboard
- Shows "Prerequisites not met" message
- Displays missing prerequisites list

**Browser Test**:
```javascript
// Check localStorage for blocked lesson attempt
console.log('Blocked lesson:', sessionStorage.getItem('blockedLesson'))
```

**Expected Result**: ✅ Advanced lessons are inaccessible without prerequisites

---

### Test 5: Celebration when all lessons done ✓

**Test Case 5.1**: Completion state displays

**SQL Setup**:
```sql
-- Mark all 13 lessons complete
-- (Use query from Day 20 Test 3.1)
```

**Steps**:
1. Complete all 13 lessons
2. Navigate to /dashboard
3. Verify celebration UI appears

**Visual Checklist**:
- [ ] No "Today's Lesson" card shown
- [ ] Celebration message displays
- [ ] Shows completion statistics:
  - "All 13 lessons complete!"
  - Final mastery score
  - Total time spent (optional)
- [ ] Option to advance to next grade (if implemented)

**Browser Test**:
```javascript
// Check dashboard state
const response = await fetch('/api/curriculum/next-lesson?userId=<user-id>&subject=math&gradeLevel=3')
const data = await response.json()
console.log('Curriculum complete:', data.completed)  // Expected: true
```

**Expected Result**: ✅ Completion state celebrates student achievement

---

## DAY 21 COMPLETION CHECKLIST

- [ ] ✅ Student sees 'Today's Lesson' automatically
- [ ] ✅ Lesson card shows all required information
- [ ] ✅ No browsing - system assigns next lesson
- [ ] ✅ Progress overview shows completion stats
- [ ] ✅ Progress bar renders correctly
- [ ] ✅ Mastery badge color-coded properly
- [ ] ✅ Can't access lessons with unmet prerequisites (UI)
- [ ] ✅ Can't access lessons with unmet prerequisites (direct URL)
- [ ] ✅ Celebration when all lessons done
- [ ] ✅ Deploy to production

**Status**: □ PENDING  □ IN PROGRESS  □ COMPLETE

---

## DAY 22 TESTING: Curriculum Paths + Progress Tracking

### Test 1: Curriculum paths seeded for all subjects ✓

**SQL Verification**:
```sql
-- Check all seeded curriculum paths
SELECT
  subject,
  grade_level,
  total_lessons,
  estimated_duration_weeks,
  array_length(lesson_sequence, 1) as sequence_length
FROM curriculum_paths
ORDER BY subject, grade_level;

-- For MVP: Should show 1 path (Math Grade 3)
-- Expected: 1 row with 13 lessons
```

**Validation**:
```sql
-- Verify lesson_sequence contains valid lesson IDs
SELECT
  cp.subject,
  cp.grade_level,
  l.id,
  l.title
FROM curriculum_paths cp
CROSS JOIN LATERAL unnest(cp.lesson_sequence) WITH ORDINALITY AS seq(lesson_id, position)
JOIN lessons l ON l.id = seq.lesson_id
WHERE cp.subject = 'math' AND cp.grade_level = 3
ORDER BY seq.position;

-- Should return 13 rows showing all lessons in order
```

**Expected Result**: ✅ Curriculum path properly references all lessons

---

### Test 2: Prerequisites defined correctly ✓

**SQL Verification**:
```sql
-- Get all prerequisite relationships with titles
SELECT
  l_main.title as lesson,
  l_main.difficulty,
  l_prereq.title as requires,
  lp.required_mastery_level as threshold
FROM lesson_prerequisites lp
JOIN lessons l_main ON lp.lesson_id = l_main.id
JOIN lessons l_prereq ON lp.prerequisite_lesson_id = l_prereq.id
WHERE l_main.grade_level = 3
ORDER BY l_main.title;

-- Expected: 10 rows showing prerequisite chains
```

**Logical Validation**:
- [ ] No circular dependencies (A requires B, B requires A)
- [ ] Prerequisites come before dependent lessons in sequence
- [ ] Mastery thresholds are reasonable (75-85%)
- [ ] Foundation lessons have NO prerequisites

**Circular Dependency Check**:
```sql
-- This query will timeout if circular dependencies exist
WITH RECURSIVE prereq_chain AS (
  SELECT
    lesson_id,
    prerequisite_lesson_id,
    ARRAY[lesson_id, prerequisite_lesson_id] as path,
    1 as depth
  FROM lesson_prerequisites

  UNION ALL

  SELECT
    lp.lesson_id,
    lp.prerequisite_lesson_id,
    pc.path || lp.prerequisite_lesson_id,
    pc.depth + 1
  FROM lesson_prerequisites lp
  JOIN prereq_chain pc ON lp.lesson_id = pc.prerequisite_lesson_id
  WHERE pc.depth < 20  -- Safety limit
    AND NOT (lp.prerequisite_lesson_id = ANY(pc.path))  -- Detect cycles
)
SELECT * FROM prereq_chain
WHERE lesson_id = ANY(path[2:array_length(path, 1)]);

-- Expected: 0 rows (no circular dependencies)
```

**Expected Result**: ✅ All prerequisites are logically valid

---

### Test 3: Progress updates when lesson completed ✓

**Test Case 3.1**: markLessonComplete updates both tables

**SQL Setup**:
```sql
-- Get a lesson ID
SELECT id FROM lessons WHERE title = 'Counting to 100' AND grade_level = 3;
```

**Function Test**:
```typescript
import { markLessonComplete } from '@/lib/curriculum/progress-updater'

const userId = '<test-user-id>'
const lessonId = '<counting-lesson-id>'
const score = 85.0

await markLessonComplete(userId, lessonId, score)
```

**SQL Verification (After function call)**:
```sql
-- Check lesson-level progress updated
SELECT * FROM progress
WHERE user_id = '<test-user-id>'
  AND lesson_id = '<counting-lesson-id>';
-- Expected: mastery_level = 85.0, completed = true

-- Check curriculum-level progress updated
SELECT * FROM student_curriculum_progress
WHERE user_id = '<test-user-id>'
  AND subject = 'math'
  AND grade_level = 3;
-- Expected: lessons_completed = 1, lessons_mastered = 1 (since 85% >= 80%)
```

**Expected Result**: ✅ Both progress tables updated correctly

---

**Test Case 3.2**: Completing multiple lessons aggregates correctly

**Setup**: Complete 5 lessons with varying scores

**SQL Setup**:
```sql
-- Get first 5 lesson IDs
SELECT id, title FROM lessons
WHERE subject = 'math' AND grade_level = 3
ORDER BY id
LIMIT 5;
```

**Function Tests**:
```typescript
// Complete 5 lessons with different scores
await markLessonComplete(userId, lesson1Id, 90)  // Mastered
await markLessonComplete(userId, lesson2Id, 85)  // Mastered
await markLessonComplete(userId, lesson3Id, 75)  // NOT mastered (< 80%)
await markLessonComplete(userId, lesson4Id, 92)  // Mastered
await markLessonComplete(userId, lesson5Id, 78)  // NOT mastered
```

**SQL Verification**:
```sql
SELECT
  lessons_completed,
  lessons_mastered,
  overall_mastery_score,
  total_lessons
FROM student_curriculum_progress
WHERE user_id = '<test-user-id>'
  AND subject = 'math'
  AND grade_level = 3;

-- Expected:
-- lessons_completed: 5
-- lessons_mastered: 3 (90%, 85%, 92% >= 80%)
-- overall_mastery_score: (90 + 85 + 75 + 92 + 78) / 5 = 84.0
-- total_lessons: 13
```

**Expected Result**: ✅ Progress aggregates correctly across multiple lessons

---

### Test 4: Next lesson calculation works reliably ✓

**Test Case 4.1**: Sequential progression through curriculum

**Test Steps**:
1. Start as new user → Get lesson 1
2. Complete lesson 1 → Get lesson 2
3. Complete lesson 2 → Get lesson 3
4. Continue through all 13 lessons

**Automated Test Script** (pseudo-code):
```typescript
const testSequentialProgression = async () => {
  const userId = '<test-user-id>'
  let completed = 0

  while (completed < 13) {
    // Get next lesson
    const nextLesson = await getNextLesson(userId, 'math', 3)

    if (!nextLesson) {
      console.log('Curriculum complete at', completed, 'lessons')
      break
    }

    console.log(`Lesson ${completed + 1}:`, nextLesson.title)

    // Complete the lesson
    await markLessonComplete(userId, nextLesson.id, 85)
    completed++
  }

  // Verify final state
  const finalLesson = await getNextLesson(userId, 'math', 3)
  console.log('Final state (should be null):', finalLesson)
  // Expected: null
}
```

**Expected Result**: ✅ User progresses smoothly through all 13 lessons in sequence

---

### Test 5: Full flow: complete lesson → assessment → unlock next ✓

**Test Case 5.1**: End-to-end lesson completion flow

**Flow Steps**:
1. User starts lesson (creates session)
2. User completes lesson teaching phase
3. Assessment system triggered (Days 23-25 integration point)
4. User passes assessment (score >= 80%)
5. `markLessonComplete()` called with score
6. Lesson marked complete in `progress` table
7. Curriculum progress updated
8. Next lesson unlocked automatically

**Integration Test** (manual walkthrough):

**Step 1: Start Lesson**
```javascript
// In browser on /dashboard
// Click "Continue Learning" on "Counting to 100"
// Should navigate to /learn/[lesson-id]
```

**Step 2: Complete Teaching Phase**
```javascript
// Interact with AI teacher
// Complete all learning objectives
```

**Step 3: Assessment Triggered**
```javascript
// After lesson complete, assessment should auto-start
// (Implementation in Days 23-25)
// For now, manually call:
```

**Step 4: Pass Assessment**
```sql
-- Simulate passing assessment
SELECT id FROM lessons WHERE title = 'Counting to 100' AND grade_level = 3;

INSERT INTO progress (user_id, lesson_id, mastery_level, completed)
VALUES ('<user-id>', '<lesson-id>', 85.0, true)
ON CONFLICT (user_id, lesson_id)
DO UPDATE SET mastery_level = 85.0, completed = true;
```

**Step 5: Verify Next Lesson Unlocked**
```javascript
// Navigate back to /dashboard
// Should now show "Place Value Basics" as next lesson
fetch('/api/curriculum/next-lesson?userId=<id>&subject=math&gradeLevel=3')
  .then(r => r.json())
  .then(data => console.log('Next lesson:', data.lesson.title))
// Expected: "Place Value Basics"
```

**Expected Result**: ✅ Complete flow works end-to-end

---

## DAY 22 COMPLETION CHECKLIST

- [ ] ✅ Curriculum paths seeded for all subjects (Math Grade 3 for MVP)
- [ ] ✅ lesson_sequence array contains valid lesson IDs
- [ ] ✅ Prerequisites defined correctly (10 relationships)
- [ ] ✅ No circular dependencies
- [ ] ✅ Prerequisites come before dependents in sequence
- [ ] ✅ Progress updates when lesson completed (lesson-level)
- [ ] ✅ Progress updates when lesson completed (curriculum-level)
- [ ] ✅ lessons_completed increments correctly
- [ ] ✅ lessons_mastered counts only ≥80% scores
- [ ] ✅ overall_mastery_score calculates as average
- [ ] ✅ Next lesson calculation works reliably
- [ ] ✅ Sequential progression through all 13 lessons works
- [ ] ✅ Full flow: lesson → assessment → next lesson unlocked
- [ ] ✅ Deploy to production

**Status**: □ PENDING  □ IN PROGRESS  □ COMPLETE

---

## PRODUCTION DEPLOYMENT CHECKLIST

### Database (Supabase)

- [ ] Run migration_001_multi_ai_system.sql in production
- [ ] Verify all 3 tables created (lesson_prerequisites, curriculum_paths, student_curriculum_progress)
- [ ] Verify all indexes created
- [ ] Run seed_curriculum_grade3_math.sql in production
- [ ] Verify 13 lessons inserted
- [ ] Verify 10 prerequisites inserted
- [ ] Verify 1 curriculum path created
- [ ] Test prerequisite queries run in <100ms

### Backend API

- [ ] Deploy /api/curriculum/next-lesson route
- [ ] Deploy /api/curriculum/progress route
- [ ] Verify API returns proper CORS headers
- [ ] Test API with production database
- [ ] Verify environment variables set in Vercel
- [ ] Test error handling (missing params, invalid IDs)

### Frontend

- [ ] Deploy updated /dashboard page
- [ ] Deploy ProgressOverview component
- [ ] Verify localStorage works in production
- [ ] Test on mobile devices
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Verify loading states work
- [ ] Verify error states work

### Integration

- [ ] Test complete user flow in production
- [ ] Verify new user gets first lesson
- [ ] Verify lesson completion updates progress
- [ ] Verify next lesson unlocks correctly
- [ ] Check browser console for errors
- [ ] Monitor Vercel logs for server errors

### Performance

- [ ] Prerequisite check completes in <200ms
- [ ] Next lesson calculation completes in <300ms
- [ ] Dashboard loads in <2s
- [ ] API responses under 1s
- [ ] No N+1 queries (check Supabase logs)

---

## TESTING SUMMARY

### Days 19-22 Overall Status

| Day | Feature | Tests | Status |
|-----|---------|-------|--------|
| 19 | Database Schema + Prerequisites | 8 test cases | ⬜ |
| 20 | Next Lesson Calculator | 9 test cases | ⬜ |
| 21 | Frontend Auto Assignment | 5 test cases | ⬜ |
| 22 | Curriculum Paths + Polish | 5 test cases | ⬜ |

**Total Test Cases**: 27

---

## TROUBLESHOOTING GUIDE

### Issue: "Lesson not found" error

**Cause**: Seed data not loaded or IDs don't match

**Fix**:
```sql
-- Re-run seed script
-- Check if lessons exist
SELECT COUNT(*) FROM lessons WHERE subject = 'math' AND grade_level = 3;
-- Should be 13
```

---

### Issue: "All lessons blocked" - new user can't access any lesson

**Cause**: Curriculum path not created or first lessons have prerequisites

**Fix**:
```sql
-- Check curriculum path exists
SELECT * FROM curriculum_paths WHERE subject = 'math' AND grade_level = 3;

-- Check first lessons have NO prerequisites
SELECT l.title FROM lessons l
LEFT JOIN lesson_prerequisites lp ON l.id = lp.lesson_id
WHERE lp.lesson_id IS NULL
  AND l.subject = 'math'
  AND l.grade_level = 3;
-- Should return: Counting to 100, Place Value Basics
```

---

### Issue: "Next lesson doesn't unlock after completion"

**Cause**: `markLessonComplete()` not called or mastery_level < 80

**Fix**:
```sql
-- Check if lesson marked complete
SELECT * FROM progress WHERE user_id = '<user-id>' AND lesson_id = '<lesson-id>';

-- Verify mastery_level >= 80 and completed = true
UPDATE progress SET mastery_level = 85.0, completed = true
WHERE user_id = '<user-id>' AND lesson_id = '<lesson-id>';
```

---

### Issue: Progress shows 0% mastery despite completing lessons

**Cause**: `student_curriculum_progress` not updated

**Fix**:
```sql
-- Manually recalculate and update
UPDATE student_curriculum_progress scp
SET
  lessons_completed = (
    SELECT COUNT(*) FROM progress p
    WHERE p.user_id = scp.user_id
      AND p.completed = true
      AND p.lesson_id IN (SELECT id FROM lessons WHERE subject = scp.subject AND grade_level = scp.grade_level)
  ),
  overall_mastery_score = (
    SELECT AVG(mastery_level) FROM progress p
    WHERE p.user_id = scp.user_id
      AND p.lesson_id IN (SELECT id FROM lessons WHERE subject = scp.subject AND grade_level = scp.grade_level)
  )
WHERE user_id = '<user-id>' AND subject = 'math' AND grade_level = 3;
```

---

## NEXT STEPS AFTER TESTING

Once Days 19-22 testing is complete:

1. **Proceed to Days 23-25**: Automated Assessment System
   - Voice-based quizzes
   - Assessor AI integration
   - Automatic grading

2. **Proceed to Days 26-28**: Admin Dashboard
   - Student list and progress monitoring
   - Struggling student alerts
   - System health metrics

3. **Days 29-30**: Polish and Demo Preparation

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Testing Status**: Ready to begin systematic testing
