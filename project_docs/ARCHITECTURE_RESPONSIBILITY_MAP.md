# Architecture Responsibility Map

> Every component owns exactly ONE responsibility. Zero overlaps. Zero conflicts.
>
> Last updated: 2026-02-08 (after Architecture Responsibility Polish)

---

## 1. Component Responsibility Table

| Component | File | Sole Responsibility | Does NOT Do |
|-----------|------|---------------------|-------------|
| **Agent Manager** | `lib/ai/agent-manager.ts` | Manages all AI-LLM interactions: routing, response generation, validation, prompt construction | Does NOT compute lessonComplete, generate adaptive directives, manage TTS, enrich profiles, or extract evidence |
| **Route Handler** | `app/api/teach/multi-ai-stream/route.ts` | Orchestrates the complete teaching request lifecycle and owns the lessonComplete decision | Does NOT implement AI logic, validate responses, synthesize speech, extract evidence AI, or cache profiles |
| **Adaptive Directives** | `lib/ai/adaptive-directives.ts` | Transforms student context into explicit teaching behavior modifications | Does NOT inject directives into prompts, track mastery, analyze evidence, log adaptations, or decide teaching phases |
| **Mastery Tracker** | `lib/ai/mastery-tracker.ts` | Retrieves current mastery level (0-100) for difficulty adaptation | Does NOT record evidence, determine lesson completion, analyze patterns, or generate directives |
| **Mastery Detector** | `lib/kernel/mastery-detector.ts` | Records evidence and applies deterministic rules to determine if mastery is achieved | Does NOT calculate mastery percentages, extract evidence quality, generate directives, or update profiles |
| **Evidence Extractor** | `lib/kernel/evidence-extractor.ts` | Uses AI to extract evidence quality (type, score, confidence) from interactions | Does NOT record evidence to DB, determine mastery, track evidence, or generate responses |
| **Profile Manager** | `lib/memory/profile-manager.ts` | Persists and caches user profiles (Memory Layer 1) | Does NOT enrich profiles, analyze patterns, manage sessions, track mastery, or generate directives |
| **Profile Enricher** | `lib/memory/profile-enricher.ts` | Detects patterns from recent evidence and updates profiles mid-session | Does NOT record evidence, manage cache TTL, extract evidence quality, or generate directives |
| **Session Manager** | `lib/memory/session-manager.ts` | Manages conversation history within a single session (Memory Layer 2) | Does NOT manage profiles, analyze learning patterns, track mastery, or generate responses |
| **Learning Analyzer** | `lib/memory/learning-analyzer.ts` | Analyzes completed sessions with AI to discover long-term learning patterns (Memory Layer 3) | Does NOT run during sessions, manage history, track mastery, or do mid-session enrichment |
| **Cache Manager** | `lib/ai/cache-manager.ts` | Manages Gemini context caching for agent system prompts (cost + latency optimization) | Does NOT generate responses, cache profiles, decide TTL dynamically, or cache lesson-specific data |
| **Adaptation Logger** | `lib/ai/adaptation-logger.ts` | Logs adaptation decisions to DB for analytics and verification | Does NOT generate directives, calculate mastery, generate responses, or update profiles |
| **Google TTS** | `lib/tts/google-tts.ts` | Converts text to speech with per-agent voice assignments and sentence chunking | Does NOT handle STT, store audio, generate content, or manage sessions |
| **Validator Agent** | (defined in `seed_ai_agents_v2.sql`) | Checks specialist responses for factual accuracy before student delivery | Does NOT teach, route, motivate, or decide mastery |
| **Coordinator Agent** | (defined in `seed_ai_agents_v2.sql`) | Routes student messages to the correct specialist agent | Does NOT teach subject content, validate, or assess |
| **Specialist Agents** (5) | (defined in `seed_ai_agents_v2.sql`) | Teach their subject following the 5-phase Teaching Progression Protocol | Do NOT compute lessonComplete, route requests, validate, or motivate |
| **Assessor Agent** | (defined in `seed_ai_agents_v2.sql`) | Generates and grades assessments | Does NOT teach new content, route, or validate |
| **Motivator Agent** | (defined in `seed_ai_agents_v2.sql`) | Provides emotional support and re-engagement | Does NOT teach content, assess, route, or validate |

---

## 2. Decision Ownership Map

Each key decision has exactly ONE owner. No shared ownership.

| Decision | Owner | Mechanism | Other Components' Role |
|----------|-------|-----------|----------------------|
| **What to teach?** | Curriculum DB (`lessons` table) | Lesson title, subject, learning objectives, curriculum content | Agent prompts receive curriculum as context; they don't choose topics |
| **How to teach?** | Agent Prompts (`seed_ai_agents_v2.sql`) | 5-phase Teaching Progression Protocol, Correction Loop, subject-specific pedagogy | Adaptive directives modify intensity/style but don't override the protocol |
| **How much to adapt?** | Adaptive Directives (`adaptive-directives.ts`) | 4 adaptation dials: learning style, difficulty, scaffolding, phase guidance | Profile provides data; mastery tracker provides score; directives produce instructions |
| **Is the lesson complete?** | Route Handler (`multi-ai-stream/route.ts`) | `teachingPhase === 5` AND `determineMastery()` passes | Agent reports teachingPhase (1-5) accurately; agent NEVER sets lessonComplete |
| **Did they learn?** | Mastery Detector (`mastery-detector.ts`) | Deterministic rules: correct answers, quality scores, evidence count thresholds | Evidence extractor provides quality data; route handler calls determineMastery |
| **What's their current level?** | Mastery Tracker (`mastery-tracker.ts`) | Calculates 0-100 from evidence table with progress fallback | Used by adaptive directives for difficulty calibration |
| **Is it safe to deliver?** | Validator Agent (via `agent-manager.ts`) | 5 checks, 0.80 confidence threshold, 2 retries, 10s timeout | Specialist generates; validator checks; route handler delivers |
| **What evidence exists?** | Evidence Extractor (`evidence-extractor.ts`) | AI analysis of each interaction → type + quality score (0-100) + confidence | Route handler triggers extraction; mastery detector records to DB |
| **Who are they?** | Memory System (3 layers) | Profile + session history + learning analysis | Each layer has a specific TTL and scope (see Section 4) |
| **Which agent handles this?** | Coordinator Agent (via `agent-manager.ts`) | JSON routing decision with reason and handoff message | Route handler has fast-path override for active specialists |

---

## 3. Three Struggle Detection Systems

The architecture intentionally uses three separate struggle detection systems. This is **correct by design** — each operates at a different speed, precision, and scope to serve a different purpose.

### Why Three Is Correct

| System | Speed | Precision | Scope | Purpose | Location |
|--------|-------|-----------|-------|---------|----------|
| **Adaptive Directives** | Instant (~0ms) | Low (regex keyword matching) | Last 5 interactions | Real-time scaffolding intensity adjustment | `adaptive-directives.ts` lines 199-255 |
| **Evidence Extractor** | Slow (~1-2s) | High (Gemini AI analysis) | Per-interaction | Mastery evidence recording with quality scores | `evidence-extractor.ts` |
| **Mastery Tracker** | Fast (~50ms) | Medium (DB aggregate) | All-lesson history | Difficulty calibration (mastery percentage) | `mastery-tracker.ts` |

### How They Complement Each Other

```
Student gives wrong answer
        │
        ├─► Adaptive Directives (INSTANT)
        │   Detects "not quite" in AI response → increases scaffolding NOW
        │   Effect: Next response has more hints, slower pace
        │
        ├─► Evidence Extractor (1-2 SECONDS, fire-and-forget)
        │   AI analyzes: "incorrect_answer, quality: 20, confidence: 0.85"
        │   Effect: Precise evidence recorded for mastery determination
        │
        └─► Mastery Tracker (NEXT REQUEST, ~50ms)
            Recalculates: mastery dropped from 65% to 58%
            Effect: Adaptive directives use lower mastery → even more support
```

### Why Not Merge Them?

- **Adaptive directives must be instant** — they run synchronously before generating the AI response. Cannot wait for AI analysis.
- **Evidence extractor must be precise** — keyword matching would miss nuance (e.g., "not quite right but close" vs "completely wrong"). AI analysis is required.
- **Mastery tracker must be historical** — single-interaction signals are too noisy. Aggregate across all evidence provides stable difficulty calibration.

Merging any two would sacrifice either speed, precision, or scope — degrading the teaching experience.

---

## 4. Three-Layer Memory Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MEMORY LAYER 3                      │
│              Learning Analyzer                       │
│  Scope: Cross-session    TTL: Permanent (DB)        │
│  Runs: After session ends                            │
│  Stores: Learning style, long-term patterns          │
│  Invalidation: Overwrites on new analysis            │
├─────────────────────────────────────────────────────┤
│                  MEMORY LAYER 2                      │
│              Session Manager                         │
│  Scope: Single session   TTL: Session lifetime       │
│  Runs: Every interaction                             │
│  Stores: Conversation history, interaction count     │
│  Invalidation: Session ends                          │
├─────────────────────────────────────────────────────┤
│                  MEMORY LAYER 1                      │
│              Profile Manager                         │
│  Scope: User-level       TTL: 5 minutes (in-memory) │
│  Runs: Every request (cache check)                   │
│  Stores: Name, age, grade, style, strengths/struggles│
│  Invalidation: Profile enricher calls invalidateCache│
└─────────────────────────────────────────────────────┘
```

### Cache Strategy

| Layer | Cache Type | TTL | Max Size | Invalidation Trigger |
|-------|-----------|-----|----------|---------------------|
| Profile Manager | In-memory Map | 5 min | 100 profiles (LRU) | `invalidateCache(userId)` from profile-enricher |
| Session Manager | None (DB direct) | Session lifetime | N/A | Session ends |
| Learning Analyzer | None (writes to profile) | Permanent | N/A | Next analysis overwrites |
| Agent Cache | In-memory Map | 5 min | All agents | `invalidateAgentCache()` |
| Context Cache | Gemini server-side | 2 hours | 2 caches (Flash + Pro) | `invalidateCache()` or TTL expiry |

### Mid-Session Profile Update Flow (Criterion 4)

```
AI Response Generated
    │
    ├─► Evidence logged to mastery_evidence table
    │
    ├─► enrichProfileIfNeeded() (fire-and-forget)
    │       │
    │       ├─► Query last 10 evidence records
    │       ├─► Detect patterns:
    │       │     3+ struggles on same topic → add to user.struggles
    │       │     2+ correct (score≥80) on topic → add to user.strengths
    │       ├─► Merge + deduplicate arrays
    │       ├─► Update users table
    │       └─► invalidateCache(userId) ← IMMEDIATE
    │
    └─► Next request loads FRESH profile (cache miss)
            │
            └─► Adaptive directives use UPDATED strengths/struggles
```

---

## 5. Prompt Architecture

### Structure: Universal Pedagogy + Subject Expertise + Curriculum Content

```
┌──────────────────────────────────────────────────┐
│              SPECIALIST PROMPT                     │
│                                                    │
│  ┌──────────────────────────────────────────┐     │
│  │  Subject-Specific Content (~200 lines)    │     │
│  │  - Mission & identity                     │     │
│  │  - Core teaching principles               │     │
│  │  - Common misconceptions                  │     │
│  │  - Grade-level strategies                 │     │
│  │  - SVG diagram examples                   │     │
│  │  - Phase-specific WHAT TO DO              │     │
│  └──────────────────────────────────────────┘     │
│                      +                             │
│  ┌──────────────────────────────────────────┐     │
│  │  Universal Pedagogy (~200 lines, shared)  │     │
│  │  - Phase tracking rules                   │     │
│  │  - Response format guidance               │     │
│  │  - Traditional Classroom Format           │     │
│  │  - Teaching Quality Criteria (Phase 5)    │     │
│  └──────────────────────────────────────────┘     │
│                      +                             │
│  ┌──────────────────────────────────────────┐     │
│  │  Dynamic Context (runtime, per-request)   │     │
│  │  - Student profile (name, age, grade)     │     │
│  │  - Conversation history (last 8 turns)    │     │
│  │  - Adaptive directives (4 categories)     │     │
│  │  - Mastery feedback (if Phase 5 loop)     │     │
│  │  - Curriculum content (if cached)         │     │
│  │  - Format guidance (field semantics)      │     │
│  └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### What Lives Where

| Content Type | Location | Shared? | Changes When? |
|-------------|----------|---------|---------------|
| Teaching Progression Protocol (5 phases) | SQL: `universal_pedagogy` variable | Yes (all 5 specialists) | Rarely (pedagogy update) |
| Correction Loop | SQL: `universal_pedagogy` variable | Yes (all 5 specialists) | Rarely |
| Traditional Classroom Format | SQL: `universal_pedagogy` variable | Yes (all 5 specialists) | Rarely |
| Teaching Quality Criteria | SQL: `universal_pedagogy` variable | Yes (all 5 specialists) | Rarely |
| Response Format Guidance | SQL: `universal_pedagogy` variable + `buildDynamicContext()` | Shared (SQL) + Runtime (TS) | SQL rarely; TS if Zod schema changes |
| Subject pedagogy (misconceptions, strategies) | SQL: per-specialist INSERT | No (unique per subject) | When subject teaching improves |
| Curriculum content (lesson text) | DB: `lessons` table → Context Cache | No (per-lesson) | When curriculum is updated |
| Student context (profile, history) | Runtime: `buildDynamicContext()` | N/A (per-request) | Every request |
| Adaptive directives | Runtime: `adaptive-directives.ts` | N/A (per-request) | Every request (based on mastery + profile) |
| Mastery feedback | Runtime: session metadata → context | N/A (per-request) | When Phase 5 reached but mastery not met |

### DRY Architecture (SQL)

The `seed_ai_agents_v2.sql` uses a PostgreSQL `DO $$ ... $$` block with `DECLARE` variables:

```
DECLARE
  phase_tracking_rules   TEXT  →  Phase progression + tracking instructions
  response_guidance      TEXT  →  Brief format guidance (Zod schema is authority)
  classroom_format       TEXT  →  audioText vs displayText rules
  teaching_quality       TEXT  →  Phase 5 quality criteria (NOT completion)
  universal_pedagogy     TEXT  →  All 4 above concatenated

BEGIN
  -- Each specialist: unique content || universal_pedagogy
  INSERT INTO ai_agents ... VALUES ('math_specialist', ...,
    E'[Math-specific content]\n\n' || universal_pedagogy, ...);
END $$;
```

One change to shared pedagogy → all 5 specialists update automatically.

---

## 6. Data Flow: Student Interaction Lifecycle

```
Student speaks/types
        │
        ▼
┌─────────────────────────┐
│  Route Handler (POST)    │
│  multi-ai-stream/route   │
└─────────┬───────────────┘
          │
          ├─► Load profile (Profile Manager, 5-min cache)
          ├─► Load session history (Session Manager)
          ├─► Load lesson + curriculum (DB)
          ├─► Get current mastery (Mastery Tracker)
          ├─► Generate adaptive directives (Adaptive Directives)
          ├─► Load mastery feedback (session metadata, if any)
          │
          ▼
┌─────────────────────────┐
│  Agent Manager            │
│  Route → Specialist       │
│  Build context + prompt   │
│  Generate response        │
│  (Progressive streaming)  │
└─────────┬───────────────┘
          │
          ├─► Validator checks response (if specialist)
          │   └─► Retry loop (max 2) if rejected
          │
          ▼
┌─────────────────────────┐
│  TTS Synthesis            │
│  (Progressive chunked)    │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐    Fire-and-forget (parallel):
│  Response to Student      │───┬─► Save interaction (Session Manager)
│  (SSE stream)             │   ├─► Log adaptation (Adaptation Logger)
└─────────────────────────┘   ├─► Enrich profile (Profile Enricher)
                               ├─► Extract evidence (Evidence Extractor)
                               │       └─► Record to DB (Mastery Detector)
                               │
                               └─► System mastery check (if Phase 5):
                                       ├─► determineMastery() → true
                                       │       └─► lessonComplete = true
                                       └─► determineMastery() → false
                                               └─► Store feedback in session metadata
                                                       └─► Next request injects feedback
```

---

## 7. lessonComplete: The System-Computed Decision

This was the most critical architecture fix. Previously, three components disagreed on completion criteria.

### Before (Conflict)

| Component | Criteria | Problem |
|-----------|----------|---------|
| Agent prompts | "8+ turns AND Phase 5 AND summary AND transfer question" | Agent can't verify mastery rules |
| Route handler | Only checked mastery when agent said `lessonComplete: true` | Dependent on agent's judgment |
| Mastery detector | Deterministic evidence rules | Never consulted proactively |

### After (Single Owner)

```
Agent: "I'm in Phase 5" (reports teachingPhase accurately)
    │
    ▼
Route Handler: "Is mastery achieved?"
    │
    ├─► determineMastery(userId, lessonId, subject, grade, sessionStart)
    │       │
    │       ├─► Check evidence count thresholds
    │       ├─► Check correct answer ratios
    │       ├─► Check quality score averages
    │       └─► Return { hasMastered: boolean, criteriaMet: {...} }
    │
    ├─► hasMastered === true  → lessonComplete = true (response to student)
    │
    └─► hasMastered === false → Store failed criteria in session metadata
                                    │
                                    ▼
                              Next request loads feedback:
                              "Focus on: correct_answer_count, quality_threshold"
                              Agent continues Phase 5 activities
```

**Key invariant**: Agent prompt says `Do NOT set lessonComplete to true — it is system-computed.` The Zod schema allows it, but the route handler always overrides to the system-computed value.

---

## 8. Validation Pipeline

```
Specialist generates response
        │
        ▼
┌─────────────────────────────┐
│  Should validate?            │
│  Only for: math, science,    │
│  english, history, art       │
│  Skip for: coordinator,      │
│  motivator, assessor         │
└─────────┬───────────────────┘
          │ Yes
          ▼
┌─────────────────────────────┐
│  Validator Agent             │
│  Model: gemini-3-pro-preview │
│  Thinking: HIGH              │
│  Timeout: 10 seconds         │
│  Threshold: 0.80 confidence  │
│                               │
│  5 Checks:                    │
│  1. Factual consistency       │
│  2. Curriculum alignment      │
│  3. Internal consistency      │
│  4. Pedagogical soundness     │
│  5. Visual-text alignment     │
└─────────┬───────────────────┘
          │
          ├─► Approved (≥0.80) → Deliver to student
          │
          ├─► Rejected (<0.80) → Retry (max 2 total)
          │       │
          │       ├─► Specialist regenerates with requiredFixes
          │       └─► Validator rechecks
          │
          ├─► Still rejected → Deliver with disclaimer + log to validation_failures
          │
          └─► Timeout/Error → Auto-approve (never block student)
```

---

## 9. Cost & Performance Profile

| Operation | Latency | Cost Impact | Frequency |
|-----------|---------|-------------|-----------|
| Profile cache hit | ~0ms | None | ~95% of requests |
| Profile cache miss | ~50ms | 1 DB read | ~5% of requests |
| Adaptive directives | ~0ms | None (pure computation) | Every request |
| Context cache check | ~0ms | None | Every request |
| Specialist response | ~2-5s | 1 Gemini Flash call | Every request |
| Validation | ~2-3s | 1 Gemini Pro call | ~60% of requests (specialists only) |
| Evidence extraction | ~1-2s | 1 Gemini Flash call | Every request (fire-and-forget) |
| Profile enrichment | ~50-100ms | 1-3 DB operations | Every request (fire-and-forget) |
| TTS synthesis | ~1-2s | 1 Google TTS call | Every request |
| Mastery check | ~50ms | 1 DB read | Only when Phase 5 |
| Google Search grounding | ~1-3s | $0.014/query | ~10-30% of history/science |

**Total typical latency**: ~4-8 seconds (specialist + validation + TTS)
**Total worst case**: ~13 seconds (specialist + 2 validation retries + TTS)

---

## 10. Agent Thinking Levels & Grounding

| Agent | Model | Thinking Level | Google Search | Rationale |
|-------|-------|---------------|---------------|-----------|
| Coordinator | Flash | LOW | No | Quick routing decisions |
| Math Specialist | Flash | HIGH | No | Precise multi-step reasoning |
| Science Specialist | Flash | MEDIUM | **Yes** | Inquiry-based + factual accuracy |
| English Specialist | Flash | HIGH | No | Nuanced language analysis |
| History Specialist | Flash | HIGH | **Yes** | Complex context + factual accuracy |
| Art Specialist | Flash | LOW | No | Intuitive creative encouragement |
| Assessor | Flash | MEDIUM | No | Fair evaluation |
| Motivator | Flash | LOW | No | Genuine emotional support |
| Validator | Pro | HIGH | No | Thorough verification requires highest capability |
