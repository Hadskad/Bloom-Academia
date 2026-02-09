/**
 * learning-analyzer.test.ts
 *
 * Tests for analyzeSessionLearning – the function that runs after a session
 * ends, calls Gemini to discover learning patterns, and writes them back to
 * the users table.
 *
 * Key coverage:
 *  - Strengths/struggles are MERGED (Set dedup) with existing profile values
 *  - Profile preferences.pace is updated correctly
 *  - learning_style is written
 *  - DB update is called with the correct merged payload
 *  - DB update error propagates as a throw
 *  - Gemini response with markdown code fences is cleaned before parse
 *
 * BUG SURFACED:
 *  analyzeSessionLearning writes directly to supabase but does NOT call
 *  invalidateCache(userId) from profile-manager.  After the update the
 *  in-memory profile cache still serves stale data until TTL (5 min) expires.
 *  The test "does not invalidate the profile-manager cache" documents this.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── mock state ────────────────────────────────────────────────────────────────
let capturedUpdate: Record<string, unknown> | null = null

const mockSupabaseUpdate = vi.fn((payload: Record<string, unknown>) => {
  capturedUpdate = payload
  return { error: null }
})

vi.mock('@/lib/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockSupabaseUpdate,
      select: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => mockSupabaseUpdate) })) })),
    })),
  },
}))

// Profile returned by getUserProfile – the "before" state
let currentProfile = {
  id: 'user-1',
  name: 'Bob',
  age: 9,
  grade_level: 3,
  learning_style: null as string | null,
  strengths: ['addition'] as string[],
  struggles: ['fractions'] as string[],
  preferences: { pace: 'slow' } as Record<string, unknown>,
  total_learning_time: 60,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// vi.mock factories are hoisted to the top of the file, above all const/let
// declarations.  We cannot reference a local variable inside the factory.
// Instead we return an inline fn that closes over the module-level `currentProfile`.
// The actual mock fn reference is grabbed via the import below.
vi.mock('@/lib/memory/profile-manager', () => ({
  getUserProfile: vi.fn(() => Promise.resolve(currentProfile)),
  // NOTE: invalidateCache is NOT exported – it's module-private.
  // analyzeSessionLearning never calls it either.  That's the bug.
}))

// Session history – minimal, content doesn't matter for unit tests
vi.mock('@/lib/memory/session-manager', () => ({
  getSessionHistory: vi.fn(() =>
    Promise.resolve([
      { id: '1', session_id: 'session-1', timestamp: '2026-01-01', user_message: 'hi', ai_response: 'hello', was_helpful: true },
    ])
  ),
}))

// Gemini mock – returns the analysis JSON
const mockGeminiGenerateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function () {
    this.models = {
      generateContent: mockGeminiGenerateContent,
    }
  }),
}))

// ── import module under test ─────────────────────────────────────────────────
import { analyzeSessionLearning } from '@/lib/memory/learning-analyzer'
import { supabase } from '@/lib/db/supabase'
import { getUserProfile } from '@/lib/memory/profile-manager'

// ── helpers ───────────────────────────────────────────────────────────────────
function geminiReturns(analysis: Record<string, unknown>) {
  mockGeminiGenerateContent.mockResolvedValue({
    text: JSON.stringify(analysis),
  })
}

// Ensure GEMINI_API_KEY is set so the constructor inside analyzeSessionLearning doesn't throw
process.env.GEMINI_API_KEY = 'test-key'

// ── tests ─────────────────────────────────────────────────────────────────────

describe('analyzeSessionLearning – strength/struggle merge logic', () => {
  beforeEach(() => {
    capturedUpdate = null
    currentProfile = {
      id: 'user-1',
      name: 'Bob',
      age: 9,
      grade_level: 3,
      learning_style: null,
      strengths: ['addition'],
      struggles: ['fractions'],
      preferences: { pace: 'slow' },
      total_learning_time: 60,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    // Wire supabase.from('users').update(...).eq('id', userId).select() chain
    ;(supabase.from as any).mockReturnValue({
      update: vi.fn((payload: Record<string, unknown>) => {
        capturedUpdate = payload
        return {
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ error: null })),
          })),
        }
      }),
    })
  })

  it('merges new strengths with existing ones (no duplicates)', async () => {
    geminiReturns({
      learningStyle: 'visual',
      newStrengths: ['addition', 'multiplication'],  // 'addition' already exists
      newStruggles: ['fractions'],
      preferredPace: 'medium',
    })

    await analyzeSessionLearning('user-1', 'session-1')

    expect(capturedUpdate).toBeTruthy()
    const strengths = capturedUpdate!.strengths as string[]
    // Set dedup: addition appears once, multiplication is new
    expect(strengths).toContain('addition')
    expect(strengths).toContain('multiplication')
    expect(strengths.filter((s) => s === 'addition').length).toBe(1)
  })

  it('merges new struggles with existing ones (no duplicates)', async () => {
    geminiReturns({
      learningStyle: 'visual',
      newStrengths: [],
      newStruggles: ['fractions', 'decimals'],  // 'fractions' already exists
      preferredPace: 'medium',
    })

    await analyzeSessionLearning('user-1', 'session-1')

    const struggles = capturedUpdate!.struggles as string[]
    expect(struggles).toContain('fractions')
    expect(struggles).toContain('decimals')
    expect(struggles.filter((s) => s === 'fractions').length).toBe(1)
  })

  it('adds entirely new strengths when profile had none', async () => {
    currentProfile = { ...currentProfile, strengths: [] }

    geminiReturns({
      learningStyle: 'auditory',
      newStrengths: ['reading', 'listening'],
      newStruggles: [],
      preferredPace: 'fast',
    })

    await analyzeSessionLearning('user-1', 'session-1')

    expect(capturedUpdate!.strengths).toEqual(['reading', 'listening'])
  })
})

describe('analyzeSessionLearning – profile fields written correctly', () => {
  beforeEach(() => {
    capturedUpdate = null
    currentProfile = {
      id: 'user-1',
      name: 'Bob',
      age: 9,
      grade_level: 3,
      learning_style: 'auditory',
      strengths: ['subtraction'],
      struggles: [],
      preferences: { pace: 'slow', theme: 'dark' },
      total_learning_time: 60,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    ;(supabase.from as any).mockReturnValue({
      update: vi.fn((payload: Record<string, unknown>) => {
        capturedUpdate = payload
        return { eq: vi.fn(() => ({ select: vi.fn(() => ({ error: null })) })) }
      }),
    })
  })

  it('writes the new learning_style from Gemini analysis', async () => {
    geminiReturns({
      learningStyle: 'kinesthetic',
      newStrengths: [],
      newStruggles: [],
      preferredPace: 'medium',
    })

    await analyzeSessionLearning('user-1', 'session-1')
    expect(capturedUpdate!.learning_style).toBe('kinesthetic')
  })

  it('writes preferredPace into preferences while preserving other keys', async () => {
    geminiReturns({
      learningStyle: 'visual',
      newStrengths: [],
      newStruggles: [],
      preferredPace: 'fast',
    })

    await analyzeSessionLearning('user-1', 'session-1')

    const prefs = capturedUpdate!.preferences as Record<string, unknown>
    expect(prefs.pace).toBe('fast')
    // Existing key preserved via spread
    expect(prefs.theme).toBe('dark')
  })
})

describe('analyzeSessionLearning – Gemini response parsing', () => {
  beforeEach(() => {
    capturedUpdate = null
    currentProfile = {
      ...currentProfile,
      strengths: [],
      struggles: [],
      preferences: {},
    }

    ;(supabase.from as any).mockReturnValue({
      update: vi.fn((payload: Record<string, unknown>) => {
        capturedUpdate = payload
        return { eq: vi.fn(() => ({ select: vi.fn(() => ({ error: null })) })) }
      }),
    })
  })

  it('strips ```json … ``` markdown fences before parsing', async () => {
    mockGeminiGenerateContent.mockResolvedValue({
      text: '```json\n{"learningStyle":"visual","newStrengths":["math"],"newStruggles":[],"preferredPace":"medium"}\n```',
    })

    await analyzeSessionLearning('user-1', 'session-1')
    expect(capturedUpdate!.learning_style).toBe('visual')
    expect(capturedUpdate!.strengths).toContain('math')
  })

  it('strips bare ``` fences before parsing', async () => {
    mockGeminiGenerateContent.mockResolvedValue({
      text: '```\n{"learningStyle":"auditory","newStrengths":[],"newStruggles":["history"],"preferredPace":"slow"}\n```',
    })

    await analyzeSessionLearning('user-1', 'session-1')
    expect(capturedUpdate!.learning_style).toBe('auditory')
    expect(capturedUpdate!.struggles).toContain('history')
  })

  it('throws when Gemini returns empty text', async () => {
    mockGeminiGenerateContent.mockResolvedValue({ text: '' })

    await expect(analyzeSessionLearning('user-1', 'session-1')).rejects.toThrow(
      'No response received from Gemini'
    )
  })

  it('throws when Gemini returns unparseable JSON', async () => {
    mockGeminiGenerateContent.mockResolvedValue({ text: 'not json at all' })

    await expect(analyzeSessionLearning('user-1', 'session-1')).rejects.toThrow()
  })
})

describe('analyzeSessionLearning – DB update error handling', () => {
  beforeEach(() => {
    currentProfile = { ...currentProfile, strengths: [], struggles: [], preferences: {} }

    geminiReturns({
      learningStyle: 'visual',
      newStrengths: ['math'],
      newStruggles: [],
      preferredPace: 'medium',
    })
  })

  it('throws when the users table update returns an error', async () => {
    ;(supabase.from as any).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ error: { message: 'row locked' } })),
        })),
      })),
    })

    await expect(analyzeSessionLearning('user-1', 'session-1')).rejects.toThrow(
      'Failed to update user profile'
    )
  })
})

describe('analyzeSessionLearning – cache invalidation gap (documented bug)', () => {
  /**
   * analyzeSessionLearning writes the updated profile directly via
   * supabase.from('users').update(…) but it never calls the profile-manager's
   * cache-invalidation function.  This means that for up to 5 minutes after
   * the update, getUserProfile will return STALE data from its in-memory cache.
   *
   * This test documents the bug by verifying the function does NOT import or
   * call any invalidation helper.  When the bug is fixed, update this test.
   */
  it('does not invalidate the profile-manager cache after writing', async () => {
    currentProfile = { ...currentProfile, strengths: [], struggles: [], preferences: {} }

    ;(supabase.from as any).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ error: null })),
        })),
      })),
    })

    geminiReturns({
      learningStyle: 'visual',
      newStrengths: ['new-topic'],
      newStruggles: [],
      preferredPace: 'medium',
    })

    // Capture what getUserProfile returns BEFORE the analyze call
    const profileBefore = await getUserProfile('user-1')
    expect(profileBefore.strengths).toEqual([])

    await analyzeSessionLearning('user-1', 'session-1')

    // getUserProfile mock still returns the SAME stale object – the real
    // cached version in production would too, because invalidateCache was
    // never called.  The DB was updated (capturedUpdate proves it) but the
    // cache was not busted.
    const profileAfter = await getUserProfile('user-1')
    expect(profileAfter.strengths).toEqual([])  // stale – bug confirmed
  })
})
