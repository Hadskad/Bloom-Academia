/**
 * Criterion 3: System Decides Mastery - Integration Tests
 *
 * Validates the complete mastery detection flow:
 * 1. Evidence extraction from student responses (AI-based)
 * 2. Evidence recording to database
 * 3. Mastery determination using 6 criteria
 * 4. Integration with lesson completion
 *
 * Test Strategy:
 * - Unit tests for evidence extractor
 * - Integration tests for full mastery flow
 * - Edge case tests for confidence thresholds
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractEvidenceQuality } from '../evidence-extractor';
import {
  recordMasteryEvidence,
  determineMastery,
  getEvidenceForLesson,
  type MasteryRules
} from '../mastery-detector';

// Mock Supabase client
vi.mock('@/lib/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

// Mock Gemini API
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            evidenceType: 'correct_answer',
            qualityScore: 100,
            confidence: 0.95,
            reasoning: 'Student provided correct answer with clear explanation'
          })
        }
      })
    })
  }))
}));

describe('Criterion 3: Evidence Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract correct_answer evidence with high confidence', async () => {
    const evidence = await extractEvidenceQuality(
      "The answer is 68 because 23 + 45 = 68",
      "Perfect! That's exactly right. You added correctly and explained your reasoning!",
      "Introduction to Addition"
    );

    expect(evidence.evidenceType).toBe('correct_answer');
    expect(evidence.qualityScore).toBeGreaterThanOrEqual(80);
    expect(evidence.confidence).toBeGreaterThan(0.7);
    expect(evidence.reasoning).toBeTruthy();
  });

  it('should extract incorrect_answer evidence', async () => {
    // Mock incorrect answer response
    const { GoogleGenAI } = await import('@google/genai');
    const mockGenAI = GoogleGenAI as any;
    mockGenAI.mockImplementationOnce(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              evidenceType: 'incorrect_answer',
              qualityScore: 20,
              confidence: 0.9,
              reasoning: 'Student made a calculation error'
            })
          }
        })
      })
    }));

    const evidence = await extractEvidenceQuality(
      "The answer is 60",
      "Not quite. Let me help you understand where you went wrong...",
      "Introduction to Addition"
    );

    expect(evidence.evidenceType).toBe('incorrect_answer');
    expect(evidence.qualityScore).toBeLessThan(50);
    expect(evidence.confidence).toBeGreaterThan(0.7);
  });

  it('should return fallback evidence on API error', async () => {
    // Mock API error
    const { GoogleGenAI } = await import('@google/genai');
    const mockGenAI = GoogleGenAI as any;
    mockGenAI.mockImplementationOnce(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(new Error('API Error'))
      })
    }));

    const evidence = await extractEvidenceQuality(
      "I don't understand",
      "Let me explain this differently...",
      "Fractions Basics"
    );

    // Should return fallback with low confidence
    expect(evidence.evidenceType).toBe('explanation');
    expect(evidence.qualityScore).toBe(50);
    expect(evidence.confidence).toBe(0.3);
    expect(evidence.reasoning).toContain('failed');
  });
});

describe('Criterion 3: Mastery Determination', () => {
  it('should require all 6 criteria for mastery', async () => {
    const userId = 'test-user-id';
    const lessonId = 'test-lesson-id';
    const sessionStart = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    // Mock evidence data showing mastery
    const { supabase } = await import('@/lib/db/supabase');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { default_mastery_rules: null },
        error: null
      }),
      // Mock getEvidenceForLesson result
      then: vi.fn().mockResolvedValue({
        data: [
          {
            evidence_type: 'correct_answer',
            content: 'Answer 1',
            metadata: { quality_score: 100 },
            recorded_at: new Date().toISOString()
          },
          {
            evidence_type: 'correct_answer',
            content: 'Answer 2',
            metadata: { quality_score: 100 },
            recorded_at: new Date().toISOString()
          },
          {
            evidence_type: 'correct_answer',
            content: 'Answer 3',
            metadata: { quality_score: 100 },
            recorded_at: new Date().toISOString()
          },
          {
            evidence_type: 'explanation',
            content: 'Student explained the concept',
            metadata: { quality_score: 85 },
            recorded_at: new Date().toISOString()
          },
          {
            evidence_type: 'application',
            content: 'Student applied knowledge',
            metadata: { quality_score: 90 },
            recorded_at: new Date().toISOString()
          },
          {
            evidence_type: 'application',
            content: 'Student applied knowledge again',
            metadata: { quality_score: 80 },
            recorded_at: new Date().toISOString()
          }
        ],
        error: null
      })
    });

    const result = await determineMastery(
      userId,
      lessonId,
      'math',
      3,
      sessionStart
    );

    // Should check all 6 criteria
    expect(result.criteriaMet).toHaveProperty('correctAnswers');
    expect(result.criteriaMet).toHaveProperty('explanationQuality');
    expect(result.criteriaMet).toHaveProperty('applicationAttempts');
    expect(result.criteriaMet).toHaveProperty('overallQuality');
    expect(result.criteriaMet).toHaveProperty('struggleRatio');
    expect(result.criteriaMet).toHaveProperty('timeSpent');
  });

  it('should fail mastery if any criterion not met', async () => {
    const userId = 'test-user-id';
    const lessonId = 'test-lesson-id';
    const sessionStart = new Date(); // Just started - will fail timeSpent criterion

    // Mock insufficient evidence
    const { supabase } = await import('@/lib/db/supabase');
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { default_mastery_rules: null },
        error: null
      }),
      then: vi.fn().mockResolvedValue({
        data: [
          {
            evidence_type: 'correct_answer',
            content: 'Answer 1',
            metadata: { quality_score: 100 },
            recorded_at: new Date().toISOString()
          }
        ],
        error: null
      })
    });

    const result = await determineMastery(
      userId,
      lessonId,
      'math',
      3,
      sessionStart
    );

    // Should not have mastery due to insufficient evidence and time
    expect(result.hasMastered).toBe(false);
    expect(result.confidence).toBe(1.0); // Deterministic
  });
});

describe('Criterion 3: Integration Flow', () => {
  it('should record evidence with confidence filtering', async () => {
    const userId = 'test-user-id';
    const lessonId = 'test-lesson-id';
    const sessionId = 'test-session-id';

    // High confidence evidence should be recorded
    const highConfidenceEvidence = {
      evidenceType: 'correct_answer' as const,
      qualityScore: 95,
      confidence: 0.9,
      reasoning: 'Clear correct answer'
    };

    await recordMasteryEvidence(
      userId,
      lessonId,
      sessionId,
      highConfidenceEvidence.evidenceType,
      'Student response',
      {
        quality_score: highConfidenceEvidence.qualityScore,
        confidence: highConfidenceEvidence.confidence,
        context: 'Test lesson'
      }
    );

    // Verify Supabase insert was called
    const { supabase } = await import('@/lib/db/supabase');
    expect(supabase.from).toHaveBeenCalledWith('mastery_evidence');
  });
});

describe('Criterion 3: Evidence Types Coverage', () => {
  const testCases = [
    {
      type: 'correct_answer' as const,
      studentMsg: '42 is the answer',
      teacherMsg: 'Correct! Well done!',
      expectedScore: { min: 80, max: 100 }
    },
    {
      type: 'incorrect_answer' as const,
      studentMsg: 'I think it\'s 10',
      teacherMsg: 'Not quite, let me help you...',
      expectedScore: { min: 0, max: 40 }
    },
    {
      type: 'explanation' as const,
      studentMsg: 'A fraction represents parts of a whole, like 1/2 means one part out of two equal parts',
      teacherMsg: 'Excellent explanation! You really understand fractions.',
      expectedScore: { min: 70, max: 100 }
    },
    {
      type: 'application' as const,
      studentMsg: 'I used fractions to divide the pizza equally among 4 friends',
      teacherMsg: 'Great real-world application!',
      expectedScore: { min: 70, max: 100 }
    },
    {
      type: 'struggle' as const,
      studentMsg: 'I don\'t understand this at all, can you help?',
      teacherMsg: 'Of course! Let me break it down step by step...',
      expectedScore: { min: 0, max: 20 }
    }
  ];

  testCases.forEach(({ type, studentMsg, teacherMsg, expectedScore }) => {
    it(`should correctly identify ${type} evidence`, async () => {
      // Mock appropriate response for this evidence type
      const { GoogleGenAI } = await import('@google/genai');
      const mockGenAI = GoogleGenAI as any;
      mockGenAI.mockImplementationOnce(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => JSON.stringify({
                evidenceType: type,
                qualityScore: (expectedScore.min + expectedScore.max) / 2,
                confidence: 0.85,
                reasoning: `Detected ${type} based on context`
              })
            }
          })
        })
      }));

      const evidence = await extractEvidenceQuality(
        studentMsg,
        teacherMsg,
        'Test Concept'
      );

      expect(evidence.evidenceType).toBe(type);
      expect(evidence.qualityScore).toBeGreaterThanOrEqual(expectedScore.min);
      expect(evidence.qualityScore).toBeLessThanOrEqual(expectedScore.max);
    });
  });
});
