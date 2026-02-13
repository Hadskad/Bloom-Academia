# Bloom Academia - Demo Flow

Bullet-point walkthrough of the complete teaching pipeline.

---

## Quick Overview

```
Student Voice → Gemini (Audio Input) → Memory Load → Adaptive Directives →
Specialist Routing → Gemini Response → Validator Check →
Progressive TTS → Evidence Extraction → Profile Enrichment →
Mastery Detection → Assessment → Next Lesson Unlocked
```

---

## Step-by-Step Flow

### 1. Student Starts Lesson
- Clicks lesson card (e.g., "Introduction to Fractions")
- Backend creates session record
- AUTO_START triggers: AI greets student by name
- Audio plays automatically via Google Cloud TTS

### 2. Student Asks a Question (Voice)
- Clicks microphone → "Listening..." (blue pulse)
- Speaks question naturally
- Clicks mic again → audio captured
- Raw audio sent directly to Gemini (no separate STT service — Gemini handles both understanding and responding)

### 3. Memory Loads (3-Layer System)
- **Layer 1 - Profile**: Name, grade, learning style, strengths, struggles (cached 5-min TTL)
- **Layer 2 - Session History**: Last 5 interactions for conversation context
- **Layer 3 - Mastery Evidence**: Correct answers, explanations, struggles (0-100 score)

### 4. Adaptive Directives Generated
- **Learning Style** (7 types): Visual → "Generate SVG diagrams", Auditory → "Conversational tone", etc.
- **Difficulty**: Mastery <50% → slow down, 50-80% → standard, >80% → accelerate
- **Scaffolding**: High struggle ratio → "I DO, WE DO, YOU DO" framework
- **Known Issues**: Strengths/struggles injected as explicit teaching instructions

### 5. Specialist Routing
- **Fast Path (90%)**: Active specialist already in session → send directly (skip Coordinator)
- **Slow Path (10%)**: Coordinator analyzes intent → routes to appropriate specialist
  - Math → `math_specialist` (HIGH thinking)
  - Science → `science_specialist` (MEDIUM thinking + Google Search)
  - English → `english_specialist` (HIGH thinking)
  - History → `history_specialist` (HIGH thinking + Google Search)
  - Art → `art_specialist` (LOW thinking)
  - Emotional support → `motivator`

### 6. Specialist Teaches
- Gemini 3 Flash generates streaming JSON response:
  ```json
  { "audioText": "...", "displayText": "...", "svg": "<svg>...</svg>", "lessonComplete": false }
  ```
- **Google Search Grounding** (History/Science only): Gemini searches web for current, accurate facts with citations
- **SVG Whiteboard**: Diagrams generated on-the-fly for visual learners
- Student sees: text + SVG diagram + hears audio

### 7. Validator Approves/Regenerates
- **Only validates** subject specialists (skips coordinator, motivator, assessor)
- Validator Agent (Gemini 3 Pro, HIGH thinking) runs 5 checks:
  1. Factual consistency
  2. Curriculum alignment (grade-appropriate)
  3. Internal consistency (no contradictions)
  4. Pedagogical soundness (logical explanation order)
  5. Visual-text alignment (SVG matches text)
- **If approved** → proceed to TTS
- **If rejected** → specialist regenerates with `requiredFixes` (max 2 retries)
- **If still rejected** → deliver with disclaimer + log for teacher review
- **Fail-safe**: 10s timeout → auto-approve (never blocks student)

### 8. Progressive TTS (30-40% Faster)
- Extract first sentence **during** Gemini streaming → generate TTS immediately
- Remaining sentences generated in parallel
- All audio buffers concatenated → Base64 → frontend playback
- **Result**: ~1,000-1,400ms vs ~2,000ms traditional

### 9. Evidence Extracted (Fire-and-Forget)
- AI analyzes student's message quality (async, doesn't block)
- Classifies as: `correct_answer`, `incorrect_answer`, `explanation`, `application`, or `struggle`
- Assigns quality score (0-100) and confidence
- If confidence > 70% → records to `mastery_evidence` table

### 10. Profile Enriched Mid-Session (Fire-and-Forget)
- Analyzes last 10 evidence records for patterns
- **3+ consecutive struggles** on same concept → add to `profile.struggles`
- **80%+ mastery** on concept → add to `profile.strengths`
- Cache invalidated immediately
- **Next interaction in SAME session** loads updated profile → AI adapts in real-time

### 11. Mastery Detection (Rules Override AI)
- Specialist suggests `lessonComplete: true`
- Backend applies **6 objective criteria**:
  - ≥ 3 correct answers
  - Explanation quality ≥ 70
  - ≥ 2 successful applications
  - Overall quality ≥ 75
  - Struggle ratio ≤ 30%
  - Time spent ≥ 5 minutes
- **ALL criteria must pass** → approve lesson complete
- **Any criterion fails** → override to false, keep teaching

### 12. Assessment Triggers
- Lesson complete approved + audio finishes → switch to AssessmentMode
- Load questions from database (correct answers NOT sent to frontend)
- Student answers via voice or text

### 13. Assessment Graded
- **Assessor Agent** (Gemini 3 Pro) grades each answer
- Smart grading: handles variations ("one out of four" = "1/4")
- Each answer recorded as mastery evidence
- Score calculated: (points_earned / total_points) × 100

### 14. Mastery Updated
- **If passed** (score ≥ 80%):
  - `progress.completed = true`
  - Next lesson unlocked
  - Student sees score + feedback + "Next lesson unlocked"
- **If failed**:
  - Student can retry
  - Attempt count tracked

---

## Example Session Timeline

| Time | Student Action | Backend | Student Sees |
|------|---------------|---------|-------------|
| 0:00 | Clicks lesson | Create session, AUTO_START | "Hi Sarah! Today we're learning fractions..." |
| 0:10 | "What is a fraction?" | Route to math_specialist, generate SVG | Text + pizza diagram + audio |
| 0:30 | "So 1/2 means one out of two?" | Fast path, evidence: correct_answer (100) | "Perfect! That's exactly right!" |
| 1:00 | 3 wrong answers on comparing | Profile enrichment: adds "comparing fractions" to struggles | More scaffolding, comparison SVG |
| 2:00 | AI says lesson complete | Rules override: time < 5min → keep teaching | Lesson continues |
| 10:00 | Mastery demonstrated | All 6 criteria met → approve | "You're ready for the assessment!" |
| 10:10 | Takes assessment | Assessor grades: 80% (4/5) | "Congratulations! Next lesson unlocked!" |

---

## Key Architecture Decisions

- **Voice-first**: Audio sent directly to Gemini (no separate STT), natural conversation feel
- **7 specialized agents**: Each with distinct thinking levels optimized for their role
- **Validation layer**: Catches hallucinations before they reach students
- **Rules-based mastery**: Objective criteria override AI's subjective opinion
- **Fire-and-forget**: Evidence extraction + profile enrichment never block the student
- **Progressive TTS**: Audio generation starts during AI streaming (30-40% faster)
- **Mid-session adaptation**: Profile updates in real-time, same session becomes smarter

---

**Tech Stack**: Gemini 3 Flash/Pro (audio input + text generation) · Google Cloud TTS · Next.js 15 · Supabase · Vercel
