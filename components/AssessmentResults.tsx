/**
 * AssessmentResults Component
 *
 * Displays assessment grading results with score, feedback, and navigation options.
 * Shows per-question breakdown and provides appropriate next steps based on pass/fail.
 *
 * Features:
 * - Celebration animation for passing
 * - Encouraging feedback for failing
 * - Per-question results with hints
 * - Navigation to next lesson (if passed) or lesson review (if failed)
 *
 * Reference: Implementation_Roadmap_2.md - Day 25 (Frontend Integration)
 */

'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, ArrowRight, RotateCcw, BookOpen } from 'lucide-react'

interface PerQuestionResult {
  questionId: string
  isCorrect: boolean
  partialCredit: number
  pointsEarned: number
  pointsPossible: number
  feedback: string
  correctAnswerHint: string | null
}

interface NextLesson {
  id: string
  title: string
  subject: string
  gradeLevel: number
}

interface AssessmentResultsProps {
  score: number
  passed: boolean
  feedback: string
  perQuestionResults: PerQuestionResult[]
  passingScore: number
  attemptNumber: number
  lessonCompleted: boolean
  nextLesson: NextLesson | null
  lessonId: string
  onRetry: () => void
  onContinue: () => void
}

export function AssessmentResults({
  score,
  passed,
  feedback,
  perQuestionResults,
  passingScore,
  attemptNumber,
  lessonCompleted,
  nextLesson,
  lessonId,
  onRetry,
  onContinue,
}: AssessmentResultsProps) {
  const router = useRouter()

  const correctCount = perQuestionResults.filter((r) => r.isCorrect).length
  const totalQuestions = perQuestionResults.length

  function handleContinueToNextLesson() {
    if (nextLesson) {
      router.push(`/learn/${nextLesson.id}`)
    } else {
      router.push('/lessons')
    }
  }

  function handleReviewLesson() {
    router.push(`/learn/${lessonId}`)
  }

  function handleBackToLessons() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        {/* Success State */}
        {passed ? (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-5xl font-bold text-success mb-3">
              Great Job!
            </h1>
            <p className="text-2xl text-gray-700 mb-2">
              You scored {score.toFixed(1)}%
            </p>
            <p className="text-lg text-gray-600">
              {correctCount} out of {totalQuestions} correct
            </p>
          </div>
        ) : (
          /* Retry State */
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">📚</div>
            <h1 className="text-5xl font-bold text-accent mb-3">
              Keep Learning!
            </h1>
            <p className="text-2xl text-gray-700 mb-2">
              You scored {score.toFixed(1)}%
            </p>
            <p className="text-lg text-gray-600">
              {correctCount} out of {totalQuestions} correct
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Passing score: {passingScore}% • Attempt {attemptNumber}
            </p>
          </div>
        )}

        {/* Feedback Card */}
        <div className={`rounded-lg p-6 mb-6 border-2 ${
          passed
            ? 'bg-success/10 border-success'
            : 'bg-accent/10 border-accent'
        }`}>
          <p className="text-lg text-gray-800 text-center font-medium">
            {feedback}
          </p>
        </div>

        {/* Per-Question Results */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Question Breakdown
          </h2>
          <div className="space-y-4">
            {perQuestionResults.map((result, index) => (
              <div
                key={result.questionId}
                className={`p-4 rounded-lg border ${
                  result.isCorrect
                    ? 'bg-success/5 border-success/30'
                    : 'bg-error/5 border-error/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-5 h-5 text-error flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-800">
                        Question {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {result.pointsEarned.toFixed(1)} / {result.pointsPossible} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {result.feedback}
                    </p>
                    {result.correctAnswerHint && (
                      <p className="text-xs text-gray-500 italic">
                        💡 {result.correctAnswerHint}
                      </p>
                    )}
                    {result.partialCredit > 0 && result.partialCredit < 1 && (
                      <p className="text-xs text-accent font-medium mt-1">
                        Partial credit: {(result.partialCredit * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {passed && lessonCompleted ? (
          /* Passed - Show Next Lesson Option */
          <div className="space-y-4">
            {nextLesson && (
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  What's Next?
                </h3>
                <p className="text-gray-700 mb-4">
                  {nextLesson.subject}: {nextLesson.title}
                </p>
                <button
                  onClick={handleContinueToNextLesson}
                  className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Next Lesson
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleBackToLessons}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-colors"
              >
                Back to Lessons
              </button>
              <button
                onClick={handleReviewLesson}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-primary font-semibold rounded-lg border border-primary transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Review Lesson
              </button>
            </div>
          </div>
        ) : (
          /* Failed - Show Retry Options */
          <div className="space-y-4">
            <button
              onClick={handleReviewLesson}
              className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Review the Lesson
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-accent font-semibold rounded-lg border border-accent transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleBackToLessons}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-colors"
              >
                Back to Lessons
              </button>
            </div>
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Attempt {attemptNumber} •
            Score: {score.toFixed(1)}% •
            Required: {passingScore}%
          </p>
        </div>
      </div>
    </div>
  )
}
