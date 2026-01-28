# Assessment Frontend Testing Guide

## Day 25 - Frontend Integration Testing

This guide outlines manual testing steps for the voice-based assessment system.

### Prerequisites
- Day 23 & 24 backend APIs must be working
- At least one lesson with assessment in database
- User account created
- Development server running (`npm run dev`)

---

## Test 1: Assessment Trigger via "End Class" Button

**Goal**: Verify assessment starts when user clicks "End Class"

**Steps**:
1. Navigate to `/learn/[lessonId]` with a lesson that has an assessment
2. Click the "End Class" button in top-right
3. **Expected**: Should transition to AssessmentMode component
4. **Expected**: Should show assessment title and question count
5. **Expected**: Should display first question with voice input

**Success Criteria**:
- ✅ Smooth transition from learning to assessment
- ✅ Assessment UI loads without errors
- ✅ Question text displays correctly
- ✅ Voice input button is enabled

---

## Test 2: Assessment Trigger via AI Completion

**Goal**: Verify assessment starts automatically when AI returns `lessonComplete: true`

**Steps**:
1. Start a lesson (`/learn/[lessonId]`)
2. Interact with the AI teacher via voice
3. Tell the AI "I think I'm ready to finish" or similar
4. Wait for AI to respond and audio to finish
5. **Expected**: Should automatically transition to assessment after audio ends

**Success Criteria**:
- ✅ AI detects lesson completion
- ✅ Assessment starts after audio finishes (not during)
- ✅ No manual "End Class" click needed
- ✅ Smooth transition

---

## Test 3: Voice Answer Collection

**Goal**: Verify voice input works for answering questions

**Steps**:
1. Start assessment (via either trigger method)
2. Read the first question
3. Click microphone button
4. **Expected**: Button turns red/animated (recording state)
5. Speak your answer clearly
6. Click microphone button again to stop
7. **Expected**: Should move to next question automatically

**Test with various answers**:
- Short answer: "50"
- Word answer: "fifty"
- Sentence answer: "the answer is fifty"

**Success Criteria**:
- ✅ Microphone starts/stops on click
- ✅ Visual feedback during recording
- ✅ Transcript captured correctly
- ✅ Automatically advances to next question
- ✅ Previous answers shown in "Answered Questions" section

---

## Test 4: Progress Indicator

**Goal**: Verify progress tracking during assessment

**Steps**:
1. Start assessment with 3 questions
2. Answer first question
3. **Expected**: Progress bar shows 33% (1/3)
4. Answer second question
5. **Expected**: Progress bar shows 67% (2/3)
6. Answer third question
7. **Expected**: Transitions to grading/results

**Success Criteria**:
- ✅ Progress bar updates correctly
- ✅ Question counter shows "Question X of Y"
- ✅ Percentage accurate
- ✅ Visual feedback smooth

---

## Test 5: Assessment Grading & Results (Pass)

**Goal**: Verify results screen for passing scores

**Steps**:
1. Complete assessment with correct answers
2. Wait for grading (loading screen should show)
3. **Expected**: Results screen with celebration (🎉)
4. **Expected**: Score >= passing score
5. **Expected**: Green success styling
6. **Expected**: "Continue to Next Lesson" button visible
7. **Expected**: Per-question breakdown shows checkmarks

**Success Criteria**:
- ✅ Grading completes successfully
- ✅ Celebration animation/emoji shown
- ✅ Score displayed accurately
- ✅ Feedback from Assessor AI shown
- ✅ Per-question results with green checkmarks
- ✅ Next lesson information displayed
- ✅ Navigation buttons work

---

## Test 6: Assessment Grading & Results (Fail)

**Goal**: Verify results screen for failing scores

**Steps**:
1. Complete assessment with mostly wrong answers
2. Wait for grading
3. **Expected**: Results screen with encouraging message
4. **Expected**: Score < passing score
5. **Expected**: "Review the Lesson" button prominent
6. **Expected**: "Try Again" button available
7. **Expected**: Per-question breakdown shows X marks and hints

**Success Criteria**:
- ✅ Encouraging (not negative) messaging
- ✅ Score displayed accurately
- ✅ Per-question results with red X marks
- ✅ Correct answer hints shown for wrong answers
- ✅ "Review Lesson" navigation works
- ✅ "Try Again" reloads assessment

---

## Test 7: Answer Variation Handling (AI Grading)

**Goal**: Verify Assessor AI handles answer variations

**Test with question**: "What is 25 + 25?"

**Correct answer in DB**: "50"

**Try these variations**:
- "50" → ✅ Should be marked correct
- "fifty" → ✅ Should be marked correct
- "Fifty" → ✅ Should be marked correct
- "the answer is 50" → ✅ Should be marked correct
- "50 apples" → ✅ Should be marked correct (if contextually valid)
- "25" → ❌ Should be marked incorrect

**Success Criteria**:
- ✅ Synonyms accepted (50 = fifty)
- ✅ Case insensitive
- ✅ Extra words handled gracefully
- ✅ Clearly wrong answers marked incorrect
- ✅ Partial credit applied when appropriate

---

## Test 8: Max Attempts Enforcement

**Goal**: Verify max attempts limit is enforced

**Steps**:
1. Check assessment's `max_attempts` value (e.g., 3)
2. Complete assessment and fail
3. Click "Try Again" and fail again
4. Repeat until max attempts reached
5. **Expected**: Error message when limit reached
6. **Expected**: Can't retry anymore

**Success Criteria**:
- ✅ Tracks attempt count correctly
- ✅ Shows "Attempt X" in results
- ✅ Blocks further attempts after max
- ✅ Clear error message

---

## Test 9: Error Handling

**Goal**: Verify graceful error handling

**Test scenarios**:

### A. Network Error During Question Fetch
1. Disconnect internet
2. Click "End Class"
3. **Expected**: Error message shown
4. **Expected**: "Back to Lessons" button available

### B. Network Error During Grading
1. Answer all questions
2. Disconnect internet before last answer submits
3. **Expected**: Error message shown
4. **Expected**: Can retry or go back

### C. Invalid Lesson (No Assessment)
1. Navigate to lesson without assessment
2. Click "End Class"
3. **Expected**: Error message: "No assessment found"

**Success Criteria**:
- ✅ No crashes or white screens
- ✅ Clear error messages
- ✅ Recovery options available
- ✅ Console logs helpful (in dev mode)

---

## Test 10: Complete Flow End-to-End

**Goal**: Verify complete user journey

**Full Flow**:
1. ✅ Start lesson from lessons list
2. ✅ Learn with AI teacher (voice interaction)
3. ✅ AI determines lesson complete OR user clicks "End Class"
4. ✅ Assessment mode starts
5. ✅ Answer all questions via voice
6. ✅ Submit for grading
7. ✅ View results with per-question feedback
8. ✅ Click "Continue to Next Lesson"
9. ✅ Land on next lesson's learn page

**Success Criteria**:
- ✅ Entire flow works without errors
- ✅ Data persists (attempts saved to DB)
- ✅ Progress updated if passed
- ✅ Next lesson unlocked if passed
- ✅ Smooth UX throughout

---

## Test 11: Mobile/Responsive Design

**Goal**: Verify UI works on different screen sizes

**Test on**:
- Desktop (1920px)
- Tablet (768px)
- Mobile (375px)

**Check**:
- ✅ Assessment card responsive
- ✅ Progress bar readable
- ✅ Microphone button easily clickable
- ✅ Results screen readable
- ✅ Buttons appropriately sized
- ✅ Text doesn't overflow

---

## Test 12: Session Integration

**Goal**: Verify assessment uses correct sessionId

**Steps**:
1. Start lesson (creates session)
2. Open browser DevTools → Console
3. Note the sessionId in dev logs
4. Complete assessment
5. Check API call to `/api/assessment/grade`
6. **Expected**: Should use same sessionId from learning session

**Success Criteria**:
- ✅ Uses existing sessionId (not creating new one)
- ✅ Assessment attempt linked to correct session
- ✅ Database shows assessment_attempts with correct session_id

---

## Common Issues & Fixes

### Issue: Assessment doesn't start on "End Class"
**Fix**: Check if lessonId has an assessment in DB. Run:
```sql
SELECT * FROM assessments WHERE lesson_id = 'your-lesson-id';
```

### Issue: Microphone doesn't work
**Fix**: Check browser permissions for microphone access

### Issue: Grading fails with 500 error
**Fix**: Check:
- GEMINI_API_KEY is set
- Assessor agent exists in DB
- Question format matches expected schema

### Issue: Results don't show next lesson
**Fix**: Verify next lesson exists and prerequisites are met

---

## Testing Checklist Summary

After completing all tests, verify:

- [x] Assessment triggers correctly (both methods)
- [x] Voice input works smoothly
- [x] Progress tracking accurate
- [x] Grading works (both pass/fail)
- [x] AI handles answer variations
- [x] Results screen comprehensive
- [x] Navigation works correctly
- [x] Error handling graceful
- [x] Mobile responsive
- [x] Session integration correct
- [x] Data persists to database

---

## Database Verification Queries

After completing a test assessment, verify data:

```sql
-- Check assessment attempt was saved
SELECT * FROM assessment_attempts
WHERE user_id = 'your-user-id'
ORDER BY attempted_at DESC
LIMIT 1;

-- Check progress was updated
SELECT * FROM progress
WHERE user_id = 'your-user-id'
AND lesson_id = 'your-lesson-id';

-- Check curriculum progress updated (if passed)
SELECT * FROM student_curriculum_progress
WHERE user_id = 'your-user-id';
```

---

## Success Metrics

**Day 25 is complete when**:
- ✅ All 12 tests pass
- ✅ No console errors in normal flow
- ✅ Assessment data saves to database
- ✅ UX feels smooth and professional
- ✅ Error states handled gracefully

**Ready for Day 26**: Admin Dashboard! 🎉
