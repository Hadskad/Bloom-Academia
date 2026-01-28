'use client'

/**
 * AgentStats Component
 *
 * Displays performance metrics for all AI agents.
 * Part of the Admin Dashboard (Day 18).
 *
 * Shows for each agent:
 * - Total interactions handled
 * - Average effectiveness score
 * - Success rate percentage
 * - Last updated timestamp
 *
 * Reference: Implementation_Roadmap_2.md - Day 18
 */

import { useState, useEffect } from 'react'
import { RefreshCw, Users, TrendingUp, Award, Clock } from 'lucide-react'
import { getAgentInfo } from './TeacherAvatar'
import type { AgentPerformanceMetrics } from '@/lib/ai/types'

interface AgentWithMetrics {
  id: string
  name: string
  role: string
  status: string
  performance_metrics: AgentPerformanceMetrics
}

interface AgentStatsProps {
  /** Auto-refresh interval in milliseconds (0 to disable) */
  autoRefreshInterval?: number
}

/**
 * Format a number with commas for display
 */
function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Format a date string to relative time
 */
function formatLastUpdated(dateStr: string | undefined): string {
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
  return `${diffDays}d ago`
}

/**
 * Get color class based on success rate
 */
function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600'
  if (rate >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Get role display name
 */
function getRoleDisplay(role: string): string {
  switch (role) {
    case 'coordinator':
      return 'Coordinator'
    case 'subject':
      return 'Subject Specialist'
    case 'support':
      return 'Support Specialist'
    default:
      return role
  }
}

export function AgentStats({ autoRefreshInterval = 0 }: AgentStatsProps) {
  const [agents, setAgents] = useState<AgentWithMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  // Fetch agents data
  async function fetchAgents() {
    try {
      const response = await fetch('/api/admin/agents')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch agents')
      }

      setAgents(data.agents)
      setLastFetch(new Date())
      setError(null)
    } catch (err) {
      console.error('Error fetching agents:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh all agent metrics
  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      // First refresh metrics on server
      await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      })

      // Then fetch updated data
      await fetchAgents()
    } catch (err) {
      console.error('Error refreshing metrics:', err)
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchAgents()
  }, [])

  // Auto-refresh if enabled
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const interval = setInterval(fetchAgents, autoRefreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefreshInterval])

  // Calculate totals
  const totalInteractions = agents.reduce(
    (sum, agent) => sum + (agent.performance_metrics.total_interactions || 0),
    0
  )

  const avgSuccessRate =
    agents.length > 0
      ? agents.reduce(
          (sum, agent) => sum + (agent.performance_metrics.success_rate || 0),
          0
        ) / agents.length
      : 0

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Error loading agent stats</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAgents}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI Agents</h2>
          <p className="text-sm text-gray-500">
            {agents.length} active agents
            {lastFetch && ` • Updated ${formatLastUpdated(lastFetch.toISOString())}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh Metrics</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total Agents</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{agents.length}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total Interactions</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {formatNumber(totalInteractions)}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Avg Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {avgSuccessRate.toFixed(1)}%
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Active Status</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {agents.filter((a) => a.status === 'active').length}/{agents.length}
          </p>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const agentDisplay = getAgentInfo(agent.name)
          const metrics = agent.performance_metrics

          return (
            <div
              key={agent.id}
              className={`border rounded-lg p-4 ${agentDisplay.bgColor}`}
            >
              {/* Agent Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl" role="img" aria-label={agent.name}>
                  {agentDisplay.emoji}
                </span>
                <div>
                  <h3 className={`font-semibold ${agentDisplay.color}`}>
                    {agentDisplay.name}
                  </h3>
                  <p className="text-xs text-gray-500">{getRoleDisplay(agent.role)}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Interactions</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(metrics.total_interactions)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Effectiveness</span>
                  <span className="font-medium text-gray-900">
                    {metrics.avg_effectiveness.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span
                    className={`font-medium ${getSuccessRateColor(metrics.success_rate)}`}
                  >
                    {metrics.success_rate.toFixed(1)}%
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 mt-2">
                  <span className="text-xs text-gray-400">
                    Updated: {formatLastUpdated(metrics.last_updated)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No agents found</p>
          <p className="text-sm text-gray-400 mt-1">
            Make sure the database has been seeded with AI agents
          </p>
        </div>
      )}
    </div>
  )
}
