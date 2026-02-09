'use client'

/**
 * Progress Dashboard Page
 *
 * Displays user's learning journey with:
 * - Summary statistics (lessons completed, average mastery, time spent)
 * - List of all attempted lessons with progress details
 * - Actions to continue incomplete lessons or review completed ones
 *
 * Design: Follows design system with Cards, Buttons, and consistent spacing
 * Accessibility: Keyboard navigation, ARIA labels, focus states
 *
 * Reference: Implementation_Roadmap.md - Day 24-25
 * Design: Bloom_Academia_Frontend.md - Card patterns, spacing
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Clock, Award, BookOpen } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  subject: string
  grade_level: number
  learning_objective: string
  estimated_duration: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface ProgressItem {
  id: string
  user_id: string
  lesson_id: string
  mastery_level: number
  attempts: number
  common_mistakes: string[]
  time_spent: number
  last_accessed: string
  completed: boolean
  lessons: Lesson
}

export default function ProgressPage() {
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    loadProgress()
  }, [])

  async function loadProgress() {
    try {
      setIsLoading(true)
      setError(null)

      // Get userId from localStorage
      const userId = localStorage.getItem('userId')
      const name = localStorage.getItem('userName') || 'Student'
      setUserName(name)

      if (!userId) {
        // No user found - redirect to welcome
        router.push('/welcome')
        return
      }

      // Fetch progress from API
      const response = await fetch(`/api/progress/${userId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch progress')
      }

      const data = await response.json()
      setProgress(data.progress || [])

    } catch (err) {
      console.error('Error loading progress:', err)
      setError('Failed to load your progress. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleContinueLesson(lessonId: string) {
    router.push(`/lessons/${lessonId}/intro`)
  }

  function handleBackToLessons() {
    router.push('/dashboard')
  }

  // Calculate summary statistics
  const completedCount = progress.filter(p => p.completed).length
  const averageMastery = progress.length > 0
    ? Math.round(progress.reduce((acc, p) => acc + p.mastery_level, 0) / progress.length)
    : 0
  const totalTimeSpent = progress.reduce((acc, p) => acc + p.time_spent, 0)

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-error text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4">
            <Button
              onClick={loadProgress}
              className="flex-1"
            >
              Try Again
            </Button>
            <Button
              onClick={handleBackToLessons}
              variant="outline"
              className="flex-1"
            >
              Back to Lessons
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Empty state (no progress yet)
  if (progress.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBackToLessons}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-6 focus-ring"
            aria-label="Back to lessons"
          >
            <ArrowLeft size={20} />
            <span>Back to Lessons</span>
          </button>

          {/* Empty State */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-2xl w-full p-12 text-center">
              <div className="text-6xl mb-6">📚</div>
              <h1 className="text-4xl font-bold mb-4 text-gray-800">
                Start Your Learning Journey!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                You haven't started any lessons yet. Let's change that!
              </p>
              <Button
                onClick={handleBackToLessons}
                size="lg"
                className="min-w-[200px]"
              >
                Browse Lessons
              </Button>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Main progress dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToLessons}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-6 focus-ring"
            aria-label="Back to lessons"
          >
            <ArrowLeft size={20} />
            <span>Back to Lessons</span>
          </button>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">
            Your Learning Journey
          </h1>
          <p className="text-lg text-gray-600">
            Great work, {userName}! Keep it up! 🎉
          </p>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Lessons Completed */}
          <Card className="p-6 bg-primary/10 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <BookOpen className="text-primary" size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">
                  {completedCount}
                </div>
                <div className="text-sm text-gray-700 font-medium">
                  Lessons Completed
                </div>
              </div>
            </div>
          </Card>

          {/* Average Mastery */}
          <Card className="p-6 bg-success/10 border-success/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="text-success" size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-success">
                  {averageMastery}%
                </div>
                <div className="text-sm text-gray-700 font-medium">
                  Average Mastery
                </div>
              </div>
            </div>
          </Card>

          {/* Time Spent Learning */}
          <Card className="p-6 bg-accent/10 border-accent/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Clock className="text-accent" size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">
                  {totalTimeSpent}
                </div>
                <div className="text-sm text-gray-700 font-medium">
                  Minutes Learning
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Lesson Progress List */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Your Lessons
          </h2>

          <div className="space-y-4">
            {progress.map((item) => (
              <Card
                key={item.id}
                className="p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Lesson Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        {item.lessons.subject}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-600">
                        Grade {item.lessons.grade_level}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {item.lessons.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span>{item.attempts} attempt{item.attempts !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{item.time_spent} minutes</span>
                      <span>•</span>
                      <span className={`font-medium ${
                        item.lessons.difficulty === 'easy' ? 'text-success' :
                        item.lessons.difficulty === 'medium' ? 'text-accent' :
                        'text-error'
                      }`}>
                        {item.lessons.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex items-center gap-4">
                    {/* Mastery Level */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Award size={16} className="text-gray-400" />
                        <span className="text-2xl font-bold text-gray-800">
                          {Math.round(item.mastery_level)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">Mastery</div>
                    </div>

                    {/* Action Button */}
                    {item.completed ? (
                      <Button
                        onClick={() => handleContinueLesson(item.lesson_id)}
                        variant="success"
                        className="min-w-[120px]"
                        aria-label={`Review ${item.lessons.title}`}
                      >
                        ✓ Review
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleContinueLesson(item.lesson_id)}
                        className="min-w-[120px]"
                        aria-label={`Continue ${item.lessons.title}`}
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-success transition-all duration-300"
                      style={{ width: `${Math.min(100, item.mastery_level)}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(item.mastery_level)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progress: ${Math.round(item.mastery_level)}%`}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Motivational Footer */}
        <Card className="p-8 bg-gradient-to-r from-primary/10 to-success/10 border-primary/20 text-center">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            Keep Up the Great Work!
          </h3>
          <p className="text-gray-600 mb-6">
            You're making excellent progress. Every lesson completed is a step toward mastery.
          </p>
          <Button
            onClick={handleBackToLessons}
            size="lg"
            aria-label="Continue learning with more lessons"
          >
            Continue Learning
          </Button>
        </Card>
      </div>
    </div>
  )
}
