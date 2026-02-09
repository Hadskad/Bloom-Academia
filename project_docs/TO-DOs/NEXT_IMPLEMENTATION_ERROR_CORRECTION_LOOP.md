# NEXT IMPLEMENTATION: ERROR CORRECTION LOOP

**Priority**: HIGH (Closes gap in Criterion 3)
**Estimated Effort**: 20-26 hours (1 week full-time)
**Dependencies**: ✅ Step 2 Complete (AI-based evidence extraction)

---

## Executive Summary

**Current State**:
- ✅ AI detects when student answers incorrectly
- ✅ Evidence recorded to database with quality scores
- ❌ Student can proceed with unresolved misconception

**Target State**:
- ✅ AI detects WHICH misconception (error taxonomy)
- ✅ System BLOCKS progression until retry completed
- ✅ Specialist prompts ENFORCE mandatory retry
- ✅ Correction verified before moving on

**Gap**: We record errors but don't force correction before progression.

---

## Problem Statement

### Current Flow (Incomplete):
```
Student: "3/4 + 2/5 = 5/9" (adds numerators AND denominators)
    ↓
Evidence Extraction: evidenceType = 'incorrect_answer', qualityScore = 10
    ↓
Record to Database: mastery_evidence table
    ↓
AI Response: "Not quite! When adding fractions, we need a common denominator..."
    ↓
❌ ISSUE: Student can say "OK" and move on without demonstrating correction
    ↓
Lesson continues with misconception unresolved
```

### Desired Flow (Complete):
```
Student: "3/4 + 2/5 = 5/9" (adds numerators AND denominators)
    ↓
Error Detection: misconception_type = 'numerator_plus_denominator_error'
    ↓
System: BLOCKS next topic, injects retry requirement
    ↓
AI Response: "That's a common mistake! The rule is: same denominator first.
              Let's try again: What's 3/4 + 2/5? Remember: common denominator!"
    ↓
✅ BLOCKING: Student MUST retry before proceeding
    ↓
Student Retry: "First find common denominator... 15/20 + 8/20 = 23/20"
    ↓
Verification: Error corrected! Mark correction_verified = true
    ↓
Lesson continues with confidence student understands
```

---

## Implementation Plan

### PHASE 1: Error Taxonomy System (8-10 hours)

#### Step 1.1: Create Error Detection Module (3 hours)
**File**: `lib/kernel/error-detector.ts` (NEW)

**Purpose**: Classify WHICH misconception, not just "incorrect"

```typescript
/**
 * Error Taxonomy System
 *
 * Extends generic 'incorrect_answer' evidence with specific error types
 * mapped to misconceptions documented in specialist prompts.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// Error classification schema
const errorClassificationSchema = z.object({
  errorType: z.enum([
    // Math errors (from seed_ai_agents_v2.sql lines 199-233)
    'numerator_plus_denominator',
    'forgot_common_denominator',
    'denominator_comparison_error',
    'improper_fraction_confusion',
    'calculation_mistake',
    'conceptual_misunderstanding',
    'process_error',
    'no_error'
  ]).describe('Specific type of mathematical error detected'),

  severity: z.enum(['critical', 'moderate', 'minor']).describe(
    'critical = fundamental misconception, moderate = process error, minor = calculation slip'
  ),

  misconceptionId: z.string().describe('Reference to misconception in specialist prompts'),

  correctionStrategy: z.string().describe('How to help student correct this specific error'),

  exampleCorrectAnswer: z.string().describe('What correct answer should look like'),

  confidence: z.number().min(0).max(1).describe('Confidence in error classification')
});

export type ErrorClassification = z.infer<typeof errorClassificationSchema>;

/**
 * Detects specific error type from student's incorrect answer
 *
 * @param studentAnswer - What student said/wrote
 * @param correctAnswer - What the correct answer is
 * @param concept - Concept being taught (e.g., "Adding Fractions")
 * @param teacherResponse - AI's response (helps contextualize)
 * @returns Detailed error classification with correction strategy
 */
export async function detectErrorType(
  studentAnswer: string,
  correctAnswer: string | undefined,
  concept: string,
  teacherResponse: string
): Promise<ErrorClassification> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const ai = new GoogleGenAI({ apiKey });
    const model = ai.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: 'application/json',
        responseSchema: errorClassificationSchema
      }
    });

    const prompt = `You are a diagnostic expert analyzing a student's mathematical error.

CONCEPT BEING TAUGHT: ${concept}

STUDENT'S ANSWER: "${studentAnswer}"

${correctAnswer ? `CORRECT ANSWER: "${correctAnswer}"` : 'CORRECT ANSWER: Unknown (open-ended question)'}

TEACHER'S RESPONSE: "${teacherResponse}"

Analyze the student's error and classify it:

COMMON MATH ERRORS:
1. numerator_plus_denominator - Added numerators AND denominators (e.g., 1/2 + 1/3 = 2/5)
2. forgot_common_denominator - Tried to add without common denominator
3. denominator_comparison_error - Thinks bigger denominator = bigger fraction
4. improper_fraction_confusion - Doesn't understand fractions > 1
5. calculation_mistake - Right method, wrong arithmetic
6. conceptual_misunderstanding - Fundamental concept gap
7. process_error - Skipped a step or wrong order
8. no_error - Answer is actually correct (rare - only if teacher misidentified)

SEVERITY LEVELS:
- critical: Fundamental misconception (e.g., doesn't understand what fractions are)
- moderate: Process error (e.g., forgot a step but understands concept)
- minor: Calculation slip (e.g., 7+8=16 instead of 15)

CORRECTION STRATEGY:
Suggest specific teaching approach to fix THIS error.

Return JSON with: errorType, severity, misconceptionId, correctionStrategy, exampleCorrectAnswer, confidence`;

    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text()) as ErrorClassification;

    console.log('[Error Detection]', {
      student: studentAnswer.substring(0, 50),
      errorType: analysis.errorType,
      severity: analysis.severity,
      confidence: analysis.confidence
    });

    return analysis;

  } catch (error) {
    console.error('[Error Detection] Failed:', error);

    // Fallback: Generic error classification
    return {
      errorType: 'conceptual_misunderstanding',
      severity: 'moderate',
      misconceptionId: 'unknown',
      correctionStrategy: 'Review the concept step-by-step with the student',
      exampleCorrectAnswer: 'Unable to determine',
      confidence: 0.3
    };
  }
}
```

**References**:
- Gemini Structured Output: https://ai.google.dev/gemini-api/docs/structured-output
- Error types mapped from: [lib/db/seed_ai_agents_v2.sql](lib/db/seed_ai_agents_v2.sql#L199-L233)

---

#### Step 1.2: Update Database Schema (1 hour)
**File**: `lib/db/migration_007_error_taxonomy.sql` (NEW)

```sql
-- Migration 007: Error Taxonomy for Correction Tracking
-- Adds fields to track specific misconceptions and correction verification

-- Add error classification columns
ALTER TABLE mastery_evidence
ADD COLUMN IF NOT EXISTS misconception_type TEXT,
ADD COLUMN IF NOT EXISTS error_severity TEXT CHECK (error_severity IN ('critical', 'moderate', 'minor')),
ADD COLUMN IF NOT EXISTS correction_strategy TEXT,
ADD COLUMN IF NOT EXISTS correction_attempted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS correction_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Index for querying unresolved errors
CREATE INDEX IF NOT EXISTS idx_mastery_evidence_unresolved
ON mastery_evidence(user_id, lesson_id, correction_verified)
WHERE evidence_type = 'incorrect_answer' AND correction_verified = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN mastery_evidence.misconception_type IS
  'Specific error type (e.g., numerator_plus_denominator, forgot_common_denominator)';
COMMENT ON COLUMN mastery_evidence.correction_verified IS
  'TRUE when student demonstrated understanding after correction';
```

**Run migration**:
```bash
# Apply migration to database
psql -h <supabase_host> -U postgres -d postgres -f lib/db/migration_007_error_taxonomy.sql
```

---

#### Step 1.3: Integrate Error Detection into Teaching Flow (2 hours)
**File**: `app/api/teach/multi-ai-stream/route.ts` (MODIFY)

**Location**: Lines 629-652 (after evidence extraction)

```typescript
// CURRENT CODE (lines 629-652):
if (messageForLogging !== '[Audio/Media input]' && aiResponse.displayText) {
  extractEvidenceQuality(
    messageForLogging,
    aiResponse.displayText,
    lesson.title
  ).then((evidence) => {
    if (evidence.confidence > 0.7) {
      return recordMasteryEvidence(
        userId, lessonId, sessionId,
        evidence.evidenceType,
        messageForLogging,
        {
          quality_score: evidence.qualityScore,
          confidence: evidence.confidence,
          context: lesson.title
        }
      );
    }
  }).catch((err) => console.error('[multi-ai-stream] Failed to record mastery evidence:', err));
}

// NEW CODE (replace with):
import { detectErrorType } from '@/lib/kernel/error-detector';

if (messageForLogging !== '[Audio/Media input]' && aiResponse.displayText) {
  extractEvidenceQuality(
    messageForLogging,
    aiResponse.displayText,
    lesson.title
  ).then(async (evidence) => {
    if (evidence.confidence > 0.7) {
      // If incorrect answer, detect specific error type
      let errorClassification = null;
      if (evidence.evidenceType === 'incorrect_answer') {
        errorClassification = await detectErrorType(
          messageForLogging,
          undefined, // Correct answer not always available in conversational teaching
          lesson.title,
          aiResponse.displayText
        );

        console.log('[Error Classification]', {
          type: errorClassification.errorType,
          severity: errorClassification.severity,
          strategy: errorClassification.correctionStrategy.substring(0, 50)
        });
      }

      // Record evidence with error classification
      return recordMasteryEvidence(
        userId, lessonId, sessionId,
        evidence.evidenceType,
        messageForLogging,
        {
          quality_score: evidence.qualityScore,
          confidence: evidence.confidence,
          context: lesson.title,
          // NEW: Include error classification
          misconception_type: errorClassification?.errorType,
          error_severity: errorClassification?.severity,
          correction_strategy: errorClassification?.correctionStrategy
        }
      );
    }
  }).catch((err) => console.error('[multi-ai-stream] Failed to record mastery evidence:', err));
}
```

---

#### Step 1.4: Update Mastery Detector Types (30 min)
**File**: `lib/kernel/mastery-detector.ts` (MODIFY)

**Location**: Lines 38-48 (Evidence interface)

```typescript
// ADD to Evidence interface:
export interface Evidence {
  evidence_type: 'correct_answer' | 'incorrect_answer' | 'explanation' | 'application' | 'struggle'
  content: string
  metadata?: {
    quality_score?: number
    confidence?: number
    context?: string
    // NEW: Error classification fields
    misconception_type?: string
    error_severity?: 'critical' | 'moderate' | 'minor'
    correction_strategy?: string
    correction_attempted?: boolean
    correction_verified?: boolean
    retry_count?: number
  }
  recorded_at: string
}
```

---

### PHASE 2: Blocking Retry Mechanism (6-8 hours)

#### Step 2.1: Create Retry Controller (3 hours)
**File**: `lib/kernel/retry-controller.ts` (NEW)

```typescript
/**
 * Retry Controller - Enforces mandatory correction before progression
 *
 * When incorrect answer detected, this module:
 * 1. Blocks lesson progression
 * 2. Generates targeted retry prompt
 * 3. Tracks retry attempts
 * 4. Verifies correction
 */

import { supabase } from '@/lib/db/supabase';
import { ErrorClassification } from './error-detector';

export interface RetryRequirement {
  required: boolean
  retryPrompt: string
  errorContext: {
    misconceptionType: string
    severity: 'critical' | 'moderate' | 'minor'
    correctionStrategy: string
  }
  allowSkipAfterAttempts: number  // Safety valve: allow skip after N attempts
}

/**
 * Determines if retry is required for this error
 *
 * @param errorClassification - Classified error from detectErrorType()
 * @param userId - Student ID
 * @param lessonId - Current lesson
 * @returns Retry requirement with guidance
 */
export async function checkRetryRequired(
  errorClassification: ErrorClassification,
  userId: string,
  lessonId: string
): Promise<RetryRequirement> {
  // Check if this error was already retried
  const { data: existingEvidence } = await supabase
    .from('mastery_evidence')
    .select('retry_count, correction_verified')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .eq('metadata->>misconception_type', errorClassification.errorType)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  const retryCount = existingEvidence?.retry_count || 0;
  const alreadyVerified = existingEvidence?.correction_verified || false;

  // Skip retry if already verified this misconception
  if (alreadyVerified) {
    return {
      required: false,
      retryPrompt: '',
      errorContext: {
        misconceptionType: errorClassification.errorType,
        severity: errorClassification.severity,
        correctionStrategy: errorClassification.correctionStrategy
      },
      allowSkipAfterAttempts: 3
    };
  }

  // Safety valve: allow skip after 3 retry attempts (prevent frustration loop)
  if (retryCount >= 3) {
    console.warn(`[Retry Controller] Student ${userId.slice(0, 8)} exceeded max retries for ${errorClassification.errorType}`);
    return {
      required: false,
      retryPrompt: "I see this is challenging. Let's move on and come back to this later.",
      errorContext: {
        misconceptionType: errorClassification.errorType,
        severity: errorClassification.severity,
        correctionStrategy: errorClassification.correctionStrategy
      },
      allowSkipAfterAttempts: 3
    };
  }

  // Generate retry prompt based on error type
  const retryPrompt = generateRetryPrompt(errorClassification, retryCount);

  return {
    required: true,
    retryPrompt,
    errorContext: {
      misconceptionType: errorClassification.errorType,
      severity: errorClassification.severity,
      correctionStrategy: errorClassification.correctionStrategy
    },
    allowSkipAfterAttempts: 3
  };
}

/**
 * Generates context-specific retry prompt
 */
function generateRetryPrompt(
  errorClassification: ErrorClassification,
  attemptNumber: number
): string {
  const encouragement = attemptNumber === 0
    ? "Let's try again!"
    : attemptNumber === 1
    ? "You're getting closer!"
    : "One more time - you've got this!";

  const guidance = errorClassification.correctionStrategy;
  const example = errorClassification.exampleCorrectAnswer;

  return `${encouragement} ${guidance}\n\nHere's an example: ${example}\n\nNow you try:`;
}

/**
 * Records retry attempt
 */
export async function recordRetryAttempt(
  userId: string,
  lessonId: string,
  sessionId: string,
  misconceptionType: string
): Promise<void> {
  // Increment retry count for this misconception
  const { data: lastEvidence } = await supabase
    .from('mastery_evidence')
    .select('id, metadata')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .eq('metadata->>misconception_type', misconceptionType)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (lastEvidence) {
    const metadata = lastEvidence.metadata as any;
    await supabase
      .from('mastery_evidence')
      .update({
        metadata: {
          ...metadata,
          retry_count: (metadata.retry_count || 0) + 1,
          correction_attempted: true
        }
      })
      .eq('id', lastEvidence.id);
  }
}

/**
 * Verifies student corrected their error
 */
export async function verifyCorrection(
  userId: string,
  lessonId: string,
  misconceptionType: string,
  studentRetryResponse: string,
  aiAssessment: 'correct' | 'still_incorrect'
): Promise<boolean> {
  if (aiAssessment === 'correct') {
    // Mark misconception as resolved
    const { data: evidenceToUpdate } = await supabase
      .from('mastery_evidence')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .eq('metadata->>misconception_type', misconceptionType)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (evidenceToUpdate) {
      const metadata = evidenceToUpdate.metadata as any;
      await supabase
        .from('mastery_evidence')
        .update({
          metadata: {
            ...metadata,
            correction_verified: true,
            corrected_at: new Date().toISOString()
          }
        })
        .eq('id', evidenceToUpdate.id);

      console.log(`[Retry Controller] Correction verified for ${misconceptionType}`);
      return true;
    }
  }

  return false;
}
```

---

#### Step 2.2: Modify Teaching Response Structure (2 hours)
**File**: `lib/ai/types.ts` (MODIFY)

Add retry requirement to response types:

```typescript
// ADD to AgentResponse interface (line ~50):
export interface AgentResponse {
  audioText: string
  displayText: string
  svg: string | null
  agentName: string
  agentId: string
  lessonComplete: boolean
  handoffMessage?: string
  // NEW: Retry requirement
  retryRequired?: {
    required: boolean
    retryPrompt: string
    misconceptionType: string
    severity: 'critical' | 'moderate' | 'minor'
    allowSkip: boolean
  }
}

// ADD to ProgressiveAgentResponse interface:
export interface ProgressiveAgentResponse extends AgentResponse {
  firstSentence: string
  remainingAudioText: string | null
  usedProgressiveExtraction: boolean
  firstSentenceAudio: Buffer | null
  // Inherits retryRequired from AgentResponse
}
```

---

#### Step 2.3: Integrate Retry Controller into Teaching Endpoint (2 hours)
**File**: `app/api/teach/multi-ai-stream/route.ts` (MODIFY)

**Location**: After error detection (lines 629-652), before response return

```typescript
// After error classification (new code from Step 1.3), add:

import { checkRetryRequired, recordRetryAttempt } from '@/lib/kernel/retry-controller';

// Check if retry is required for this error
let retryRequirement = null;
if (errorClassification && errorClassification.confidence > 0.7) {
  retryRequirement = await checkRetryRequired(
    errorClassification,
    userId,
    lessonId
  );

  if (retryRequirement.required) {
    // Record retry attempt
    await recordRetryAttempt(
      userId,
      lessonId,
      sessionId,
      errorClassification.errorType
    );

    console.log('[Retry Required]', {
      misconception: errorClassification.errorType,
      severity: errorClassification.severity,
      attempt: (errorClassification as any).retry_count || 0
    });
  }
}

// MODIFY response return (line 708):
return NextResponse.json({
  success: true,
  teacherResponse: {
    audioText: aiResponse.audioText,
    displayText: aiResponse.displayText,
    svg: aiResponse.svg,
    audioBase64,
    agentName: aiResponse.agentName,
    handoffMessage: aiResponse.handoffMessage
  },
  lessonComplete: finalLessonComplete,
  routing: {
    agentName: aiResponse.agentName,
    reason: routingReason
  },
  // NEW: Include retry requirement
  retryRequired: retryRequirement?.required ? {
    required: true,
    retryPrompt: retryRequirement.retryPrompt,
    misconceptionType: retryRequirement.errorContext.misconceptionType,
    severity: retryRequirement.errorContext.severity,
    allowSkip: retryRequirement.allowSkipAfterAttempts <= (errorClassification?.retry_count || 0)
  } : undefined
});
```

---

### PHASE 3: Specialist Prompt Updates (2-3 hours)

#### Step 3.1: Update Math Specialist Prompt (1 hour)
**File**: `lib/db/seed_ai_agents_v2.sql` (MODIFY)

**Location**: Lines 175-196 (IF INCORRECT section)

```sql
-- REPLACE lines 188-196 with:
IF INCORRECT:
1. Acknowledge the attempt: "Good try! Let's look at this together."
2. Identify the specific error: "I see where the mix-up happened..."
3. Explain the correct approach: "When we add fractions, we need..."
4. Demonstrate correctly: Show the right solution step-by-step
5. **MANDATORY RETRY** (NOT OPTIONAL):
   "Now it's your turn. Try this: [Present similar problem]"
   "I'll wait right here while you work it out."
6. **BLOCKING INSTRUCTION**:
   Do NOT proceed to new topics or concepts until student attempts correction.
   Do NOT say "let's move on" or "we'll come back to this."
   Stay on THIS concept until resolved.
7. **VERIFICATION**:
   When student retries, explicitly confirm: "Perfect! You fixed the [specific error]!"
   OR if still wrong: "Not quite yet. Let's look at [specific part] again."

NEVER:
- Say "close enough" for wrong math
- Move on without retry attempt
- Proceed to new topics with unresolved errors
- Make the student feel bad (focus on the math, not the student)
- Give up after one correction attempt (minimum 2-3 attempts before escalation)
```

#### Step 3.2: Apply Same Pattern to Other Specialists (1-2 hours)
- Science Specialist (lines 350+)
- English Specialist (lines 550+)
- History Specialist (lines 750+)

Each should have:
1. Error identification
2. Correction explanation
3. **MANDATORY retry** (not optional)
4. Blocking (don't proceed)
5. Verification (confirm correction)

---

### PHASE 4: Frontend Handling (4-5 hours)

#### Step 4.1: Update API Response Type (30 min)
**File**: `app/learn/[lessonId]/page.tsx` (MODIFY)

```typescript
// ADD to API response interface:
interface TeachResponse {
  success: boolean
  teacherResponse: {
    audioText: string
    displayText: string
    svg: string | null
    audioBase64: string
    agentName: string
    handoffMessage?: string
  }
  lessonComplete: boolean
  routing: {
    agentName: string
    reason: string
  }
  // NEW: Retry requirement
  retryRequired?: {
    required: boolean
    retryPrompt: string
    misconceptionType: string
    severity: 'critical' | 'moderate' | 'minor'
    allowSkip: boolean
  }
}
```

#### Step 4.2: Add Retry State Management (1 hour)
```typescript
// ADD state:
const [retryMode, setRetryMode] = useState<{
  active: boolean
  prompt: string
  misconception: string
  severity: 'critical' | 'moderate' | 'minor'
  allowSkip: boolean
} | null>(null);

// MODIFY handleSendMessage to check retry mode:
const handleSendMessage = async (message: string) => {
  // ... existing code ...

  const data: TeachResponse = await response.json();

  // Check if retry required
  if (data.retryRequired?.required) {
    setRetryMode({
      active: true,
      prompt: data.retryRequired.retryPrompt,
      misconception: data.retryRequired.misconceptionType,
      severity: data.retryRequired.severity,
      allowSkip: data.retryRequired.allowSkip
    });
  } else {
    setRetryMode(null);
  }

  // ... rest of existing code ...
};
```

#### Step 4.3: Add Retry UI Component (2 hours)
```typescript
// ADD retry banner component:
{retryMode?.active && (
  <div className={`
    fixed top-0 left-0 right-0 z-50 p-4
    ${retryMode.severity === 'critical' ? 'bg-red-100 border-red-500' :
      retryMode.severity === 'moderate' ? 'bg-yellow-100 border-yellow-500' :
      'bg-blue-100 border-blue-500'}
    border-b-4
  `}>
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg">
            {retryMode.severity === 'critical' ? '⚠️ Let\'s Fix This!' :
             retryMode.severity === 'moderate' ? '🔄 Try Again' :
             '💡 One More Time'}
          </h3>
          <p className="text-sm mt-1">{retryMode.prompt}</p>
        </div>
        {retryMode.allowSkip && (
          <button
            onClick={() => setRetryMode(null)}
            className="ml-4 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Skip for Now
          </button>
        )}
      </div>
    </div>
  </div>
)}

// MODIFY voice input - disable "Next" button during retry:
<VoiceInput
  onTranscriptionComplete={handleSendMessage}
  disabled={isLoading || retryMode?.active}
/>

{/* Show retry indicator */}
{retryMode?.active && (
  <p className="text-sm text-gray-600 mt-2">
    ✋ Please answer the question above before moving on
  </p>
)}
```

---

## Testing Plan

### Unit Tests:
1. **Error Detection**:
   - Test all error types in taxonomy
   - Verify confidence thresholds
   - Test fallback behavior

2. **Retry Controller**:
   - Test retry requirement logic
   - Test safety valve (max 3 attempts)
   - Test correction verification

3. **Database**:
   - Test schema changes
   - Test evidence recording with error fields
   - Test querying unresolved errors

### Integration Tests:
1. **Full Correction Flow**:
   - Student gives wrong answer
   - Error detected and classified
   - Retry prompt displayed
   - Student corrects answer
   - Verification confirmed
   - Lesson continues

2. **Edge Cases**:
   - Multiple errors in same lesson
   - Error in audio-only input
   - Retry after 3 attempts (safety valve)
   - Correction verification fails

### Manual Testing Scenarios:
```
Scenario 1: Fraction Addition Error
- Lesson: Introduction to Fractions
- Student: "1/2 + 1/3 = 2/5"
- Expected: Error detected (numerator_plus_denominator), retry required
- Student Retry: "First find common denominator: 6. So 3/6 + 2/6 = 5/6"
- Expected: Correction verified, lesson continues

Scenario 2: Calculation Mistake
- Lesson: Multiplication
- Student: "7 × 8 = 54" (should be 56)
- Expected: Error detected (calculation_mistake - severity: minor), retry required
- Student Retry: "7 × 8 = 56"
- Expected: Correction verified immediately (simple error)

Scenario 3: Persistent Misconception
- Lesson: Fractions
- Student: "1/2 + 1/3 = 2/5" (Attempt 1)
- Retry 1: "1/2 + 1/3 = 2/6" (still wrong)
- Retry 2: "1/2 + 1/3 = 4/6" (getting closer)
- Retry 3: "1/2 + 1/3 = 5/6" (correct!)
- Expected: Correction verified after 3 attempts

Scenario 4: Safety Valve Triggered
- Student fails same error 3 times
- Expected: System allows skip with note for teacher review
```

---

## Success Metrics

### Quantitative:
- Error type detection accuracy: >90%
- Mandatory retry enforcement rate: 100% (for confidence >0.7)
- Correction verification rate: >95%
- Safety valve trigger rate: <5% (most students correct within 3 attempts)

### Qualitative:
- Student perception: "The system helps me fix my mistakes before moving on"
- Teacher perception: "I can trust students actually understand concepts, not just heard them"
- Reduced misconception carry-forward: Students don't proceed with fundamental errors

---

## Rollout Plan

### Phase 1: Error Taxonomy (Week 1)
- Deploy error detection module
- Update database schema
- Integrate into teaching flow
- Monitor error classification accuracy

### Phase 2: Retry Mechanism (Week 2)
- Deploy retry controller
- Update API response types
- Add retry state management
- Test blocking behavior

### Phase 3: Specialist Prompts (Week 2)
- Update math specialist first (most critical)
- Test with real students
- Roll out to other specialists

### Phase 4: Frontend (Week 3)
- Deploy retry UI components
- Add visual indicators
- Test user experience
- Gather feedback

---

## Risks and Mitigations

### Risk 1: Over-blocking (Frustration)
**Mitigation**: Safety valve (skip after 3 attempts)

### Risk 2: False Positives (Wrong Error Detection)
**Mitigation**: Confidence threshold (0.7), logging for review

### Risk 3: Performance Impact (Extra AI Calls)
**Mitigation**: Fire-and-forget for non-critical, parallel execution

### Risk 4: Student Feels Punished
**Mitigation**: Growth mindset language ("Let's fix this together!"), not "You're wrong"

---

## Next Steps After Completion

Once error correction loop is complete, move to:
1. **Criterion 5: Failure → Remediation** - Diagnostic remediation for assessment failures
2. **Criterion 6: One Learner Improves** - Learning analytics dashboard

---

## References

### Official Documentation:
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Supabase Schema Migrations](https://supabase.com/docs/guides/database/migrations)
- [React State Management](https://react.dev/learn/managing-state)

### Implementation Files:
- Current: [lib/kernel/evidence-extractor.ts](lib/kernel/evidence-extractor.ts)
- Current: [lib/kernel/mastery-detector.ts](lib/kernel/mastery-detector.ts)
- Current: [app/api/teach/multi-ai-stream/route.ts](app/api/teach/multi-ai-stream/route.ts)
- Current: [lib/db/seed_ai_agents_v2.sql](lib/db/seed_ai_agents_v2.sql)

### Related Documentation:
- [ROADMAP_TO_100_PERCENT.md](ROADMAP_TO_100_PERCENT.md)
- [CRITERION_3_STEP2_COMPLETE.md](CRITERION_3_STEP2_COMPLETE.md)
- [VALIDATOR_IMPLEMENTATION.md](VALIDATOR_IMPLEMENTATION.md)

---

**Status**: Ready for implementation
**Priority**: HIGH
**Estimated Completion**: 20-26 hours (1 week full-time)
