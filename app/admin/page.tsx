'use client'

/**
 * Admin Dashboard Page
 *
 * Day 18 Implementation: Agent Performance Tracking
 * Day 26 Implementation: School-wide KPIs
 * Day 27 Implementation: Student List + Individual Progress View
 * Day 28 Implementation: Struggling Students Alert + System Health
 *
 * Provides admin access to:
 * - School-wide KPIs (total students, active today, avg mastery, lessons today)
 * - Student list with details view
 * - Student alerts (low mastery, inactive students)
 * - AI agent performance metrics
 * - System health status
 * - Total interactions across all agents
 * - Success rates and effectiveness scores
 *
 * Reference: Implementation_Roadmap_2.md - Day 18, Day 26, Day 27, Day 28
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Users, UserCheck, BookOpen, Award, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { AgentStats } from '@/components/AgentStats'
import { StudentList } from '@/components/admin/StudentList'
import { StudentDetail } from '@/components/admin/StudentDetail'
import { AlertsDashboard } from '@/components/admin/AlertsDashboard'
import { SystemHealth } from '@/components/admin/SystemHealth'

/**
 * Interface for school statistics from API
 */
interface SchoolStats {
  totalStudents: number
  activeStudentsToday: number
  avgMasteryScore: number
  lessonsCompletedToday: number
  timestamp: string
}

/**
 * KPI Card Component
 * Displays a single metric with icon and styling
 */
function KPICard({
  title,
  value,
  icon: Icon,
  colorClass
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
}) {
  return (
    <div className={`rounded-xl p-6 ${colorClass}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 opacity-80" />
        <span className="text-sm font-medium uppercase tracking-wide opacity-80">
          {title}
        </span>
      </div>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SchoolStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // Fetch school statistics
  async function fetchStats() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }

      setStats(data.stats)
      setError(null)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-bold text-gray-900">School Dashboard</h1>
            </div>
            <span className="text-sm text-gray-500">
              Bloom Academia
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">School Overview</h2>
            <p className="text-gray-600 mt-1">
              Monitor school performance and student progress
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>

        {/* KPI Cards Section */}
        <section className="mb-8">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 font-medium">Error loading statistics</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <button
                onClick={fetchStats}
                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-gray-200 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Students"
                value={stats.totalStudents.toLocaleString()}
                icon={Users}
                colorClass="bg-blue-600 text-white"
              />
              <KPICard
                title="Active Today"
                value={stats.activeStudentsToday.toLocaleString()}
                icon={UserCheck}
                colorClass="bg-green-600 text-white"
              />
              <KPICard
                title="Lessons Today"
                value={stats.lessonsCompletedToday.toLocaleString()}
                icon={BookOpen}
                colorClass="bg-purple-600 text-white"
              />
              <KPICard
                title="Avg Mastery"
                value={`${stats.avgMasteryScore.toFixed(1)}%`}
                icon={Award}
                colorClass="bg-amber-500 text-white"
              />
            </div>
          ) : null}
        </section>

        {/* Student Alerts Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Student Alerts</h3>
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <AlertsDashboard onSelectStudent={(id) => setSelectedStudentId(id)} />
          </section>
        </div>

        {/* Student List Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Student Management</h3>
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <StudentList onSelectStudent={(id) => setSelectedStudentId(id)} />
          </section>
        </div>

        {/* System Health Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">System Health</h3>
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SystemHealth />
          </section>
        </div>

        {/* AI Agents Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">AI Agents</h3>
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <AgentStats autoRefreshInterval={60000} />
          </section>
        </div>

        {/* Footer Info */}
        <footer className="mt-8 text-center text-sm text-gray-400">
          <p>Day 28: Admin Dashboard with Alerts + System Health</p>
          <p className="mt-1">
            Statistics refresh manually. Agent metrics update automatically.
          </p>
        </footer>
      </main>

      {/* Student Detail Modal */}
      {selectedStudentId && (
        <StudentDetail
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  )
}
