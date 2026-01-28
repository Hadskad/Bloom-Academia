# Curriculum System Integration Guide

## Overview

This guide shows you exactly how to integrate the curriculum sequencing system into your existing code. All integrations are optional and can be added incrementally.

---

## Integration Point 1: Lesson Completion (REQUIRED for auto progression)

### Location: `app/api/sessions/end/route.ts`

**What to add:** When a lesson is completed, update both progress tables and get the next lesson from the curriculum system.

**Step 1:** Add imports at the top:

```typescript
import { markLessonComplete } from '@/lib/curriculum/progress-updater'
import { getNextLesson } from '@/lib/curriculum/next-lesson'
```

**Step 2:** Replace the "Get next lesson" section (lines 134-147) with this:

```typescript
// Get next lesson using curriculum system
let nextLesson = null
try {
  // Use curriculum system to get next available lesson
  nextLesson = await getNextLesson(
    session.user_id,
    session.lessons.subject,
    session.lessons.grade_level
  )

  // If no next lesson in curriculum, fallback to old logic
  if (!nextLesson) {
    const { data: fallback } = await supabase
      .from('lessons')
      .select('*')
      .eq('subject', session.lessons.subject)
      .gt('grade_level', session.lessons.grade_level)
      .order('grade_level', { ascending: true })
      .limit(1)
      .maybeSingle()

    nextLesson = fallback
  }
} catch (error) {
  console.error('Error getting next lesson from curriculum:', error)
  // Fallback to old logic on error
  const { data: fallback } = await supabase
    .from('lessons')
    .select('*')
    .eq('subject', session.lessons.subject)
    .gt('grade_level', session.lessons.grade_level)
    .order('grade_level', { ascending: true })
    .limit(1)
    .maybeSingle()

  nextLesson = fallback
}
```

**Step 3:** After upserting progress (after line 132), add curriculum sync:

```typescript
// Upsert progress table (existing code stays)
const { error: progressError } = await supabase
  .from('progress')
  .upsert(
    {
      user_id: session.user_id,
      lesson_id: session.lesson_id,
      mastery_level: masteryLevel,
      time_spent: timeSpent,
      attempts: 1,
      completed: masteryLevel >= 70,
      last_accessed: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,lesson_id',
    }
  )
  .select()

if (progressError) {
  console.error('Error upserting progress:', progressError)
  return NextResponse.json(
    { error: 'Failed to save progress' },
    { status: 500 }
  )
}

// NEW: Sync with curriculum system if lesson completed
if (masteryLevel >= 80) {
  try {
    await markLessonComplete(session.user_id, session.lesson_id, masteryLevel)
    console.log('Curriculum progress updated for lesson completion')
  } catch (curriculumError) {
    console.error('Failed to update curriculum progress (non-critical):', curriculumError)
    // Don't fail the request - progress table already updated
  }
}
```

**Why this works:**
- If mastery ≥ 80%, curriculum progress is updated automatically
- Next lesson comes from curriculum system (respects prerequisites)
- If curriculum system fails, falls back to old logic (safe)
- Non-blocking - errors don't break the completion flow

---

## Integration Point 2: User Onboarding (OPTIONAL but recommended)

### Location: `app/welcome/page.tsx` or wherever you create users

**What to add:** Initialize curriculum progress when a new user signs up.

```typescript
import { initializeCurriculumProgress } from '@/lib/curriculum/progress-updater'

// After creating user
const userId = newUser.id
const userGrade = 3 // or whatever grade they selected

// Initialize curriculum for their grade level
try {
  await initializeCurriculumProgress(userId, 'math', userGrade)
  console.log('Curriculum initialized for new user')
} catch (error) {
  console.error('Failed to initialize curriculum (non-critical):', error)
  // Don't fail signup - they can still use the app
}
```

**Why this works:**
- Sets up curriculum tracking from day one
- Creates `student_curriculum_progress` record
- Enables dashboard to show 0/13 lessons immediately

---

## Integration Point 3: Lesson Access Control (OPTIONAL - adds prerequisite enforcement)

### Location: `app/learn/[lessonId]/page.tsx`

**What to add:** Check prerequisites before allowing lesson access.

**Step 1:** Add import at top:

```typescript
import { hasCompletedPrerequisites, getMissingPrerequisites } from '@/lib/curriculum/prerequisite-checker'
```

**Step 2:** Add check in `loadLessonAndStartSession` function (after fetching lesson, before starting session):

```typescript
async function loadLessonAndStartSession() {
  try {
    setIsLoading(true)

    const userId = localStorage.getItem('userId')
    if (!userId) {
      router.push('/welcome')
      return
    }

    // Fetch lesson (existing code)
    const lessonResponse = await fetch(`/api/lessons/${lessonId}`)
    // ... existing lesson fetch code ...

    // NEW: Check prerequisites
    const canAccess = await fetch(
      `/api/curriculum/check-prerequisites?userId=${userId}&lessonId=${lessonId}`
    )
    const prereqData = await canAccess.json()

    if (!prereqData.canAccess) {
      // Show error and redirect to dashboard
      setError(`You need to complete these lessons first: ${prereqData.missingLessons.join(', ')}`)
      setTimeout(() => router.push('/dashboard'), 3000)
      return
    }

    // Continue with session start (existing code)
    // ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Step 3:** Create the API endpoint for prerequisite checking:

Create new file: `app/api/curriculum/check-prerequisites/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { hasCompletedPrerequisites, getMissingPrerequisites } from '@/lib/curriculum/prerequisite-checker'
import { supabase } from '@/lib/db/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const lessonId = searchParams.get('lessonId')

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: 'userId and lessonId required' },
        { status: 400 }
      )
    }

    const canAccess = await hasCompletedPrerequisites(userId, lessonId)

    if (!canAccess) {
      const missingIds = await getMissingPrerequisites(userId, lessonId)

      // Get lesson titles for missing prerequisites
      const { data: missingLessons } = await supabase
        .from('lessons')
        .select('title')
        .in('id', missingIds)

      return NextResponse.json({
        canAccess: false,
        missingLessons: missingLessons?.map(l => l.title) || []
      })
    }

    return NextResponse.json({
      canAccess: true,
      missingLessons: []
    })
  } catch (error) {
    console.error('Error checking prerequisites:', error)
    return NextResponse.json(
      { error: 'Failed to check prerequisites' },
      { status: 500 }
    )
  }
}
```

**Why this works:**
- Prevents students from jumping to advanced lessons
- Shows helpful error message with what they need to complete
- Auto-redirects to dashboard after 3 seconds

---

## Integration Point 4: Dashboard Navigation (OPTIONAL - enhances UX)

### Location: Various navigation components

**What to add:** Replace "Browse Lessons" links with "Go to Dashboard".

**Example - Update `app/lessons/[id]/complete/page.tsx`:**

```typescript
// Change the "Start Next Lesson" button to use dashboard
const goToNextLesson = () => {
  // Instead of going directly to next lesson:
  // router.push(`/lessons/${summary.nextLesson.id}/intro`)

  // Go to dashboard which will show auto-assigned next lesson:
  router.push('/dashboard')
}
```

**Why this works:**
- Centralizes lesson assignment in one place (dashboard)
- Dashboard always shows the correct next lesson
- Students see progress overview before starting

---

## Testing the Integration

### Test 1: Complete a Lesson

1. Start dev server: `npm run dev`
2. Complete a lesson (get mastery ≥ 80%)
3. Check database:

```sql
-- Should see updated progress
SELECT * FROM progress WHERE user_id = 'YOUR_USER_ID' ORDER BY last_accessed DESC LIMIT 1;

-- Should see curriculum progress updated
SELECT * FROM student_curriculum_progress WHERE user_id = 'YOUR_USER_ID';
```

### Test 2: Auto Progression

1. Complete "Counting to 100" lesson
2. Go to `/dashboard`
3. Should see "Place Value Basics" as next lesson (not "Counting to 100")

### Test 3: Prerequisite Blocking

1. Try to access `/learn/[division-lesson-id]` directly
2. Should be blocked if you haven't completed multiplication
3. Should show error message and redirect to dashboard

---

## Migration Path (Recommended Order)

### Phase 1: Basic Integration (Start Here)
1. ✅ Run database setup (DONE - you already did this!)
2. ✅ Add lesson completion sync (Integration Point 1)
3. ✅ Test that curriculum progress updates

### Phase 2: Enhanced UX
4. Add dashboard navigation links (Integration Point 4)
5. Update completion screen to go to dashboard
6. Test full flow: lesson → complete → dashboard → next lesson

### Phase 3: Strict Enforcement
7. Add prerequisite checking (Integration Point 3)
8. Test that advanced lessons are blocked
9. Update error messages and redirects

### Phase 4: Onboarding
10. Add curriculum initialization (Integration Point 2)
11. Test new user flow
12. Verify dashboard shows 0/13 for new users

---

## Rollback Plan

If something goes wrong, you can safely rollback:

1. **Remove imports** from modified files
2. **Revert to old next-lesson logic** (lines 134-147 in sessions/end)
3. **Comment out** `markLessonComplete()` call
4. **Keep** all curriculum tables - they won't affect existing code

The curriculum system is **additive** - it doesn't break existing functionality.

---

## Quick Reference: What Each File Does

| File | Purpose | Used By |
|------|---------|---------|
| `lib/curriculum/prerequisite-checker.ts` | Check if prerequisites met | Lesson access control |
| `lib/curriculum/next-lesson.ts` | Calculate next available lesson | Dashboard, session end |
| `lib/curriculum/progress-updater.ts` | Sync both progress tables | Lesson completion |
| `app/api/curriculum/next-lesson/route.ts` | API for next lesson | Dashboard page |
| `app/api/curriculum/progress/route.ts` | API for progress summary | ProgressOverview component |
| `components/ProgressOverview.tsx` | Visual progress display | Dashboard page |
| `app/dashboard/page.tsx` | Auto lesson assignment page | Main student entry point |

---

## Support

If you encounter issues:

1. Check console for error messages
2. Verify database tables exist (run verification queries from CURRICULUM_IMPLEMENTATION_COMPLETE.md)
3. Test APIs directly with curl
4. Check that imports are correct

All integration points are **optional and non-breaking** - you can add them incrementally!
