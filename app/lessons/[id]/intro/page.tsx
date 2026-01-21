'use client'

/**
 * Lesson Intro Screen
 *
 * Displays lesson details and overview before starting the actual teaching session.
 * Sets expectations, shows learning objectives, and explains how the voice
 * interface works.
 *
 * Flow:
 * 1. Fetch lesson details from /api/lessons/[id]
 * 2. Display lesson title, objective, duration, difficulty
 * 3. Show "How This Works" instructions
 * 4. Start Session button creates session and redirects to /learn/[lessonId]
 *
 * Reference: Implementation_Roadmap.md - Day 17
 * Reference: Bloom_Academia_App-Flow.md - Section 4 (Lesson Intro Screen)
 * Design: Bloom_Academia_Frontend.md - Typography, spacing, colors
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, BarChart3 } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  subject: string
  grade_level: number
  learning_objective: string
  estimated_duration: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export default function LessonIntroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)

  // Unwrap params (Next.js 15 async params)
  useEffect(() => {
    params.then((p) => setLessonId(p.id))
  }, [params])

  // Fetch lesson details when lessonId is available
  useEffect(() => {
    if (lessonId) {
      fetchLesson()
    }
  }, [lessonId])

  const fetchLesson = async () => {
    if (!lessonId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/lessons/${lessonId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Lesson not found')
        }
        throw new Error('Failed to fetch lesson')
      }

      const data = await response.json()
      setLesson(data)
    } catch (err) {
      console.error('Error fetching lesson:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load lesson details'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const startLesson = async () => {
    if (!lessonId) return

    try {
      setIsStarting(true)

      // Get userId from localStorage
      const userId = localStorage.getItem('userId')
      if (!userId) {
        // Redirect to welcome if no user
        router.push('/welcome')
        return
      }

      // Create session
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          lessonId: lessonId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start session')
      }

      const { sessionId } = await response.json()

      // Store session ID in localStorage
      localStorage.setItem('currentSession', sessionId)

      // Redirect to learning interface
      router.push(`/learn/${lessonId}`)
    } catch (err) {
      console.error('Error starting lesson:', err)
      setError('Failed to start lesson. Please try again.')
      setIsStarting(false)
    }
  }

  const goBack = () => {
    router.push('/lessons')
  }

  // Get difficulty badge styling
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-success/20 text-success'
      case 'medium':
        return 'bg-accent/20 text-accent'
      case 'hard':
        return 'bg-error/20 text-error'
      default:
        return 'bg-gray-200 text-gray-600'
    }
  }

  // Get subject color
  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'math':
        return 'text-primary'
      case 'science':
        return 'text-success'
      case 'english':
        return 'text-accent'
      case 'history':
        return 'text-error'
      default:
        return 'text-gray-600'
    }
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
          <p className="mt-4 text-gray-600">Loading lesson details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-error/10 border border-error text-error rounded-lg p-6 mb-4">
            {error || 'Lesson not found'}
          </div>
          <Button onClick={goBack}>Back to Lessons</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <button
          onClick={goBack}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lessons
        </button>

        {/* Subject Badge */}
        <div
          className={`text-sm font-semibold mb-2 ${getSubjectColor(
            lesson.subject
          )}`}
        >
          {lesson.subject.toUpperCase()}
        </div>

        {/* Lesson Title */}
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          {lesson.title}
        </h1>

        {/* What You'll Learn */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            What You'll Learn:
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {lesson.learning_objective}
          </p>
        </div>

        {/* Lesson Metadata */}
        <div className="flex items-center gap-6 mb-6 text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              {lesson.estimated_duration} minutes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <span
              className={`px-3 py-1 rounded-md font-medium text-sm ${getDifficultyStyles(
                lesson.difficulty
              )}`}
            >
              {lesson.difficulty}
            </span>
          </div>
        </div>

        {/* How This Works */}
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            How This Works:
          </h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-success mr-3 mt-0.5">✓</span>
              <span>Click the microphone button to speak</span>
            </li>
            <li className="flex items-start">
              <span className="text-success mr-3 mt-0.5">✓</span>
              <span>Ask questions anytime - interrupt if you're confused</span>
            </li>
            <li className="flex items-start">
              <span className="text-success mr-3 mt-0.5">✓</span>
              <span>
                I'll draw diagrams on the whiteboard to help you understand
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-success mr-3 mt-0.5">✓</span>
              <span>Take your time - there's no rush!</span>
            </li>
          </ul>
        </div>

        {/* Start Button */}
        <Button
          onClick={startLesson}
          disabled={isStarting}
          className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg font-semibold rounded-lg transition-colors"
        >
          {isStarting ? 'Starting...' : 'Start Class! 🎓'}
        </Button>

        {/* Grade Level Info */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Recommended for Grade {lesson.grade_level}
        </p>
      </div>
    </div>
  )
}
