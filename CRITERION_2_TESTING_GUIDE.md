# CRITERION 2 TESTING GUIDE

Quick reference for testing the Adaptive Teaching implementation.

---

## PRE-TESTING CHECKLIST

### 1. Run Database Migration

```sql
-- In Supabase SQL Editor, run:
-- File: lib/db/migration_005_adaptation_tracking.sql
```

Verify table created:
```sql
SELECT * FROM adaptation_logs LIMIT 1;
```

### 2. Run Automated Tests

```bash
npm test -- adaptive-teaching.test.ts
```

Expected: All 17+ tests should pass ✅

---

## MANUAL TESTING SCENARIOS

### Test 1: Visual Learner Adaptation

**Setup**:
```sql
-- Update user profile
UPDATE users
SET learning_style = 'visual'
WHERE id = 'YOUR_USER_ID';
```

**Test**:
1. Start a lesson (any subject)
2. Ask: "What is a fraction?" or "Explain photosynthesis"
3. Check response includes `<svg>` tag

**Verify**:
```sql
SELECT has_svg, learning_style
FROM adaptation_logs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: `has_svg = true` for most responses

---

### Test 2: Struggling Student (Low Mastery)

**Setup**:
```sql
-- Set low mastery by adding incorrect answers to mastery_evidence
INSERT INTO mastery_evidence (user_id, lesson_id, session_id, evidence_type, content)
VALUES
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'incorrect_answer', 'Test answer 1'),
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'incorrect_answer', 'Test answer 2'),
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'incorrect_answer', 'Test answer 3');
```

**Test**:
1. Start the same lesson
2. Ask: "Explain [concept]"
3. Check response uses simple language, breaks into small steps

**Verify**:
```sql
SELECT mastery_level, difficulty_level
FROM adaptation_logs
WHERE user_id = 'YOUR_USER_ID'
  AND lesson_id = 'YOUR_LESSON_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- `mastery_level` < 50
- `difficulty_level = 'simplified'`

---

### Test 3: Excelling Student (High Mastery)

**Setup**:
```sql
-- Set high mastery by adding correct answers
INSERT INTO mastery_evidence (user_id, lesson_id, session_id, evidence_type, content)
VALUES
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'correct_answer', 'Correct 1'),
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'correct_answer', 'Correct 2'),
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'correct_answer', 'Correct 3'),
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'correct_answer', 'Correct 4'),
  ('YOUR_USER_ID', 'YOUR_LESSON_ID', 'YOUR_SESSION_ID', 'correct_answer', 'Correct 5');
```

**Test**:
1. Start the same lesson
2. Ask: "What is [concept]?"
3. Check response includes advanced vocabulary, challenging questions

**Verify**:
```sql
SELECT mastery_level, difficulty_level
FROM adaptation_logs
WHERE user_id = 'YOUR_USER_ID'
  AND lesson_id = 'YOUR_LESSON_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- `mastery_level` > 80
- `difficulty_level = 'accelerated'`

---

## VERIFICATION QUERIES

### Query 1: SVG Adaptation Verification

```sql
SELECT
  learning_style,
  COUNT(*) as total_adaptations,
  SUM(CASE WHEN has_svg THEN 1 ELSE 0 END) as svg_count,
  ROUND(
    SUM(CASE WHEN has_svg THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100,
    1
  ) as svg_percentage
FROM adaptation_logs
WHERE learning_style IS NOT NULL
GROUP BY learning_style
ORDER BY svg_percentage DESC;
```

**Success Criteria**: Visual learners have 2-3x higher `svg_percentage` than others

---

### Query 2: Difficulty vs Mastery Correlation

```sql
SELECT
  difficulty_level,
  COUNT(*) as count,
  ROUND(AVG(mastery_level), 1) as avg_mastery,
  MIN(mastery_level) as min_mastery,
  MAX(mastery_level) as max_mastery
FROM adaptation_logs
GROUP BY difficulty_level
ORDER BY
  CASE difficulty_level
    WHEN 'simplified' THEN 1
    WHEN 'standard' THEN 2
    WHEN 'accelerated' THEN 3
  END;
```

**Success Criteria**:
- `simplified`: avg_mastery < 50
- `standard`: avg_mastery 50-80
- `accelerated`: avg_mastery > 80

---

### Query 3: Recent Adaptations (Debugging)

```sql
SELECT
  a.created_at,
  u.name as student_name,
  l.title as lesson_title,
  a.mastery_level,
  a.learning_style,
  a.difficulty_level,
  a.scaffolding_level,
  a.has_svg,
  LEFT(a.response_preview, 100) as preview
FROM adaptation_logs a
JOIN users u ON a.user_id = u.id
JOIN lessons l ON a.lesson_id = l.id
ORDER BY a.created_at DESC
LIMIT 10;
```

**Use**: Inspect recent adaptations to verify directives are being applied

---

## PROGRAMMATIC VERIFICATION

### Use the Verification Function

```typescript
import { verifySvgAdaptation } from '@/lib/ai/adaptation-logger';

const result = await verifySvgAdaptation();

console.log('Visual Learner SVG Rate:', result.visualLearnerSvgRate);
console.log('Other Learner SVG Rate:', result.otherLearnerSvgRate);
console.log('Ratio Multiplier:', result.ratioMultiplier);
console.log('Passes Threshold (2x):', result.passesThreshold);
```

---

## TROUBLESHOOTING

### Issue: No adaptation_logs entries

**Cause**: Migration not run or logging failed

**Solution**:
1. Verify table exists: `SELECT * FROM adaptation_logs;`
2. Check console logs for errors: Look for `[Adaptation Logger]`
3. Verify `logAdaptation()` is being called in route handler

---

### Issue: All mastery_level = 50

**Cause**: No mastery evidence in database

**Solution**:
1. Add test evidence (see Test 2 & 3 setup)
2. Verify mastery_evidence table has data:
   ```sql
   SELECT * FROM mastery_evidence WHERE user_id = 'YOUR_USER_ID';
   ```

---

### Issue: has_svg always false

**Cause**: Visual learner directives not being applied

**Solution**:
1. Verify learning_style is set: `SELECT learning_style FROM users WHERE id = 'YOUR_USER_ID';`
2. Check console logs for `[Adaptive Teaching] Generated directives`
3. Verify adaptiveInstructions contains "SVG" keyword

---

## EXPECTED CONSOLE OUTPUT

When working correctly, you should see:

```
[Adaptive Teaching] Generated directives: {
  userId: 'a1b2c3d4',
  lessonId: 'e5f6g7h8',
  mastery: 45,
  learningStyle: 'visual',
  directiveCount: 12
}

[Mastery Tracker] Evidence-based calculation for lesson e5f6g7h8: {
  correct: 2,
  incorrect: 3,
  mastery: 40
}

[Adaptation Logger] Logged adaptation: {
  userId: 'a1b2c3d4',
  lessonId: 'e5f6g7h8',
  mastery: 45,
  difficulty: 'simplified',
  scaffolding: 'standard',
  hasSvg: true
}
```

---

## SUCCESS METRICS CHECKLIST

After testing, verify these metrics:

- [ ] Visual learners have 2-3x higher SVG rate
- [ ] Simplified difficulty correlates with mastery < 50
- [ ] Accelerated difficulty correlates with mastery > 80
- [ ] Adaptation logs show non-zero entries
- [ ] Different learning styles produce different directives
- [ ] Scaffolding level adjusts based on struggle rate

---

## NEXT STEPS AFTER TESTING

1. If all tests pass → Update ROADMAP_TO_100_PERCENT.md (Criterion 2: 10/10 ✅)
2. If issues found → Debug using troubleshooting section
3. Create analytics dashboard (optional) to visualize adaptations
4. Proceed to Criterion 3 implementation

---

**Testing Status**: Ready for manual verification
**Estimated Testing Time**: 30-45 minutes
**Required Access**: Supabase SQL Editor + Application testing environment
