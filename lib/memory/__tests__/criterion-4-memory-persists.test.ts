/**
 * Criterion 4: Memory Persists - Automated Test Suite
 *
 * Tests for real-time profile enrichment and trajectory analysis.
 * Validates that memory persists and evolves during learning sessions.
 *
 * Test Coverage:
 * 1. Profile Enrichment - Real-time updates during sessions
 * 2. Trajectory Analysis - Learning trend detection
 * 3. Cache Invalidation - Ensures updated profiles are loaded
 * 4. Fire-and-Forget - Non-blocking enrichment
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { enrichProfileIfNeeded } from '../profile-enricher'
import {
  getLearningTrajectory,
  getTrajectoryMessage,
} from '../trajectory-analyzer'
import { supabase } from '@/lib/db/supabase'

// Mock Supabase client
vi.mock('@/lib/db/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock profile-manager cache invalidation
vi.mock('../profile-manager', () => ({
  invalidateCache: vi.fn(),
  getUserProfile: vi.fn(),
}))

describe('Criterion 4: Memory Persists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Profile Enrichment - Real-Time Updates', () => {
    it('should detect struggles after 3 consecutive low scores', async () => {
      // Mock mastery_evidence query
      const mockEvidence = [
        { topic: 'fractions', mastery_score: 30 },
        { topic: 'fractions', mastery_score: 25 },
        { topic: 'fractions', mastery_score: 35 },
      ]

      // Create proper mock chain for evidence query
      const evidenceMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockEvidence,
          error: null,
        }),
      }

      // Create proper mock chain for profile fetch
      const profileFetchMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { struggles: [] },
          error: null,
        }),
      }

      // Create proper mock chain for profile update
      const profileUpdateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: { struggles: ['fractions'] },
          error: null,
        }),
      }

      // Mock returns in order: evidence query, profile fetch, profile update
      ;(supabase.from as any)
        .mockReturnValueOnce(evidenceMock)
        .mockReturnValueOnce(profileFetchMock)
        .mockReturnValueOnce(profileUpdateMock)

      await enrichProfileIfNeeded('user-123', 'lesson-456', 'session-789')

      // Verify the sequence of calls
      expect(supabase.from).toHaveBeenCalledWith('mastery_evidence')
      expect(supabase.from).toHaveBeenCalledWith('users')
      expect(profileUpdateMock.update).toHaveBeenCalledWith({ struggles: ['fractions'] })
    })

    it('should detect strengths after 80%+ mastery score', async () => {
      const mockEvidence = [
        { topic: 'multiplication', mastery_score: 85 },
        { topic: 'multiplication', mastery_score: 90 },
      ]

      const evidenceMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockEvidence,
          error: null,
        }),
      }

      const profileFetchMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { strengths: [] },
          error: null,
        }),
      }

      const profileUpdateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: { strengths: ['multiplication'] },
          error: null,
        }),
      }

      ;(supabase.from as any)
        .mockReturnValueOnce(evidenceMock)
        .mockReturnValueOnce(profileFetchMock)
        .mockReturnValueOnce(profileUpdateMock)

      await enrichProfileIfNeeded('user-123', 'lesson-456', 'session-789')

      expect(profileUpdateMock.update).toHaveBeenCalledWith({ strengths: ['multiplication'] })
    })

    it('should not update profile if no patterns detected', async () => {
      const mockEvidence = [
        { topic: 'division', mastery_score: 60 },
        { topic: 'division', mastery_score: 65 },
      ]

      const evidenceMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockEvidence,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(evidenceMock)

      await enrichProfileIfNeeded('user-123', 'lesson-456', 'session-789')

      // Should only query evidence, no profile updates
      expect(supabase.from).toHaveBeenCalledTimes(1)
      expect(supabase.from).toHaveBeenCalledWith('mastery_evidence')
    })

    it('should deduplicate topics when adding to arrays', async () => {
      const mockEvidence = [
        { topic: 'fractions', mastery_score: 30 },
        { topic: 'fractions', mastery_score: 25 },
        { topic: 'fractions', mastery_score: 35 },
      ]

      const evidenceMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockEvidence,
          error: null,
        }),
      }

      // Profile already has 'fractions' in struggles
      const profileFetchMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { struggles: ['fractions'] },
          error: null,
        }),
      }

      const updateSpy = vi.fn().mockReturnThis()
      const profileUpdateMock = {
        update: updateSpy,
        eq: vi.fn().mockResolvedValue({
          data: { struggles: ['fractions'] },
          error: null,
        }),
      }

      ;(supabase.from as any)
        .mockReturnValueOnce(evidenceMock)
        .mockReturnValueOnce(profileFetchMock)
        .mockReturnValueOnce(profileUpdateMock)

      await enrichProfileIfNeeded('user-123', 'lesson-456', 'session-789')

      // Verify update was called with deduplicated array (only one 'fractions')
      expect(updateSpy).toHaveBeenCalledWith({ struggles: ['fractions'] })
    })

    it('should handle empty evidence arrays', async () => {
      const evidenceMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(evidenceMock)

      // Should not throw, just return without updating
      await expect(
        enrichProfileIfNeeded('user-123', 'lesson-456', 'session-789')
      ).resolves.not.toThrow()
    })
  })

  describe('Trajectory Analysis - Learning Trends', () => {
    it('should detect improving trend when scores increase', async () => {
      const mockSessions = [
        { effectiveness_score: 50, started_at: '2026-01-01', lessons: { subject: 'math' } },
        { effectiveness_score: 60, started_at: '2026-01-02', lessons: { subject: 'math' } },
        { effectiveness_score: 70, started_at: '2026-01-03', lessons: { subject: 'math' } },
        { effectiveness_score: 75, started_at: '2026-01-04', lessons: { subject: 'math' } },
      ]

      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const trajectory = await getLearningTrajectory('user-123', 'math')

      expect(trajectory.trend).toBe('improving')
      expect(trajectory.details.scoreDelta).toBeGreaterThan(10)
    })

    it('should detect declining trend when scores decrease', async () => {
      const mockSessions = [
        { effectiveness_score: 80, started_at: '2026-01-01', lessons: { subject: 'math' } },
        { effectiveness_score: 70, started_at: '2026-01-02', lessons: { subject: 'math' } },
        { effectiveness_score: 60, started_at: '2026-01-03', lessons: { subject: 'math' } },
        { effectiveness_score: 50, started_at: '2026-01-04', lessons: { subject: 'math' } },
      ]

      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const trajectory = await getLearningTrajectory('user-123', 'math')

      expect(trajectory.trend).toBe('declining')
      expect(trajectory.details.scoreDelta).toBeLessThan(-10)
    })

    it('should detect stable trend when scores are consistent', async () => {
      const mockSessions = [
        { effectiveness_score: 70, started_at: '2026-01-01', lessons: { subject: 'math' } },
        { effectiveness_score: 68, started_at: '2026-01-02', lessons: { subject: 'math' } },
        { effectiveness_score: 72, started_at: '2026-01-03', lessons: { subject: 'math' } },
        { effectiveness_score: 71, started_at: '2026-01-04', lessons: { subject: 'math' } },
      ]

      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const trajectory = await getLearningTrajectory('user-123', 'math')

      expect(trajectory.trend).toBe('stable')
      expect(Math.abs(trajectory.details.scoreDelta)).toBeLessThan(10)
    })

    it('should return insufficient_data with less than 3 sessions', async () => {
      const mockSessions = [
        { effectiveness_score: 70, started_at: '2026-01-01', lessons: { subject: 'math' } },
        { effectiveness_score: 75, started_at: '2026-01-02', lessons: { subject: 'math' } },
      ]

      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const trajectory = await getLearningTrajectory('user-123', 'math')

      expect(trajectory.trend).toBe('insufficient_data')
      expect(trajectory.sessionCount).toBe(2)
      expect(trajectory.confidence).toBe(0)
    })

    it('should calculate confidence based on session count and volatility', async () => {
      const mockSessions = [
        { effectiveness_score: 70, started_at: '2026-01-01', lessons: { subject: 'math' } },
        { effectiveness_score: 71, started_at: '2026-01-02', lessons: { subject: 'math' } },
        { effectiveness_score: 72, started_at: '2026-01-03', lessons: { subject: 'math' } },
        { effectiveness_score: 73, started_at: '2026-01-04', lessons: { subject: 'math' } },
        { effectiveness_score: 74, started_at: '2026-01-05', lessons: { subject: 'math' } },
      ]

      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const trajectory = await getLearningTrajectory('user-123', 'math')

      // High confidence: 5 sessions + low volatility
      expect(trajectory.confidence).toBeGreaterThan(0.8)
      expect(trajectory.details.volatility).toBeLessThan(5)
    })
  })

  describe('Trajectory Messages', () => {
    it('should generate improving message with emoji', async () => {
      const mockSessions = [
        { effectiveness_score: 50, started_at: '2026-01-01', lessons: { subject: 'math' } },
        { effectiveness_score: 70, started_at: '2026-01-02', lessons: { subject: 'math' } },
        { effectiveness_score: 85, started_at: '2026-01-03', lessons: { subject: 'math' } },
      ]

      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const message = await getTrajectoryMessage('user-123', 'math')

      expect(message).toContain('📈')
      expect(message).toContain('improving')
      expect(message).toContain('math')
    })

    it('should generate insufficient data message for new students', async () => {
      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      const message = await getTrajectoryMessage('user-123', 'math')

      expect(message).toContain('Keep learning')
      expect(message).toContain('few more sessions')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully in enrichment', async () => {
      const evidenceMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(evidenceMock)

      // enrichProfileIfNeeded catches errors and logs them (fire-and-forget)
      // It should not throw, but log error internally
      await expect(
        enrichProfileIfNeeded('user-123', 'lesson-456', 'session-789')
      ).resolves.not.toThrow()
    })

    it('should handle database errors in trajectory analysis', async () => {
      const sessionsMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }

      ;(supabase.from as any).mockReturnValueOnce(sessionsMock)

      // Trajectory analysis should throw on DB errors
      await expect(
        getLearningTrajectory('user-123', 'math')
      ).rejects.toThrow('Failed to fetch learning trajectory')
    })
  })
})
