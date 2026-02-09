# EXECUTIVE BRIEF: Error Correction Loop Implementation

**Date**: 2026-02-07
**Priority**: HIGH
**Estimated Effort**: 20-26 hours (1 week)

---

## Current Status ✅

**Step 2 (AI-Based Evidence Extraction) is COMPLETE**:
- ✅ Evidence extracted using Gemini AI (semantic understanding)
- ✅ Replaces keyword matching with intelligent classification
- ✅ Integrated into teaching endpoint
- ✅ High-confidence filtering (>70%)
- ✅ Records to `mastery_evidence` table

**Files Verified**:
- [lib/kernel/evidence-extractor.ts](lib/kernel/evidence-extractor.ts) - Production ready
- [app/api/teach/multi-ai-stream/route.ts](app/api/teach/multi-ai-stream/route.ts#L629-L652) - Integrated

---

## The Gap 🎯

**What Works Now**:
```
Student: "3/4 + 2/5 = 5/9" (wrong)
    ↓
System: Records "incorrect_answer" to database
    ↓
AI: "Not quite! Here's how fractions work..."
    ↓
❌ Student can say "OK" and move on
```

**What Should Happen**:
```
Student: "3/4 + 2/5 = 5/9" (wrong)
    ↓
System: Detects "numerator_plus_denominator_error"
    ↓
System: BLOCKS progression, requires retry
    ↓
AI: "Common mistake! Try again with common denominator first."
    ↓
✅ Student MUST retry before continuing
    ↓
Student: "15/20 + 8/20 = 23/20" (correct)
    ↓
System: Verifies correction, allows progression
```

---

## What Needs to Be Built

### 1. Error Taxonomy System (8-10 hours)
**Purpose**: Detect WHICH misconception, not just "incorrect"

**Components**:
- `lib/kernel/error-detector.ts` - Classifies specific error types
- `migration_007_error_taxonomy.sql` - Adds misconception tracking to database
- Integration into teaching flow

**Output**:
```typescript
{
  errorType: 'numerator_plus_denominator',
  severity: 'critical',
  correctionStrategy: 'Explain common denominators first',
  confidence: 0.92
}
```

### 2. Blocking Retry Mechanism (6-8 hours)
**Purpose**: STOP lesson flow when error detected

**Components**:
- `lib/kernel/retry-controller.ts` - Manages retry requirements
- API response enhancement - Include `retryRequired` flag
- Frontend UI - Display retry prompt, block "Next" button

**Safety Features**:
- Max 3 retry attempts (then allow skip)
- Verification tracking
- Graceful degradation on errors

### 3. Specialist Prompt Updates (2-3 hours)
**Purpose**: Make retry MANDATORY, not optional

**Changes**:
```diff
- 5. Offer retry: "Want to try a similar one?"
+ 5. MANDATORY RETRY: "Now you try. [Present similar problem]"
+ 6. BLOCKING: Do NOT proceed to new topics until retry attempted
+ 7. VERIFY: Confirm correction before moving on
```

**Files**: `lib/db/seed_ai_agents_v2.sql` (all specialists)

### 4. Frontend Handling (4-5 hours)
**Purpose**: Visual feedback and blocking UI

**Components**:
- Retry mode state management
- Warning banner (severity-based colors)
- Disabled "Next" button during retry
- "Skip for Now" option (after 3 attempts)

---

## Implementation Approach

### Week 1: Foundation (Days 1-3)
1. ✅ Verify Step 2 complete (DONE)
2. Build error taxonomy system
3. Update database schema
4. Test error classification accuracy

### Week 2: Integration (Days 4-5)
1. Build retry controller
2. Integrate into teaching endpoint
3. Update specialist prompts
4. Test blocking behavior

### Week 3: Polish (Days 6-7)
1. Build frontend UI
2. Add visual indicators
3. User testing
4. Documentation

---

## How We'll Go About It

### Phase 1: Start Here 👈
**File**: `lib/kernel/error-detector.ts` (NEW)

I'll build the error detection module first because:
- Foundation for everything else
- Can test independently
- Maps to existing misconceptions in specialist prompts

**Action**:
1. I'll write the code following CLAUDE.md guidelines
2. Verify against Gemini API docs
3. Create comprehensive error taxonomy
4. Test with sample student responses

### Phase 2: Database
**File**: `lib/db/migration_007_error_taxonomy.sql` (NEW)

Add tracking fields:
- `misconception_type` - Which error occurred
- `error_severity` - Critical/moderate/minor
- `correction_verified` - Was it fixed?
- `retry_count` - How many attempts?

**Action**:
1. Write migration SQL
2. Apply to database
3. Verify schema changes
4. Update TypeScript types

### Phase 3: Integration
**File**: `app/api/teach/multi-ai-stream/route.ts` (MODIFY)

Hook error detection into teaching flow:
1. After evidence extraction
2. If `incorrect_answer` → detect error type
3. Check if retry required
4. Include in API response

**Action**:
1. Modify lines 629-652 (existing evidence extraction)
2. Add error detection call
3. Update response type
4. Test end-to-end

### Phase 4: Frontend
**Files**: `app/learn/[lessonId]/page.tsx`, `components/VoiceInput.tsx` (MODIFY)

Add blocking UI:
1. Retry mode state
2. Warning banner
3. Disabled buttons
4. Skip option (after 3 attempts)

**Action**:
1. Add state management
2. Build UI components
3. Test user experience
4. Gather feedback

---

## Decision Points

### Question 1: Error Types
Should we start with just math errors or all subjects?

**Recommendation**: Start with math (most critical), then expand.
- Math errors well-documented in prompts
- Clearest right/wrong answers
- Highest impact (fundamental skills)

### Question 2: Blocking Strictness
How strict should retry enforcement be?

**Recommendation**: Strict but with safety valve.
- Always require retry for critical/moderate errors
- Allow skip after 3 attempts (prevent frustration)
- Track skip rate for teacher review

### Question 3: Frontend vs Backend First?
Which should we build first?

**Recommendation**: Backend first (error detection + retry controller).
- Can test via API directly
- Frontend depends on API contract
- Faster iteration without UI complexity

---

## Success Criteria

### Technical:
- ✅ Error type detection: >90% accuracy
- ✅ Retry enforcement: 100% (for confidence >0.7)
- ✅ Correction verification: >95%
- ✅ Safety valve triggers: <5% of interactions

### User Experience:
- ✅ Students feel supported, not punished
- ✅ Clear guidance on how to correct errors
- ✅ Visual feedback on retry mode
- ✅ Can skip after reasonable attempts

### Business:
- ✅ Reduces misconception carry-forward
- ✅ Increases true learning vs passive listening
- ✅ Provides teacher dashboard data on common errors
- ✅ Differentiates from "chat with AI" tutors

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Over-blocking frustrates students | Safety valve: skip after 3 attempts |
| False positive error detection | Confidence threshold (0.7), logging for review |
| Performance impact (extra AI calls) | Fire-and-forget, parallel execution |
| Student feels punished | Growth mindset language, focus on learning |

---

## After This is Complete

Next priorities (in order):
1. **Criterion 5**: Failure → Diagnostic Remediation (assessment failures)
2. **Criterion 6**: Learning Analytics Dashboard (visualize improvement)
3. **Polish**: UI/UX refinements, performance optimization

---

## Ready to Start?

**Recommended First Step**:
Build `lib/kernel/error-detector.ts` - the foundation for everything else.

I'll:
1. ✅ Follow CLAUDE.md guidelines (verify against official docs)
2. ✅ Create comprehensive error taxonomy (from specialist prompts)
3. ✅ Use Gemini structured output (proven pattern)
4. ✅ Include tests and documentation
5. ✅ Ask questions if multiple approaches exist

**Would you like me to start with error-detector.ts now?**

---

## Quick Reference

**Key Documents**:
- [NEXT_IMPLEMENTATION_ERROR_CORRECTION_LOOP.md](NEXT_IMPLEMENTATION_ERROR_CORRECTION_LOOP.md) - Detailed implementation plan
- [CRITERION_3_STEP2_COMPLETE.md](CRITERION_3_STEP2_COMPLETE.md) - Current state verification
- [ROADMAP_TO_100_PERCENT.md](ROADMAP_TO_100_PERCENT.md) - Overall project roadmap

**Key Files to Modify**:
- `lib/kernel/error-detector.ts` (NEW) - Error classification
- `lib/kernel/retry-controller.ts` (NEW) - Retry enforcement
- `lib/db/migration_007_error_taxonomy.sql` (NEW) - Schema changes
- `app/api/teach/multi-ai-stream/route.ts` (MODIFY) - Integration
- `app/learn/[lessonId]/page.tsx` (MODIFY) - Frontend UI

**Estimated Timeline**:
- Phase 1 (Error Taxonomy): 8-10 hours
- Phase 2 (Retry Mechanism): 6-8 hours
- Phase 3 (Prompts): 2-3 hours
- Phase 4 (Frontend): 4-5 hours
- **Total**: 20-26 hours (1 week full-time)
