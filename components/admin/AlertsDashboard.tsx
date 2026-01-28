'use client'

/**
 * AlertsDashboard Component
 *
 * Displays struggling students alerts for admin monitoring.
 * Shows students with low mastery and inactive students.
 *
 * Day 28 Implementation: Struggling Students Alert
 *
 * Features:
 * - Low mastery students (<70%) section
 * - Inactive students (7+ days) section
 * - View Details button for each student
 * - Refresh functionality
 *
 * Reference: Implementation_Roadmap_2.md - Day 28
 */

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Moon,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Clock
} from 'lucide-react'

/**
 * Interface for a student with low mastery
 */
interface LowMasteryStudent {
  user_id: string
  user_name: string
  user_age: number
  subject: string
  grade_level: number
  overall_mastery_score: number
  lessons_completed: number
  lessons_mastered: number
}

/**
 * Interface for an inactive student
 */
interface InactiveStudent {
  id: string
  name: string
  age: number
  grade_level: number
  last_session_at: string | null
  days_inactive: number
}

/**
 * Interface for the alerts response
 */
interface AlertsData {
  lowMastery: LowMasteryStudent[]
  inactive: InactiveStudent[]
  timestamp: string
}

interface AlertsDashboardProps {
  /** Callback when a student is selected */
  onSelectStudent: (studentId: string) => void
}

/**
 * Format last session date
 */
function formatLastSession(dateStr: string | null, daysInactive: number): string {
  if (!dateStr || daysInactive >= 999) {
    return 'Never logged in'
  }

  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get mastery color class
 */
function getMasteryColor(mastery: number): string {
  if (mastery >= 60) return 'text-yellow-600 bg-yellow-100'
  if (mastery >= 40) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

/**
 * Capitalize first letter of subject
 */
function capitalizeSubject(subject: string): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1)
}

export function AlertsDashboard({ onSelectStudent }: AlertsDashboardProps) {
  const [alerts, setAlerts] = useState<AlertsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch alerts data
  async function fetchAlerts() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/alerts')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch alerts')
      }

      setAlerts(data.alerts)
      setError(null)
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAlerts()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Error loading alerts</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAlerts}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!alerts) return null

  const hasAlerts = alerts.lowMastery.length > 0 || alerts.inactive.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Student Alerts</h2>
          <p className="text-sm text-gray-500">
            {hasAlerts
              ? `${alerts.lowMastery.length + alerts.inactive.length} students need attention`
              : 'All students are on track'}
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* No Alerts State */}
      {!hasAlerts && (
        <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-green-700 font-medium">All students are doing well!</p>
          <p className="text-green-600 text-sm mt-1">
            No students currently need attention
          </p>
        </div>
      )}

      {/* Low Mastery Section */}
      {alerts.lowMastery.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900">
              Low Mastery ({alerts.lowMastery.length})
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Students scoring below 70% on average
          </p>

          <div className="space-y-3">
            {alerts.lowMastery.map((student) => (
              <div
                key={`${student.user_id}-${student.subject}`}
                className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.user_name}</p>
                    <p className="text-sm text-gray-600">
                      {capitalizeSubject(student.subject)} - Grade {student.grade_level}
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.lessons_completed} lessons, {student.lessons_mastered} mastered
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getMasteryColor(
                      student.overall_mastery_score
                    )}`}
                  >
                    {student.overall_mastery_score.toFixed(1)}%
                  </span>
                  <button
                    onClick={() => onSelectStudent(student.user_id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-200 rounded-md transition-colors"
                  >
                    View
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inactive Students Section */}
      {alerts.inactive.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-900">
              Inactive ({alerts.inactive.length})
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Students who haven&apos;t logged in for 7+ days
          </p>

          <div className="space-y-3">
            {alerts.inactive.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-600">
                      {student.age} years old - Grade {student.grade_level}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last session: {formatLastSession(student.last_session_at, student.days_inactive)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    {student.days_inactive >= 999
                      ? 'Never active'
                      : `${student.days_inactive}d ago`}
                  </span>
                  <button
                    onClick={() => onSelectStudent(student.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    View
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
