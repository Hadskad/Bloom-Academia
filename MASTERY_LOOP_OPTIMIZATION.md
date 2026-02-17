# Mastery Loop Optimization Plan
## Math → Understanding Fractions → Single Student (Bulletproof Edition)

**Date:** 2026-02-16
**Goal:** Perfect the mastery detection and adaptation loop for one subject/lesson/student, then scale

---

## Current State Analysis ✅

### What's Working
1. **5-Phase Teaching Protocol** - Solid pedagogical structure (Hook → I Do → We Do → You Do → Consolidate)
2. **Correction Loop** - 4-step error correction (Identify → Correct → Verify → Confirm)
3. **Evidence Recording** - Tracks correct/incorrect answers, explanations, applications
4. **Mastery Calculation** - Evidence-based scoring (correct/total * 100)
5. **Adaptive Directives** - Changes teaching based on mastery level (<50%, 50-80%, >80%)
6. **Cache System** - 5-min TTL with global invalidation

### Critical Gaps Identified ⚠️

#### **1. Mastery Loop is POST-Lesson Only**
- ❌ **Current:** Mastery only calculated at lesson END via `determineMastery()`
- ❌ **Current:** Mastery level doesn't update MID-lesson even when evidence changes
- ✅ **Fix:** Real-time mastery updates after each interaction

#### **2. No Progressive Difficulty Unlocking**
- ❌ **Current:** Student at 85% mastery gets same difficulty as 45% student
- ❌ **Current:** Agent prompt has "mastery acceleration" but it's based on PRIOR KNOWLEDGE, not CURRENT MASTERY
- ✅ **Fix:** Inject current mastery score into agent context, enable mid-lesson difficulty adjustment

#### **3. Evidence Quality Not Verified in Production**
- ⚠️ **Current:** `extractEvidenceQuality()` exists but unclear if it's working correctly
- ⚠️ **Current:** Quality score threshold is 0.7 confidence — is this tuned?
- ✅ **Fix:** Add logging and verification that evidence extraction is firing correctly

#### **4. Adaptive Directives Have Redundancy**
- ❌ **Current:** ~135 tokens per request after compaction (was 280)
- ❌ **Current:** Still contains verbose phrases like "Student excels at", "Connect new concepts to"
- ✅ **Fix:** Further compress to ~80-90 tokens (target: 40% more reduction)

#### **5. Mastery Rules Not Tuned for Grade 3 Fractions**
- ❌ **Current:** Generic defaults (minCorrectAnswers: 3, minOverallQuality: 60)
- ❌ **Current:** No subject_configurations row for Grade 3 Math
- ✅ **Fix:** Add fraction-specific mastery rules (higher standards for fractions)

#### **6. No Stress Testing**
- ❌ **Current:** No automated tests for mastery loop reliability
- ❌ **Current:** Unknown how system behaves under rapid evidence accumulation
- ✅ **Fix:** Add stress test suite for evidence recording → mastery calculation → cache invalidation

#### **7. Teaching Progression Protocol Not Enforced**
- ⚠️ **Current:** Agent prompt has detailed phase rules, but no RUNTIME enforcement
- ⚠️ **Current:** Agent could skip phases and system wouldn't catch it
- ✅ **Fix:** Add phase tracking in database + validation layer

---

## Optimization Priority Tiers

### **Tier 1: Critical (Do First) 🔴**
These directly impact mastery accuracy and adaptation effectiveness.

1. **Real-Time Mastery Updates During Lesson**
   - **Current:** Mastery cached for 5 minutes, doesn't update mid-lesson
   - **Fix:** Invalidate cache immediately after evidence recording
   - **File:** `lib/kernel/mastery-detector.ts` → `recordMasteryEvidence()`
   - **Impact:** Adaptive directives reflect CURRENT performance, not 5-min-old data

2. **Inject Current Mastery into Agent Prompt**
   - **Current:** Agent has mastery acceleration rules but no access to actual score
   - **Fix:** Add `<current_mastery_score>{{score}}</current_mastery_score>` to system context
   - **File:** `lib/ai/teaching-helpers.ts` → `buildAgentContext()`
   - **Impact:** Agent can ACTUALLY adapt difficulty based on evidence

3. **Verify Evidence Extraction is Working**
   - **Current:** `extractEvidenceQuality()` exists but unclear if it's firing
   - **Fix:** Add performance logging to verify it's called + results recorded
   - **Files:** `lib/ai/teaching-helpers.ts` → `fireAndForgetSideEffects()`
   - **Impact:** Ensure evidence quality scores are actually being captured

### **Tier 2: High Impact (Do Second) 🟠**
These improve adaptation precision and reliability.

4. **Grade 3 Fractions Mastery Rules**
   - **Current:** Using generic defaults (too lenient for fractions)
   - **Fix:** Add row to `subject_configurations` table
   - **Params:**
     ```json
     {
       "minCorrectAnswers": 4,          // Fractions need more practice
       "minExplanationQuality": 70,     // Must verbalize understanding
       "minApplicationAttempts": 2,     // Transfer to new contexts
       "minOverallQuality": 70,         // Higher bar than default 60
       "maxStruggleRatio": 0.3,         // Less tolerance for confusion
       "minTimeSpentMinutes": 5         // Fractions take time
     }
     ```
   - **Impact:** Students must TRULY master fractions before progression

5. **Compress Adaptive Directives Further (40% reduction)**
   - **Current:** ~135 tokens per request (after first optimization)
   - **Target:** ~80 tokens (remove all non-actionable fluff)
   - **Removals:**
     - "Student excels at" → Just list strengths
     - "Connect new concepts to these strengths as bridges" → "Use {{strength}} as foundation"
     - All remaining emojis/separators
   - **File:** `lib/ai/adaptive-directives.ts` → `compactDirectives()`
   - **Impact:** Faster Gemini response time (~100ms saved per request)

6. **Progressive Difficulty Unlocking**
   - **Current:** No mid-lesson difficulty adjustment
   - **Fix:** When mastery crosses thresholds, inject difficulty directive
   - **Thresholds:**
     - Mastery 0-49%: "Use SIMPLEST examples, break every step"
     - Mastery 50-79%: "Standard difficulty, introduce 1 challenge per phase"
     - Mastery 80-100%: "ACCELERATE: Skip basics, focus on edge cases/word problems"
   - **File:** `lib/ai/adaptive-directives.ts` → `generateAdaptiveDirectives()`
   - **Impact:** Students get optimal challenge level throughout lesson

### **Tier 3: Reliability (Do Third) 🟡**
These ensure the system doesn't break under stress.

7. **Stress Test Suite**
   - **Tests:**
     - Rapid evidence recording (10 records in 1 second)
     - Concurrent mastery calculations
     - Cache invalidation race conditions
     - Mastery threshold edge cases (49.5% → 50%, 79.9% → 80%)
   - **File:** `lib/ai/__tests__/mastery-loop-stress.test.ts` (new)
   - **Impact:** Confidence that system won't break under real student use

8. **Phase Tracking Validation**
   - **Current:** Agent tracks phases internally, no database record
   - **Fix:** Add `current_phase` column to `agent_interactions` table
   - **Validation:** Check that phases progress 1→2→3→4→5 (or backward via correction loop)
   - **Impact:** Catch agents that skip phases or get stuck

---

## Implementation Roadmap

### **Phase 1: Critical Fixes (1-2 hours)**
- [ ] Real-time mastery cache invalidation
- [ ] Inject current mastery into agent context
- [ ] Add evidence extraction logging

### **Phase 2: Tuning (1 hour)**
- [ ] Create Grade 3 Fractions mastery rules
- [ ] Compress adaptive directives to 80 tokens
- [ ] Implement progressive difficulty unlocking

### **Phase 3: Validation (1-2 hours)**
- [ ] Build stress test suite
- [ ] Add phase tracking to database
- [ ] Run full mastery loop end-to-end test

### **Phase 4: Scale (After validation)**
- [ ] Replicate to Science specialist
- [ ] Replicate to English specialist
- [ ] Generalize mastery rules for all subjects

---

## Success Metrics

### **Before Optimization**
- Mastery updates: Every 5 minutes (cache TTL)
- Adaptive directives: ~135 tokens
- Evidence extraction: Unknown if working
- Mastery rules: Generic defaults
- Stress tested: No

### **After Optimization**
- Mastery updates: Real-time (immediate cache invalidation)
- Adaptive directives: ~80 tokens (40% reduction)
- Evidence extraction: Verified + logged
- Mastery rules: Grade 3 Fractions tuned (70% quality threshold)
- Stress tested: 100% pass rate on edge cases

### **Student-Facing Improvements**
1. **Mid-lesson adaptation**: Struggling student gets scaffolding FASTER (not 5 min later)
2. **Optimal challenge**: Mastery 85% student gets harder problems automatically
3. **Accurate progression**: Can't advance from fractions without TRUE mastery (4+ correct, 70% quality)
4. **Faster responses**: 100ms saved per turn from compressed directives

---

## Next Steps

**Start with Tier 1, Critical fixes:**
1. Fix real-time mastery updates
2. Inject mastery into agent prompt
3. Verify evidence extraction

**Then validate before scaling:**
1. Test with one student on "Understanding Fractions"
2. Check logs for evidence quality scores
3. Verify mastery updates correctly after each interaction
4. Confirm agent actually adapts difficulty mid-lesson

**Once bulletproof:**
1. Scale to other math lessons
2. Scale to other specialists (Science, English, History, Art)
3. Build teacher dashboard to monitor mastery loop health

---

## Files to Modify

| Priority | File | Changes |
|----------|------|---------|
| 🔴 Critical | `lib/kernel/mastery-detector.ts` | Remove `refreshMasteryCache()` call delay, make immediate |
| 🔴 Critical | `lib/ai/teaching-helpers.ts` | Inject `<current_mastery>{{score}}</current_mastery>` into system context |
| 🔴 Critical | `lib/ai/teaching-helpers.ts` | Add performance logging to evidence extraction |
| 🟠 High | `lib/db/seed_mastery_rules_grade3_fractions.sql` | New file: Insert Grade 3 Fractions mastery rules |
| 🟠 High | `lib/ai/adaptive-directives.ts` | Further compress directives to ~80 tokens |
| 🟠 High | `lib/ai/adaptive-directives.ts` | Add progressive difficulty unlocking thresholds |
| 🟡 Reliability | `lib/ai/__tests__/mastery-loop-stress.test.ts` | New file: Stress test suite |
| 🟡 Reliability | `lib/db/migration_add_phase_tracking.sql` | New file: Add `current_phase` to agent_interactions |

---

## Questions to Answer

1. **Should mastery updates be INSTANT or have a 30-second debounce?**
   - Instant = more accurate but more cache churn
   - 30s debounce = less overhead but slightly stale data

2. **Should progressive difficulty be GRADUAL or THRESHOLD-BASED?**
   - Gradual = smooth difficulty curve
   - Threshold = clear mastery milestones (50%, 80%)

3. **Should agents ANNOUNCE mastery level to students?**
   - "You're at 75% mastery, almost there!" (motivating?)
   - OR keep it invisible (avoid fixation on score)?

4. **Should mastery rules be LESSON-SPECIFIC or SUBJECT-SPECIFIC?**
   - Lesson-specific = maximum precision (e.g., fractions vs multiplication)
   - Subject-specific = easier to scale

---

**Ready to implement Tier 1 Critical fixes?**
