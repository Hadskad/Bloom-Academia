'use client'

/**
 * StudentDetail Component
 *
 * Displays detailed information for a specific student in a modal/drawer.
 * Shows progress by subject and recent activity timeline.
 *
 * Day 27 Implementation: Student List + Individual Progress View
 *
 * Features:
 * - Student profile summary
 * - Progress bars for each subject
 * - Recent session timeline
 * - Close button to return to list
 *
 * Reference: Implementation_Roadmap_2.md - Day 27
 */

import { useState, useEffect } from 'react'
import {
  X,
  User,
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Calendar
} from 'lucide-react'

/**
 * Interface for subject progress
 */
interface SubjectProgress {
  id: string
  subject: string
  grade_level: number
  lessons_completed: number
  lessons_mastered: number
  total_lessons: number
  overall_mastery_score: number
  last_activity: string | null
  percentComplete: number
}

/**
 * Interface for recent session
 */
interface RecentSession {
  id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  interaction_count: number
}

/**
 * Interface for complete student details
 */
interface StudentDetails {
  user: {
    id: string
    name: string
    age: number
    grade_level: number
    learning_style: string | null
    strengths: string[]
    struggles: string[]
    total_learning_time: number
    created_at: string
  }
  progress: SubjectProgress[]
  recentSessions: RecentSession[]
  totalLessonsCompleted: number
  totalLessonsMastered: number
  overallAvgMastery: number
  lastActiveAt: string | null
}

interface StudentDetailProps {
  /** Student ID to fetch details for */
  studentId: string
  /** Callback to close the detail view */
  onClose: () => void
}

/**
 * Format a date to readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format a datetime to readable format with time
 */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Format learning time in minutes to readable format
 */
function formatLearningTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
}

/**
 * Get color class based on mastery score
 */
function getMasteryColorClass(mastery: number): string {
  if (mastery >= 80) return 'text-green-600'
  if (mastery >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Get progress bar color based on mastery
 */
function getProgressBarColor(mastery: number): string {
  if (mastery >= 80) return 'bg-green-500'
  if (mastery >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

/**
 * Capitalize first letter of subject
 */
function capitalizeSubject(subject: string): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1)
}

export function StudentDetail({ studentId, onClose }: StudentDetailProps) {
  const [details, setDetails] = useState<StudentDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch student details
  useEffect(() => {
    async function fetchDetails() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/admin/students/${studentId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch student details')
        }

        setDetails(data.student)
        setError(null)
      } catch (err) {
        console.error('Error fetching student details:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetails()
  }, [studentId])

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-md m-4 p-6">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Error loading student</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!details) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{details.user.name}</h2>
              <p className="text-sm text-gray-500">
                {details.user.age} years old • Grade {details.user.grade_level}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Lessons</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {details.totalLessonsCompleted}
              </p>
              <p className="text-xs text-blue-600">completed</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Mastered</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {details.totalLessonsMastered}
              </p>
              <p className="text-xs text-green-600">lessons (80%+)</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Avg Mastery</span>
              </div>
              <p className={`text-2xl font-bold ${getMasteryColorClass(details.overallAvgMastery)}`}>
                {details.overallAvgMastery.toFixed(1)}%
              </p>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Time</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {Math.floor(details.user.total_learning_time / 60) || 0}h
              </p>
              <p className="text-xs text-amber-600">total learning</p>
            </div>
          </div>

          {/* Student Info */}
          {(details.user.learning_style || details.user.strengths.length > 0 || details.user.struggles.length > 0) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Learning Profile</h3>
              <div className="space-y-2 text-sm">
                {details.user.learning_style && (
                  <p>
                    <span className="text-gray-500">Learning Style:</span>{' '}
                    <span className="text-gray-900 capitalize">{details.user.learning_style}</span>
                  </p>
                )}
                {details.user.strengths.length > 0 && (
                  <p>
                    <span className="text-gray-500">Strengths:</span>{' '}
                    <span className="text-gray-900">{details.user.strengths.join(', ')}</span>
                  </p>
                )}
                {details.user.struggles.length > 0 && (
                  <p>
                    <span className="text-gray-500">Areas to improve:</span>{' '}
                    <span className="text-gray-900">{details.user.struggles.join(', ')}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Progress by Subject */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Progress by Subject</h3>
            {details.progress.length > 0 ? (
              <div className="space-y-4">
                {details.progress.map((p) => (
                  <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {capitalizeSubject(p.subject)} - Grade {p.grade_level}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {p.lessons_completed} of {p.total_lessons} lessons completed
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${getMasteryColorClass(p.overall_mastery_score)}`}>
                        {p.overall_mastery_score.toFixed(1)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className={`h-2.5 rounded-full transition-all ${getProgressBarColor(p.overall_mastery_score)}`}
                        style={{ width: `${p.percentComplete}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{p.percentComplete}% complete</span>
                      <span>{p.lessons_mastered} mastered</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                No subject progress recorded yet
              </p>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
            {details.recentSessions.length > 0 ? (
              <div className="space-y-2">
                {details.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateTime(session.started_at)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.interaction_count} interactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {session.duration_minutes !== null ? (
                        <p className="text-sm text-gray-600">
                          {session.duration_minutes} min
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">In progress</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                No recent sessions recorded
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-400">
            <p>Student since {formatDate(details.user.created_at)}</p>
            {details.lastActiveAt && (
              <p>Last active: {formatDateTime(details.lastActiveAt)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
