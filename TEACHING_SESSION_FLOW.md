# Teaching Session Flow: Request-to-Response

**The Complete Journey of a Student's Question**

---

## Frontend: Student Interaction

Student clicks the microphone button and speaks. The VoiceRecorder component captures the audio as base64-encoded data. Alternatively, student can upload an image or video through the MediaUpload component for visual problem-solving.

Voice states transition through: idle (ready) → listening (recording) → thinking (AI processing) → speaking (audio playing) → idle (complete).

---

## API Endpoint: Multi-AI Progressive Streaming

### Step 1: Context Building (Lines 174-260)

The system fetches four pieces of data in parallel using Promise.all to save time:
- **User profile** from Layer 1 memory (permanent traits: name, age, grade level, learning style, strengths, struggles)
- **Session history** from Layer 2 memory (last 5 conversation exchanges)
- **Lesson details** from database (title, subject, learning objective)
- **Active specialist** check to see which AI agent last spoke

**NEW: Adaptive Teaching Directives (Criterion 2)**

The system now calculates the student's current mastery level (0-100 scale) and generates adaptive teaching directives based on:
- Learning style preferences (visual, auditory, kinesthetic, reading-writing)
- Detected struggle patterns from profile
- Current mastery level in this lesson

These directives are formatted as instructions and injected into the AI's context, actively modifying how the AI teaches rather than just providing passive background information.

The complete context includes user profile, conversation history, lesson details, any audio or media data, and the new adaptive instructions.

---

### Step 2: Agent Routing & Response (agent-manager.ts)

**Special Case: Auto-Start Lesson**

When the lesson first loads, the system sends an AUTO_START message. The Coordinator immediately greets the student, introduces the lesson title and learning objective, and asks if they're ready to begin. This greeting plays automatically without requiring the student to speak first.

**FAST PATH: Active Specialist Exists**

If a specialist is already teaching this student (tracked from previous interaction), the system skips routing and sends the message directly to that specialist. This saves 200-400ms by avoiding the Coordinator routing step.

The specialist uses progressive streaming: Gemini starts responding immediately, and as soon as the first sentence is complete (300-500ms into the stream), the system begins generating TTS audio for it in parallel while Gemini continues generating the rest of the response. This produces 30-40% latency reduction compared to waiting for the full response before starting TTS.

Three-tier fallback exists: if progressive streaming fails, try regular streaming. If that fails, try non-streaming. If all fail, return error.

**SLOW PATH: No Active Specialist**

Two scenarios exist:

*Scenario A: Audio or Media Only, No Text*

When the student sends audio or uploads an image/video without accompanying text, the system can't analyze message content for routing. Instead, it routes directly to the specialist matching the lesson's subject. Math lesson goes to math_specialist, science lesson to science_specialist, etc. This mirrors the Coordinator's fallback logic for unclear messages.

*Scenario B: Text Message Provided*

The Coordinator analyzes the message and decides where to route. The Coordinator may handle simple messages directly (greetings, clarifications, requests for breaks) or route to a subject specialist. If routing to a specialist, the Coordinator can provide a handoff message displayed visually on screen.

**Agent Configuration**

Different agents use different thinking levels based on cognitive requirements:
- **HIGH thinking** (deep reasoning): Math, English, and History specialists need precise multi-step reasoning
- **MEDIUM thinking** (balanced): Science specialist and Assessor need fair but not exhaustive analysis
- **LOW thinking** (fast, intuitive): Coordinator, Art specialist, and Motivator need quick responses

Google Search grounding is enabled only for History and Science specialists to provide factual accuracy with source citations. Math doesn't need web search (deterministic), English doesn't need it (grammar/literature analysis), and support agents don't teach factual content.

---

### Step 3: TTS Generation (Lines 566-588)

If progressive streaming succeeded, the first sentence audio is already synthesized. The system generates TTS for the remaining text in chunks and concatenates the audio buffers (first sentence plus remainder) into the final base64-encoded MP3.

If progressive streaming didn't fire or failed, the system generates TTS for the entire response in one shot.

Each agent has a unique Neural2 voice from Google Cloud TTS, giving each specialist a distinct personality.

---

### Step 4: Persistence & Analytics (Lines 590-652)

**Dual-Write to Two Tables**

The system writes to two tables simultaneously in fire-and-forget pattern (non-blocking, errors logged but don't block response):

First table is agent_interactions, which tracks analytics: which agent responded, routing decision, routing reason, response time in milliseconds.

Second table is interactions, which stores conversation history used for Layer 2 memory. Simpler schema with just user message and AI response.

Both writes happen in parallel and are non-critical to the student's immediate experience.

**NEW: Adaptation Logging (Criterion 2)**

The system logs which adaptive directives were applied to this interaction: what learning style adjustments, difficulty modifications, and scaffolding needs were injected into the AI's instructions. This creates an audit trail proving the AI actually adapted its teaching behavior.

**NEW: Profile Enrichment (Criterion 4)**

The system analyzes recent mastery evidence from the last 5-10 interactions. If it detects patterns (3 or more struggles with a specific topic, or 80%+ high-quality evidence for a topic), it updates the user's profile in real-time by adding to struggles or strengths arrays.

Critically, it invalidates the cache immediately after updating. This means the very next interaction in the same session will load the updated profile and adapt accordingly. The profile doesn't wait until end of session—it updates mid-session for immediate effect.

**NEW: Mastery Evidence Extraction (Criterion 3)**

The system uses AI to analyze the conversation exchange and extract evidence quality. This replaces keyword matching with semantic understanding.

The AI determines the evidence type (correct answer, explanation given, self-correction, application to new context, or connection between concepts) and assigns quality score and confidence level.

Only evidence with confidence above 70% gets recorded to the mastery_evidence table. This filters out ambiguous interactions that don't clearly demonstrate learning progress.

---

### Step 5: Mastery Override (Lines 654-705)

**NEW: Rules-Based Mastery Check (Criterion 3)**

When the AI specialist sets lessonComplete to true (meaning it subjectively thinks the student has mastered the lesson), the system doesn't trust this decision blindly.

Instead, it fetches all mastery evidence collected during this session and applies six objective criteria:
1. **Correct answers** - at least 70% accuracy required
2. **Explanation quality** - at least 2 good explanations required
3. **Self-correction** - at least 1 instance where student caught own mistake (bonus criterion)
4. **Application** - at least 1 instance applying concept to new situation
5. **Engagement** - at least 5 minutes active learning time
6. **Consistency** - at least 3 pieces of positive evidence overall

The system counts how many criteria are met and calculates whether mastery is truly achieved. If the objective criteria aren't satisfied, the system overrides the AI's subjective decision and sets lessonComplete to false.

This prevents the AI from ending lessons prematurely based on politeness, over-optimism, or misreading student understanding. The rules-based system is objective and consistent.

If mastery check fails, the system logs which criteria weren't met for teacher review and debugging.

---

### Step 6: Response to Frontend (Lines 708-723)

The API returns a JSON response containing:
- **audioText** - natural spoken language optimized for TTS
- **displayText** - markdown-formatted text with bold, italics, and LaTeX math equations
- **svg** - visual diagram code or null if no diagram needed
- **audioBase64** - base64-encoded MP3 audio
- **agentName** - which specialist responded (for avatar display)
- **handoffMessage** - optional visual-only transition message from Coordinator
- **lessonComplete** - boolean using the mastery override decision (not raw AI decision)
- **routing** - which agent handled this and why

---

## Frontend: Display & Speak (Lines 313-369)

The frontend receives the response and adds it to the conversation history array. It tracks the current agent name for avatar display.

If lessonComplete is true, it stores a flag in localStorage to trigger the assessment modal after the audio finishes playing (not immediately, to avoid interrupting the AI's final remarks).

Voice state changes to speaking. The system creates an HTML5 Audio element with the base64 MP3 data and plays it.

When audio ends, voice state returns to idle. If the completion flag was set, the assessment modal opens automatically.

The displayText renders as Markdown with KaTeX support for math equations (both inline dollar signs and block double-dollar signs). The SVG diagram displays in the whiteboard area. The agent's avatar shows with their name. The handoff message displays as visual text only (not spoken through TTS).

If audio playback fails for any reason (codec issues, browser limitations), the system gracefully degrades to text-only mode with a toast notification. The student can still read the response even if audio doesn't work.

---

## Performance Metrics

Context building takes 50-150ms through parallel Promise.all fetching. Routing decision takes 200-400ms using LOW thinking level. AI response generation takes 1,000-1,400ms with progressive streaming (down from 1,400-2,000ms with standard streaming, a 30-40% improvement). TTS generation takes 300-600ms through chunked parallel synthesis.

Total latency from microphone button release to first audio playback: approximately 1,500-2,500ms depending on response length and complexity.

Key optimizations: progressive streaming saves 30-40% on AI response, parallel context building saves 50-100ms, chunked TTS saves 300-600ms, and fast-path routing saves 200-400ms when a specialist is already active.

---

## Error Handling & Resilience

**Three-Tier Fallback System**

First attempt: progressive streaming (fastest, most complex). If that fails, fallback to regular streaming (fast, simpler). If that fails, fallback to non-streaming (slowest, most reliable). If all three fail, return error to user.

**Fire-and-Forget Pattern**

All analytics and logging operations (dual-write persistence, adaptation logging, profile enrichment, mastery evidence extraction) are non-blocking. They execute asynchronously with errors caught and logged but not thrown. The critical path is only AI response plus TTS—everything else is supplementary.

**Network Resilience**

The frontend detects offline status and warns the user before attempting requests. Retry logic with exponential backoff attempts failed requests up to 3 times. AbortController cancels pending requests when the user starts a new interaction. Audio failures gracefully degrade to text-only mode.

**Philosophy**: Never block the student's learning experience. If anything fails, log it and continue delivering the core teaching content.

---

## Key Architectural Changes from Original Flow

1. **Progressive Streaming** - Added first sentence extraction during streaming with parallel TTS synthesis, achieving 30-40% latency reduction.

2. **Adaptive Teaching Directives** - Context building now generates and injects real-time teaching instructions based on learning style, mastery level, and struggles.

3. **Mastery Override System** - AI's subjective completion decisions are now verified against six objective criteria with veto power.

4. **Real-Time Profile Enrichment** - User profiles update mid-session when struggle or mastery patterns detected, with immediate cache invalidation for same-session effect.

5. **AI Evidence Extraction** - Replaced keyword matching with semantic AI analysis to accurately identify learning evidence types and quality.

6. **Media Upload Support** - Added vision analysis capabilities for image and video uploads with MIME type validation.

7. **Fast-Path Routing** - Added optimization to skip Coordinator routing when a specialist is already actively teaching the student.

8. **Auto-Start Greetings** - System automatically introduces the lesson when page loads rather than waiting for student to speak first.

**Why Dual-Write?**

The agent_interactions table serves analytics purposes: tracking which agents handle what, measuring performance, analyzing routing patterns.

The interactions table serves memory purposes: storing conversation history that gets loaded into context for the next request.

Separating concerns allows each system to optimize for its purpose without compromise.
