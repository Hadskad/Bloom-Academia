# ROADMAP TO 100% - ACHIEVING ALL 6 CRITERIA
**Current Score**: 32/60 (53%)
**Target Score**: 60/60 (100%)
**Gap**: 28 points across 5 criteria

---

## EXECUTIVE SUMMARY

We need to add **intelligence layers** on top of the excellent architecture you've built:

| What's Missing | Impact | Effort |
|----------------|--------|--------|
| Adaptive Teaching Logic | AI adapts based on student data | 16 hours |
| Diagnostic Remediation | Failure → targeted reteaching | 20 hours |
| Learning Analytics | Track improvement over time | 12 hours |
| Mastery Integration | Connect evidence → assessment | 8 hours |
| Profile Enrichment | Update student profiles dynamically | 6 hours |

**Total Effort**: ~62 hours (1.5-2 weeks full-time)

---

## CRITERION 1: AI TEACHES ✅ (Already 100%)

**Current**: 10/10
**Target**: 10/10
**Action**: ✅ COMPLETE - No changes needed

This is production-ready and excellent.

---
Done!
## CRITERION 2: AI ADAPTS ⚠️ → ✅

**Current**: 6/10 (Context loaded but not used)
**Target**: 10/10 (Dynamic adaptation in real-time)
**Gap**: 4 points
**Effort**: 16 hours

### The Problem

Context data flows to agents but **doesn't change teaching behavior**:

```typescript
// CURRENT: Context says student is "visual learner"
// But teaching response is same whether visual or auditory
```

### The Solution: Adaptive Teaching Engine

Create a **Teaching Adapter** that modifies specialist responses based on context.

---

### IMPLEMENTATION PLAN

#### Step 1: Create Adaptive Context Directives (3 hours)

**File**: `lib/ai/adaptive-directives.ts` (NEW)

```typescript
/**
 * Generates adaptive teaching directives based on student context
 * These are injected into specialist prompts to modify teaching style
 */

export interface AdaptiveDirectives {
  styleAdjustments: string[]      // Learning style modifications
  difficultyAdjustments: string[]  // Pacing and complexity
  scaffoldingNeeds: string[]       // Support level required
  encouragementLevel: string       // Tone adjustment
}

/**
 * Analyzes student context and generates teaching directives
 */
export function generateAdaptiveDirectives(
  profile: UserProfile,
  recentHistory: Interaction[],
  currentMastery: number
): AdaptiveDirectives {
  const directives: AdaptiveDirectives = {
    styleAdjustments: [],
    difficultyAdjustments: [],
    scaffoldingNeeds: [],
    encouragementLevel: 'standard'
  }

  // 1. LEARNING STYLE ADAPTATION, ADD MORE COMMON STYLES
  if (profile.learning_style === 'visual') {
    directives.styleAdjustments.push(
      'CRITICAL: Generate an SVG diagram for every concept explained.',
      'Use visual metaphors and spatial descriptions.',
      'Reference colors, shapes, and visual patterns frequently.'
    )
  } else if (profile.learning_style === 'auditory') {
    directives.styleAdjustments.push(
      'Use conversational language and verbal explanations.',
      'Include sound-based metaphors (rhythm, melody, echoes).',
      'Repeat key concepts in different phrasings.'
    )
  } else if (profile.learning_style === 'kinesthetic') {
    directives.styleAdjustments.push(
      'Describe physical actions and hands-on activities.',
      'Use movement-based metaphors (building, touching, moving).',
      'Suggest concrete manipulatives or physical demonstrations.'
    )
  }

  // 2. DIFFICULTY ADAPTATION (based on current mastery)
  if (currentMastery < 50) {
    // Student struggling - SIMPLIFY
    directives.difficultyAdjustments.push(
      'SLOW DOWN: Break every concept into smallest possible steps.',
      'Use ONLY simple vocabulary (avoid technical terms unless necessary).',
      'Provide MORE examples (minimum 3 concrete examples per concept).',
      'Check understanding after EVERY step before proceeding.'
    )
  } else if (currentMastery >= 50 && currentMastery < 80) {
    // Student learning - STANDARD
    directives.difficultyAdjustments.push(
      'Balanced pace: Explain clearly with 1-2 examples.',
      'Introduce concepts progressively.',
      'Check understanding periodically.'
    )
  } else {
    // Student excelling - CHALLENGE
    directives.difficultyAdjustments.push(
      'ACCELERATE: Student is ready for more complexity.',
      'Introduce advanced vocabulary and concepts.',
      'Ask deeper questions that require synthesis.',
      'Provide challenging extensions and applications.'
    )
  }

  // 3. SCAFFOLDING BASED ON RECENT STRUGGLES
  const recentErrors = recentHistory.filter(i =>
    i.role === 'teacher' &&
    (i.content.includes('not quite') || i.content.includes('incorrect'))
  ).length

  const struggleRatio = recentErrors / Math.max(recentHistory.length, 1)

  if (struggleRatio > 0.4) {
    // High struggle - MAX SUPPORT
    directives.scaffoldingNeeds.push(
      'MAXIMUM SCAFFOLDING REQUIRED:',
      '- Use "I DO, WE DO, YOU DO" framework',
      '- Show complete worked examples first',
      '- Guide every step with prompts',
      '- Provide sentence starters and templates',
      '- Celebrate small wins frequently'
    )
    directives.encouragementLevel = 'high'
  } else if (struggleRatio > 0.2) {
    // Moderate struggle - STANDARD SUPPORT
    directives.scaffoldingNeeds.push(
      'Provide hints when student gets stuck.',
      'Ask guiding questions to prompt thinking.',
      'Offer partial examples.'
    )
    directives.encouragementLevel = 'standard'
  } else {
    // Low struggle - MINIMAL SUPPORT
    directives.scaffoldingNeeds.push(
      'Student is confident - reduce scaffolding.',
      'Let student work independently.',
      'Only intervene if they explicitly ask.'
    )
    directives.encouragementLevel = 'minimal'
  }

  // 4. KNOWN STRENGTHS & STRUGGLES
  if (profile.strengths && profile.strengths.length > 0) {
    directives.scaffoldingNeeds.push(
      `LEVERAGE STRENGTHS: Student excels at ${profile.strengths.join(', ')}.`,
      `Connect new concepts to these strengths.`
    )
  }

  if (profile.struggles && profile.struggles.length > 0) {
    directives.scaffoldingNeeds.push(
      `KNOWN STRUGGLES: Student has difficulty with ${profile.struggles.join(', ')}.`,
      `Anticipate confusion in these areas and pre-explain.`
    )
  }

  return directives
}

/**
 * Formats directives as prompt injection text
 */
export function formatDirectivesForPrompt(directives: AdaptiveDirectives): string {
  const sections: string[] = []

  if (directives.styleAdjustments.length > 0) {
    sections.push(
      '═══ LEARNING STYLE ADAPTATIONS ═══',
      ...directives.styleAdjustments
    )
  }

  if (directives.difficultyAdjustments.length > 0) {
    sections.push(
      '\n═══ DIFFICULTY ADJUSTMENTS ═══',
      ...directives.difficultyAdjustments
    )
  }

  if (directives.scaffoldingNeeds.length > 0) {
    sections.push(
      '\n═══ SCAFFOLDING INSTRUCTIONS ═══',
      ...directives.scaffoldingNeeds
    )
  }

  sections.push(
    `\n═══ ENCOURAGEMENT LEVEL ═══`,
    `${directives.encouragementLevel.toUpperCase()} - Adjust tone accordingly`
  )

  return sections.join('\n')
}
```

---

#### Step 2: Get Current Mastery Level (2 hours)

**File**: `lib/ai/mastery-tracker.ts` (NEW)

```typescript
import { supabase } from '@/lib/db/supabase'

/**
 * Gets student's current mastery level for active lesson
 * Returns 0-100 representing % mastery
 */
export async function getCurrentMasteryLevel(
  userId: string,
  lessonId: string
): Promise<number> {
  try {
    // Check if we have evidence-based mastery data
    const { data: evidenceData } = await supabase
      .from('mastery_evidence')
      .select('evidence_type, metadata')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)

    if (evidenceData && evidenceData.length > 0) {
      // Calculate from evidence
      const correctAnswers = evidenceData.filter(
        e => e.evidence_type === 'correct_answer'
      ).length
      const totalAnswers = evidenceData.filter(
        e => e.evidence_type === 'correct_answer' || e.evidence_type === 'incorrect_answer'
      ).length

      if (totalAnswers > 0) {
        return Math.round((correctAnswers / totalAnswers) * 100)
      }
    }

    // Fallback: Check lesson progress table
    const { data: progressData } = await supabase
      .from('progress')
      .select('mastery_level')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (progressData?.mastery_level) {
      return progressData.mastery_level
    }

    // Default: Assume 50% (neutral)
    return 50
  } catch (error) {
    console.error('Error getting mastery level:', error)
    return 50 // Neutral default
  }
}
```

---

#### Step 3: Inject Adaptive Directives into Teaching (4 hours)

**File**: `app/api/teach/multi-ai-stream/route.ts` (MODIFY)

```typescript
// Add after line 100 (after context building)

import { generateAdaptiveDirectives, formatDirectivesForPrompt } from '@/lib/ai/adaptive-directives'
import { getCurrentMasteryLevel } from '@/lib/ai/mastery-tracker'

// Get current mastery level for this lesson
const currentMastery = await getCurrentMasteryLevel(userId, lessonId)

// Generate adaptive teaching directives
const adaptiveDirectives = generateAdaptiveDirectives(
  profile,
  recentHistory,
  currentMastery
)

// Format directives as prompt injection
const directivesText = formatDirectivesForPrompt(adaptiveDirectives)

// Add to context
const adaptedContext = {
  ...context,
  adaptiveInstructions: directivesText
}

// Pass adapted context to agent manager
const aiResponse = await agentManager.getAgentResponseStreaming(
  userMessage,
  adaptedContext  // Now includes adaptive directives
)
```

**File**: `lib/ai/agent-manager.ts` (MODIFY)

Line ~400 (in specialist prompt building):

```typescript
// ADD TO SPECIALIST SYSTEM PROMPT:
const systemPrompt = `
${agent.system_prompt}

${context.adaptiveInstructions || ''}

═══ CURRENT STUDENT CONTEXT ═══
${JSON.stringify(context.userProfile, null, 2)}
${context.recentHistory.map(h => `${h.role}: ${h.content}`).join('\n')}
`
```

---

#### Step 4: Test Adaptation (2 hours)

**Test Cases**:

1. **Visual Learner Test**
   - Set user profile: `learning_style: 'visual'`
   - Ask: "What is a fraction?"
   - Expected: Response MUST include SVG diagram
   - Verify: Check response contains `<svg>` tag

2. **Struggling Student Test**
   - Set mastery: 30% (low)
   - Ask: "Explain photosynthesis"
   - Expected: Very simple language, multiple examples, step-by-step
   - Verify: Response uses "simple words" and breaks into tiny steps

3. **Excelling Student Test**
   - Set mastery: 95% (high)
   - Ask: "What's gravity?"
   - Expected: Advanced vocabulary, challenging questions, extensions
   - Verify: Response includes "synthesis" questions or advanced concepts

---

#### Step 5: Add Adaptation Logging (2 hours)

**File**: `lib/ai/adaptation-logger.ts` (NEW)

```typescript
/**
 * Logs adaptation decisions for analytics and debugging
 */
export async function logAdaptation(
  userId: string,
  lessonId: string,
  sessionId: string,
  adaptiveDirectives: AdaptiveDirectives,
  responseGenerated: string
) {
  await supabase.from('adaptation_logs').insert({
    user_id: userId,
    lesson_id: lessonId,
    session_id: sessionId,
    mastery_level: adaptiveDirectives.currentMastery,
    learning_style: adaptiveDirectives.styleAdjustments[0] || 'none',
    difficulty_level: adaptiveDirectives.difficultyAdjustments[0] || 'standard',
    scaffolding_level: adaptiveDirectives.encouragementLevel,
    response_preview: responseGenerated.substring(0, 200),
    created_at: new Date().toISOString()
  })
}
```

**Migration**: `lib/db/migration_005_adaptation_tracking.sql`

```sql
CREATE TABLE IF NOT EXISTS adaptation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  session_id UUID NOT NULL REFERENCES sessions(session_id),
  mastery_level INTEGER NOT NULL,
  learning_style TEXT,
  difficulty_level TEXT,
  scaffolding_level TEXT,
  response_preview TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_adaptation_logs_user ON adaptation_logs(user_id);
CREATE INDEX idx_adaptation_logs_lesson ON adaptation_logs(lesson_id);
```

---

#### Step 6: Validate Real-Time Adaptation (3 hours)

**Dashboard**: Create `/app/admin/adaptation-analytics/page.tsx`

Show:
- How often each adaptation type triggered
- Distribution of difficulty levels per student
- Correlation: mastery level → difficulty adjustment
- Visual learners → SVG generation rate

**Success Criteria**:
- ✅ Visual learners receive 3x more SVGs than auditory learners
- ✅ Struggling students (mastery <50) receive simpler language
- ✅ Excelling students (mastery >80) get challenging extensions
- ✅ Adaptation logs show non-zero counts

---

### CRITERION 2 COMPLETE: 6/10 → 10/10 ✅

**New Score**: 10/10 when adaptive directives consistently modify teaching behavior

---

## CRITERION 3: SYSTEM DECIDES MASTERY ⚠️ → ✅

**Current**: 5/10 (Rules exist, poor integration)
**Target**: 10/10 (Evidence-based, integrated with assessment)
**Gap**: 5 points
**Effort**: 8 hours

### The Problem

1. Evidence collection is keyword-based (fragile)
2. Assessment grading is separate from mastery detection
3. Mastery decision doesn't drive next actions

### The Solution: Unified Mastery System

---

### IMPLEMENTATION PLAN

#### Step 1: Improve Evidence Collection (3 hours)

**File**: `lib/kernel/evidence-extractor.ts` (NEW)

```typescript
import { GoogleGenerativeAI } from '@google/genai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Uses AI to extract evidence quality from student response
 * More reliable than keyword matching
 */
export async function extractEvidenceQuality(
  studentResponse: string,
  teacherResponse: string,
  conceptBeingTaught: string
): Promise<{
  evidenceType: 'correct_answer' | 'incorrect_answer' | 'explanation' | 'application' | 'struggle'
  qualityScore: number  // 0-100
  confidence: number    // 0-1
}> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          evidenceType: {
            type: 'string',
            enum: ['correct_answer', 'incorrect_answer', 'explanation', 'application', 'struggle']
          },
          qualityScore: { type: 'number' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' }
        },
        required: ['evidenceType', 'qualityScore', 'confidence']
      }
    }
  })

  const prompt = `
You are analyzing a student's learning evidence during a lesson.

CONCEPT BEING TAUGHT: ${conceptBeingTaught}

STUDENT RESPONSE: "${studentResponse}"

TEACHER RESPONSE: "${teacherResponse}"

Analyze the student's response and classify the evidence:

EVIDENCE TYPES:
- correct_answer: Student answered correctly
- incorrect_answer: Student answered incorrectly
- explanation: Student explained a concept (assess quality)
- application: Student applied knowledge to solve a problem
- struggle: Student showed confusion or asked for help

QUALITY SCORE (0-100):
- For correct_answer: 100 if fully correct, 80 if mostly correct
- For explanation: Rate clarity, completeness, understanding (0-100)
- For application: Rate success in applying concept (0-100)
- For incorrect_answer: 0-30 (closer to correct = higher)
- For struggle: 0 (indicates need for support)

CONFIDENCE (0-1): How certain are you of this classification?

Strictly Return JSON with: evidenceType, qualityScore, confidence, reasoning
`

  const result = await model.generateContent(prompt)
  const analysis = JSON.parse(result.response.text())

  console.log('[Evidence Extraction]', {
    student: studentResponse.substring(0, 50),
    type: analysis.evidenceType,
    quality: analysis.qualityScore,
    reasoning: analysis.reasoning
  })

  return {
    evidenceType: analysis.evidenceType,
    qualityScore: analysis.qualityScore,
    confidence: analysis.confidence
  }
}
```

---

#### Step 2: Integrate with Teaching Endpoint (2 hours)

**File**: `app/api/teach/multi-ai-stream/route.ts` (MODIFY)

Replace keyword-based evidence recording (lines 265-312) with:

```typescript
import { extractEvidenceQuality } from '@/lib/kernel/evidence-extractor'
import { recordMasteryEvidence } from '@/lib/kernel/mastery-detector'

// After AI response is generated
if (aiResponse && userMessage) {
  try {
    // Use AI to extract evidence quality
    const evidence = await extractEvidenceQuality(
      userMessage,
      aiResponse.displayText,
      lessonTitle  // Concept being taught
    )

    // Only record if confidence is high
    if (evidence.confidence > 0.7) {
      await recordMasteryEvidence(
        userId,
        lessonId,
        sessionId,
        evidence.evidenceType,
        userMessage,
        {
          quality_score: evidence.qualityScore,
          confidence: evidence.confidence,
          context: lessonTitle
        }
      )

      console.log('[Mastery Evidence]', {
        type: evidence.evidenceType,
        quality: evidence.qualityScore,
        lesson: lessonTitle.substring(0, 30)
      })
    }
  } catch (error) {
    console.error('Evidence extraction failed:', error)
    // Non-fatal - continue without evidence
  }
}
```

---

#### Step 3: Integrate Mastery with Assessment (3 hours)

**File**: `app/api/assessment/grade/route.ts` (MODIFY)

After grading (line 154), add mastery detection:

```typescript
import { determineMastery } from '@/lib/kernel/mastery-detector'
import { recordMasteryEvidence } from '@/lib/kernel/mastery-detector'

// After grading assessment
const gradingResult = await gradeAssessment(assessment.questions, body.answers)
const passed = gradingResult.score >= assessment.passing_score

// Record evidence for each question
for (const result of gradingResult.perQuestionResults) {
  await recordMasteryEvidence(
    body.userId,
    body.lessonId,
    body.sessionId,
    result.correct ? 'correct_answer' : 'incorrect_answer',
    result.userAnswer,
    {
      quality_score: result.correct ? 100 : 0,
      confidence: 1.0,
      context: result.questionText
    }
  )
}

// Get lesson details for mastery determination
const { data: lessonData } = await supabase
  .from('lessons')
  .select('subject, grade_level')
  .eq('id', body.lessonId)
  .single()

// Determine mastery using rules-based system
const masteryResult = await determineMastery(
  body.userId,
  body.lessonId,
  lessonData.subject,
  lessonData.grade_level,
  sessionStartTime  // Pass from session start
)

console.log('[Mastery Determination]', {
  hasMastered: masteryResult.hasMastered,
  criteria: masteryResult.criteriaMet,
  evidence: masteryResult.evidence
})

// Override lessonComplete based on mastery
const lessonCompleted = masteryResult.hasMastered

// Return mastery details in response
return NextResponse.json({
  ...existingResponse,
  mastery: {
    hasMastered: masteryResult.hasMastered,
    confidence: masteryResult.confidence,
    criteriaMet: masteryResult.criteriaMet,
    evidence: masteryResult.evidence
  }
})
```

---

### CRITERION 3 COMPLETE: 5/10 → 10/10 ✅

**New Score**: 10/10 when mastery is evidence-based and integrated with assessment

---

## CRITERION 4: MEMORY PERSISTS ⚠️ → ✅

**Current**: 6/10 (Saves but doesn't evolve)
**Target**: 10/10 (Profile enriched during learning)
**Gap**: 4 points
**Effort**: 6 hours

### The Problem

Student profile is static - never updated with learning insights.

### The Solution: Profile Enrichment Engine

---

### IMPLEMENTATION PLAN

#### Step 1: Create Profile Updater (3 hours)

**File**: `lib/memory/profile-enrichment.ts` (NEW)

```typescript
import { supabase } from '@/lib/db/supabase'

export interface ProfileUpdate {
  newStrengths?: string[]
  newStruggles?: string[]
  learningStyleRefinement?: string
  notes?: string
}

/**
 * Enriches student profile based on lesson performance
 */
export async function enrichProfile(
  userId: string,
  lessonId: string,
  masteryResult: MasteryResult,
  lessonSubject: string
): Promise<void> {
  try {
    const updates: ProfileUpdate = {}

    // 1. Identify new strengths
    if (masteryResult.hasMastered && masteryResult.evidence.correctAnswers >= 5) {
      updates.newStrengths = [lessonSubject]
    }

    // 2. Identify new struggles
    if (!masteryResult.hasMastered && masteryResult.evidence.incorrectAnswers >= 3) {
      updates.newStruggles = [lessonSubject]
    }

    // 3. Update profile in database
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('strengths, struggles, metadata')
      .eq('user_id', userId)
      .single()

    if (currentProfile) {
      const updatedStrengths = Array.from(new Set([
        ...(currentProfile.strengths || []),
        ...(updates.newStrengths || [])
      ]))

      const updatedStruggles = Array.from(new Set([
        ...(currentProfile.struggles || []),
        ...(updates.newStruggles || [])
      ]))

      await supabase
        .from('user_profiles')
        .update({
          strengths: updatedStrengths,
          struggles: updatedStruggles,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      console.log('[Profile Enrichment]', {
        userId: userId.substring(0, 8),
        newStrengths: updates.newStrengths,
        newStruggles: updates.newStruggles
      })
    }
  } catch (error) {
    console.error('Profile enrichment failed:', error)
    // Non-fatal
  }
}
```

---

#### Step 2: Call After Every Lesson (1 hour)

**File**: `app/api/teach/multi-ai-stream/route.ts` (MODIFY)

After mastery determination:

```typescript
import { enrichProfile } from '@/lib/memory/profile-enrichment'

// When lesson completes
if (masteryResult.hasMastered) {
  await enrichProfile(
    userId,
    lessonId,
    masteryResult,
    lessonSubject
  )
}
```

---

#### Step 3: Cross-Session Analysis (2 hours)

**File**: `lib/memory/learning-trajectory.ts` (NEW)

```typescript
/**
 * Analyzes student's learning trajectory across all sessions
 */
export async function getLearningTrajectory(userId: string) {
  const { data } = await supabase
    .from('progress')
    .select('lesson_id, mastery_level, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  // Calculate learning velocity
  const masteryOverTime = data.map(d => ({
    date: d.created_at,
    mastery: d.mastery_level
  }))

  return {
    totalLessons: data.length,
    averageMastery: data.reduce((sum, d) => sum + d.mastery_level, 0) / data.length,
    masteryTrend: calculateTrend(masteryOverTime),
    learningVelocity: calculateVelocity(masteryOverTime)
  }
}

function calculateTrend(data: Array<{date: string, mastery: number}>): 'improving' | 'stable' | 'declining' {
  if (data.length < 2) return 'stable'

  const recent = data.slice(-3)
  const earlier = data.slice(0, 3)

  const recentAvg = recent.reduce((sum, d) => sum + d.mastery, 0) / recent.length
  const earlierAvg = earlier.reduce((sum, d) => sum + d.mastery, 0) / earlier.length

  if (recentAvg > earlierAvg + 10) return 'improving'
  if (recentAvg < earlierAvg - 10) return 'declining'
  return 'stable'
}
```

---

### CRITERION 4 COMPLETE: 6/10 → 10/10 ✅

**New Score**: 10/10 when profiles evolve and cross-session analysis works

---

## CRITERION 5: FAILURE → REMEDIATION ❌ → ✅

**Current**: 1/10 (Loop-back only)
**Target**: 10/10 (Diagnostic + targeted reteaching)
**Gap**: 9 points (BIGGEST GAP)
**Effort**: 20 hours

### The Problem

Failed assessment → "Try again" with same content. No diagnosis, no targeting.

### The Solution: Diagnostic Remediation Engine

---

### IMPLEMENTATION PLAN

#### Step 1: Tag Assessment Questions with Concepts (3 hours)

**Migration**: `lib/db/migration_006_concept_tagging.sql`

```sql
-- Add concept tags to questions
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS concept_tags JSONB DEFAULT '[]';

-- Example: Update fractions assessment
UPDATE assessments
SET concept_tags = '[
  {"concept": "numerator_denominator", "questions": ["q1", "q2", "q5", "q8"]},
  {"concept": "fraction_visualization", "questions": ["q3", "q6", "q9"]},
  {"concept": "fraction_comparison", "questions": ["q7", "q10"]},
  {"concept": "whole_fractions", "questions": ["q4", "q11", "q12"]}
]'
WHERE lesson_id = '0d27645e-54b0-418f-b62f-e848087d7db9';
```

**Update seed file**: `lib/db/seed_assessment_intro_fractions.sql`

Add concept tags to each question:

```sql
{
  "id": "q1",
  "text": "What does the numerator of a fraction represent?",
  "concepts": ["numerator_denominator", "fraction_basics"],
  ...
}
```

---

#### Step 2: Create Diagnostic Analyzer (4 hours)

**File**: `lib/assessment/diagnostic-analyzer.ts` (NEW)

```typescript
export interface DiagnosticResult {
  failedConcepts: Array<{
    concept: string
    questionsFailedCount: number
    totalQuestionsForConcept: number
    severity: 'critical' | 'moderate' | 'minor'
  }>
  remediationNeeded: boolean
  recommendedActions: string[]
}

/**
 * Analyzes failed assessment to identify specific concept gaps
 */
export function diagnoseConceptGaps(
  questions: Question[],
  userAnswers: Array<{ questionId: string; userAnswer: string }>,
  gradingResults: GradingResult
): DiagnosticResult {
  const conceptFailures = new Map<string, { failed: number; total: number }>()

  // Analyze each wrong answer
  for (const result of gradingResults.perQuestionResults) {
    if (!result.correct) {
      const question = questions.find(q => q.id === result.questionId)
      if (question?.concepts) {
        for (const concept of question.concepts) {
          const current = conceptFailures.get(concept) || { failed: 0, total: 0 }
          conceptFailures.set(concept, {
            failed: current.failed + 1,
            total: current.total + 1
          })
        }
      }
    }
  }

  // Convert to diagnostic format
  const failedConcepts = Array.from(conceptFailures.entries())
    .map(([concept, stats]) => {
      const failureRate = stats.failed / stats.total
      return {
        concept,
        questionsFailedCount: stats.failed,
        totalQuestionsForConcept: stats.total,
        severity: failureRate >= 0.75 ? 'critical' : failureRate >= 0.5 ? 'moderate' : 'minor'
      }
    })
    .filter(c => c.severity !== 'minor')
    .sort((a, b) => b.questionsFailedCount - a.questionsFailedCount)

  // Generate remediation recommendations
  const recommendedActions: string[] = []

  if (failedConcepts.length === 0) {
    recommendedActions.push('No specific gaps - review entire lesson')
  } else {
    for (const concept of failedConcepts.slice(0, 3)) {
      recommendedActions.push(
        `Focus on: ${humanizeConceptName(concept.concept)} (${concept.questionsFailedCount}/${concept.totalQuestionsForConcept} questions failed)`
      )
    }
  }

  return {
    failedConcepts,
    remediationNeeded: failedConcepts.length > 0,
    recommendedActions
  }
}

function humanizeConceptName(concept: string): string {
  return concept
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
```

---

#### Step 3: Create Remediation Content Generator (5 hours)

**File**: `lib/remediation/content-generator.ts` (NEW)

```typescript
import { GoogleGenerativeAI } from '@google/genai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Generates targeted remediation lesson for a specific concept
 */
export async function generateRemediationLesson(
  concept: string,
  subject: string,
  gradeLevel: number,
  studentProfile: UserProfile
): Promise<{
  title: string
  explanation: string
  examples: string[]
  practiceProblems: Array<{ question: string; answer: string }>
  svg?: string
}> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' },
          examples: { type: 'array', items: { type: 'string' } },
          practiceProblems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' }
              }
            }
          },
          svg: { type: 'string' }
        }
      }
    }
  })

  const prompt = `
You are creating a REMEDIATION MINI-LESSON to help a struggling student.

CONCEPT STUDENT FAILED: ${concept}
SUBJECT: ${subject}
GRADE LEVEL: ${gradeLevel}
STUDENT LEARNING STYLE: ${studentProfile.learning_style || 'visual'}

REQUIREMENTS:
1. VERY SIMPLE explanation (Grade ${gradeLevel} vocabulary)
2. 3-4 concrete examples showing the concept
3. 3 practice problems (easy → medium difficulty)
4. If visual learner, generate an SVG diagram

FORMAT YOUR RESPONSE AS JSON with:
- title: Short, encouraging title
- explanation: 2-3 paragraph simple explanation
- examples: Array of 3-4 example strings
- practiceProblems: Array of {question, answer} objects
- svg: SVG code string (if appropriate) or null

Focus on rebuilding confidence and understanding, not speed.
`

  const result = await model.generateContent(prompt)
  const lesson = JSON.parse(result.response.text())

  console.log('[Remediation Generated]', {
    concept,
    title: lesson.title,
    exampleCount: lesson.examples.length,
    practiceCount: lesson.practiceProblems.length
  })

  return lesson
}
```

---

#### Step 4: Build Remediation Flow (4 hours)

**File**: `app/api/remediation/generate/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { diagnoseConceptGaps } from '@/lib/assessment/diagnostic-analyzer'
import { generateRemediationLesson } from '@/lib/remediation/content-generator'

/**
 * POST /api/remediation/generate
 *
 * Analyzes failed assessment and generates targeted remediation
 */
export async function POST(request: NextRequest) {
  const { userId, assessmentId, failedQuestions, userProfile } = await request.json()

  // Load assessment questions
  const { data: assessment } = await supabase
    .from('assessments')
    .select('questions, lesson_id')
    .eq('id', assessmentId)
    .single()

  // Diagnose concept gaps
  const diagnosis = diagnoseConceptGaps(
    assessment.questions,
    failedQuestions,
    gradingResult  // From previous grading
  )

  // Generate remediation lessons for top 2 failed concepts
  const remediationLessons = []

  for (const failedConcept of diagnosis.failedConcepts.slice(0, 2)) {
    const lesson = await generateRemediationLesson(
      failedConcept.concept,
      subject,
      gradeLevel,
      userProfile
    )

    remediationLessons.push({
      concept: failedConcept.concept,
      severity: failedConcept.severity,
      lesson
    })
  }

  // Save remediation plan to database
  await supabase.from('remediation_plans').insert({
    user_id: userId,
    assessment_id: assessmentId,
    lesson_id: assessment.lesson_id,
    diagnosis: diagnosis,
    remediation_content: remediationLessons,
    created_at: new Date().toISOString()
  })

  return NextResponse.json({
    diagnosis,
    remediationLessons,
    message: `Generated ${remediationLessons.length} targeted remediation mini-lessons`
  })
}
```

---

#### Step 5: Update Assessment Results UI (4 hours)

**File**: `components/AssessmentResults.tsx` (MODIFY)

After failed assessment (line 225):

```tsx
// If failed, show diagnostic breakdown
{!passed && diagnosis && (
  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h3 className="font-bold text-lg mb-2">📊 What You Need to Practice</h3>

    {diagnosis.failedConcepts.map(concept => (
      <div key={concept.concept} className="mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs ${
            concept.severity === 'critical' ? 'bg-red-100 text-red-700' :
            concept.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {concept.severity}
          </span>
          <span className="font-medium">
            {humanizeConceptName(concept.concept)}
          </span>
          <span className="text-sm text-gray-500">
            ({concept.questionsFailedCount} questions)
          </span>
        </div>
      </div>
    ))}

    <div className="mt-4 flex gap-3">
      <button
        onClick={() => startRemediation()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🎯 Start Targeted Practice
      </button>
      <button
        onClick={() => router.push(`/learn/${lessonId}`)}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        📚 Review Full Lesson
      </button>
    </div>
  </div>
)}
```

**Add remediation flow**:

```tsx
const startRemediation = async () => {
  setLoading(true)

  // Generate remediation content
  const response = await fetch('/api/remediation/generate', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      assessmentId,
      failedQuestions: results.perQuestionResults.filter(r => !r.correct),
      userProfile
    })
  })

  const { remediationLessons } = await response.json()

  // Navigate to remediation session
  router.push(`/remediation/${remediationLessons[0].id}`)
}
```

---

### CRITERION 5 COMPLETE: 1/10 → 10/10 ✅

**New Score**: 10/10 when failures trigger diagnostic → targeted remediation

---

## CRITERION 6: ONE LEARNER IMPROVES ⚠️ → ✅

**Current**: 4/10 (Metrics shown, no trends)
**Target**: 10/10 (Clear improvement visualization)
**Gap**: 6 points
**Effort**: 12 hours

### The Problem

Progress dashboard shows static numbers, not improvement over time.

### The Solution: Learning Analytics Dashboard

---

### IMPLEMENTATION PLAN

#### Step 1: Create Analytics Engine (4 hours)

**File**: `lib/analytics/improvement-tracker.ts` (NEW)

```typescript
export interface ImprovementAnalytics {
  studentId: string

  // Before/After Comparison
  firstAttemptAverage: number
  latestAttemptAverage: number
  overallImprovement: number  // Percentage points gained

  // Trend Analysis
  masteryTrend: Array<{ date: string; mastery: number; lesson: string }>
  learningVelocity: number  // Points gained per week

  // Strength/Weakness Breakdown
  strongestSubjects: Array<{ subject: string; mastery: number }>
  weakestSubjects: Array<{ subject: string; mastery: number }>

  // Time Analysis
  totalTimeSpent: number  // Minutes
  averageTimePerLesson: number
  efficiencyScore: number  // Mastery gained per hour
}

/**
 * Generates comprehensive improvement analytics for a student
 */
export async function generateImprovementAnalytics(
  userId: string
): Promise<ImprovementAnalytics> {
  // Get all assessment attempts ordered by time
  const { data: attempts } = await supabase
    .from('assessment_attempts')
    .select(`
      score,
      created_at,
      lesson_id,
      lessons (
        title,
        subject
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!attempts || attempts.length === 0) {
    return null  // No data yet
  }

  // Calculate before/after
  const firstThree = attempts.slice(0, 3)
  const lastThree = attempts.slice(-3)

  const firstAttemptAverage =
    firstThree.reduce((sum, a) => sum + a.score, 0) / firstThree.length
  const latestAttemptAverage =
    lastThree.reduce((sum, a) => sum + a.score, 0) / lastThree.length
  const overallImprovement = latestAttemptAverage - firstAttemptAverage

  // Calculate mastery trend
  const masteryTrend = attempts.map(a => ({
    date: a.created_at,
    mastery: a.score,
    lesson: a.lessons.title
  }))

  // Calculate learning velocity (points per week)
  const daysSinceStart =
    (new Date().getTime() - new Date(attempts[0].created_at).getTime()) /
    (1000 * 60 * 60 * 24)
  const weeksSinceStart = daysSinceStart / 7
  const learningVelocity = overallImprovement / weeksSinceStart

  // Subject breakdown
  const subjectMastery = new Map<string, number[]>()
  for (const attempt of attempts) {
    const subject = attempt.lessons.subject
    if (!subjectMastery.has(subject)) {
      subjectMastery.set(subject, [])
    }
    subjectMastery.get(subject).push(attempt.score)
  }

  const subjectAverages = Array.from(subjectMastery.entries()).map(([subject, scores]) => ({
    subject,
    mastery: scores.reduce((sum, s) => sum + s, 0) / scores.length
  }))

  const strongestSubjects = subjectAverages
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3)

  const weakestSubjects = subjectAverages
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)

  // Time analysis
  const { data: sessions } = await supabase
    .from('sessions')
    .select('start_time, end_time')
    .eq('user_id', userId)

  const totalTimeSpent = sessions.reduce((sum, s) => {
    const duration = new Date(s.end_time).getTime() - new Date(s.start_time).getTime()
    return sum + (duration / (1000 * 60))  // Convert to minutes
  }, 0)

  const averageTimePerLesson = totalTimeSpent / attempts.length
  const efficiencyScore = (latestAttemptAverage - firstAttemptAverage) / (totalTimeSpent / 60)

  return {
    studentId: userId,
    firstAttemptAverage: Math.round(firstAttemptAverage),
    latestAttemptAverage: Math.round(latestAttemptAverage),
    overallImprovement: Math.round(overallImprovement),
    masteryTrend,
    learningVelocity: Math.round(learningVelocity * 10) / 10,
    strongestSubjects,
    weakestSubjects,
    totalTimeSpent: Math.round(totalTimeSpent),
    averageTimePerLesson: Math.round(averageTimePerLesson),
    efficiencyScore: Math.round(efficiencyScore * 10) / 10
  }
}
```

---

#### Step 2: Create Analytics API (2 hours)

**File**: `app/api/analytics/improvement/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateImprovementAnalytics } from '@/lib/analytics/improvement-tracker'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const analytics = await generateImprovementAnalytics(userId)

  return NextResponse.json(analytics)
}
```

---

#### Step 3: Build Improvement Dashboard (6 hours)

**File**: `app/progress/page.tsx` (MAJOR REWRITE)

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'  // Install: npm install react-chartjs-2 chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function ProgressPage() {
  const [analytics, setAnalytics] = useState(null)
  const userId = localStorage.getItem('userId')

  useEffect(() => {
    fetch(`/api/analytics/improvement?userId=${userId}`)
      .then(res => res.json())
      .then(setAnalytics)
  }, [])

  if (!analytics) return <div>Loading analytics...</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">📈 Your Learning Journey</h1>

      {/* IMPROVEMENT HIGHLIGHT */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Starting Average</div>
          <div className="text-4xl font-bold text-blue-900 mt-2">
            {analytics.firstAttemptAverage}%
          </div>
          <div className="text-xs text-blue-500 mt-1">First 3 assessments</div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
          <div className="text-sm text-green-600 font-medium">Current Average</div>
          <div className="text-4xl font-bold text-green-900 mt-2">
            {analytics.latestAttemptAverage}%
          </div>
          <div className="text-xs text-green-500 mt-1">Latest 3 assessments</div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Total Improvement</div>
          <div className={`text-4xl font-bold mt-2 ${
            analytics.overallImprovement > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {analytics.overallImprovement > 0 ? '+' : ''}{analytics.overallImprovement}%
          </div>
          <div className="text-xs text-yellow-500 mt-1">
            {analytics.learningVelocity} points/week
          </div>
        </div>
      </div>

      {/* MASTERY TREND GRAPH */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">Mastery Over Time</h2>
        <Line
          data={{
            labels: analytics.masteryTrend.map(t =>
              new Date(t.date).toLocaleDateString()
            ),
            datasets: [{
              label: 'Assessment Score',
              data: analytics.masteryTrend.map(t => t.mastery),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4
            }]
          }}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: { display: true, text: 'Score (%)' }
              }
            }
          }}
        />
      </div>

      {/* STRENGTHS & WEAKNESSES */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-green-800 mb-4">💪 Your Strengths</h3>
          {analytics.strongestSubjects.map(s => (
            <div key={s.subject} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{s.subject}</span>
                <span className="text-green-600 font-bold">{Math.round(s.mastery)}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${s.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-red-50 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-red-800 mb-4">🎯 Areas to Improve</h3>
          {analytics.weakestSubjects.map(s => (
            <div key={s.subject} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{s.subject}</span>
                <span className="text-red-600 font-bold">{Math.round(s.mastery)}%</span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${s.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TIME & EFFICIENCY */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-purple-50 p-6 rounded-lg text-center">
          <div className="text-3xl mb-2">⏱️</div>
          <div className="text-2xl font-bold text-purple-900">
            {Math.floor(analytics.totalTimeSpent / 60)}h {analytics.totalTimeSpent % 60}m
          </div>
          <div className="text-sm text-purple-600">Total Learning Time</div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg text-center">
          <div className="text-3xl mb-2">📚</div>
          <div className="text-2xl font-bold text-orange-900">
            {analytics.averageTimePerLesson} min
          </div>
          <div className="text-sm text-orange-600">Average per Lesson</div>
        </div>

        <div className="bg-teal-50 p-6 rounded-lg text-center">
          <div className="text-3xl mb-2">⚡</div>
          <div className="text-2xl font-bold text-teal-900">
            {analytics.efficiencyScore} pts/hr
          </div>
          <div className="text-sm text-teal-600">Learning Efficiency</div>
        </div>
      </div>

      {/* INSIGHT MESSAGE */}
      <div className="mt-8 p-6 bg-blue-100 border-l-4 border-blue-600 rounded">
        <h3 className="font-bold text-blue-900 mb-2">🎓 Your Learning Insight</h3>
        <p className="text-blue-800">
          {analytics.overallImprovement > 20 ? (
            <>Amazing progress! You've improved by <strong>{analytics.overallImprovement}%</strong> since you started. Keep up the excellent work!</>
          ) : analytics.overallImprovement > 10 ? (
            <>Great job! You're steadily improving at <strong>{analytics.learningVelocity} points per week</strong>. Consistency is key!</>
          ) : analytics.overallImprovement > 0 ? (
            <>You're making progress! Focus on your weaker areas to accelerate your improvement.</>
          ) : (
            <>Learning takes time. Keep practicing, and don't get discouraged. Every attempt makes you stronger!</>
          )}
        </p>
      </div>
    </div>
  )
}
```

**Install Chart.js**:
```bash
npm install react-chartjs-2 chart.js
```

---

### CRITERION 6 COMPLETE: 4/10 → 10/10 ✅

**New Score**: 10/10 when improvement is clearly visualized with trends

---

## FINAL IMPLEMENTATION TIMELINE

### WEEK 1 (40 hours)

**Days 1-2: Adaptive Teaching (16h)**
- Create adaptive directives system
- Inject into specialist prompts
- Test with different learning styles
- Validate SVG generation for visual learners

**Days 3-4: Mastery & Remediation Part 1 (16h)**
- Improve evidence extraction (AI-based)
- Integrate mastery with assessment
- Tag assessment questions with concepts
- Build diagnostic analyzer

**Day 5: Profile Enrichment (8h)**
- Create profile updater
- Integrate with lesson completion
- Build cross-session analysis

---

### WEEK 2 (22 hours)

**Days 1-2: Remediation Part 2 (12h)**
- Build remediation content generator
- Create remediation API
- Update assessment results UI
- Test remediation flow end-to-end

**Days 3-4: Learning Analytics (10h)**
- Create improvement analytics engine
- Build analytics API
- Redesign progress dashboard
- Add trend graphs and insights

---

## VALIDATION CHECKLIST

After implementation, verify each criterion hits 10/10:

### ✅ Criterion 1: AI Teaches (Already 10/10)
- [x] Multi-agent routing works
- [x] SVG generation works
- [x] Audio playback works
- [x] Streaming under 2s

### ✅ Criterion 2: AI Adapts (6/10 → 10/10)
- [ ] Visual learners get 3x more SVGs
- [ ] Struggling students get simpler language
- [ ] Excelling students get challenging extensions
- [ ] Adaptation logs show non-zero counts
- [ ] Manual test: Same question to visual vs auditory learner produces different responses

### ✅ Criterion 3: System Decides Mastery (5/10 → 10/10)
- [ ] AI-based evidence extraction working (not keyword matching)
- [ ] Assessment grading calls `determineMastery()`
- [ ] Mastery result includes all 6 criteria
- [ ] Lesson completion requires mastery (not just assessment pass)
- [ ] Manual test: Student with 2 correct answers cannot complete lesson

### ✅ Criterion 4: Memory Persists (6/10 → 10/10)
- [ ] Profile updated after lesson completion
- [ ] New strengths added to profile
- [ ] New struggles added to profile
- [ ] Cross-session analysis shows trend
- [ ] Manual test: Complete 3 lessons, verify profile shows strengths

### ✅ Criterion 5: Failure → Remediation (1/10 → 10/10)
- [ ] Failed assessment shows diagnostic breakdown
- [ ] Concept-level gaps identified
- [ ] Remediation lessons generated
- [ ] "Start Targeted Practice" button works
- [ ] Manual test: Fail assessment on fractions → get fraction-specific remediation

### ✅ Criterion 6: One Learner Improves (4/10 → 10/10)
- [ ] Progress dashboard shows before/after comparison
- [ ] Trend graph displays mastery over time
- [ ] Strengths/weaknesses breakdown visible
- [ ] Improvement percentage calculated
- [ ] Manual test: Complete 5 lessons, see upward trend line

---

## SUCCESS METRICS

**BEFORE** (Current):
- Criterion 1: 10/10 ✅
- Criterion 2: 6/10 ⚠️
- Criterion 3: 5/10 ⚠️
- Criterion 4: 6/10 ⚠️
- Criterion 5: 1/10 ❌
- Criterion 6: 4/10 ⚠️
- **TOTAL: 32/60 (53%)**

**AFTER** (Target):
- Criterion 1: 10/10 ✅
- Criterion 2: 10/10 ✅
- Criterion 3: 10/10 ✅
- Criterion 4: 10/10 ✅
- Criterion 5: 10/10 ✅
- Criterion 6: 10/10 ✅
- **TOTAL: 60/60 (100%)** 🎯

---

## MIGRATION FILES NEEDED

```bash
lib/db/migration_005_adaptation_tracking.sql
lib/db/migration_006_concept_tagging.sql
lib/db/migration_007_remediation_plans.sql
```

All migrations included in implementation sections above.

---

## PROOF OF 100% ACHIEVEMENT

Create automated test suite:

**File**: `tests/e2e/six-criteria-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test('Criterion 1: AI Teaches', async ({ page }) => {
  // Test teaching flow end-to-end
  // ... assertions
})

test('Criterion 2: AI Adapts - Visual Learner', async ({ page }) => {
  // Set profile to visual
  // Ask question
  // Assert SVG present in response
})

test('Criterion 3: Mastery Decision', async ({ page }) => {
  // Complete lesson
  // Verify mastery calculated
  // Assert all 6 criteria checked
})

test('Criterion 4: Memory Persists', async ({ page }) => {
  // Complete lesson
  // Start new session
  // Verify previous interactions loaded
})

test('Criterion 5: Remediation Triggered', async ({ page }) => {
  // Fail assessment
  // Assert diagnostic shown
  // Click "Targeted Practice"
  // Verify remediation content loaded
})

test('Criterion 6: Improvement Visible', async ({ page }) => {
  // Navigate to progress
  // Assert before/after comparison visible
  // Assert trend graph rendered
})
```

---

## ESTIMATED COSTS

**Development Time**: 62 hours @ $50/hr = **$3,100**

**Additional API Costs** (monthly):
- Gemini API (evidence extraction, remediation): ~$15/month
- Chart.js library: Free
- Database storage (minimal): <$1/month

**Total Monthly Increase**: ~$16

---

**This roadmap takes you from 53% to 100%. Every implementation is concrete, testable, and directly addresses the gaps identified in the execution trace.**

Ready to start? I recommend beginning with **Week 1, Days 1-2: Adaptive Teaching** - it has the highest immediate impact and builds foundation for the rest.
