/**
 * agent-manager.test.ts
 *
 * Tests for AIAgentManager and module-level cache utilities.
 *
 * Strategy: every external dependency is mocked at the module boundary.
 * The class is instantiated normally so all internal logic (alias resolution,
 * SVG extraction, JSON cleanup, progressive sentence extraction, cache TTL)
 * executes against real code paths.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── mock external modules before importing the module under test ──────────────
vi.mock('@/lib/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({ error: null })),
    })),
  },
}))

vi.mock('@/lib/analytics/agent-performance', () => ({
  updateAgentPerformance: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/tts/google-tts', () => ({
  generateSpeech: vi.fn(() => Promise.resolve(Buffer.from('audio'))),
}))

// GoogleGenAI mock – we replace the whole module so the constructor never
// touches a real API key.  Individual tests re-implement generateContent /
// generateContentStream as needed.
const mockGenerateContent = vi.fn()
const mockGenerateContentStream = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    this.models = {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    }
  }),
  ThinkingLevel: { LOW: 'LOW', MEDIUM: 'MEDIUM' },
}))

// ── now import the module under test ─────────────────────────────────────────
import { AIAgentManager, invalidateAgentCache, getCacheStatus } from '@/lib/ai/agent-manager'
import { supabase } from '@/lib/db/supabase'
import { generateSpeech } from '@/lib/tts/google-tts'

// ── shared helpers ────────────────────────────────────────────────────────────

/** Minimal AIAgent shape that satisfies the class internals */
function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-id-1',
    name: 'math_specialist',
    role: 'subject',
    model: 'gemini-3-flash-preview',
    system_prompt: 'You are a math teacher.',
    subjects: ['math'],
    capabilities: { can_teach: true },
    performance_metrics: { total_interactions: 0, avg_effectiveness: 0, success_rate: 0 },
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Wire the supabase mock so that .from('ai_agents').select('*').eq('status','active')
 *  resolves to the given agents array. */
function seedAgents(agents: ReturnType<typeof makeAgent>[]) {
  ;(supabase.from as any).mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        // loadAgents path – no further chaining
        data: agents,
        error: null,
        // getActiveSpecialist path chains .order().limit().single()
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({ error: null })),
  })
}

/** Minimal AgentContext */
function makeContext() {
  return {
    userId: 'user-1',
    sessionId: 'session-1',
    lessonId: 'lesson-1',
    userProfile: { name: 'Alice', age: 10, grade_level: 4 },
  }
}

// Set env var so the constructor doesn't throw
process.env.GEMINI_API_KEY = 'test-key'

// ── tests ─────────────────────────────────────────────────────────────────────

describe('AIAgentManager – agent name alias resolution', () => {
  beforeEach(() => {
    invalidateAgentCache()
    seedAgents([
      makeAgent({ name: 'math_specialist' }),
      makeAgent({ name: 'coordinator', role: 'coordinator' }),
    ])
  })

  it('resolves short alias "math" to "math_specialist"', async () => {
    const manager = new AIAgentManager()
    const agent = await manager.getAgent('math')
    expect(agent.name).toBe('math_specialist')
  })

  it('passes through canonical name unchanged', async () => {
    const manager = new AIAgentManager()
    const agent = await manager.getAgent('math_specialist')
    expect(agent.name).toBe('math_specialist')
  })

  it('throws for an unknown agent name', async () => {
    const manager = new AIAgentManager()
    await expect(manager.getAgent('nonexistent')).rejects.toThrow('Agent not found: nonexistent')
  })

  it('resolves all defined aliases', async () => {
    const allAgents = ['math', 'science', 'english', 'history', 'art'].map((short) =>
      makeAgent({ name: `${short}_specialist` })
    )
    seedAgents(allAgents)
    invalidateAgentCache()

    const manager = new AIAgentManager()
    for (const short of ['math', 'science', 'english', 'history', 'art']) {
      const agent = await manager.getAgent(short)
      expect(agent.name).toBe(`${short}_specialist`)
    }
  })
})

describe('AIAgentManager – SVG extraction via getAgentResponse', () => {
  beforeEach(() => {
    invalidateAgentCache()
    seedAgents([makeAgent()])
  })

  /** Helper: set up generateContent to return a specific JSON payload */
  function mockGeminiResponse(payload: Record<string, unknown>) {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(payload) })
  }

  it('returns SVG from the svg field directly', async () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
    mockGeminiResponse({
      audioText: 'Here is a circle.',
      displayText: 'Look at the circle.',
      svg,
      lessonComplete: false,
    })

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponse('math_specialist', 'show me', makeContext())
    expect(result.svg).toBe(svg)
    expect(result.audioText).toBe('Here is a circle.')
  })

  it('extracts SVG from [SVG]…[/SVG] markers in displayText when svg field is null', async () => {
    const svg = '<svg viewBox="0 0 100 100"><rect width="50" height="50"/></svg>'
    mockGeminiResponse({
      audioText: 'Look at the diagram.',
      displayText: `Some text [SVG] ${svg} [/SVG] more text`,
      svg: null,
      lessonComplete: false,
    })

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponse('math_specialist', 'show', makeContext())
    expect(result.svg).toBe(svg)
    expect(result.displayText).not.toContain('[SVG]')
    expect(result.displayText).not.toContain('</svg>')
  })

  it('does NOT extract raw <svg> from displayText without [SVG] wrapper (only audioText is cleaned)', async () => {
    // The extraction guard on displayText checks for '[SVG]' marker only.
    // Raw <svg> in displayText is intentionally left in place so the frontend
    // can render it inline.  Raw <svg> in *audioText* IS stripped (TTS guard).
    const svg = '<svg viewBox="0 0 50 50"><line x1="0" y1="0" x2="50" y2="50"/></svg>'
    mockGeminiResponse({
      audioText: `Listen to this ${svg} explanation.`,
      displayText: `Explanation: ${svg} end`,
      svg: null,
      lessonComplete: false,
    })

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponse('math_specialist', 'draw', makeContext())
    // svg field stays null – no [SVG] wrapper present in displayText
    expect(result.svg).toBeNull()
    // displayText keeps the raw SVG (no extraction without wrapper)
    expect(result.displayText).toContain('<svg')
    // audioText is cleaned – TTS must not read SVG code
    expect(result.audioText).not.toContain('<svg')
  })

  it('strips SVG markers from audioText so TTS does not read SVG code', async () => {
    const svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
    mockGeminiResponse({
      audioText: `Listen [SVG] ${svg} [/SVG] to this.`,
      displayText: 'Normal text.',
      svg: null,
      lessonComplete: false,
    })

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponse('math_specialist', 'hi', makeContext())
    expect(result.audioText).not.toContain('<svg')
    expect(result.audioText).not.toContain('[SVG]')
  })

  it('returns agentId from the agent record', async () => {
    mockGeminiResponse({
      audioText: 'Hi.',
      displayText: 'Hello.',
      svg: null,
      lessonComplete: false,
    })

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponse('math_specialist', 'hi', makeContext())
    expect(result.agentId).toBe('agent-id-1')
  })
})

describe('AIAgentManager – routeRequest JSON cleanup & fallback', () => {
  beforeEach(() => {
    invalidateAgentCache()
    seedAgents([
      makeAgent({ name: 'coordinator', role: 'coordinator' }),
      makeAgent({ name: 'math_specialist' }),
    ])
  })

  it('strips ```json … ``` markdown fences from coordinator response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '```json\n{"route_to":"math_specialist","reason":"math question"}\n```',
    })

    const manager = new AIAgentManager()
    const decision = await manager.routeRequest('What is 2+2?', makeContext())
    expect(decision.route_to).toBe('math_specialist')
    expect(decision.reason).toBe('math question')
  })

  it('strips bare ``` fences', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '```\n{"route_to":"science_specialist","reason":"science"}\n```',
    })

    const manager = new AIAgentManager()
    const decision = await manager.routeRequest('Tell me about atoms', makeContext())
    expect(decision.route_to).toBe('science_specialist')
  })

  it('falls back to regex extraction when JSON is unparseable', async () => {
    // Simulate a response that has valid key/value pairs but broken JSON structure
    mockGenerateContent.mockResolvedValue({
      text: 'Sure! I think "route_to": "history_specialist" and "reason": "history topic" would work',
    })

    const manager = new AIAgentManager()
    const decision = await manager.routeRequest('Tell me about Rome', makeContext())
    expect(decision.route_to).toBe('history_specialist')
    expect(decision.reason).toBe('history topic')
  })

  it('returns self-routing fallback when neither JSON nor regex works', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'completely garbled response !@#' })

    const manager = new AIAgentManager()
    const decision = await manager.routeRequest('???', makeContext())
    expect(decision.route_to).toBe('self')
    expect(decision.reason).toMatch(/[Rr]outing error/)
  })

  it('throws when coordinator returns empty text', async () => {
    // The routeRequest catches and returns self-fallback
    mockGenerateContent.mockResolvedValue({ text: '' })

    const manager = new AIAgentManager()
    const decision = await manager.routeRequest('hello', makeContext())
    expect(decision.route_to).toBe('self')
  })
})

describe('AIAgentManager – tryExtractFirstSentence via progressive streaming', () => {
  beforeEach(() => {
    invalidateAgentCache()
    seedAgents([makeAgent()])
  })

  /** Build an async iterable that yields JSON chunks one character at a time
   *  so the progressive extractor has a chance to fire mid-stream. */
  function* chunkify(json: string, size = 20) {
    for (let i = 0; i < json.length; i += size) {
      yield { text: json.slice(i, i + size) }
    }
  }

  it('extracts first sentence early and returns it plus remainder', async () => {
    const payload = JSON.stringify({
      audioText: 'Great question! Fractions are parts of a whole. Let me explain more.',
      displayText: '# Fractions',
      svg: null,
      lessonComplete: false,
    })

    mockGenerateContentStream.mockResolvedValue(chunkify(payload, 15))
    ;(generateSpeech as any).mockResolvedValue(Buffer.from('tts-audio'))

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponseProgressiveStreaming(
      'math_specialist',
      'What are fractions?',
      makeContext()
    )

    expect(result.firstSentence).toBe('Great question!')
    expect(result.remainingAudioText).toBe('Fractions are parts of a whole. Let me explain more.')
    expect(result.usedProgressiveExtraction).toBe(true)
    expect(result.firstSentenceAudio).toEqual(Buffer.from('tts-audio'))
  })

  it('falls back to post-stream extraction when audioText has no sentence boundary mid-stream', async () => {
    // Single short sentence – chunked so large that audioText arrives in one piece
    // after the loop, so tryExtractFirstSentence never fires during iteration
    const payload = JSON.stringify({
      audioText: 'Hello there',   // no period – post-stream fallback takes whole text
      displayText: 'Hi',
      svg: null,
      lessonComplete: false,
    })

    mockGenerateContentStream.mockResolvedValue(chunkify(payload, payload.length)) // one big chunk
    ;(generateSpeech as any).mockResolvedValue(Buffer.from('audio'))

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponseProgressiveStreaming(
      'math_specialist',
      'hi',
      makeContext()
    )

    // Post-stream fallback: no sentence-ending punctuation → whole text becomes firstSentence
    expect(result.firstSentence).toBe('Hello there')
    expect(result.remainingAudioText).toBeNull()
  })

  it('returns null firstSentenceAudio when TTS fails mid-stream', async () => {
    const payload = JSON.stringify({
      audioText: 'First sentence here. Second sentence here.',
      displayText: 'Text',
      svg: null,
      lessonComplete: false,
    })

    mockGenerateContentStream.mockResolvedValue(chunkify(payload, 10))
    ;(generateSpeech as any).mockRejectedValue(new Error('TTS service down'))

    const manager = new AIAgentManager()
    const result = await manager.getAgentResponseProgressiveStreaming(
      'math_specialist',
      'go',
      makeContext()
    )

    // The .catch in the source returns null as sentinel
    expect(result.firstSentenceAudio).toBeNull()
  })
})

describe('AIAgentManager – cache utilities', () => {
  beforeEach(() => {
    invalidateAgentCache()
  })

  it('getCacheStatus reports not cached initially', () => {
    const status = getCacheStatus()
    expect(status.cached).toBe(false)
    expect(status.agentCount).toBe(0)
    expect(status.ageMs).toBe(0)
  })

  it('getCacheStatus reports cached after loadAgents', async () => {
    seedAgents([makeAgent(), makeAgent({ name: 'coordinator' })])

    const manager = new AIAgentManager()
    await manager.loadAgents()

    const status = getCacheStatus()
    expect(status.cached).toBe(true)
    expect(status.agentCount).toBe(2)
    expect(status.ageMs).toBeLessThan(1000) // just populated
  })

  it('invalidateAgentCache clears the cache', async () => {
    seedAgents([makeAgent()])

    const manager = new AIAgentManager()
    await manager.loadAgents()
    expect(getCacheStatus().cached).toBe(true)

    invalidateAgentCache()
    expect(getCacheStatus().cached).toBe(false)
  })

  it('loadAgents hits DB again after cache is invalidated', async () => {
    seedAgents([makeAgent()])

    const manager = new AIAgentManager()
    await manager.loadAgents()

    // Track how many times supabase.from was called
    const callsBefore = (supabase.from as any).mock.calls.length

    invalidateAgentCache()
    await manager.loadAgents()

    expect((supabase.from as any).mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('loadAgents throws when DB returns no agents', async () => {
    ;(supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null })),
      })),
    })

    const manager = new AIAgentManager()
    await expect(manager.loadAgents()).rejects.toThrow('No active AI agents found')
  })

  it('loadAgents throws on DB error', async () => {
    ;(supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: { message: 'connection lost' } })),
      })),
    })

    const manager = new AIAgentManager()
    await expect(manager.loadAgents()).rejects.toThrow('Failed to load AI agents: connection lost')
  })
})

describe('AIAgentManager – constructor', () => {
  it('throws when GEMINI_API_KEY is missing', () => {
    const original = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    expect(() => new AIAgentManager()).toThrow('GEMINI_API_KEY environment variable is not set')

    process.env.GEMINI_API_KEY = original!
  })
})
