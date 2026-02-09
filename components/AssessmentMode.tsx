/**
 * AssessmentMode Component (MCQ Version)
 *
 * Multiple choice question assessment interface that displays questions one by one,
 * collects answers via radio button selection, and submits to the grading API.
 *
 * Flow:
 * 1. Fetch assessment questions (without correct answers)
 * 2. Display questions sequentially with MCQ options
 * 3. Collect selected answers
 * 4. Submit all answers for grading
 * 5. Show results via AssessmentResults component
 *
 * Reference: Implementation_Roadmap_2.md - Day 25 (MCQ Implementation)
 * API: GET /api/assessment/questions, POST /api/assessment/grade
 */

'use client'

import { useState, useEffect } from 'react'
import { AssessmentResults } from '@/components/AssessmentResults'
import { Loader2, CheckCircle, Circle } from 'lucide-react'

interface Question {
  id: string
  text: string
  type: string
  options: string[]
  points: number
  hint?: string
}

interface Assessment {
  assessmentId: string
  title: string
  passingScore: number
  maxAttempts: number
  questionCount: number
  questions: Question[]
}

interface AssessmentModeProps {
  lessonId: string
  userId: string
  sessionId: string
  onComplete: () => void
}

interface GradingResult {
  success: boolean
  score: number
  totalPoints: number
  earnedPoints: number
  passed: boolean
  passingScore: number
  feedback: string
  perQuestionResults: Array<{
    questionId: string
    isCorrect: boolean
    partialCredit: number
    pointsEarned: number
    pointsPossible: number
    feedback: string
    correctAnswerHint: string | null
  }>
  attemptNumber: number
  lessonCompleted: boolean
  nextLesson: {
    id: string
    title: string
    subject: string
    gradeLevel: number
  } | null
}

export function AssessmentMode({
  lessonId,
  userId,
  sessionId,
  onComplete,
}: AssessmentModeProps) {
  // State management
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Array<{ questionId: string; userAnswer: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [startTime] = useState(Date.now())

  // Fetch assessment questions on mount
  useEffect(() => {
    async function fetchAssessment() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/assessment/questions?lessonId=${lessonId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load assessment')
        }

        const data = await response.json()
        setAssessment(data)
      } catch (err) {
        console.error('Error fetching assessment:', err)
        setError(err instanceof Error ? err.message : 'Failed to load assessment')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssessment()
  }, [lessonId])

  // Handle answer selection and move to next question
  function handleAnswerSubmit() {
    if (!assessment || selectedAnswer === null) return

    const currentQuestion = assessment.questions[currentQuestionIndex]

    // Save answer
    const newAnswer = {
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
    }

    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)

    // Reset selection for next question
    setSelectedAnswer(null)

    // Move to next question or submit
    if (currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered - submit for grading
      submitAssessment(updatedAnswers)
    }
  }

  // Submit assessment for grading
  async function submitAssessment(finalAnswers: Array<{ questionId: string; userAnswer: string }>) {
    if (!assessment) return

    try {
      setIsSubmitting(true)
      setError(null)

      // Calculate time taken in seconds
      const timeTakenSeconds = Math.floor((Date.now() - startTime) / 1000)

      const response = await fetch('/api/assessment/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId,
          assessmentId: assessment.assessmentId,
          lessonId,
          answers: finalAnswers,
          timeTakenSeconds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to grade assessment')
      }

      const result = await response.json()
      setGradingResult(result)
    } catch (err) {
      console.error('Error submitting assessment:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit assessment')
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading assessment...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-error/10 border border-error text-error rounded-lg p-6 mb-4">
            {error}
          </div>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    )
  }

  // Show results screen after grading
  if (gradingResult) {
    return (
      <AssessmentResults
        score={gradingResult.score}
        passed={gradingResult.passed}
        feedback={gradingResult.feedback}
        perQuestionResults={gradingResult.perQuestionResults}
        passingScore={gradingResult.passingScore}
        attemptNumber={gradingResult.attemptNumber}
        lessonCompleted={gradingResult.lessonCompleted}
        nextLesson={gradingResult.nextLesson}
        lessonId={lessonId}
        assessmentId={assessment!.assessmentId}
        userId={userId}
        onRetry={() => window.location.reload()}
        onContinue={onComplete}
      />
    )
  }

  // Submitting state
  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-gray-800 text-xl font-semibold mb-2">
            Grading your answers...
          </p>
          <p className="text-gray-600">
            Calculating your score
          </p>
        </div>
      </div>
    )
  }

  // Main assessment UI
  if (!assessment) return null

  const currentQuestion = assessment.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Quick Check
          </h1>
          <p className="text-lg md:text-xl text-gray-600">{assessment.title}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {assessment.questions.length}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6 md:mb-8 border border-gray-200">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4">
              MULTIPLE CHOICE
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4">
              {currentQuestion.text}
            </h2>
            {currentQuestion.hint && (
              <p className="text-sm text-gray-500 italic">
                💡 Hint: {currentQuestion.hint}
              </p>
            )}
          </div>

          {/* MCQ Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedAnswer === option
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedAnswer === option ? (
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-base md:text-lg ${
                    selectedAnswer === option ? 'font-semibold text-primary' : 'text-gray-700'
                  }`}>
                    {option}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleAnswerSubmit}
            disabled={selectedAnswer === null}
            className={`w-full mt-6 px-6 py-4 rounded-lg font-semibold text-white transition-colors ${
              selectedAnswer === null
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {currentQuestionIndex < assessment.questions.length - 1 ? 'Next Question' : 'Submit Assessment'}
          </button>
        </div>

        {/* Answered Questions Summary */}
        {answers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Answered Questions
            </h3>
            <div className="space-y-2">
              {answers.map((answer, index) => (
                <div
                  key={answer.questionId}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">Q{index + 1}:</span> {answer.userAnswer}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-error/10 border border-error rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
