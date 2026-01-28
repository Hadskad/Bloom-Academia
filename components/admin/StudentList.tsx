'use client'

/**
 * StudentList Component
 *
 * Displays a table of all students with their key metrics.
 * Allows clicking on a student to view detailed information.
 *
 * Day 27 Implementation: Student List + Individual Progress View
 *
 * Features:
 * - Sortable table with student info
 * - Color-coded mastery scores
 * - Formatted last active dates
 * - Click to view details
 *
 * Reference: Implementation_Roadmap_2.md - Day 27
 */

import { useState, useEffect } from 'react'
import { Users, ChevronRight, RefreshCw } from 'lucide-react'

/**
 * Interface for student list item (from existing API)
 */
interface StudentListItem {
  id: string
  name: string
  age: number
  grade_level: number
  created_at: string
  total_learning_time: number
  avgMastery: number
  lastActive: string | null
}

interface StudentListProps {
  /** Callback when a student is selected */
  onSelectStudent: (studentId: string) => void
}

/**
 * Format a date to a relative time string
 */
function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'Never'

  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

/**
 * Get color class based on mastery score
 */
function getMasteryColor(mastery: number): string {
  if (mastery >= 80) return 'text-green-600 bg-green-100'
  if (mastery >= 60) return 'text-yellow-600 bg-yellow-100'
  if (mastery > 0) return 'text-red-600 bg-red-100'
  return 'text-gray-500 bg-gray-100'
}

/**
 * Format learning time in minutes to a readable format
 */
function formatLearningTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function StudentList({ onSelectStudent }: StudentListProps) {
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch students
  async function fetchStudents() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/students')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students')
      }

      setStudents(data.students || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchStudents()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded" />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Error loading students</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchStudents}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (students.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No students found</p>
        <p className="text-sm text-gray-400 mt-1">
          Students will appear here once they sign up
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Students</h3>
          <p className="text-sm text-gray-500">{students.length} total students</p>
        </div>
        <button
          onClick={fetchStudents}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Name
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Grade
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Avg Mastery
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Learning Time
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                Last Active
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onSelectStudent(student.id)}
              >
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.age} years old</p>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    Grade {student.grade_level}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getMasteryColor(
                      student.avgMastery
                    )}`}
                  >
                    {student.avgMastery > 0 ? `${student.avgMastery.toFixed(1)}%` : 'N/A'}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {formatLearningTime(student.total_learning_time)}
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {formatLastActive(student.lastActive)}
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectStudent(student.id)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:text-primary/80 hover:bg-primary/10 rounded-md transition-colors"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
