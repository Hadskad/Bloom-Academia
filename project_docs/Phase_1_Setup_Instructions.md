# Phase 1 Setup Instructions

**Quick setup guide for deploying the Curriculum Builder system**

---

## Step 1: Run Database Migration

1. Open Supabase SQL Editor: `https://app.supabase.com/project/<your-project>/sql`

2. Copy and paste the contents of:
   ```
   lib/db/migration_003_curriculum_builder.sql
   ```

3. Click "Run" to execute the migration

4. **Verify success:**
   ```sql
   -- Check tables were created
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('subject_configurations', 'mastery_evidence');

   -- Should return 2 rows
   ```

5. **Verify seed data:**
   ```sql
   SELECT * FROM subject_configurations WHERE subject = 'math' AND grade_level = 3;

   -- Should return 1 row with default_mastery_rules JSON
   ```

---

## Step 2: Verify Frontend Build

No additional dependencies needed! All new code uses existing packages:
- Next.js 15 (already installed)
- React (already installed)
- Supabase client (already installed)
- UI components (already exist)

**Just verify TypeScript compiles:**
```bash
npm run build
```

If build fails, check for any import errors or typos.

---

## Step 3: Test Curriculum Builder UI

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:**
   ```
   http://localhost:3000/admin/curriculum-builder
   ```

3. **Test flow:**
   - Select "Grade 3" + "Math"
   - Should see: minCorrectAnswers = 3 (seed data)
   - Change to 5
   - Click "Save Configuration"
   - Should see: "Configuration saved successfully!"
   - Reload page
   - Should persist: minCorrectAnswers = 5

4. **Test reset:**
   - Click "Reset to Defaults"
   - Should revert to: minCorrectAnswers = 3
   - Click Save to commit

---

## Step 4: Test Evidence Recording

1. **Start a lesson:**
   - Go to `/lessons`
   - Start any Grade 3 Math lesson

2. **Interact with AI:**
   - Answer a question correctly
   - AI should respond with "Correct!" or similar

3. **Check database:**
   ```sql
   SELECT * FROM mastery_evidence
   WHERE user_id = '<your-user-id>'
   ORDER BY recorded_at DESC
   LIMIT 10;
   ```

4. **Expected result:**
   - Should see new rows with `evidence_type = 'correct_answer'`
   - Content should be your answer
   - Metadata should include quality_score

---

## Step 5: Test Mastery Override

This is harder to test manually (requires specific conditions). Here's how:

1. **Modify rules to be very strict:**
   - Go to `/admin/curriculum-builder`
   - Set minCorrectAnswers = 10 (very high)
   - Save

2. **Start a lesson:**
   - Answer 3-4 questions correctly
   - Try to complete the lesson

3. **Check console logs:**
   - Open browser DevTools → Console
   - Look for: `[Mastery Override] AI said complete, but rules say NOT mastered`

4. **Expected behavior:**
   - AI might say "Great! You've completed the lesson!"
   - System should return `lessonComplete: false`
   - Lesson should NOT complete (student stays in lesson)

5. **Verify in database:**
   ```sql
   SELECT evidence_type, COUNT(*) as count
   FROM mastery_evidence
   WHERE user_id = '<your-user-id>'
   AND lesson_id = '<lesson-id>'
   GROUP BY evidence_type;
   ```

   Should show:
   - correct_answer: 3-4
   - But minCorrectAnswers rule is 10 → NOT MASTERED

---

## Step 6: Reset Test Data (If Needed)

If you want to start fresh:

```sql
-- Clear evidence for your user
DELETE FROM mastery_evidence WHERE user_id = '<your-user-id>';

-- Reset subject configurations to seed data
DELETE FROM subject_configurations WHERE subject = 'math' AND grade_level = 3;

-- Re-insert seed data
INSERT INTO subject_configurations (subject, grade_level, default_mastery_rules)
VALUES (
  'math',
  3,
  '{
    "minCorrectAnswers": 3,
    "minExplanationQuality": 70,
    "minApplicationAttempts": 2,
    "minOverallQuality": 75,
    "maxStruggleRatio": 0.3,
    "minTimeSpentMinutes": 5
  }'::jsonb
);
```

---

## Troubleshooting

### Issue: "Table does not exist" error
**Cause:** Migration didn't run successfully
**Fix:**
1. Check Supabase SQL Editor for error messages
2. Verify you're in the correct project
3. Re-run migration

### Issue: Curriculum builder shows "No configuration" but seed data was inserted
**Cause:** API can't reach database
**Fix:**
1. Check Supabase credentials in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
2. Restart dev server

### Issue: Evidence not recording
**Cause:** Keyword matching not detecting correct/incorrect
**Fix:**
1. Check AI response text in console
2. Verify response contains keywords like "correct", "right", "not quite"
3. If needed, add more keywords to detection logic in `app/api/teach/multi-ai/route.ts` (lines 180-200)

### Issue: Mastery override not working
**Cause:** AI never says `lessonComplete: true`
**Fix:**
1. This is normal - AI is conservative about completion
2. To force test, temporarily hardcode:
   ```typescript
   let lessonComplete = true; // Force test
   ```
3. Remove hardcode after testing

### Issue: TypeScript errors on build
**Cause:** Import path issues or type mismatches
**Fix:**
1. Verify all import paths use `@/lib/...` alias
2. Check `tsconfig.json` has correct paths configuration
3. Run: `npm run build` to see detailed errors

---

## Quick Verification Checklist

After setup, verify these work:

- [ ] Database migration ran successfully
- [ ] Seed data exists for Grade 3 Math
- [ ] Curriculum builder UI loads at `/admin/curriculum-builder`
- [ ] Can select grade/subject and see configuration
- [ ] Can save configuration and it persists
- [ ] Evidence is recorded during lessons
- [ ] Console shows `[Mastery]` log messages
- [ ] No TypeScript build errors

---

## Next Steps After Phase 1

Once Phase 1 is verified working:

1. **Gather user feedback:**
   - Are the 6 mastery rules sufficient?
   - Are default values reasonable?
   - Is UI intuitive?

2. **Create configurations for more subjects:**
   - Use curriculum builder to add Grade 3 Science, English, etc.
   - Experiment with different rule values

3. **Plan Phase 2:**
   - Design topic-level configuration schema
   - Plan UI for topic-specific overrides
   - Decide on inheritance behavior

---

## Contact

For issues or questions about this implementation, refer to:
- **Implementation Summary:** `project_docs/Phase_1_Implementation_Summary.md`
- **Migration File:** `lib/db/migration_003_curriculum_builder.sql`
- **Core Logic:** `lib/kernel/mastery-detector.ts`

---

**Last Updated:** February 2, 2026
