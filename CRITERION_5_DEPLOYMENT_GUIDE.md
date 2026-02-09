# CRITERION 5: DEPLOYMENT GUIDE

Quick reference for deploying the diagnostic remediation system to production.

---

## PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables

Verify `GEMINI_API_KEY` is set:
```bash
echo $GEMINI_API_KEY
```

If not set:
```bash
# .env.local
GEMINI_API_KEY=your_key_here
```

---

### 2. Database Migrations

**Step 1: Run Main Migration**
```bash
# Connect to your Supabase database
psql -h db.<project-ref>.supabase.co -U postgres -d postgres

# Or use Supabase CLI
supabase db push
```

Run migration files in order:
```sql
-- Migration 007: Remediation System Schema
\i lib/db/migration_007_remediation_system.sql

-- Migration 007b: Concept Tags for Existing Assessment
\i lib/db/migration_007_concept_tags.sql
```

**Step 2: Verify Tables Created**
```sql
-- Check remediation_plans table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'remediation_plans';

-- Check concept_tags column added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assessments' AND column_name = 'concept_tags';
```

**Step 3: Verify Concept Tags Applied**
```sql
SELECT
  id,
  title,
  jsonb_array_length(concept_tags) AS concept_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(questions) AS q
    WHERE q ? 'concepts'
  ) AS tagged_questions
FROM assessments
WHERE lesson_id = '0d27645e-54b0-418f-b62f-e848087d7db9';

-- Expected Output:
-- concept_count: 4
-- tagged_questions: 12
```

---

### 3. Install Dependencies

No new dependencies required! All use existing packages:
- `@google/genai` (already installed)
- `react-markdown` (already installed)

---

### 4. Build & Deploy

```bash
# Build Next.js app
npm run build

# Test locally first
npm run dev

# Deploy to Vercel (or your platform)
vercel deploy --prod
```

---

## POST-DEPLOYMENT VERIFICATION

### Test 1: Generate Remediation API

```bash
curl -X POST https://your-domain.com/api/remediation/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<valid-user-id>",
    "assessmentId": "<valid-assessment-id>",
    "lessonId": "<valid-lesson-id>",
    "perQuestionResults": [
      {
        "questionId": "q1",
        "isCorrect": false,
        "partialCredit": 0,
        "pointsEarned": 0,
        "pointsPossible": 8.33,
        "feedback": "Not quite",
        "correctAnswerHint": "The numerator is the top number"
      }
    ],
    "userProfile": {
      "id": "<user-id>",
      "learning_style": "visual",
      "grade_level": 5,
      "age": 10,
      "strengths": [],
      "struggles": []
    }
  }'
```

Expected Response:
```json
{
  "success": true,
  "remediationPlanId": "<uuid>",
  "diagnosis": {
    "failedConcepts": [...],
    "remediationNeeded": true
  },
  "remediationLessons": [...],
  "message": "Generated N targeted remediation mini-lessons"
}
```

---

### Test 2: Load Remediation Plan

```bash
curl https://your-domain.com/api/remediation/generate?planId=<uuid>
```

Expected: Full remediation plan with lessons

---

### Test 3: End-to-End User Flow

1. Log in as test student
2. Navigate to fractions lesson: `/learn/0d27645e-54b0-418f-b62f-e848087d7db9`
3. Complete lesson
4. **Fail assessment** (score < 80%)
5. Verify diagnostic breakdown appears
6. Click "🎯 Start Targeted Practice"
7. Verify remediation session loads
8. Navigate through mini-lessons
9. Click "I'm Ready to Try Again!"
10. Verify redirects to lesson page

---

## MONITORING

### Key Metrics to Track

1. **Remediation Generation Rate**
   ```sql
   SELECT
     COUNT(*) AS total_remediations,
     COUNT(CASE WHEN completed THEN 1 END) AS completed_remediations,
     AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END) AS completion_rate
   FROM remediation_plans
   WHERE created_at >= NOW() - INTERVAL '7 days';
   ```

2. **Most Common Failed Concepts**
   ```sql
   SELECT
     concept->>'concept' AS concept_name,
     COUNT(*) AS failure_count
   FROM remediation_plans,
       jsonb_array_elements(diagnosis->'failedConcepts') AS concept
   GROUP BY concept_name
   ORDER BY failure_count DESC
   LIMIT 10;
   ```

3. **Remediation Effectiveness**
   ```sql
   SELECT
     rp.user_id,
     rp.lesson_id,
     rp.created_at AS remediation_date,
     (
       SELECT score
       FROM assessment_attempts aa
       WHERE aa.user_id = rp.user_id
         AND aa.lesson_id = rp.lesson_id
         AND aa.created_at > rp.created_at
       ORDER BY aa.created_at ASC
       LIMIT 1
     ) AS post_remediation_score
   FROM remediation_plans rp
   WHERE rp.completed = TRUE;
   ```

---

## ROLLBACK PROCEDURE

If issues occur, rollback in reverse order:

### Step 1: Disable Remediation UI
```typescript
// components/AssessmentResults.tsx
// Comment out the diagnostic breakdown section (lines 183-239)
```

### Step 2: Remove Database Schema
```sql
-- WARNING: This deletes all remediation data
DROP TABLE IF EXISTS remediation_plans CASCADE;
DROP VIEW IF EXISTS remediation_analytics CASCADE;

-- Remove concept_tags column
ALTER TABLE assessments DROP COLUMN IF EXISTS concept_tags;
```

### Step 3: Redeploy Previous Version
```bash
git revert <commit-hash>
vercel deploy --prod
```

---

## TROUBLESHOOTING

### Issue: "GEMINI_API_KEY not set"

**Solution:**
```bash
# Verify environment variable
echo $GEMINI_API_KEY

# Add to Vercel
vercel env add GEMINI_API_KEY
```

---

### Issue: "Assessment not found"

**Cause**: Assessment ID doesn't exist or doesn't have concept tags

**Solution:**
```sql
-- Check if assessment exists
SELECT id, title, concept_tags FROM assessments WHERE id = '<assessment-id>';

-- If concept_tags is null, run tagging migration
\i lib/db/migration_007_concept_tags.sql
```

---

### Issue: "No remediation lessons generated"

**Cause**: All concepts passed or no concepts tagged

**Solution:**
```sql
-- Verify questions have concept tags
SELECT
  id,
  text,
  concepts
FROM jsonb_to_recordset((SELECT questions FROM assessments WHERE id = '<assessment-id>'))
AS q(id TEXT, text TEXT, concepts JSONB);

-- If concepts are null, questions need tagging
```

---

### Issue: Remediation page shows loading forever

**Cause**: Remediation plan ID doesn't exist or API is failing

**Solution:**
1. Check browser console for errors
2. Verify plan ID exists:
   ```sql
   SELECT * FROM remediation_plans WHERE id = '<plan-id>';
   ```
3. Check API endpoint:
   ```bash
   curl https://your-domain.com/api/remediation/generate?planId=<plan-id>
   ```

---

## COST ESTIMATES

### Gemini API Usage

**Pricing** (as of Jan 2026):
- Gemini 3 Flash: $0.10 per 1M input tokens, $0.40 per 1M output tokens
- Average remediation generation: ~2,000 input + 1,500 output tokens

**Cost per remediation**:
```
Input:  2,000 tokens × $0.10 / 1M = $0.0002
Output: 1,500 tokens × $0.40 / 1M = $0.0006
Total: ~$0.0008 per remediation plan
```

**Monthly estimate** (100 failed assessments):
```
100 failures × 50% use remediation = 50 remediations
50 × $0.0008 = $0.04/month
```

Very affordable! 🎉

### Database Storage

**Remediation Plans Table**:
- Average plan size: ~10 KB (JSON content)
- 1,000 plans = 10 MB
- Negligible cost

---

## SUPPORT CONTACTS

- **Implementation Questions**: Check `CRITERION_5_IMPLEMENTATION_COMPLETE.md`
- **Bug Reports**: Create issue in repository
- **Database Issues**: Check Supabase dashboard logs
- **API Issues**: Check Vercel function logs

---

## SUCCESS CRITERIA

✅ **Deployment is successful when:**

1. Database migrations complete without errors
2. API endpoint returns valid remediation plans
3. UI displays diagnostic breakdown for failed assessments
4. Remediation session page loads and displays content
5. Students can complete remediation flow end-to-end
6. No console errors in browser or server logs

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2026-02-08
**Estimated Deployment Time**: 15-20 minutes
