# Curriculum System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Setup (2 minutes)

**Option A: One Command (Recommended)**
```bash
npx ts-node scripts/seed-curriculum.ts
```

**Option B: Manual SQL**
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste content from `lib/db/seed_curriculum_grade3_math.sql`
3. Execute

### Step 2: Verify Installation (1 minute)

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM lessons WHERE subject = 'math' AND grade_level = 3;
-- Expected: 13

SELECT COUNT(*) FROM curriculum_paths WHERE subject = 'math' AND grade_level = 3;
-- Expected: 1
```

### Step 3: Test the API (1 minute)

```bash
# Replace <USER_ID> with actual user UUID
curl "http://localhost:3000/api/curriculum/next-lesson?userId=<USER_ID>&subject=math&gradeLevel=3"
```

**Expected Response**:
```json
{
  "success": true,
  "lesson": {
    "title": "Counting to 100",
    ...
  }
}
```

### Step 4: Use in Your App (1 minute)

**In Dashboard Page**:
```typescript
// Already implemented in app/dashboard/page.tsx
// Just navigate to /dashboard
```

**In Lesson Completion**:
```typescript
import { markLessonComplete } from '@/lib/curriculum/progress-updater'

// When student finishes lesson
await markLessonComplete(userId, lessonId, masteryScore)
// Automatically unlocks next lesson!
```

---

## 📖 Key Files

**Need to understand how it works?**
- `lib/curriculum/next-lesson.ts` - Main logic
- `lib/curriculum/prerequisite-checker.ts` - Validation
- `lib/curriculum/progress-updater.ts` - Updates

**Want to add new subjects?**
- `scripts/seed-curriculum.ts` - Modify this file

**Need the full docs?**
- `project_docs/CURRICULUM_IMPLEMENTATION_COMPLETE.md`
- `lib/db/README_CURRICULUM_SETUP.md`

---

## ⚡ Common Tasks

### Add a New Subject

1. Edit `scripts/seed-curriculum.ts`
2. Add your lessons array:
```typescript
const scienceGrade3 = [
  { title: 'Solar System', subject: 'science', ... },
  ...
]
```
3. Run: `npx ts-node scripts/seed-curriculum.ts`

### Check Student Progress

```typescript
import { getCurriculumProgressSummary } from '@/lib/curriculum/next-lesson'

const summary = await getCurriculumProgressSummary(userId, 'math', 3)
console.log(`${summary.lessonsCompleted}/${summary.totalLessons} complete`)
```

### Verify Prerequisites

```typescript
import { hasCompletedPrerequisites } from '@/lib/curriculum/prerequisite-checker'

const canAccess = await hasCompletedPrerequisites(userId, lessonId)
if (!canAccess) {
  // Show "Complete prerequisites first" message
}
```

---

## 🐛 Troubleshooting

**"No curriculum path found"**
→ Run: `npx ts-node scripts/seed-curriculum.ts`

**"All lessons blocked"**
→ Check: Student needs to start from first lesson (no prerequisites)

**Dashboard shows wrong lesson**
→ Verify: Progress table has correct mastery_level values

---

## 📞 Need Help?

- Read: `project_docs/CURRICULUM_IMPLEMENTATION_COMPLETE.md`
- Check: SQL verification queries in `lib/db/README_CURRICULUM_SETUP.md`
- Debug: Enable console logging in API routes

---

## ✅ You're Ready!

The curriculum system is now:
- ✅ Automatically assigning next lessons
- ✅ Enforcing prerequisites
- ✅ Tracking progress across subjects
- ✅ Calculating mastery scores

Navigate to `/dashboard` to see it in action!
