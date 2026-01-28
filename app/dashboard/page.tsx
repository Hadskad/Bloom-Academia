/**
 * Student Dashboard Page
 *
 * Automatic lesson assignment based on curriculum sequencing.
 * Shows:
 * - Next recommended lesson (automatically determined)
 * - Overall progress overview across all subjects
 * - Quick actions (start lesson, view progress, browse subjects)
 *
 * Features:
 * - No manual lesson browsing required
 * - Prerequisites automatically enforced
 * - Progress tracking across curriculum paths
 * - Celebration when curriculum complete
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Day 21: Frontend)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgressOverview } from '@/components/ProgressOverview'
import {
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  Target
} from 'lucide-react'

interface Lesson {
  id: string
  title: string
  subject: string
  grade_level: number
  learning_objective: string
  estimated_duration: number | null
  difficulty: string | null
}

interface NextLessonResponse {
  success?: boolean
  completed?: boolean
  lesson?: Lesson
  progress?: {
    subject: string
    gradeLevel: number
    lessonsCompleted: number
    totalLessons: number
    percentComplete: number
    overallMasteryScore: number
  }
  message?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [gradeLevel, setGradeLevel] = useState<number>(3)
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<NextLessonResponse['progress'] | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)

      // Get userId from localStorage
      const storedUserId = localStorage.getItem('userId')
      const storedName = localStorage.getItem('userName') || 'Student'
      const storedGrade = parseInt(localStorage.getItem('userGrade') || '3', 10)

      setUserName(storedName)
      setUserId(storedUserId)
      setGradeLevel(storedGrade)

      if (!storedUserId) {
        // No user found - redirect to welcome
        router.push('/welcome')
        return
      }

      // Fetch next lesson for Math (primary subject for MVP)
      const response = await fetch(
        `/api/curriculum/next-lesson?userId=${storedUserId}&subject=math&gradeLevel=${storedGrade}`
      )

      if (!response.ok) {
        throw new Error('Failed to load next lesson')
      }

      const data: NextLessonResponse = await response.json()

      if (data.completed) {
        setIsComplete(true)
      } else if (data.lesson) {
        setNextLesson(data.lesson)
        setProgress(data.progress || null)
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleStartLesson() {
    if (nextLesson) {
      router.push(`/learn/${nextLesson.id}`)
    }
  }

  function handleViewProgress() {
    router.push('/progress')
  }

  function handleBrowseLessons() {
    router.push('/lessons')
  }

  // Get motivational greeting based on time of day
  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Get difficulty color
  function getDifficultyColor(difficulty: string | null) {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'hard':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Preparing your learning path...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4">
            <Button onClick={loadDashboard} className="flex-1">
              Try Again
            </Button>
            <Button onClick={handleBrowseLessons} variant="outline" className="flex-1">
              Browse Lessons
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Curriculum complete state
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full p-12 text-center">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-5xl font-bold mb-4 text-gray-800">
            Congratulations!
          </h1>
          <p className="text-2xl text-gray-700 mb-8">
            You've completed all {progress?.lessonsCompleted || 0} lessons for Math Grade {gradeLevel}!
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleViewProgress} size="lg">
              View Your Progress
            </Button>
            <Button onClick={handleBrowseLessons} variant="outline" size="lg">
              Explore More Subjects
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Main dashboard with next lesson
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Next Lesson Card (Hero) */}
        {nextLesson && (
          <Card className="mb-8 p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Target size={24} />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Today's Lesson
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{nextLesson.title}</h2>

            <p className="text-blue-100 mb-6 text-lg">{nextLesson.learning_objective}</p>

            <div className="flex flex-wrap items-center gap-6 text-sm mb-8">
              <div className="flex items-center gap-2">
                <BookOpen size={18} />
                <span className="capitalize">{nextLesson.subject}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Award size={18} />
                <span>Grade {nextLesson.grade_level}</span>
              </div>
              {nextLesson.estimated_duration && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span>~{nextLesson.estimated_duration} minutes</span>
                  </div>
                </>
              )}
              {nextLesson.difficulty && (
                <>
                  <span>•</span>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(
                      nextLesson.difficulty
                    )}`}
                  >
                    {nextLesson.difficulty}
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={handleStartLesson}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold text-lg px-8"
            >
              Start Learning
              <ChevronRight size={20} className="ml-2" />
            </Button>
          </Card>
        )}

        {/* Progress Overview */}
        {progress && (
          <Card className="mb-8 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="text-yellow-500" size={24} />
              <h3 className="text-2xl font-semibold text-gray-800">Your Progress</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Lessons Completed */}
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {progress.lessonsCompleted}/{progress.totalLessons}
                </div>
                <div className="text-sm text-gray-600">Lessons Completed</div>
              </div>

              {/* Completion Percentage */}
              <div>
                <div className="text-4xl font-bold text-green-600 mb-1">
                  {Math.round(progress.percentComplete)}%
                </div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>

              {/* Overall Mastery */}
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-1">
                  {Math.round(progress.overallMasteryScore)}%
                </div>
                <div className="text-sm text-gray-600">Mastery Score</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end px-2"
                style={{ width: `${progress.percentComplete}%` }}
              >
                <span className="text-xs text-white font-semibold">
                  {Math.round(progress.percentComplete)}%
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              {progress.totalLessons - progress.lessonsCompleted} lessons remaining in Math Grade{' '}
              {progress.gradeLevel}
            </p>
          </Card>
        )}

        {/* Curriculum Progress Overview (All Subjects) */}
        {userId && (
          <div className="mb-8">
            <ProgressOverview userId={userId} />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="p-6 hover:shadow-xl transition-all cursor-pointer group"
            onClick={handleViewProgress}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">View Detailed Progress</h4>
                <p className="text-sm text-gray-600">See your mastery scores and achievements</p>
              </div>
              <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </Card>

          <Card
            className="p-6 hover:shadow-xl transition-all cursor-pointer group"
            onClick={handleBrowseLessons}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <BookOpen className="text-purple-600" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">Browse All Lessons</h4>
                <p className="text-sm text-gray-600">Explore available subjects and topics</p>
              </div>
              <ChevronRight className="text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
