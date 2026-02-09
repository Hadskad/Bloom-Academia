# Phase 1 API Reference

Quick reference for all new APIs in the Curriculum Builder system.

---

## Admin APIs

### GET /api/admin/curriculum/subject

Loads mastery rules configuration for a subject/grade.

**Query Parameters:**
- `grade` (required): Grade level (1-12)
- `subject` (required): Subject name (math, science, english, history, art, other)

**Response (200 OK):**
```json
{
  "exists": true,
  "subject": "math",
  "gradeLevel": 3,
  "masteryRules": {
    "minCorrectAnswers": 3,
    "minExplanationQuality": 70,
    "minApplicationAttempts": 2,
    "minOverallQuality": 75,
    "maxStruggleRatio": 0.3,
    "minTimeSpentMinutes": 5
  },
  "createdAt": "2026-02-02T10:00:00Z",
  "updatedAt": "2026-02-02T10:00:00Z"
}
```

**Response (if no configuration exists):**
```json
{
  "exists": false,
  "subject": "math",
  "gradeLevel": 3,
  "masteryRules": {
    // System defaults
  }
}
```

**Errors:**
- `400 Bad Request`: Missing or invalid parameters
- `500 Internal Server Error`: Database error

**Example Usage:**
```typescript
const response = await fetch('/api/admin/curriculum/subject?grade=3&subject=math')
const data = await response.json()

if (data.exists) {
  console.log('Configuration exists:', data.masteryRules)
} else {
  console.log('Using defaults:', data.masteryRules)
}
```

---

### PUT /api/admin/curriculum/subject

Saves or updates mastery rules configuration.

**Request Body:**
```json
{
  "subject": "math",
  "gradeLevel": 3,
  "masteryRules": {
    "minCorrectAnswers": 5,
    "minExplanationQuality": 75,
    "minApplicationAttempts": 3,
    "minOverallQuality": 80,
    "maxStruggleRatio": 0.25,
    "minTimeSpentMinutes": 7
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Configuration saved successfully",
  "configuration": {
    "subject": "math",
    "gradeLevel": 3,
    "masteryRules": {
      "minCorrectAnswers": 5,
      "minExplanationQuality": 75,
      "minApplicationAttempts": 3,
      "minOverallQuality": 80,
      "maxStruggleRatio": 0.25,
      "minTimeSpentMinutes": 7
    },
    "updatedAt": "2026-02-02T11:30:00Z"
  }
}
```

**Validation Rules:**
- `gradeLevel`: 1-12
- `subject`: one of [math, science, english, history, art, other]
- `minCorrectAnswers`: >= 0
- `minExplanationQuality`: 0-100
- `minApplicationAttempts`: >= 0
- `minOverallQuality`: 0-100
- `maxStruggleRatio`: 0-1
- `minTimeSpentMinutes`: >= 0

**Errors:**
- `400 Bad Request`: Missing fields or validation errors
- `500 Internal Server Error`: Database error

**Example Usage:**
```typescript
const response = await fetch('/api/admin/curriculum/subject', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'math',
    gradeLevel: 3,
    masteryRules: {
      minCorrectAnswers: 5,
      minExplanationQuality: 75,
      minApplicationAttempts: 3,
      minOverallQuality: 80,
      maxStruggleRatio: 0.25,
      minTimeSpentMinutes: 7
    }
  })
})

const data = await response.json()
if (data.success) {
  console.log('Saved:', data.configuration)
}
```

---

## Mastery APIs

### POST /api/kernel/mastery/record-evidence

Records student learning evidence for rules-based mastery detection.

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "lessonId": "650e8400-e29b-41d4-a716-446655440000",
  "sessionId": "750e8400-e29b-41d4-a716-446655440000",
  "evidenceType": "correct_answer",
  "content": "The answer is 68 because 23 + 45 = 68",
  "metadata": {
    "quality_score": 85,
    "confidence": 0.95,
    "context": "AI praised answer"
  }
}
```

**Evidence Types:**
- `correct_answer` - Student answered correctly
- `incorrect_answer` - Student answered incorrectly
- `explanation` - Student explained a concept
- `application` - Student applied knowledge
- `struggle` - Student showed signs of struggle

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Evidence recorded successfully",
  "evidenceType": "correct_answer"
}
```

**Errors:**
- `400 Bad Request`: Missing fields or invalid evidence type
- `500 Internal Server Error`: Database error

**Example Usage:**
```typescript
// After student answers correctly
await fetch('/api/kernel/mastery/record-evidence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    lessonId,
    sessionId,
    evidenceType: 'correct_answer',
    content: studentResponse,
    metadata: { quality_score: 80 }
  })
})
```

---

## Core Functions (TypeScript)

These are not HTTP endpoints but TypeScript functions you can import and use.

### recordMasteryEvidence()

**Import:**
```typescript
import { recordMasteryEvidence } from '@/lib/kernel/mastery-detector'
```

**Signature:**
```typescript
async function recordMasteryEvidence(
  userId: string,
  lessonId: string,
  sessionId: string,
  evidenceType: 'correct_answer' | 'incorrect_answer' | 'explanation' | 'application' | 'struggle',
  content: string,
  metadata?: {
    quality_score?: number
    confidence?: number
    context?: string
  }
): Promise<void>
```

**Usage:**
```typescript
await recordMasteryEvidence(
  userId,
  lessonId,
  sessionId,
  'correct_answer',
  'Student said: The answer is 68',
  { quality_score: 85, context: 'AI praised' }
)
```

---

### determineMastery()

**Import:**
```typescript
import { determineMastery } from '@/lib/kernel/mastery-detector'
```

**Signature:**
```typescript
async function determineMastery(
  userId: string,
  lessonId: string,
  subject: string,
  gradeLevel: number,
  sessionStartTime: Date
): Promise<MasteryResult>
```

**Return Type:**
```typescript
interface MasteryResult {
  hasMastered: boolean
  confidence: number  // Always 1.0 (deterministic)
  criteriaMet: {
    correctAnswers: boolean
    explanationQuality: boolean
    applicationAttempts: boolean
    overallQuality: boolean
    struggleRatio: boolean
    timeSpent: boolean
  }
  evidence: {
    correctAnswers: number
    incorrectAnswers: number
    explanations: number
    applications: number
    struggles: number
    avgQuality: number
    timeSpentMinutes: number
  }
  rulesApplied: MasteryRules
}
```

**Usage:**
```typescript
const sessionStart = new Date(Date.now() - 10 * 60 * 1000) // 10 mins ago

const result = await determineMastery(
  userId,
  lessonId,
  'math',
  3,
  sessionStart
)

if (result.hasMastered) {
  console.log('Student mastered the lesson!')
  console.log('Evidence:', result.evidence)
} else {
  console.log('More practice needed')
  console.log('Criteria met:', Object.values(result.criteriaMet).filter(Boolean).length, '/ 6')
}
```

---

### getEffectiveRulesForSubject()

**Import:**
```typescript
import { getEffectiveRulesForSubject } from '@/lib/kernel/mastery-detector'
```

**Signature:**
```typescript
async function getEffectiveRulesForSubject(
  subject: string,
  gradeLevel: number
): Promise<MasteryRules>
```

**Return Type:**
```typescript
interface MasteryRules {
  minCorrectAnswers: number
  minExplanationQuality: number
  minApplicationAttempts: number
  minOverallQuality: number
  maxStruggleRatio: number
  minTimeSpentMinutes: number
}
```

**Usage:**
```typescript
const rules = await getEffectiveRulesForSubject('math', 3)

console.log('Grade 3 Math requires:')
console.log('- Min correct answers:', rules.minCorrectAnswers)
console.log('- Min explanation quality:', rules.minExplanationQuality)
```

---

## Database Schema Reference

### subject_configurations

```sql
CREATE TABLE subject_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('math', 'science', 'english', 'history', 'art', 'other')),
  grade_level INTEGER NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  default_mastery_rules JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, grade_level)
);
```

**Indexes:**
- `idx_subject_configs_subject_grade` on (subject, grade_level)

---

### mastery_evidence

```sql
CREATE TABLE mastery_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'correct_answer',
    'incorrect_answer',
    'explanation',
    'application',
    'struggle'
  )),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_mastery_evidence_user_lesson` on (user_id, lesson_id)
- `idx_mastery_evidence_session` on (session_id)
- `idx_mastery_evidence_type` on (evidence_type)
- `idx_mastery_evidence_recorded` on (recorded_at DESC)

---

## SQL Helper Functions

### get_effective_mastery_rules()

```sql
SELECT get_effective_mastery_rules('math', 3);

-- Returns:
-- {
--   "minCorrectAnswers": 3,
--   "minExplanationQuality": 70,
--   ...
-- }
```

---

### count_evidence_by_type()

```sql
SELECT count_evidence_by_type(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- user_id
  '650e8400-e29b-41d4-a716-446655440000'::uuid,  -- lesson_id
  'correct_answer'
);

-- Returns: 5 (number of correct answers)
```

---

### get_lesson_evidence()

```sql
SELECT * FROM get_lesson_evidence(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- user_id
  '650e8400-e29b-41d4-a716-446655440000'::uuid   -- lesson_id
);

-- Returns table with columns:
-- evidence_type | content | metadata | recorded_at
```

---

## Common Queries

### Get all configurations
```sql
SELECT subject, grade_level, default_mastery_rules
FROM subject_configurations
ORDER BY subject, grade_level;
```

### Get evidence for a lesson
```sql
SELECT evidence_type, content, metadata, recorded_at
FROM mastery_evidence
WHERE user_id = '<user-id>'
AND lesson_id = '<lesson-id>'
ORDER BY recorded_at ASC;
```

### Count evidence by type for a lesson
```sql
SELECT evidence_type, COUNT(*) as count
FROM mastery_evidence
WHERE user_id = '<user-id>'
AND lesson_id = '<lesson-id>'
GROUP BY evidence_type;
```

### Get recent evidence for a user
```sql
SELECT me.evidence_type, me.content, l.title as lesson_title, me.recorded_at
FROM mastery_evidence me
JOIN lessons l ON me.lesson_id = l.id
WHERE me.user_id = '<user-id>'
ORDER BY me.recorded_at DESC
LIMIT 20;
```

### Get all subjects with configurations
```sql
SELECT DISTINCT subject, grade_level
FROM subject_configurations
ORDER BY grade_level, subject;
```

---

## Error Codes Reference

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing parameters, invalid values |
| 404 | Not Found | Lesson doesn't exist |
| 500 | Internal Server Error | Database connection, Supabase error |

---

## Rate Limits

No rate limits currently enforced on these APIs (internal use only).

For production, consider:
- Max 100 requests/minute per user for GET endpoints
- Max 10 requests/minute per user for PUT endpoints
- Max 1000 evidence records/lesson (prevent abuse)

---

**Last Updated:** February 2, 2026
