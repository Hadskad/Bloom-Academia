/**
 * Assessment Grading Engine (MCQ Version)
 *
 * Simple grading engine for multiple choice questions using direct answer comparison.
 * No AI needed - just exact string matching with case-insensitive comparison.
 *
 * Flow:
 * 1. Compare user's selected answer with correct answer
 * 2. Generate encouraging feedback based on result
 * 3. Return standardized grading response
 *
 * Reference: Implementation_Roadmap_2.md - Day 25 (MCQ Implementation)
 */

/**
 * Type definition for grading result
 */
export interface GradingResult {
  isCorrect: boolean
  partialCredit: number // 0.0 to 1.0 (always 0 or 1 for MCQ)
  feedback: string
  correctAnswerHint: string | null
}

/**
 * Interface for question being graded
 */
export interface QuestionToGrade {
  id: string
  text: string
  type: string
  correct_answer: string
  points: number
}

/**
 * Grades a single MCQ answer using direct string comparison
 *
 * For MCQ, grading is simple:
 * - Exact match (case-insensitive) = correct
 * - No match = incorrect
 * - No partial credit for MCQ
 *
 * @param question - The question being graded
 * @param userAnswer - The student's selected answer
 * @returns Grading result with feedback
 *
 * @example
 * ```typescript
 * const result = await gradeAnswer(
 *   {
 *     id: "q1",
 *     text: "What is 23 plus 45?",
 *     type: "multiple_choice",
 *     correct_answer: "68",
 *     points: 33.33
 *   },
 *   "68"
 * )
 * console.log(result.isCorrect) // true
 * console.log(result.feedback) // "Correct! Well done."
 * ```
 */
export async function gradeAnswer(
  question: QuestionToGrade,
  userAnswer: string
): Promise<GradingResult> {
  try {
    // Validate inputs
    if (!question || !question.text || !question.correct_answer) {
      throw new Error('Invalid question object')
    }

    if (!userAnswer || userAnswer.trim() === '') {
      // Empty answer = incorrect
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'No answer selected. Please choose an option.',
        correctAnswerHint: `The correct answer is: ${question.correct_answer}`,
      }
    }

    // Simple case-insensitive string comparison for MCQ
    const isCorrect =
      userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()

    // Generate encouraging feedback
    const feedback = isCorrect
      ? generateCorrectFeedback()
      : generateIncorrectFeedback()

    const correctAnswerHint = isCorrect
      ? null
      : `The correct answer is: ${question.correct_answer}`

    return {
      isCorrect,
      partialCredit: isCorrect ? 1 : 0,
      feedback,
      correctAnswerHint,
    }
  } catch (error) {
    console.error('Error grading answer:', error)

    // Fallback to exact string match if anything fails
    const isExactMatch =
      userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()

    return {
      isCorrect: isExactMatch,
      partialCredit: isExactMatch ? 1 : 0,
      feedback: isExactMatch ? 'Correct!' : 'Not quite right. Try again!',
      correctAnswerHint: isExactMatch ? null : `The correct answer is: ${question.correct_answer}`,
    }
  }
}

/**
 * Generate varied positive feedback for correct answers
 */
function generateCorrectFeedback(): string {
  const feedbackOptions = [
    'Correct! Well done.',
    'That\'s right! Great job.',
    'Excellent! You got it.',
    'Perfect! Keep up the good work.',
    'Correct! You\'re doing great.',
    'That\'s the right answer! Nice work.',
    'Well done! That\'s correct.',
    'Exactly right! Good thinking.',
  ]

  return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)]
}

/**
 * Generate encouraging feedback for incorrect answers
 */
function generateIncorrectFeedback(): string {
  const feedbackOptions = [
    'Not quite. Review the lesson and try again!',
    'That\'s not correct, but keep trying!',
    'Not this time. Give it another shot!',
    'Good try! Review and try again.',
    'Not the right answer. Keep learning!',
    'Close! Review the material and try again.',
    'That\'s incorrect, but don\'t give up!',
  ]

  return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)]
}

/**
 * Grades multiple answers for a complete assessment
 *
 * @param questions - Array of questions from the assessment
 * @param answers - Array of student answers with question IDs
 * @returns Object with total score, per-question results, and overall feedback
 *
 * @example
 * ```typescript
 * const result = await gradeAssessment(
 *   assessment.questions,
 *   [
 *     { questionId: "q1", userAnswer: "68" },
 *     { questionId: "q2", userAnswer: "27" },
 *     { questionId: "q3", userAnswer: "50" }
 *   ]
 * )
 * console.log(result.score) // 100.0
 * console.log(result.passed) // true
 * ```
 */
export async function gradeAssessment(
  questions: QuestionToGrade[],
  answers: Array<{ questionId: string; userAnswer: string }>
): Promise<{
  score: number
  totalPoints: number
  earnedPoints: number
  perQuestionResults: Array<{
    questionId: string
    isCorrect: boolean
    partialCredit: number
    pointsEarned: number
    pointsPossible: number
    feedback: string
    correctAnswerHint: string | null
  }>
}> {
  let totalPoints = 0
  let earnedPoints = 0
  const perQuestionResults = []

  // Grade each answer
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId)

    if (!question) {
      console.warn(`Question ${answer.questionId} not found in assessment`)
      continue
    }

    totalPoints += question.points

    // Grade using direct comparison
    const gradingResult = await gradeAnswer(question, answer.userAnswer)

    // Calculate points earned (full or none for MCQ - no partial credit)
    const pointsEarned = gradingResult.isCorrect ? question.points : 0

    earnedPoints += pointsEarned

    perQuestionResults.push({
      questionId: question.id,
      isCorrect: gradingResult.isCorrect,
      partialCredit: gradingResult.partialCredit,
      pointsEarned,
      pointsPossible: question.points,
      feedback: gradingResult.feedback,
      correctAnswerHint: gradingResult.correctAnswerHint,
    })
  }

  // Calculate final score percentage
  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

  return {
    score,
    totalPoints,
    earnedPoints,
    perQuestionResults,
  }
}
