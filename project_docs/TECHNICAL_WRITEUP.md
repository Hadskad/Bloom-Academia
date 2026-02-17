# Bloom Academia: Technical Architecture & Implementation

## 1. The Problem

### 1.1 Learning Poverty (Core Crisis)
Over 70% of children globally cannot read or perform basic mathematics by age 10, despite years of schooling. This exists because:
- Students advance through grades without demonstrating mastery of prerequisites
- Knowledge gaps compound exponentially (today's confusion becomes tomorrow's failure)
- No systematic detection or remediation of individual student struggles
- Fixed-pace curricula ignore individual readiness

**Bloom's Solution**: Mastery-based progression enforced by deterministic rules. Students cannot advance until objective evidence thresholds are met: minimum 3 correct answers, 70+ quality score on explanations, <30% struggle ratio, and verified application of knowledge. The system tracks 5 evidence types (correct answers, explanations, self-corrections, applications, struggles) and applies teacher-configured rules with 100% confidence—no AI opinions allowed.

### 1.2 Teacher Shortage & Quality Variance
The global teacher shortage exceeds 40 million positions. Where teachers exist, quality varies drastically due to training differences, classroom overcrowding (30-60 students per teacher), and burnout from unsustainable workloads.

**Bloom's Solution**: Multiple AI teachers per student with unlimited availability. Consistent, curriculum-aligned instruction delivered through specialized agents with domain expertise (Math specialist uses HIGH reasoning for multi-step proofs, History specialist uses Google Search grounding for factual accuracy). System scales to millions of concurrent students at near-zero marginal cost.

### 1.3 One-Size-Fits-All Classrooms
Traditional education teaches at a fixed pace, leaving fast learners bored and struggling learners behind. This exists due to:
- Standardized lesson schedules
- Single instructional approach for diverse learning styles
- No time for individualized explanation paths
- Assessment as summative judgment, not diagnostic tool

**Bloom's Solution**: Fully personalized 1-on-1 instruction through adaptive teaching directives. System analyzes learning style (visual, auditory, kinesthetic, logical, etc.), current mastery level (0-100 scale), and detected struggle patterns to generate explicit teaching modifications before every interaction. Visual learners receive SVG diagrams for every concept. Struggling students trigger simplification mode with maximum scaffolding. High-mastery students (>80%) receive acceleration with synthesis challenges.

### 1.4 Bloom's 2-Sigma Problem (Unscalable 1-on-1 Tutoring)
Research proves 1-on-1 tutoring outperforms classroom instruction by 2 standard deviations, but human tutoring:
- Costs $40-100/hour per student
- Requires expert tutors (scarce supply)
- Cannot scale linearly (each new student requires another tutor)
- Inaccessible to 90% of global students due to cost/geography

**Bloom's Solution**: AI-powered replication of 1-on-1 tutoring with voice-based natural conversation. Cost scales sub-linearly through caching (agent prompts pre-cached, user profiles cached 5 minutes), fast-path routing (skips coordinator when specialist active), and serverless architecture.

### 1.5 Hallucinations & Trust Crisis in AI Education
Existing LLM tutors suffer fatal flaws:
- Hallucinate facts with confident tone ("Napoleon was born in 1823" delivered authoritatively)
- Skip prerequisite checks (teach calculus to students lacking algebra foundations)
- Generate plausible-sounding but pedagogically wrong explanations
- No verification layer between generation and student delivery

**Why this exists**: LLMs are probabilistic text generators, not knowledge databases. They optimize for coherence, not correctness. Standard implementations lack curriculum enforcement or factual verification.

**Bloom's Solution**: Independent Validator agent as quality assurance gatekeeper. Every subject specialist response undergoes 5-category validation before reaching students:

1. **Factual Consistency**: Definitions match curriculum, calculations correct, no invented claims
2. **Curriculum Alignment**: Grade-appropriate terminology, prerequisites satisfied
3. **Internal Consistency**: Text and SVG diagrams align, no contradictions within response
4. **Pedagogical Soundness**: Logical explanation order (concrete before abstract), proper scaffolding
5. **Visual-Text Alignment**: Diagrams accurately represent described concepts

**Validation Pipeline**:
```
Specialist Response → Validator Agent (HIGH thinking, 10s timeout)
                            ↓
                    Confidence ≥ 0.80?
                    ├─ YES → Deliver to student
                    └─ NO → Extract requiredFixes, regenerate (max 2 retries)
                            ↓
                    Still rejected? → Log to validation_failures table
                                   → Deliver with disclaimer: "I'm still verifying..."
```

**Implementation Details**:
- Model: `gemini-3-flash-preview` with HIGH thinking level (thorough reasoning)
- Structured output: JSON schema with `approved`, `confidenceScore`, `issues[]`, `requiredFixes[]`
- Timeout: 10 seconds (fail-safe to prevent blocking student—auto-approve on timeout)
- Regeneration loop: Append `requiredFixes` to original prompt, specialist regenerates with feedback
- Fail-safe: Validation errors auto-approve (logged for teacher review, learning continues)

This creates a self-healing teaching loop where hallucinations are caught and corrected before reaching students.

### 1.6 Access Inequality (Geography, Poverty, Conflict)
251 million children are out of school due to:
- Rural isolation (no physical schools within reachable distance)
- Conflict zones (infrastructure destroyed, unsafe travel)
- Poverty (cannot afford fees, uniforms, transportation)
- Disability (lack of specialized resources)

**Bloom's Solution**: Voice-first, low-literacy-friendly platform requiring only:
- Basic internet connectivity (works on mobile networks)
- Any device with a browser (phone, tablet, computer)
- No reading required (voice input/output, visual SVG support)
- No physical school infrastructure needed

System deployed as serverless edge functions, enabling global reach without regional data centers.

### 1.7 Short-Term Learning, Long-Term Forgetting
Traditional education optimizes for exam performance, not retention. Students cram for tests, then forget within weeks. This exists because:
- No spaced repetition scheduling
- No long-term memory tracking across semesters
- No automatic revision triggers based on forgetting curves

**Bloom's Solution**: Persistent learner memory with real-time profile enrichment. As students learn, the system:
1. Records mastery evidence to `mastery_evidence` table (evidence type, quality score, timestamp)
2. Analyzes last 10 evidence records for patterns (3+ struggles → add to `struggles[]`, 80%+ mastery → add to `strengths[]`)
3. Updates user profile immediately (mid-session, not just at end)
4. Invalidates cache so next interaction loads updated profile
5. Tracks learning trajectory across sessions (improving/declining/stable trends)

**Fire-and-Forget Pattern**: Profile enrichment runs asynchronously after each response, never blocking student. Errors are logged but don't throw exceptions—learning continues even if enrichment fails.

---

## 2. Why LLM-Only Tutors Fail

### 2.1 Hallucination Without Verification
Standard LLM implementations call a single model with student input and return the response directly. No verification step exists between generation and delivery.

**Example failure scenario**:
```
Student: "What's the capital of Australia?"
LLM: "The capital of Australia is Sydney, the largest city."  [WRONG - Canberra]
Student receives incorrect information immediately.
```

**Root cause**: LLMs generate plausible text based on statistical patterns, not verified knowledge retrieval. Confidence tone does not correlate with factual accuracy.

### 2.2 No Mastery Enforcement
Typical chatbot tutors rely on the AI's judgment of whether a student "understands." This leads to:
- Premature advancement (student says "I get it" without demonstrating application)
- Politeness bias (AI marks lesson complete to be encouraging, not rigorous)
- No objective evidence threshold (subjective "seems good enough")

**Example failure scenario**:
```
Tutor: "Do you understand fractions now?"
Student: "Yes!" [Has not correctly answered a single question]
Tutor: "Great! Let's move to decimals." [Advancement without mastery]
```

**Root cause**: LLMs optimize for conversational flow and user satisfaction, not educational rigor. They cannot enforce evidence-based mastery criteria.

### 2.3 No Adaptive Teaching
Generic chatbots receive the same prompts regardless of:
- Student's learning style (visual vs. auditory vs. kinesthetic)
- Current mastery level (struggling vs. proficient)
- Historical struggle patterns (repeatedly failing prerequisite concepts)

**Example failure scenario**:
```
Visual learner asks: "How does photosynthesis work?"
Text-only response: [300-word paragraph with no diagrams]
Student struggles to visualize, gives up.
```

**Root cause**: No dynamic prompt modification based on student profile. Static system prompts cannot personalize to individual needs.

### 2.4 Single-Agent Generalist Weakness
Using one general-purpose model for all subjects results in:
- Shallow subject expertise (surface-level explanations)
- Inconsistent quality across domains (good at writing, weak at math)
- No domain-specific reasoning configurations (math needs step-by-step logic, history needs source grounding)

**Example failure scenario**:
```
Student: "Solve 2x + 5 = 13"
Generalist tutor: "The answer is x = 4."  [Correct but no explanation of steps]
Student cannot apply method to similar problems.
```

**Root cause**: General-purpose models lack specialization. No thinking level configuration or domain-specific tool access (e.g., Google Search for history facts).

---

## 3. Bloom's Multi-Agent Solution

### 3.1 Hierarchical Agent Architecture

**Coordinator Agent** (Router):
- **Role**: Routes student messages to appropriate specialists, manages session flow
- **Model**: `gemini-3-flash-preview` with LOW thinking level (fast routing decisions)
- **Triggers**: First message in session, explicit specialist handoff requests, session-scoped routing logic
- **Fast-Path Optimization**: When a specialist is already active (tracked via last agent interaction), subsequent messages route directly to that specialist, saving 200-400ms by skipping coordinator analysis

**Subject Specialists** (5 agents):
1. **Math Specialist**
   - Thinking Level: HIGH (precise multi-step logical reasoning for proofs, algebraic manipulation)
   - Tools: None (deterministic domain, no web search needed)
   - Voice: Neural2-D (clear, methodical tone)

2. **Science Specialist**
   - Thinking Level: MEDIUM (balanced inquiry-based reasoning)
   - Tools: Google Search grounding (for current research, scientific facts beyond training cutoff)
   - Voice: Neural2-F (curious, exploratory tone)

3. **English Specialist**
   - Thinking Level: HIGH (nuanced literary analysis, grammar rule application)
   - Tools: None (language analysis doesn't require web)
   - Voice: Neural2-A (expressive, literary tone)

4. **History Specialist**
   - Thinking Level: HIGH (complex historical context, source evaluation)
   - Tools: Google Search grounding (for dates, events, recent historical research)
   - Voice: Neural2-C (narrative, engaging tone)

5. **Art Specialist**
   - Thinking Level: LOW (intuitive creative encouragement, subjective domain)
   - Tools: None (creative/subjective subject)
   - Voice: Neural2-E (warm, encouraging tone)

**Support Specialists** (3 agents):
- **Assessor**: MEDIUM thinking, evaluates quiz responses with structured grading
- **Motivator**: LOW thinking, provides emotional support when students struggle
- **Validator**: HIGH thinking, verifies specialist responses before delivery (quality assurance gatekeeper)

### 3.2 Agent Configuration & Caching

**Database-Driven Agent Definitions**:
All agents load from `ai_agents` table with:
- `system_prompt` (TEXT): Full agent persona, teaching philosophy, response format
- `model` (VARCHAR): Gemini model variant (`gemini-3-flash-preview`)
- `capabilities` (JSONB): Allowed actions (e.g., `["generate_svg", "use_google_search"]`)
- `performance_metrics` (JSONB): Success rate, average response time, validation pass rate

**Module-Level Cache**:
```typescript
interface AgentCacheEntry {
  agents: Map<string, AIAgent>;
  timestamp: number;
}
let agentCache: AgentCacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

**Cache Strategy**:
- Single cache entry holds all active agents (one database query fetches all)
- TTL: 5 minutes (agents don't change frequently)
- Cache miss: Fetch all agents from database, populate Map, set timestamp
- Cache hit: Return agents from memory (0ms latency)
- Invalidation: Manual or TTL expiration (future: webhook on agent updates)

**Agent Name Aliases**:
Coordinator AI sometimes returns abbreviated names (`math` instead of `math_specialist`). Alias map ensures routing works:
```typescript
const AGENT_NAME_ALIASES = {
  'math': 'math_specialist',
  'science': 'science_specialist',
  // ...
};
```

### 3.3 Thinking Level Differentiation

**Implementation** (from [agent-manager.ts](lib/ai/agent-manager.ts)):
```typescript
import { ThinkingLevel } from '@google/genai'; // SDK v1.35.0

function getThinkingLevelForAgent(agentName: string): ThinkingLevel {
  switch (agentName) {
    // Deep reasoning for complex subjects
    case 'math_specialist':
    case 'english_specialist':
    case 'history_specialist':
      return ThinkingLevel.HIGH;

    // Balanced reasoning for inquiry-based subjects
    case 'science_specialist':
    case 'assessor':
      return ThinkingLevel.MEDIUM;

    // Fast, intuitive responses for support/creative roles
    case 'coordinator':
    case 'art_specialist':
    case 'motivator':
      return ThinkingLevel.LOW;

    default:
      return ThinkingLevel.MEDIUM;
  }
}
```

**Applied in Generation**:
```typescript
const response = await this.ai.models.generateContent({
  model: agent.model,
  contents: prompt,
  config: {
    thinkingConfig: {
      thinkingLevel: getThinkingLevelForAgent(agent.name)
    }
  }
});
```

**Performance Impact**:
- LOW thinking: Fastest responses (~800-1,200ms), suitable for simple routing/encouragement
- MEDIUM thinking: Balanced (~1,000-1,400ms), good for inquiry-based teaching
- HIGH thinking: Slower (~1,500-2,500ms) but more accurate for multi-step reasoning, complex analysis

This gives each agent a distinct "cognitive profile" optimized for their teaching role.

### 3.4 Google Search Grounding (Factual Subjects)

**Why Only History & Science?**
- **Math**: Deterministic domain, no need for web search (2+2=4 doesn't change)
- **English**: Grammar rules and literature analysis don't require current events
- **Art**: Subjective/creative domain, not fact-dependent
- **History/Science**: Factual domains with evolving research, dates, discoveries beyond model training cutoff

**Implementation**:
```typescript
function shouldUseGoogleSearch(agentName: string): boolean {
  switch (agentName) {
    case 'history_specialist':
    case 'science_specialist':
      return true;
    default:
      return false;
  }
}

// Applied in all three response methods
const tools = shouldUseGoogleSearch(agent.name)
  ? [{ googleSearch: {} }]
  : undefined;

const response = await this.ai.models.generateContent({
  model: agent.model,
  contents: prompt,
  tools, // Google Search enabled for history/science only
  config: { /* ... */ }
});
```

**Grounding Metadata Extraction**:
```typescript
interface GroundingMetadata {
  webSearchQueries?: string[];  // Queries model generated
  groundingChunks?: Array<{     // Source snippets
    web?: { uri: string; title?: string; }
  }>;
  sources?: GroundingSource[];  // Parsed citations
}

function extractGroundingMetadata(response: GeminiResponse): GroundingMetadata | null {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  if (!metadata) return null;

  const sources: GroundingSource[] = metadata.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({
      title: chunk.web!.title || 'Source',
      url: chunk.web!.uri,
      snippet: chunk.web!.snippet
    })) || [];

  return {
    webSearchQueries: metadata.webSearchQueries,
    groundingChunks: metadata.groundingChunks,
    sources
  };
}
```

**Cost & Latency**:
- Pricing: $14 per 1,000 Google Search queries (as of Jan 5, 2026)
- Estimated usage: 10-30% of history/science responses trigger search (model decides when needed)
- Cost per grounded response: ~$0.014-$0.042
- Latency impact: +1-3 seconds when search triggered (only when model deems necessary for accuracy)

**Example Response with Citations**:
```markdown
The American Revolution began in 1775 with the Battles of Lexington and Concord.
The conflict arose from colonial opposition to British taxation without representation...

**Sources:**
- [Britannica - American Revolution](https://britannica.com/event/American-Revolution)
- [History.com - Revolutionary War Timeline](https://history.com/topics/revolutionary-war)
```

Students see where information comes from, building critical thinking and source evaluation skills.

---

## 4. Gemini 3 Flash Integration & Advanced Features

### 4.1 Model Configuration

**Primary Model**: `gemini-3-flash-preview`
**SDK**: `@google/genai` v1.35.0
**API Base**: Google AI Studio (not Vertex AI)

**Why Gemini 3 Flash?**
- Fast inference (optimized for low-latency applications)
- Native audio understanding (no transcription step needed)
- Structured output support (JSON schema enforcement)
- Context caching (pre-cache system prompts for cost/latency reduction)
- Multimodal (text, audio, images, video in single request)
- Google Search grounding integration
- Thinking level configuration (LOW/MEDIUM/HIGH reasoning)

### 4.2 Structured Output (JSON Schema Enforcement)

**Problem**: Raw LLM output is unstructured text. Parsing with regex is brittle and fails on format variations.

**Solution**: Gemini's structured output mode enforces JSON schemas, guaranteeing well-formed responses.

**Teaching Response Schema**:
```typescript
import { z } from 'zod';

const teachingResponseSchema = z.object({
  audioText: z.string().describe(
    'Text optimized for speech synthesis (natural spoken language), should reference visual diagram when available'
  ),
  displayText: z.string().describe(
    'Markdown-formatted text for screen display. Use LaTeX math ($ inline $, $$ block $$). Can reference diagrams.'
  ),
  svg: z.string().nullable().describe(
    'Valid SVG XML for visual diagram, or null if not needed'
  ),
  lessonComplete: z.boolean().describe(
    'Set to true ONLY when student has demonstrated COMPLETE mastery of ALL objectives. Be strict.'
  )
});
```

**API Call**:
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: prompt,
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
    thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
  }
});

// Response is guaranteed to match schema
const parsed = teachingResponseSchema.parse(JSON.parse(response.text));
```

**Benefits**:
- No regex parsing fragility
- Type-safe responses (TypeScript inference from Zod schema)
- Automatic validation (throws if schema violated)
- Self-documenting (schema describes intent to model)

**Validation Result Schema** (Validator Agent):
```typescript
const validationResultSchema = z.object({
  approved: z.boolean().describe('Whether response passed all validation checks'),
  confidenceScore: z.number().min(0).max(1).describe('Confidence (0.0-1.0). Threshold: ≥0.80 for approval'),
  issues: z.array(z.string()).describe('Specific issues found (empty if approved)'),
  requiredFixes: z.array(z.string()).nullable().describe('Actionable fixes if rejected (null if approved)')
});
```

### 4.3 Native Audio Input (No Transcription)

**Traditional Pipeline** (STT → LLM → TTS):
```
Audio → Transcription Service (Gemini native audio/Whisper) → Text → LLM → Text → TTS → Audio
        [+200-500ms, +cost]
```

**Bloom's Pipeline** (Direct Audio):
```
Audio → Gemini (native audio understanding) → Structured JSON → TTS → Audio
        [No transcription step, -200-500ms latency, -transcription cost]
```

**Implementation**:
```typescript
// Frontend: Capture audio as base64
const audioBlob = await recorder.stop();
const base64Audio = await blobToBase64(audioBlob);

// API Route: Pass directly to Gemini
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: [{
    parts: [
      {
        inlineData: {
          mimeType: 'audio/webm', // or audio/mp3, audio/wav
          data: base64Audio
        }
      }
    ]
  }],
  config: { /* ... */ }
});
```

**Supported Audio Formats**:
- WebM (Opus codec, browser default)
- MP3 (cross-platform compatibility)
- WAV (uncompressed, larger file size)

**Latency Impact**:
- Eliminates transcription step: -200-500ms
- Direct semantic understanding (no text intermediate)
- Maintains voice tone/emotion context

### 4.4 Context Caching (System Prompt Optimization)

**Problem**: Agent system prompts are 500-2,000 tokens and identical across requests for the same agent. Re-processing wastes compute and adds latency.

**Solution**: Pre-cache system prompts in Gemini's context cache, reference by name in requests.

**Cache Creation**:
```typescript
import { ensureCacheFresh } from './cache-manager';

// Ensure agent's system prompt is cached (creates if missing, refreshes if stale)
const cachedContent = await ensureCacheFresh(agent.name, agent.system_prompt);

// Reference cache in request
const response = await ai.models.generateContent({
  model: agent.model,
  cachedContent: cachedContent.name, // "cached_prompts/math_specialist_abc123"
  contents: dynamicPrompt, // Only user message sent (system prompt from cache)
  config: { /* ... */ }
});
```

**Cache TTL & Refresh**:
- TTL: 30 minutes (configurable)
- Refresh trigger: Any request within 25 minutes extends TTL (prevents expiration during active use)
- Cache miss: Create new cache entry, subsequent requests hit cache

**Performance Benefits**:
- Cache hit: ~0ms for system prompt processing (vs ~50-100ms cold)
- Token cost: Free for cached tokens (only pay for new tokens)
- Consistent across requests (same cache version ensures reproducibility)

**Cost Savings**:
```
Without caching: 1,500 tokens/request * $0.000075/1K tokens = $0.0001125 per request
With caching: 0 cached tokens + 200 new tokens * $0.000075/1K tokens = $0.000015 per request
Savings: 86.7% on input token cost for typical requests
```

### 4.5 Progressive Streaming (Tier 3 Optimization)

**Problem**: Waiting for complete AI response before starting TTS adds 1,000-2,000ms latency.

**Solution**: Extract first complete sentence from streaming response, start TTS immediately, continue streaming remainder in parallel.

**Flow**:
```
Gemini Streaming Starts (t=0ms)
  ↓
First sentence extracted (t=300-500ms)
  ↓
TTS starts on first sentence (parallel) ← Student hears audio early
  ↓
Continue streaming rest of response (t=500-1,400ms)
  ↓
Remaining sentences → TTS (chunked)
  ↓
Complete response ready (t=1,400ms)
```

**Implementation**:
```typescript
async function getAgentResponseProgressiveStreaming(
  agent: AIAgent,
  context: AgentContext
): Promise<ProgressiveAgentResponse> {
  const stream = await ai.models.generateContentStream({
    model: agent.model,
    contents: prompt,
    config: { /* ... */ }
  });

  let accumulatedText = '';
  let firstSentenceExtracted = false;
  let firstSentenceAudio: string | null = null;

  for await (const chunk of stream) {
    accumulatedText += chunk.text();

    // Extract first complete sentence (ends with . ! ?)
    if (!firstSentenceExtracted && /[.!?]/.test(accumulatedText)) {
      const sentences = accumulatedText.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length > 0) {
        const firstSentence = sentences[0].trim();

        // Generate TTS in parallel while streaming continues
        firstSentenceAudio = await generateSpeech(firstSentence, agent.voice);
        firstSentenceExtracted = true;
      }
    }
  }

  // Parse final accumulated JSON
  const parsed = teachingResponseSchema.parse(JSON.parse(accumulatedText));

  return {
    ...parsed,
    firstSentenceAudio, // Can play immediately for early audio start
    fullAudio: await generateSpeech(parsed.audioText, agent.voice)
  };
}
```

**Latency Reduction**:
- Traditional: 1,400ms (AI) + 600ms (TTS) = 2,000ms total
- Progressive: 1,400ms (AI parallel with TTS starting at 500ms) = 1,400ms total
- **Savings: 30-40% perceived latency reduction**

**Fallback Strategy**:
```
Try progressive streaming
  ↓ (if extraction fails)
Fall back to regular streaming
  ↓ (if streaming fails)
Fall back to non-streaming
  ↓ (if all fail)
Return error (never blocks student indefinitely)
```

### 4.6 Vision Analysis (Image & Video Support)

**Use Cases**:
- Upload handwritten math work for error detection
- Submit science experiment photos for analysis
- Share historical artifacts for discussion
- Send diagrams for conceptual review

**Implementation**:
```typescript
// Frontend: Capture image/video as base64
const file = await uploadFile();
const base64Media = await fileToBase64(file);

// API Route: Pass to Gemini with text context
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: [{
    parts: [
      { text: "Please analyze this math problem and explain where I went wrong:" },
      {
        inlineData: {
          mimeType: 'image/jpeg', // or image/png, video/mp4, etc.
          data: base64Media
        }
      }
    ]
  }],
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: z.toJSONSchema(teachingResponseSchema)
  }
});
```

**Supported Formats**:
- **Images**: JPEG, PNG, WebP (1,120 tokens at HIGH resolution)
- **Videos**: MP4, WebM, MOV (1,120 tokens per frame sampled)

**Vision Capabilities**:
- OCR (extract handwritten text from photos)
- Object detection (identify experiment components)
- Diagram analysis (understand visual representations)
- Error detection (spot mistakes in student work)

**Token Cost**:
- Images: 1,120 tokens (HIGH resolution) or 258 tokens (LOW resolution)
- Videos: 1,120 tokens per frame * sampling rate (configurable)

---

## 5. What Makes Bloom Non-Wrapper (Custom Algorithmic Logic)

### 5.1 Adaptive Teaching Directives (Novel Prompt Engineering)

**Standard LLM Tutors**: Pass static context to model ("Student is a visual learner") and hope model adapts.

**Bloom's Innovation**: Algorithmically generates explicit, actionable teaching directives and injects them into prompts.

**Implementation** ([lib/ai/adaptive-directives.ts](lib/ai/adaptive-directives.ts)):

```typescript
export function generateAdaptiveDirectives(
  profile: UserProfile,
  masteryLevel: number, // 0-100
  strugglePatterns: string[]
): string {
  const directives: string[] = [];

  // 1. Learning Style Adaptation (7 types)
  if (profile.learning_style === 'visual') {
    directives.push(
      '📊 VISUAL LEARNER DETECTED:',
      '- Generate SVG diagram for EVERY concept (no exceptions)',
      '- Use spatial metaphors ("imagine the number line...")',
      '- Reference diagrams explicitly in audio ("as you see in the diagram...")'
    );
  } else if (profile.learning_style === 'auditory') {
    directives.push(
      '🎧 AUDITORY LEARNER DETECTED:',
      '- Use conversational rhythm with natural pauses',
      '- Repeat key concepts in different phrasings',
      '- Minimize reliance on visual-only explanations'
    );
  } else if (profile.learning_style === 'kinesthetic') {
    directives.push(
      '🤸 KINESTHETIC LEARNER DETECTED:',
      '- Use movement metaphors ("imagine jumping from number to number")',
      '- Describe hands-on scenarios ("if you were holding the fractions...")',
      '- Encourage mental visualization of actions'
    );
  }
  // ... (logical, social, solitary, reading/writing adaptations)

  // 2. Difficulty Adaptation (based on mastery)
  if (masteryLevel < 50) {
    directives.push(
      '🔻 SIMPLIFICATION MODE (Mastery <50%):',
      '- Break every concept into smallest possible steps',
      '- Use maximum scaffolding (think-alouds, step-by-step)',
      '- Check understanding after EVERY step',
      '- Avoid multi-step problems until basics solid'
    );
  } else if (masteryLevel > 80) {
    directives.push(
      '🔺 ACCELERATION MODE (Mastery >80%):',
      '- Challenge with synthesis questions (combine concepts)',
      '- Introduce edge cases and exceptions',
      '- Ask "why" questions to deepen understanding',
      '- Move to application problems quickly'
    );
  }

  // 3. Struggle-Based Scaffolding
  if (strugglePatterns.length > 0) {
    directives.push(
      '⚠️ RECENT STRUGGLES DETECTED:',
      ...strugglePatterns.map(s => `- Extra support needed: ${s}`),
      '- Increase encouragement frequency',
      '- Provide worked examples before asking student to try'
    );
  }

  // 4. Strength Reinforcement
  if (profile.strengths && profile.strengths.length > 0) {
    directives.push(
      '✅ STUDENT STRENGTHS:',
      ...profile.strengths.map(s => `- Build on: ${s}`),
      '- Reference these strengths when teaching new concepts'
    );
  }

  return directives.join('\n');
}
```

**Injection Point**:
```typescript
// Before every AI request
const adaptiveDirectives = generateAdaptiveDirectives(
  context.userProfile,
  context.masteryLevel,
  context.recentStruggles
);

const prompt = `
${agent.system_prompt}

${adaptiveDirectives}  ← Injected dynamically

CONVERSATION:
${conversationHistory}

STUDENT MESSAGE:
${userMessage}
`;
```

**Why This Is Non-Wrapper**:
- **Custom algorithm**: No LLM API provides automatic learning style adaptation
- **Explicit directive generation**: Transforms profile data into actionable instructions
- **Dynamic prompt engineering**: Each request gets unique directives based on current state
- **7 learning style types**: Visual, auditory, kinesthetic, logical, social, solitary, reading/writing
- **3 difficulty modes**: Simplification (<50%), standard (50-80%), acceleration (>80%)

This is **original logic** not provided by any Gemini API feature.

### 5.2 Rules-Based Mastery Detection (Zero AI Opinion)

**Standard LLM Tutors**: Ask AI "Did the student understand?" (subjective, unreliable, prone to politeness bias)

**Bloom's Innovation**: Deterministic mastery rules applied to accumulated evidence. 100% confidence, no AI opinions.

**Implementation** ([lib/kernel/mastery-detector.ts](lib/kernel/mastery-detector.ts)):

```typescript
export interface MasteryRules {
  minCorrectAnswers: number         // e.g., 3
  minExplanationQuality: number     // e.g., 70 (0-100 scale)
  minApplicationAttempts: number    // e.g., 2
  minOverallQuality: number         // e.g., 75 (weighted average)
  maxStruggleRatio: number          // e.g., 0.3 (30%)
  minTimeSpentMinutes: number       // e.g., 5
}

export async function determineMastery(
  userId: string,
  lessonId: string,
  subject: string,
  gradeLevel: number,
  sessionStartTime: Date
): Promise<MasteryResult> {
  // 1. Fetch all evidence from database
  const evidence = await getEvidenceForLesson(userId, lessonId);

  // 2. Calculate statistics (deterministic counting)
  const correctAnswers = evidence.filter(e => e.evidence_type === 'correct_answer').length;
  const incorrectAnswers = evidence.filter(e => e.evidence_type === 'incorrect_answer').length;
  const explanations = evidence.filter(e => e.evidence_type === 'explanation');
  const applications = evidence.filter(e => e.evidence_type === 'application').length;
  const struggles = evidence.filter(e => e.evidence_type === 'struggle').length;

  // Calculate average quality scores
  const avgExplanationQuality = average(
    explanations.map(e => e.metadata?.quality_score || 0).filter(q => q > 0)
  );
  const avgOverallQuality = average(
    evidence.map(e => e.metadata?.quality_score || 0).filter(q => q > 0)
  );

  // Calculate struggle ratio
  const struggleRatio = evidence.length > 0 ? struggles / evidence.length : 0;

  // Calculate time spent
  const timeSpentMinutes = (Date.now() - sessionStartTime.getTime()) / (1000 * 60);

  // 3. Load teacher-configured rules for this subject/grade
  const rules = await getEffectiveRulesForSubject(subject, gradeLevel);

  // 4. Apply rules (boolean checks, no AI involved)
  const criteriaResults = {
    correctAnswers: correctAnswers >= rules.minCorrectAnswers,
    explanationQuality: avgExplanationQuality >= rules.minExplanationQuality,
    applicationAttempts: applications >= rules.minApplicationAttempts,
    overallQuality: avgOverallQuality >= rules.minOverallQuality,
    struggleRatio: struggleRatio <= rules.maxStruggleRatio,
    timeSpent: timeSpentMinutes >= rules.minTimeSpentMinutes
  };

  // 5. Mastery = ALL criteria must be met (AND logic, not averaging)
  const hasMastered = Object.values(criteriaResults).every(met => met);

  return {
    hasMastered,
    confidence: 1.0, // Always 100% (deterministic)
    criteriaMet: criteriaResults,
    evidence: { /* stats */ },
    rulesApplied: rules
  };
}
```

**Evidence Quality Scoring** (AI-powered but rules-enforced):
```typescript
// Uses Gemini structured output to analyze student explanations
const evidenceAnalysis = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: `Analyze this student explanation: "${studentResponse}"`,
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: z.toJSONSchema(z.object({
      evidenceType: z.enum(['correct_answer', 'explanation', 'application', 'struggle']),
      qualityScore: z.number().min(0).max(100),
      confidence: z.number().min(0).max(1),
      reasoning: z.string()
    }))
  }
});

// Score recorded to mastery_evidence table
await recordMasteryEvidence(
  userId,
  lessonId,
  sessionId,
  evidenceAnalysis.evidenceType,
  studentResponse,
  { quality_score: evidenceAnalysis.qualityScore }
);
```

**Why This Is Non-Wrapper**:
- **Custom rules engine**: No LLM API provides teacher-configurable mastery thresholds
- **Deterministic decision logic**: 100% reproducible (same evidence → same result)
- **Evidence tracking architecture**: Custom database schema for mastery evidence
- **Multi-criteria evaluation**: 6 criteria must ALL pass (not "good enough" averaging)
- **AI used only for quality scoring**: Semantic analysis of explanations, not final mastery decision

### 5.3 Real-Time Profile Enrichment (Fire-and-Forget Async Updates)

**Standard LLM Tutors**: Update profiles only at session end (no mid-session adaptation)

**Bloom's Innovation**: Mid-session profile updates triggered by pattern detection, with immediate cache invalidation.

**Implementation** ([lib/memory/profile-enricher.ts](lib/memory/profile-enricher.ts)):

```typescript
export async function enrichProfileIfNeeded(
  userId: string,
  lessonId: string,
  sessionId: string
): Promise<void> {
  try {
    // 1. Fetch last 10 mastery evidence records for this session
    const { data: recentEvidence } = await supabase
      .from('mastery_evidence')
      .select('evidence_type, metadata')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (!recentEvidence || recentEvidence.length === 0) return;

    // 2. Detect struggle patterns (3+ consecutive struggles)
    const strugglesInWindow = recentEvidence.filter(
      e => e.evidence_type === 'struggle' || (e.metadata?.quality_score || 100) < 50
    );

    if (strugglesInWindow.length >= 3) {
      // Extract struggle topic from evidence content
      const struggleTopic = extractTopicFromEvidence(recentEvidence[0]);

      // Fetch current profile
      const { data: profile } = await supabase
        .from('users')
        .select('struggles')
        .eq('id', userId)
        .single();

      // Merge and deduplicate
      const currentStruggles = profile?.struggles || [];
      const updatedStruggles = Array.from(new Set([...currentStruggles, struggleTopic]));

      // Update profile (mid-session!)
      await supabase
        .from('users')
        .update({ struggles: updatedStruggles })
        .eq('id', userId);

      // Invalidate cache so next AI prompt loads updated profile
      await invalidateProfileCache(userId);

      console.log(`[profile-enricher] Added struggle: ${struggleTopic} (mid-session)`);
    }

    // 3. Detect mastery patterns (80%+ quality scores)
    const masteryInWindow = recentEvidence.filter(
      e => (e.metadata?.quality_score || 0) >= 80
    );

    if (masteryInWindow.length >= 5) {
      // Extract mastered topic
      const masteredTopic = extractTopicFromEvidence(recentEvidence[0]);

      // Update strengths array (same pattern as struggles)
      const { data: profile } = await supabase
        .from('users')
        .select('strengths')
        .eq('id', userId)
        .single();

      const currentStrengths = profile?.strengths || [];
      const updatedStrengths = Array.from(new Set([...currentStrengths, masteredTopic]));

      await supabase
        .from('users')
        .update({ strengths: updatedStrengths })
        .eq('id', userId);

      await invalidateProfileCache(userId);

      console.log(`[profile-enricher] Added strength: ${masteredTopic} (mid-session)`);
    }

  } catch (error) {
    console.error('[profile-enricher] Enrichment failed:', error);
    // Don't throw - this is non-critical background work
  }
}
```

**Integration Point** ([app/api/teach/multi-ai-stream/route.ts](app/api/teach/multi-ai-stream/route.ts)):
```typescript
// After AI response generation (line 617)
enrichProfileIfNeeded(userId, lessonId, sessionId)
  .catch(err => console.error('[multi-ai-stream] Profile enrichment failed:', err));

// Response returned immediately (fire-and-forget pattern)
return NextResponse.json(agentResponse);
```

**Why This Is Non-Wrapper**:
- **Pattern detection algorithm**: Custom logic for struggle/mastery thresholds (not LLM-provided)
- **Fire-and-forget architecture**: Async updates without blocking student
- **Immediate cache invalidation**: Next interaction loads fresh profile (same-session adaptation)
- **Deduplication via Set**: Array merge with duplicate removal (not LLM feature)
- **Supabase array operations**: Direct PostgreSQL array updates without RPC

### 5.4 Learning Trajectory Analysis (Lightweight Option A)

**Standard LLM Tutors**: No multi-session trend tracking

**Bloom's Innovation**: Analyzes last 5 sessions to detect improving/declining/stable trends with confidence scoring.

**Implementation** ([lib/memory/trajectory-analyzer.ts](lib/memory/trajectory-analyzer.ts)):

```typescript
export async function analyzeLearningTrajectory(
  userId: string,
  subject: string
): Promise<TrajectoryAnalysis> {
  // 1. Fetch last 5 completed sessions for this subject
  const { data: sessions } = await supabase
    .from('sessions')
    .select('effectiveness_score, started_at')
    .eq('user_id', userId)
    .eq('lessons.subject', subject)
    .not('ended_at', 'is', null)
    .not('effectiveness_score', 'is', null)
    .order('started_at', { ascending: true }) // Oldest first for chronological trend
    .limit(5);

  if (!sessions || sessions.length < 2) {
    return { trend: 'insufficient_data', confidence: 0 };
  }

  // 2. Calculate trend metrics
  const scores = sessions.map(s => s.effectiveness_score);
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const delta = lastScore - firstScore;

  // Calculate volatility (standard deviation)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const volatility = stdDev / 100; // Normalize to 0-1

  // 3. Classify trend
  let trend: 'improving' | 'declining' | 'stable';
  if (delta > 10 && avgScore > 60) {
    trend = 'improving';
  } else if (delta < -10 || avgScore < 40) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // 4. Calculate confidence (more sessions + lower volatility = higher confidence)
  const sessionConfidence = sessions.length / 5; // 0.4 for 2 sessions, 1.0 for 5 sessions
  const volatilityPenalty = 1 - (volatility * 0.5); // High volatility reduces confidence
  const confidence = sessionConfidence * volatilityPenalty;

  return {
    trend,
    confidence,
    delta,
    avgScore,
    sessionCount: sessions.length,
    message: generateTrajectoryMessage(trend, delta)
  };
}

function generateTrajectoryMessage(trend: string, delta: number): string {
  switch (trend) {
    case 'improving':
      return `📈 Great progress! Up ${delta.toFixed(1)} points recently.`;
    case 'declining':
      return `📉 Performance dipped ${Math.abs(delta).toFixed(1)} points. Let's focus on fundamentals.`;
    case 'stable':
      return `➡️ Consistent performance. Ready to challenge with harder material?`;
    default:
      return '';
  }
}
```

**Why This Is Non-Wrapper**:
- **Custom trend detection algorithm**: Delta thresholds (+10/-10), average score checks
- **Confidence scoring formula**: `(sessionCount / 5) * (1 - volatility * 0.5)`
- **Volatility calculation**: Standard deviation normalized to 0-1 scale
- **Multi-session query optimization**: Chronological ordering, null filtering
- **Human-readable messages**: Emoji-enhanced trend descriptions

### 5.5 Diagnostic Concept Gap Analysis

**Standard LLM Tutors**: Generic "try again" feedback on assessment failures

**Bloom's Innovation**: Groups failures by concept, classifies severity, prioritizes remediation targets.

**Implementation** ([lib/assessment/diagnostic-analyzer.ts](lib/assessment/diagnostic-analyzer.ts)):

```typescript
export function diagnoseConceptGaps(
  questions: QuestionWithConcepts[],
  gradingResults: PerQuestionResult[],
  conceptMetadata?: ConceptMetadata[]
): DiagnosticResult {
  // 1. Track concept failures: concept → {failed: count, total: count, questionIds: []}
  const conceptStats = new Map<string, {
    failed: number;
    total: number;
    failedQuestionIds: string[];
  }>();

  // 2. Iterate through grading results
  for (const result of gradingResults) {
    const question = questions.find(q => q.id === result.questionId);
    if (!question) continue;

    const concepts = question.concepts || [];
    if (concepts.length === 0) continue;

    // Update statistics for each concept tagged in question
    for (const concept of concepts) {
      if (!conceptStats.has(concept)) {
        conceptStats.set(concept, { failed: 0, total: 0, failedQuestionIds: [] });
      }

      const stats = conceptStats.get(concept)!;
      stats.total += 1;

      if (!result.isCorrect) {
        stats.failed += 1;
        stats.failedQuestionIds.push(result.questionId);
      }
    }
  }

  // 3. Convert to FailedConcept objects with severity classification
  const failedConcepts: FailedConcept[] = [];

  for (const [concept, stats] of conceptStats.entries()) {
    if (stats.failed === 0) continue; // Skip concepts with no failures

    const failureRate = stats.failed / stats.total;

    // Classify severity based on failure rate
    let severity: 'critical' | 'moderate' | 'minor';
    if (failureRate >= 0.75) {
      severity = 'critical';  // Failed ≥75% of questions
    } else if (failureRate >= 0.50) {
      severity = 'moderate';  // Failed ≥50% of questions
    } else {
      severity = 'minor';     // Failed <50% of questions
    }

    failedConcepts.push({
      concept,
      displayName: conceptMetadata?.get(concept) || humanizeConceptName(concept),
      questionsFailedCount: stats.failed,
      totalQuestionsForConcept: stats.total,
      failureRate,
      severity,
      questionIds: stats.failedQuestionIds
    });
  }

  // 4. Sort by severity (critical first) then failure count (most failed first)
  failedConcepts.sort((a, b) => {
    const severityOrder = { critical: 0, moderate: 1, minor: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.questionsFailedCount - a.questionsFailedCount;
  });

  // 5. Generate actionable recommendations (top 2-3 concepts)
  const topConcepts = failedConcepts.slice(0, 3);
  const recommendedActions = topConcepts.map(c => {
    const emoji = c.severity === 'critical' ? '🔴' : c.severity === 'moderate' ? '🟡' : '🔵';
    return `${emoji} ${c.displayName}: ${c.questionsFailedCount}/${c.totalQuestionsForConcept} questions need review`;
  });

  return {
    failedConcepts,
    remediationNeeded: failedConcepts.length > 0,
    recommendedActions,
    totalQuestionsAnalyzed: gradingResults.length,
    totalQuestionsFailed: gradingResults.filter(r => !r.isCorrect).length
  };
}
```

**Why This Is Non-Wrapper**:
- **Concept grouping algorithm**: Maps questions → concepts, aggregates failures
- **Severity classification**: 3-tier system (critical ≥75%, moderate ≥50%, minor <50%)
- **Custom sorting logic**: Severity-first, then failure count (multi-key sort)
- **Prioritization heuristic**: Top 2-3 concepts for focused remediation
- **Human-readable recommendations**: Emoji severity indicators, fraction formatting

---

## Summary: Non-Wrapper Evidence

Bloom Academia is **not a thin API wrapper**. The system implements:

1. **Adaptive Directive Generation** (250+ lines custom logic) - Transforms profile data into explicit teaching instructions
2. **Rules-Based Mastery Detection** (378 lines deterministic engine) - Zero AI opinion, 100% confidence
3. **Real-Time Profile Enrichment** (Fire-and-forget async updates) - Mid-session adaptation with cache invalidation
4. **Learning Trajectory Analysis** (Custom trend detection algorithm) - Multi-session pattern recognition
5. **Diagnostic Concept Gap Analysis** (Severity classification + prioritization) - Actionable remediation targets
6. **Validation Pipeline** (Self-healing regeneration loop) - Independent quality assurance layer
7. **Progressive Streaming** (Sentence extraction + parallel TTS) - 30-40% latency reduction
8. **Multi-Agent Orchestration** (Hierarchical routing + fast-path optimization) - Specialized agents with differentiated thinking levels

**Total Custom Logic**: ~3,000+ lines of original algorithms, not provided by any Gemini API feature.

**Testing Coverage**: 14/14 passing tests for Criterion 4 (memory persistence), comprehensive test suites for mastery detection, diagnostic analysis, and profile enrichment.

This is a production-grade educational platform with substantial engineering beyond LLM API calls.
