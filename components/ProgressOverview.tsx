/**
 * ProgressOverview Component
 *
 * Displays student's progress across all curriculum paths.
 * Shows completion percentage, mastery score, and lesson counts.
 *
 * Features:
 * - Real-time progress fetching from API
 * - Visual progress bars for each subject
 * - Mastery percentage indicators
 * - Last activity timestamps
 *
 * Usage:
 * <ProgressOverview userId="user-uuid" />
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Day 21: Frontend)
 */

'use client'

import { useState, useEffect } from 'react'

interface CurriculumProgress {
  subject: string
  grade_level: number
  lessons_completed: number
  lessons_mastered: number
  total_lessons: number
  overall_mastery_score: number
  percentComplete: number
  masteryPercentage: number
  last_activity: string
}

interface ProgressOverviewProps {
  userId: string
}

export function ProgressOverview({ userId }: ProgressOverviewProps) {
  const [progress, setProgress] = useState<CurriculumProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProgress() {
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/curriculum/progress?userId=${userId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch progress')
        }

        setProgress(data.progress || [])
      } catch (err) {
        console.error('Error fetching curriculum progress:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [userId])

  // Format date/time
  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Capitalize subject name
  const formatSubject = (subject: string) => {
    return subject.charAt(0).toUpperCase() + subject.slice(1)
  }

  // Get color based on mastery percentage
  const getMasteryColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="progress-overview animate-pulse">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="progress-overview">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>Failed to load progress: {error}</p>
        </div>
      </div>
    )
  }

  if (progress.length === 0) {
    return (
      <div className="progress-overview">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-700 mb-2">No learning progress yet</p>
          <p className="text-sm text-blue-600">
            Start your first lesson to begin tracking progress!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="progress-overview">
      <h3 className="text-lg font-semibold mb-4">Your Progress</h3>

      <div className="space-y-4">
        {progress.map((p) => (
          <div
            key={`${p.subject}-${p.grade_level}`}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {formatSubject(p.subject)} - Grade {p.grade_level}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Last active: {formatLastActivity(p.last_activity)}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getMasteryColor(p.masteryPercentage)}`}>
                  {p.masteryPercentage}%
                </div>
                <div className="text-xs text-gray-500">mastery</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  {p.lessons_completed} / {p.total_lessons} lessons
                </span>
                <span>{p.percentComplete}% complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${p.percentComplete}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">Mastered:</span>{' '}
                <span className="font-semibold text-green-600">
                  {p.lessons_mastered}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Remaining:</span>{' '}
                <span className="font-semibold text-gray-700">
                  {p.total_lessons - p.lessons_completed}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
