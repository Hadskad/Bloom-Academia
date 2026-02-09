'use client'

/**
 * Lesson Completion Screen
 *
 * Displays celebration and summary after completing a lesson.
 * Shows metrics (time, questions, mastery), suggests next lesson, and provides
 * navigation options.
 *
 * Flow:
 * 1. Get sessionId from localStorage
 * 2. Call /api/sessions/end to end session and get summary
 * 3. Display celebration animation
 * 4. Show metrics (time spent, questions asked, mastery level)
 * 5. Suggest next lesson
 * 6. Provide navigation options (back to lessons, review, start next)
 *
 * Reference: Implementation_Roadmap.md - Day 18-19
 * Reference: Bloom_Academia_App-Flow.md - Section 6 (Lesson Completion Screen)
 * Design: Bloom_Academia_Frontend.md - Typography, spacing, colors
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface LessonSummary {
  studentName: string
  timeSpent: number
  questionsAsked: number
  masteryLevel: number
  nextLesson: {
    id: string
    title: string
    subject: string
  }
}

export default function LessonCompletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)

  // Unwrap params (Next.js 15 async params)
  useEffect(() => {
    params.then((p) => setLessonId(p.id))
  }, [params])

  // End session and get summary when component mounts
  useEffect(() => {
    const endSession = async () => {
      try {
        setIsLoading(true)

        // Get session ID from localStorage
        const sessionId = localStorage.getItem('currentSession')
        if (!sessionId) {
          throw new Error('No active session found')
        }

        // End session and get summary
        const response = await fetch('/api/sessions/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })

        if (!response.ok) {
          throw new Error('Failed to end session')
        }

        const data = await response.json()
        setSummary(data.summary)

        // Clear current session from localStorage
        localStorage.removeItem('currentSession')
      } catch (err) {
        console.error('Error ending session:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load completion summary'
        )
      } finally {
        setIsLoading(false)
      }
    }

    endSession()
  }, [])

  const goToNextLesson = () => {
    // Redirect to dashboard which will show the curriculum-assigned next lesson
    router.push('/dashboard')
  }

  const goToLessons = () => {
    router.push('/dashboard')
  }

  const reviewLesson = () => {
    if (lessonId) {
      router.push(`/lessons/${lessonId}/intro`)
    }
  }

  const viewProgress = () => {
    router.push('/progress')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-96 bg-gray-200 rounded mx-auto"></div>
            <div className="h-6 w-64 bg-gray-200 rounded mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Calculating your progress...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-error/10 border border-error text-error rounded-lg p-6 mb-4">
            {error || 'Failed to load completion summary'}
          </div>
          <Button onClick={goToLessons}>Back to Lessons</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Celebration Section */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            Lesson Complete!
          </h1>
          <p className="text-xl text-gray-600">
            Great work, {summary.studentName}!
          </p>
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-lg p-8 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Your Progress
          </h2>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {summary.timeSpent}
              </div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-2">
                {summary.questionsAsked}
              </div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">
                {summary.masteryLevel}%
              </div>
              <div className="text-sm text-gray-600">Mastery</div>
            </div>
          </div>
        </div>

        {/* Next Lesson Suggestion */}
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            What's Next?
          </h3>
          <p className="text-gray-700 mb-4">{summary.nextLesson.title}</p>
          <Button
            onClick={goToNextLesson}
            className="bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            Start Next Class
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            onClick={goToLessons}
            variant="outline"
            className="border-gray-300 py-6 text-base"
          >
            Back to Lessons
          </Button>

          <Button
            onClick={reviewLesson}
            variant="outline"
            className="border-primary text-primary py-6 text-base hover:bg-primary/10"
          >
            Review This Lesson
          </Button>

          <Button
            onClick={viewProgress}
            variant="secondary"
            className="py-6 text-base"
          >
            View Progress
          </Button>
        </div>
      </div>
    </div>
  )
}
