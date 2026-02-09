/**
 * Unit Tests for Diagnostic Analyzer
 *
 * Purpose: Verify diagnostic analysis correctly identifies concept gaps
 *          and generates appropriate remediation recommendations
 *
 * Test Coverage:
 * - Concept gap detection and grouping
 * - Severity classification (critical/moderate/minor)
 * - Failure rate calculations
 * - Recommended action generation
 * - Edge cases (no tags, all pass, etc.)
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Diagnostic Analyzer Testing
 * Vitest Documentation: https://vitest.dev/api/
 */

import { describe, it, expect } from 'vitest';
import {
  diagnoseConceptGaps,
  humanizeConceptName,
  filterBySeverity,
  getSummary,
  type QuestionWithConcepts,
  type PerQuestionResult,
  type ConceptMetadata
} from '../diagnostic-analyzer';

// =====================================================
// TEST DATA SETUP
// =====================================================

const mockQuestions: QuestionWithConcepts[] = [
  // Numerator/Denominator Questions
  { id: 'q1', text: 'What is a numerator?', concepts: ['numerator_denominator'] },
  { id: 'q2', text: 'What is a denominator?', concepts: ['numerator_denominator'] },
  { id: 'q5', text: 'How many parts?', concepts: ['numerator_denominator'] },
  { id: 'q8', text: 'Parts in whole?', concepts: ['numerator_denominator'] },

  // Fraction Visualization Questions
  { id: 'q3', text: 'Shade 3/4', concepts: ['fraction_visualization'] },
  { id: 'q6', text: 'Shade 2/5', concepts: ['fraction_visualization'] },
  { id: 'q9', text: 'Which is shaded?', concepts: ['fraction_visualization'] },

  // Fraction Comparison Questions
  { id: 'q7', text: 'Which is larger?', concepts: ['fraction_comparison'] },
  { id: 'q10', text: 'Compare fractions', concepts: ['fraction_comparison'] },

  // Whole Fractions Questions
  { id: 'q4', text: 'What is 2/2?', concepts: ['whole_fractions'] },
  { id: 'q11', text: 'Equal parts?', concepts: ['whole_fractions'] },
  { id: 'q12', text: 'One whole?', concepts: ['whole_fractions'] }
];

const mockConceptMetadata: ConceptMetadata[] = [
  {
    concept: 'numerator_denominator',
    display_name: 'Numerator & Denominator',
    description: 'Understanding top and bottom numbers',
    questions: ['q1', 'q2', 'q5', 'q8']
  },
  {
    concept: 'fraction_visualization',
    display_name: 'Visual Representation',
    description: 'Understanding fractions through diagrams',
    questions: ['q3', 'q6', 'q9']
  },
  {
    concept: 'fraction_comparison',
    display_name: 'Comparing Fractions',
    description: 'Determining which fraction is larger',
    questions: ['q7', 'q10']
  },
  {
    concept: 'whole_fractions',
    display_name: 'Understanding Wholes',
    description: 'Recognizing complete wholes',
    questions: ['q4', 'q11', 'q12']
  }
];

function createResult(questionId: string, isCorrect: boolean): PerQuestionResult {
  return {
    questionId,
    isCorrect,
    partialCredit: isCorrect ? 1 : 0,
    pointsEarned: isCorrect ? 8.33 : 0,
    pointsPossible: 8.33,
    feedback: isCorrect ? 'Correct!' : 'Not quite',
    correctAnswerHint: isCorrect ? null : 'Try again'
  };
}

// =====================================================
// TEST SUITE: CRITICAL SEVERITY (≥75% failure rate)
// =====================================================

describe('diagnoseConceptGaps - Critical Severity', () => {
  it('should identify critical gap when student fails 4/4 questions (100% failure)', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false),  // numerator_denominator - FAIL
      createResult('q2', false),  // numerator_denominator - FAIL
      createResult('q5', false),  // numerator_denominator - FAIL
      createResult('q8', false),  // numerator_denominator - FAIL
      createResult('q3', true),   // fraction_visualization - PASS
      createResult('q6', true),   // fraction_visualization - PASS
      createResult('q9', true),   // fraction_visualization - PASS
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.remediationNeeded).toBe(true);
    expect(diagnosis.failedConcepts).toHaveLength(1);

    const criticalConcept = diagnosis.failedConcepts[0];
    expect(criticalConcept.concept).toBe('numerator_denominator');
    expect(criticalConcept.severity).toBe('critical');
    expect(criticalConcept.failureRate).toBe(1.0);  // 100%
    expect(criticalConcept.questionsFailedCount).toBe(4);
    expect(criticalConcept.totalQuestionsForConcept).toBe(4);
    expect(criticalConcept.displayName).toBe('Numerator & Denominator');
  });

  it('should identify critical gap at exactly 75% failure rate threshold', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false),  // numerator_denominator - FAIL
      createResult('q2', false),  // numerator_denominator - FAIL
      createResult('q5', false),  // numerator_denominator - FAIL
      createResult('q8', true),   // numerator_denominator - PASS (75% failure)
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.failedConcepts[0].severity).toBe('critical');
    expect(diagnosis.failedConcepts[0].failureRate).toBe(0.75);
  });
});

// =====================================================
// TEST SUITE: MODERATE SEVERITY (50-74% failure rate)
// =====================================================

describe('diagnoseConceptGaps - Moderate Severity', () => {
  it('should identify moderate gap when student fails 2/3 questions (~67% failure)', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q3', false),  // fraction_visualization - FAIL
      createResult('q6', false),  // fraction_visualization - FAIL
      createResult('q9', true),   // fraction_visualization - PASS
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.failedConcepts[0].severity).toBe('moderate');
    expect(diagnosis.failedConcepts[0].failureRate).toBeCloseTo(0.667, 2);
    expect(diagnosis.failedConcepts[0].questionsFailedCount).toBe(2);
  });

  it('should identify moderate gap at exactly 50% failure rate threshold', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q7', false),   // fraction_comparison - FAIL
      createResult('q10', true),   // fraction_comparison - PASS (50% failure)
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.failedConcepts[0].severity).toBe('moderate');
    expect(diagnosis.failedConcepts[0].failureRate).toBe(0.5);
  });
});

// =====================================================
// TEST SUITE: MINOR SEVERITY (<50% failure rate)
// =====================================================

describe('diagnoseConceptGaps - Minor Severity', () => {
  it('should identify minor gap when student fails 1/4 questions (25% failure)', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false),  // numerator_denominator - FAIL
      createResult('q2', true),   // numerator_denominator - PASS
      createResult('q5', true),   // numerator_denominator - PASS
      createResult('q8', true),   // numerator_denominator - PASS
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.failedConcepts[0].severity).toBe('minor');
    expect(diagnosis.failedConcepts[0].failureRate).toBe(0.25);
  });

  it('should NOT include concepts with 0% failure (all correct)', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q3', true),   // fraction_visualization - PASS
      createResult('q6', true),   // fraction_visualization - PASS
      createResult('q9', true),   // fraction_visualization - PASS
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.remediationNeeded).toBe(false);
    expect(diagnosis.failedConcepts).toHaveLength(0);
  });
});

// =====================================================
// TEST SUITE: MULTIPLE CONCEPTS
// =====================================================

describe('diagnoseConceptGaps - Multiple Concepts', () => {
  it('should correctly identify and prioritize multiple failed concepts', () => {
    const gradingResults: PerQuestionResult[] = [
      // Critical: numerator_denominator (4/4 fail = 100%)
      createResult('q1', false),
      createResult('q2', false),
      createResult('q5', false),
      createResult('q8', false),

      // Moderate: fraction_visualization (2/3 fail = 67%)
      createResult('q3', false),
      createResult('q6', false),
      createResult('q9', true),

      // Minor: fraction_comparison (1/2 fail = 50%)
      createResult('q7', false),
      createResult('q10', true),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.failedConcepts).toHaveLength(3);

    // Should be sorted by severity (critical first)
    expect(diagnosis.failedConcepts[0].concept).toBe('numerator_denominator');
    expect(diagnosis.failedConcepts[0].severity).toBe('critical');

    expect(diagnosis.failedConcepts[1].concept).toBe('fraction_visualization');
    expect(diagnosis.failedConcepts[1].severity).toBe('moderate');

    expect(diagnosis.failedConcepts[2].concept).toBe('fraction_comparison');
    expect(diagnosis.failedConcepts[2].severity).toBe('moderate'); // 50% is moderate
  });

  it('should sort concepts by failure count when severity is equal', () => {
    const gradingResults: PerQuestionResult[] = [
      // Both critical, but numerator has more failures
      createResult('q1', false),  // numerator_denominator - 4 fails
      createResult('q2', false),
      createResult('q5', false),
      createResult('q8', false),

      createResult('q4', false),  // whole_fractions - 3 fails
      createResult('q11', false),
      createResult('q12', false),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    // Both are critical, but numerator should come first (4 fails > 3 fails)
    expect(diagnosis.failedConcepts[0].concept).toBe('numerator_denominator');
    expect(diagnosis.failedConcepts[0].questionsFailedCount).toBe(4);

    expect(diagnosis.failedConcepts[1].concept).toBe('whole_fractions');
    expect(diagnosis.failedConcepts[1].questionsFailedCount).toBe(3);
  });
});

// =====================================================
// TEST SUITE: RECOMMENDED ACTIONS
// =====================================================

describe('diagnoseConceptGaps - Recommended Actions', () => {
  it('should generate actionable recommendations for failed concepts', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false),
      createResult('q2', false),
      createResult('q5', false),
      createResult('q8', false),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.recommendedActions.length).toBeGreaterThan(0);
    expect(diagnosis.recommendedActions[0]).toContain('Numerator & Denominator');
    expect(diagnosis.recommendedActions[0]).toContain('4/4'); // Shows failure count
  });

  it('should limit recommendations to top 3 concepts', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false), createResult('q2', false), createResult('q5', false), createResult('q8', false),
      createResult('q3', false), createResult('q6', false), createResult('q9', false),
      createResult('q7', false), createResult('q10', false),
      createResult('q4', false), createResult('q11', false), createResult('q12', false),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    // Should show top 3 + "plus N more" message
    const conceptActions = diagnosis.recommendedActions.filter(a => a.includes('questions need review'));
    expect(conceptActions.length).toBeLessThanOrEqual(3);

    // Should have a message about additional concepts
    const moreMessage = diagnosis.recommendedActions.find(a => a.includes('more concepts'));
    expect(moreMessage).toBeDefined();
  });
});

// =====================================================
// TEST SUITE: EDGE CASES
// =====================================================

describe('diagnoseConceptGaps - Edge Cases', () => {
  it('should handle questions without concept tags gracefully', () => {
    const questionsWithoutTags: QuestionWithConcepts[] = [
      { id: 'q1', text: 'Question 1' },  // No concepts array
      { id: 'q2', text: 'Question 2', concepts: [] },  // Empty concepts array
    ];

    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false),
      createResult('q2', false),
    ];

    const diagnosis = diagnoseConceptGaps(questionsWithoutTags, gradingResults);

    // Should not crash, should return no failed concepts
    expect(diagnosis.failedConcepts).toHaveLength(0);
    expect(diagnosis.remediationNeeded).toBe(false);
  });

  it('should handle empty grading results', () => {
    const diagnosis = diagnoseConceptGaps(mockQuestions, []);

    expect(diagnosis.failedConcepts).toHaveLength(0);
    expect(diagnosis.remediationNeeded).toBe(false);
    expect(diagnosis.totalQuestionsAnalyzed).toBe(0);
    expect(diagnosis.totalQuestionsFailed).toBe(0);
  });

  it('should handle all questions passed (no failures)', () => {
    const gradingResults: PerQuestionResult[] = mockQuestions.map(q =>
      createResult(q.id, true)
    );

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);

    expect(diagnosis.remediationNeeded).toBe(false);
    expect(diagnosis.failedConcepts).toHaveLength(0);
  });

  it('should use humanized names when metadata not provided', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false),
      createResult('q2', false),
    ];

    // Call without metadata
    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults);

    expect(diagnosis.failedConcepts[0].displayName).toBe('Numerator Denominator');
  });
});

// =====================================================
// TEST SUITE: UTILITY FUNCTIONS
// =====================================================

describe('humanizeConceptName', () => {
  it('should convert snake_case to Title Case', () => {
    expect(humanizeConceptName('numerator_denominator')).toBe('Numerator Denominator');
    expect(humanizeConceptName('fraction_visualization')).toBe('Fraction Visualization');
    expect(humanizeConceptName('whole_fractions')).toBe('Whole Fractions');
  });

  it('should handle single words', () => {
    expect(humanizeConceptName('fractions')).toBe('Fractions');
    expect(humanizeConceptName('algebra')).toBe('Algebra');
  });
});

describe('filterBySeverity', () => {
  it('should filter to only critical concepts', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false), createResult('q2', false), createResult('q5', false), createResult('q8', false), // critical
      createResult('q3', false), createResult('q6', false), createResult('q9', true),  // moderate
      createResult('q7', false), createResult('q10', true), createResult('q10', true),  // minor
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);
    const criticalOnly = filterBySeverity(diagnosis, 'critical');

    expect(criticalOnly.failedConcepts.length).toBe(1);
    expect(criticalOnly.failedConcepts[0].severity).toBe('critical');
  });

  it('should include critical and moderate when filtering by moderate', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false), createResult('q2', false), createResult('q5', false), createResult('q8', false), // critical
      createResult('q3', false), createResult('q6', true), createResult('q9', true),  // minor
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);
    const moderateAndAbove = filterBySeverity(diagnosis, 'moderate');

    expect(moderateAndAbove.failedConcepts.length).toBeGreaterThanOrEqual(1);
    expect(moderateAndAbove.failedConcepts.every(c => c.severity !== 'minor')).toBe(true);
  });
});

describe('getSummary', () => {
  it('should generate appropriate summary for single concept', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false), createResult('q2', false),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);
    const summary = getSummary(diagnosis);

    expect(summary).toContain('You need help with');
    expect(summary).toContain('Numerator & Denominator');
  });

  it('should generate appropriate summary for multiple concepts', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', false), createResult('q2', false),
      createResult('q3', false), createResult('q6', false),
      createResult('q7', false),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);
    const summary = getSummary(diagnosis);

    expect(summary).toContain('concepts');
    expect(summary.length).toBeGreaterThan(20);  // Should be descriptive
  });

  it('should handle no remediation needed', () => {
    const gradingResults: PerQuestionResult[] = [
      createResult('q1', true), createResult('q2', true),
    ];

    const diagnosis = diagnoseConceptGaps(mockQuestions, gradingResults, mockConceptMetadata);
    const summary = getSummary(diagnosis);

    expect(summary).toContain('No specific concept gaps');
  });
});
