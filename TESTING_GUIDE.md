# Streaming Implementation Testing Guide

**Implementation**: Multi-AI Teaching with Gemini Streaming + JSON Schema
**Date**: 2026-01-30

---

## Quick Start Testing

### 1. Start Development Server

```bash
npm run dev
```

Server should start on `http://localhost:3000`

### 2. Browser Testing (Recommended)

#### Step 1: Create/Login User
1. Navigate to `http://localhost:3000/welcome`
2. Create a test user (e.g., "Test Student", age 10)
3. User ID will be stored in localStorage

#### Step 2: Select a Lesson
1. Go to Dashboard (`http://localhost:3000/dashboard`)
2. Select "Introduction to Fractions" lesson
3. Click "Start Learning"

#### Step 3: Test Voice Interaction
1. Wait for automatic greeting from Coordinator
2. Click microphone button
3. Say: "What is a fraction?"
4. Observe:
   - ✅ Voice state changes: listening → thinking → speaking
   - ✅ Agent indicator shows which specialist is responding
   - ✅ Text response appears with markdown formatting
   - ✅ SVG diagram displays (if applicable)
   - ✅ Audio plays automatically

#### Step 4: Verify Streaming Works
Open browser DevTools Console (F12) and look for:
```
[Streaming] Fast path: Continuing with math_specialist
```
OR
```
[Streaming] No active specialist - using Coordinator to route
```

If you see:
```
[Streaming] Failed for [agent], falling back to non-streaming
```
This means streaming had an error but fallback worked correctly.

---

## API Testing (cURL)

### Test Streaming Endpoint Directly

#### Prerequisites
1. Get a valid `userId`, `sessionId`, and `lessonId`
2. Or use test IDs from your database

#### Test Command

```bash
curl -X POST http://localhost:3000/api/teach/multi-ai-stream \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "sessionId": "YOUR_SESSION_ID",
    "lessonId": "YOUR_LESSON_ID",
    "userMessage": "What is a fraction?"
  }'
```

#### Expected Response

```json
{
  "success": true,
  "teacherResponse": {
    "audioText": "A fraction represents part of a whole...",
    "displayText": "# What is a Fraction?\n\nA **fraction** represents...",
    "svg": "<svg>...</svg>",
    "audioBase64": "base64_encoded_audio...",
    "agentName": "math_specialist",
    "handoffMessage": null
  },
  "lessonComplete": false,
  "routing": {
    "agentName": "math_specialist",
    "reason": "Continuing with math_specialist (session-scoped)"
  }
}
```

---

## Functional Testing Checklist

### Core Functionality

- [ ] **Initial Greeting**
  - Coordinator greets student on lesson start
  - Audio plays automatically
  - Greeting mentions lesson title and objective

- [ ] **Smart Routing - Fast Path**
  - Second question goes directly to specialist (no Coordinator routing)
  - Console shows: `[Streaming] Fast path: Continuing with [agent]`

- [ ] **Smart Routing - New Session**
  - First question routes through Coordinator
  - Appropriate specialist is selected
  - Console shows: `[Streaming] No active specialist - using Coordinator to route`

- [ ] **Agent Responses**
  - Text displays correctly with markdown formatting
  - Audio plays without errors
  - Agent avatar/name shows correctly

### All Agents Testing

Test each specialist with appropriate questions:

- [ ] **Math Specialist** (`math_specialist`)
  - Question: "What is 1/2 + 1/4?"
  - Should show SVG diagram
  - Should explain step-by-step

- [ ] **Science Specialist** (`science_specialist`)
  - Question: "What is photosynthesis?"
  - Should provide scientific explanation

- [ ] **English Specialist** (`english_specialist`)
  - Question: "What is a noun?"
  - Should explain grammar concepts

- [ ] **History Specialist** (`history_specialist`)
  - Question: "Who was Abraham Lincoln?"
  - Should provide historical context

- [ ] **Art Specialist** (`art_specialist`)
  - Question: "What are primary colors?"
  - Should discuss art concepts

- [ ] **Assessor** (`assessor`)
  - Triggered automatically when lesson completes
  - Should ask assessment questions

- [ ] **Motivator** (`motivator`)
  - Should activate when student is struggling
  - Provides encouragement

### Advanced Features

- [ ] **SVG Generation**
  - Math problems generate visual diagrams
  - SVG renders correctly in browser
  - No SVG code in audio text

- [ ] **Lesson Completion Detection**
  - AI sets `lessonComplete: true` when student masters topic
  - Assessment mode triggers automatically
  - Smooth transition to assessment

- [ ] **Handoff Messages**
  - Coordinator provides smooth transition when routing to specialist
  - Handoff message displays before specialist response

- [ ] **Error Handling**
  - Network interruption shows toast notification
  - Offline banner appears when no internet
  - Requests can be cancelled (new question interrupts old)

---

## Performance Testing

### Latency Measurement

#### Using Browser DevTools

1. Open DevTools → Network tab
2. Filter: "multi-ai"
3. Ask a question
4. Check "Time" column for request duration

**Expected Results:**
- Streaming endpoint: 1,000-2,000ms
- Non-streaming endpoint: 1,500-3,000ms
- **Improvement: 20-40% faster**

#### Using Console Timestamps

Add this to frontend code temporarily:

```typescript
const startTime = performance.now();
const response = await fetchWithRetry('/api/teach/multi-ai-stream', ...);
const endTime = performance.now();
console.log(`[Perf] Total latency: ${endTime - startTime}ms`);
```

### Success Rate Monitoring

Check server logs for:

```bash
# Successful streaming (should be >95%)
grep "\[Streaming\] Fast path" logs.txt | wc -l

# Fallback to non-streaming (should be <5%)
grep "\[Streaming\] Failed" logs.txt | wc -l
```

---

## Edge Case Testing

### 1. Malformed Responses

**Simulate**: Temporarily break JSON schema in agent system prompt

**Expected**:
- Error logged in console
- Automatic fallback to non-streaming
- User sees response (via fallback)

### 2. Network Interruption

**Simulate**:
1. Start a question
2. Immediately disconnect WiFi
3. Reconnect

**Expected**:
- Toast: "You are offline..."
- Request retries when back online
- Eventually succeeds or shows error

### 3. Rapid Question Changes

**Simulate**:
1. Ask question 1
2. Before response, ask question 2
3. Before response, ask question 3

**Expected**:
- Previous requests are cancelled (AbortController)
- Only question 3 response appears
- No stacking of old responses

### 4. Audio Playback Failure

**Simulate**: Invalid audio base64 (shouldn't happen with schema validation)

**Expected**:
- Toast: "Audio unavailable, but you can read the response above"
- Text response still visible
- State returns to idle

### 5. Empty SVG Field

**Test**: Question that doesn't need SVG

**Expected**:
- `svg: null` in response
- No SVG section rendered
- Text-only response displays correctly

### 6. SVG in displayText (Fallback)

**Simulate**: Model puts SVG in displayText despite schema

**Expected**:
- Fallback extraction logic activates
- SVG extracted and rendered separately
- displayText cleaned of SVG code

---

## Regression Testing

### Verify Old Functionality Still Works

- [ ] **User creation** (`/welcome`)
- [ ] **Dashboard** (`/dashboard`)
- [ ] **Lesson selection** (`/lessons`)
- [ ] **Session management** (`/api/sessions/start`)
- [ ] **Assessment mode** (end class button)
- [ ] **Progress tracking** (`/progress`)

### Verify Non-Streaming Still Works

Temporarily revert frontend to `/api/teach/multi-ai`:

```typescript
'/api/teach/multi-ai'  // Old endpoint
```

Test same scenarios - should work identically (just slower).

---

## Load Testing (Optional)

### Using Artillery.io

Install Artillery:
```bash
npm install -g artillery
```

Create `load-test.yml`:

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
  processor: "./load-test-processor.js"

scenarios:
  - name: "Streaming Teaching Flow"
    flow:
      - post:
          url: "/api/teach/multi-ai-stream"
          json:
            userId: "test-user"
            sessionId: "test-session"
            lessonId: "test-lesson"
            userMessage: "What is 1/2?"
```

Run:
```bash
artillery run load-test.yml
```

**Target Metrics:**
- Response time p95: <3000ms
- Success rate: >99%
- Fallback rate: <5%

---

## Debugging Common Issues

### Issue: Console shows "Failed to parse Gemini streaming JSON response"

**Cause**: Gemini returned invalid JSON (rare with schema validation)

**Solution**:
- Check server logs for full response
- Verify schema is correctly applied
- Should auto-fallback to non-streaming

### Issue: Audio doesn't play

**Causes**:
1. Browser autoplay policy (first interaction)
2. Invalid base64 audio
3. Network error during audio fetch

**Solutions**:
1. Ensure user has interacted with page
2. Check DevTools Console for audio errors
3. Verify `audioBase64` field in response

### Issue: SVG not rendering

**Causes**:
1. Invalid SVG XML
2. Malformed HTML in SVG
3. Security restrictions

**Solutions**:
1. Check DevTools Console for errors
2. Inspect SVG string in response
3. Verify `dangerouslySetInnerHTML` is used correctly

### Issue: Agent doesn't switch correctly

**Cause**: Smart routing not detecting active specialist

**Solution**:
- Check `agent_interactions` table in database
- Verify `getActiveSpecialist()` query
- Ensure session ID is consistent

### Issue: Streaming always falls back to non-streaming

**Causes**:
1. Network issues
2. Gemini API error
3. Invalid API key

**Solutions**:
1. Check network connectivity
2. Verify `GEMINI_API_KEY` environment variable
3. Check Gemini API quota/limits

---

## Success Criteria

### Functional Requirements ✅

- [ ] All 7 agents respond correctly
- [ ] Smart routing works (fast path + coordinator routing)
- [ ] SVG generation and rendering works
- [ ] Audio playback works
- [ ] Lesson completion detection works
- [ ] Error handling and fallback work

### Performance Requirements ✅

- [ ] Streaming endpoint 20-40% faster than non-streaming
- [ ] Fallback rate <5%
- [ ] Audio plays without stuttering
- [ ] UI remains responsive during AI generation

### Quality Requirements ✅

- [ ] Teaching quality identical to non-streaming
- [ ] JSON schema validation 100% reliable
- [ ] No malformed responses reach user
- [ ] Error messages are user-friendly

---

## Test Results Template

```markdown
## Test Session: [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Node Version: [version]
- Environment: [development/production]

### Functional Tests
- Initial Greeting: ✅/❌
- Smart Routing Fast Path: ✅/❌
- Smart Routing New Session: ✅/❌
- Math Specialist: ✅/❌
- Science Specialist: ✅/❌
- SVG Generation: ✅/❌
- Audio Playback: ✅/❌
- Lesson Completion: ✅/❌
- Error Handling: ✅/❌

### Performance Tests
- Avg Latency (Streaming): [ms]
- Avg Latency (Non-Streaming): [ms]
- Improvement: [%]
- Fallback Rate: [%]

### Edge Cases
- Malformed Response: ✅/❌
- Network Interruption: ✅/❌
- Rapid Questions: ✅/❌
- Audio Failure: ✅/❌

### Issues Found
1. [Description]
   - Severity: High/Medium/Low
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Overall Result: ✅ PASS / ❌ FAIL

### Notes
[Additional observations]
```

---

## Next Steps After Testing

### If All Tests Pass ✅

1. Monitor production logs for 24-48 hours
2. Collect latency metrics
3. Analyze fallback rate
4. Plan Phase 2 optimization (progressive field extraction)

### If Tests Fail ❌

1. Document all failures with screenshots
2. Check server logs for error details
3. Verify environment variables are set
4. Review code changes for typos
5. Test non-streaming endpoint to isolate issue

---

## Support & Troubleshooting

### Logs to Check

**Frontend (Browser Console):**
```
[Learn] Received transcript: ...
[Learn] Retry attempt ...
[Learn] Audio playback error: ...
```

**Backend (Server Logs):**
```
[Streaming] Fast path: ...
[Streaming] Failed for ..., falling back to non-streaming: ...
Error getting streaming response from ...
```

**Database (Supabase):**
- `agent_interactions` table for routing history
- `interactions` table for conversation history
- `sessions` table for session validity

### Getting Help

1. Check [STREAMING_IMPLEMENTATION.md](STREAMING_IMPLEMENTATION.md) for architecture details
2. Review [CLAUDE.md](CLAUDE.md) for development guidelines
3. Consult official Gemini API docs: https://ai.google.dev/gemini-api/docs/structured-output

---

**Good luck with testing! 🚀**
