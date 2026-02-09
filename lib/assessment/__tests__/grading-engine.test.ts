/**
 * grading-engine.test.ts
 *
 * Tests for gradeAnswer and gradeAssessment.
 * Zero external dependencies – pure logic, no mocks needed.
 *
 * Coverage:
 *  - Case-insensitive matching
 *  - Whitespace trimming on both sides
 *  - Empty / blank answer handling
 *  - Invalid question object (missing fields)
 *  - partialCredit is always 0 or 1 for MCQ
 *  - correctAnswerHint is null on correct, populated on incorrect
 *  - gradeAssessment: full score, partial score, zero score
 *  - gradeAssessment: question ID not found in questions array (skipped)
 *  - gradeAssessment: empty questions array → score 0
 *  - gradeAssessment: empty answers array → score 0, totalPoints 0
 */

import { describe, it, expect } from 'vitest'
import { gradeAnswer, gradeAssessment } from '@/lib/assessment/grading-engine'
import type { QuestionToGrade } from '@/lib/assessment/grading-engine'

// ── shared fixtures ──────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<QuestionToGrade> = {}): QuestionToGrade {
  return {
    id: 'q1',
    text: 'What is 2 + 3?',
    type: 'multiple_choice',
    correct_answer: '5',
    points: 25,
    ...overrides,
  }
}

// ── gradeAnswer ───────────────────────────────────────────────────────────────

describe('gradeAnswer – correct answer detection', () => {
  it('marks exact match as correct', async () => {
    const result = await gradeAnswer(makeQuestion(), '5')
    expect(result.isCorrect).toBe(true)
    expect(result.partialCredit).toBe(1)
    expect(result.correctAnswerHint).toBeNull()
  })

  it('is case-insensitive', async () => {
    const q = makeQuestion({ correct_answer: 'True' })
    const result = await gradeAnswer(q, 'true')
    expect(result.isCorrect).toBe(true)
  })

  it('is case-insensitive (uppercase user answer)', async () => {
    const q = makeQuestion({ correct_answer: 'Paris' })
    const result = await gradeAnswer(q, 'PARIS')
    expect(result.isCorrect).toBe(true)
  })

  it('trims leading/trailing whitespace before comparing', async () => {
    const result = await gradeAnswer(makeQuestion(), '  5  ')
    expect(result.isCorrect).toBe(true)
  })

  it('trims whitespace on correct_answer side too', async () => {
    const q = makeQuestion({ correct_answer: '  5  ' })
    const result = await gradeAnswer(q, '5')
    expect(result.isCorrect).toBe(true)
  })
})

describe('gradeAnswer – incorrect answer detection', () => {
  it('marks wrong answer as incorrect', async () => {
    const result = await gradeAnswer(makeQuestion(), '7')
    expect(result.isCorrect).toBe(false)
    expect(result.partialCredit).toBe(0)
  })

  it('provides correctAnswerHint on incorrect', async () => {
    const result = await gradeAnswer(makeQuestion(), '7')
    expect(result.correctAnswerHint).toContain('5')
  })

  it('provides encouraging feedback on incorrect', async () => {
    const result = await gradeAnswer(makeQuestion(), '7')
    expect(result.feedback).toBeTruthy()
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('provides positive feedback on correct', async () => {
    const result = await gradeAnswer(makeQuestion(), '5')
    expect(result.feedback).toBeTruthy()
    expect(result.feedback.length).toBeGreaterThan(0)
  })
})

describe('gradeAnswer – empty / blank answers', () => {
  it('treats empty string as incorrect', async () => {
    const result = await gradeAnswer(makeQuestion(), '')
    expect(result.isCorrect).toBe(false)
    expect(result.partialCredit).toBe(0)
  })

  it('treats whitespace-only string as incorrect', async () => {
    const result = await gradeAnswer(makeQuestion(), '   ')
    expect(result.isCorrect).toBe(false)
  })

  it('includes "No answer selected" feedback for empty answer', async () => {
    const result = await gradeAnswer(makeQuestion(), '')
    expect(result.feedback).toContain('No answer selected')
  })

  it('provides correctAnswerHint for empty answer', async () => {
    const result = await gradeAnswer(makeQuestion(), '')
    expect(result.correctAnswerHint).toContain('5')
  })
})

describe('gradeAnswer – invalid question object', () => {
  it('throws / falls back gracefully when question.text is missing', async () => {
    const badQuestion = { id: 'q1', type: 'multiple_choice', correct_answer: '5', points: 10 } as any
    // The function checks !question.text and throws internally,
    // but the catch block falls back to exact string match.
    const result = await gradeAnswer(badQuestion, '5')
    // Fallback path: exact match still works
    expect(result.isCorrect).toBe(true)
  })

  it('throws / falls back when correct_answer is missing', async () => {
    const badQuestion = { id: 'q1', text: 'What?', type: 'multiple_choice', points: 10 } as any
    // correct_answer is undefined → trim() will throw in the catch fallback too,
    // but the outer try catches !question.correct_answer first and throws 'Invalid question object'
    // which is then caught by the outer catch. The catch fallback also fails because
    // correct_answer is undefined. This surfaces as a thrown error.
    await expect(gradeAnswer(badQuestion, 'anything')).rejects.toThrow()
  })
})

// ── gradeAssessment ──────────────────────────────────────────────────────────

describe('gradeAssessment – full assessment scoring', () => {
  const questions: QuestionToGrade[] = [
    makeQuestion({ id: 'q1', correct_answer: '5', points: 33.33 }),
    makeQuestion({ id: 'q2', text: 'What is 10 - 3?', correct_answer: '7', points: 33.33 }),
    makeQuestion({ id: 'q3', text: 'What is 4 * 2?', correct_answer: '8', points: 33.34 }),
  ]

  it('returns 100 score when all answers are correct', async () => {
    const answers = [
      { questionId: 'q1', userAnswer: '5' },
      { questionId: 'q2', userAnswer: '7' },
      { questionId: 'q3', userAnswer: '8' },
    ]

    const result = await gradeAssessment(questions, answers)
    expect(result.score).toBeCloseTo(100, 1)
    expect(result.earnedPoints).toBeCloseTo(100, 1)
    expect(result.totalPoints).toBeCloseTo(100, 1)
    expect(result.perQuestionResults).toHaveLength(3)
    expect(result.perQuestionResults.every((r) => r.isCorrect)).toBe(true)
  })

  it('returns 0 score when all answers are wrong', async () => {
    const answers = [
      { questionId: 'q1', userAnswer: 'wrong' },
      { questionId: 'q2', userAnswer: 'wrong' },
      { questionId: 'q3', userAnswer: 'wrong' },
    ]

    const result = await gradeAssessment(questions, answers)
    expect(result.score).toBe(0)
    expect(result.earnedPoints).toBe(0)
    expect(result.perQuestionResults.every((r) => !r.isCorrect)).toBe(true)
  })

  it('returns partial score when some answers are correct', async () => {
    const answers = [
      { questionId: 'q1', userAnswer: '5' },      // correct
      { questionId: 'q2', userAnswer: 'wrong' },   // incorrect
      { questionId: 'q3', userAnswer: '8' },       // correct
    ]

    const result = await gradeAssessment(questions, answers)
    // q1 (33.33) + q3 (33.34) = 66.67 out of 100
    expect(result.score).toBeCloseTo(66.67, 1)
    expect(result.earnedPoints).toBeCloseTo(66.67, 1)
    expect(result.perQuestionResults[0].isCorrect).toBe(true)
    expect(result.perQuestionResults[1].isCorrect).toBe(false)
    expect(result.perQuestionResults[2].isCorrect).toBe(true)
  })

  it('populates pointsEarned and pointsPossible per question', async () => {
    const answers = [
      { questionId: 'q1', userAnswer: '5' },
      { questionId: 'q2', userAnswer: 'wrong' },
      { questionId: 'q3', userAnswer: '8' },
    ]

    const result = await gradeAssessment(questions, answers)

    expect(result.perQuestionResults[0].pointsEarned).toBeCloseTo(33.33)
    expect(result.perQuestionResults[0].pointsPossible).toBeCloseTo(33.33)

    expect(result.perQuestionResults[1].pointsEarned).toBe(0)
    expect(result.perQuestionResults[1].pointsPossible).toBeCloseTo(33.33)
  })
})

describe('gradeAssessment – edge cases', () => {
  it('skips answers whose questionId is not in the questions array', async () => {
    const questions: QuestionToGrade[] = [
      makeQuestion({ id: 'q1', correct_answer: '5', points: 50 }),
    ]
    const answers = [
      { questionId: 'q1', userAnswer: '5' },
      { questionId: 'q999', userAnswer: 'ghost' },  // not in questions
    ]

    const result = await gradeAssessment(questions, answers)
    // Only q1 counted
    expect(result.totalPoints).toBe(50)
    expect(result.earnedPoints).toBe(50)
    expect(result.perQuestionResults).toHaveLength(1)
  })

  it('returns score 0 when questions array is empty', async () => {
    const result = await gradeAssessment([], [{ questionId: 'q1', userAnswer: '5' }])
    expect(result.score).toBe(0)
    expect(result.totalPoints).toBe(0)
    expect(result.earnedPoints).toBe(0)
    expect(result.perQuestionResults).toHaveLength(0)
  })

  it('returns score 0 when answers array is empty', async () => {
    const questions: QuestionToGrade[] = [
      makeQuestion({ id: 'q1', correct_answer: '5', points: 100 }),
    ]
    const result = await gradeAssessment(questions, [])
    expect(result.score).toBe(0)
    expect(result.totalPoints).toBe(0)
    expect(result.earnedPoints).toBe(0)
    expect(result.perQuestionResults).toHaveLength(0)
  })

  it('handles single-question assessment correctly', async () => {
    const questions: QuestionToGrade[] = [
      makeQuestion({ id: 'q1', correct_answer: 'yes', points: 100 }),
    ]
    const answers = [{ questionId: 'q1', userAnswer: 'YES' }]

    const result = await gradeAssessment(questions, answers)
    expect(result.score).toBe(100)
    expect(result.earnedPoints).toBe(100)
  })

  it('correctAnswerHint is null for correct, populated for incorrect', async () => {
    const questions: QuestionToGrade[] = [
      makeQuestion({ id: 'q1', correct_answer: 'A', points: 50 }),
      makeQuestion({ id: 'q2', text: 'Pick B', correct_answer: 'B', points: 50 }),
    ]
    const answers = [
      { questionId: 'q1', userAnswer: 'A' },   // correct
      { questionId: 'q2', userAnswer: 'C' },   // wrong
    ]

    const result = await gradeAssessment(questions, answers)
    expect(result.perQuestionResults[0].correctAnswerHint).toBeNull()
    expect(result.perQuestionResults[1].correctAnswerHint).toContain('B')
  })
})
