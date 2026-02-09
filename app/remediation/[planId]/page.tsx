/**
 * Remediation Session Page
 *
 * Purpose: Displays targeted mini-lessons for specific concept gaps
 *          Provides focused practice instead of full lesson review
 *
 * Features:
 * - Loads remediation plan from database
 * - Displays concept-specific explanations
 * - Shows SVG diagrams for visual learners
 * - Provides practice problems with answers
 * - Tracks completion
 * - Routes back to assessment retry after completion
 *
 * Flow:
 * 1. Load remediation plan by ID
 * 2. Display each mini-lesson sequentially
 * 3. Student works through content at own pace
 * 4. Mark complete and return to assessment
 *
 * Criterion 5: Failure → Remediation (Step 6 - Remediation UI)
 * Reference: ROADMAP_TO_100_PERCENT.md - Remediation Session Page
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle, ArrowRight, ArrowLeft, BookOpen, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface PracticeProblem {
  question: string
  answer: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface RemediationLesson {
  title: string
  explanation: string
  examples: string[]
  practiceProblems: PracticeProblem[]
  svg?: string
  estimatedTimeMinutes: number
}

interface RemediationContent {
  concept: string
  displayName: string
  severity: 'critical' | 'moderate' | 'minor'
  lesson: RemediationLesson
}

interface RemediationPlan {
  id: string
  user_id: string
  assessment_id: string
  lesson_id: string
  diagnosis: any
  remediation_content: RemediationContent[]
  completed: boolean
  created_at: string
}

export default function RemediationSessionPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string

  // State
  const [plan, setPlan] = useState<RemediationPlan | null>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [showPracticeAnswers, setShowPracticeAnswers] = useState<boolean[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  // Load remediation plan on mount
  useEffect(() => {
    loadRemediationPlan()
  }, [planId])

  async function loadRemediationPlan() {
    try {
      const response = await fetch(`/api/remediation/generate?planId=${planId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load remediation plan')
      }

      const data: RemediationPlan = await response.json()
      setPlan(data)

      // Initialize practice answer visibility
      if (data.remediation_content.length > 0) {
        const firstLesson = data.remediation_content[0].lesson
        setShowPracticeAnswers(new Array(firstLesson.practiceProblems.length).fill(false))
      }

      setLoading(false)
    } catch (err) {
      console.error('[RemediationSession] Load error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load remediation plan')
      setLoading(false)
    }
  }

  function handleNextLesson() {
    if (!plan) return

    const nextIndex = currentLessonIndex + 1
    if (nextIndex < plan.remediation_content.length) {
      setCurrentLessonIndex(nextIndex)
      // Reset practice answer visibility for new lesson
      const nextLesson = plan.remediation_content[nextIndex].lesson
      setShowPracticeAnswers(new Array(nextLesson.practiceProblems.length).fill(false))
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function handlePreviousLesson() {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1)
      // Reset practice answer visibility
      const prevLesson = plan!.remediation_content[currentLessonIndex - 1].lesson
      setShowPracticeAnswers(new Array(prevLesson.practiceProblems.length).fill(false))
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function togglePracticeAnswer(index: number) {
    setShowPracticeAnswers(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  async function handleCompleteRemediation() {
    if (!plan) return

    setCompleting(true)

    try {
      // Mark remediation plan as completed
      const { supabase } = await import('@/lib/db/supabase')
      await supabase
        .from('remediation_plans')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', plan.id)

      // Navigate back to lesson to retry assessment
      router.push(`/learn/${plan.lesson_id}`)
    } catch (err) {
      console.error('[RemediationSession] Complete error:', err)
      setCompleting(false)
      // Non-fatal: still allow navigation
      router.push(`/learn/${plan.lesson_id}`)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your practice plan...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Oops!
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Remediation plan not found'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Get current lesson
  const currentContent = plan.remediation_content[currentLessonIndex]
  const currentLesson = currentContent.lesson
  const isLastLesson = currentLessonIndex === plan.remediation_content.length - 1
  const isFirstLesson = currentLessonIndex === 0

  // Severity badge color
  const severityColor = currentContent.severity === 'critical'
    ? 'bg-red-100 text-red-800 border-red-300'
    : currentContent.severity === 'moderate'
    ? 'bg-orange-100 text-orange-800 border-orange-300'
    : 'bg-blue-100 text-blue-800 border-blue-300'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${severityColor}`}>
                  {currentContent.severity}
                </span>
                <span className="text-sm text-gray-600">
                  Lesson {currentLessonIndex + 1} of {plan.remediation_content.length}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentLesson.title}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {currentContent.displayName} • About {currentLesson.estimatedTimeMinutes} minutes
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentLessonIndex + 1) / plan.remediation_content.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Explanation Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Let's Learn This Together
          </h2>
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{currentLesson.explanation}</ReactMarkdown>
          </div>
        </div>

        {/* SVG Diagram (if exists) */}
        {currentLesson.svg && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📊 Visual Guide
            </h2>
            <div className="flex justify-center">
              <div dangerouslySetInnerHTML={{ __html: currentLesson.svg }} />
            </div>
          </div>
        )}

        {/* Examples Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            💡 Examples
          </h2>
          <div className="space-y-4">
            {currentLesson.examples.map((example, index) => (
              <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <p className="text-gray-800">{example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Practice Problems Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            ✏️ Practice Problems
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Try these on your own first, then reveal the answers to check your work!
          </p>
          <div className="space-y-4">
            {currentLesson.practiceProblems.map((problem, index) => (
              <div key={index} className="p-4 border-2 border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-gray-700">
                        Problem {index + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        problem.difficulty === 'easy'
                          ? 'bg-green-100 text-green-800'
                          : problem.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium">{problem.question}</p>
                  </div>
                </div>

                {/* Answer Toggle */}
                <button
                  onClick={() => togglePracticeAnswer(index)}
                  className="mt-3 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {showPracticeAnswers[index] ? 'Hide Answer' : 'Show Answer'}
                </button>

                {/* Answer Display */}
                {showPracticeAnswers[index] && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                    <p className="text-sm font-bold text-green-900 mb-1">✅ Answer:</p>
                    <p className="text-gray-800">{problem.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePreviousLesson}
              disabled={isFirstLesson}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex-1 text-center">
              <p className="text-sm text-gray-600">
                {currentLessonIndex + 1} of {plan.remediation_content.length} concepts
              </p>
            </div>

            {!isLastLesson ? (
              <button
                onClick={handleNextLesson}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCompleteRemediation}
                disabled={completing}
                className="px-6 py-3 bg-success hover:bg-success/90 disabled:bg-success/50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                {completing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    I'm Ready to Try Again!
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Encouragement Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            🌟 Take your time and work through each concept carefully. You've got this!
          </p>
        </div>
      </div>
    </div>
  )
}
