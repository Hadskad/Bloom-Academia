'use client'

/**
 * SystemHealth Component
 *
 * Displays system health status for admin monitoring.
 * Shows AI agent status and external service health.
 *
 * Day 28 Implementation: System Health Monitoring
 *
 * Features:
 * - Service status indicators (Gemini API, Database, Voice)
 * - AI agent count and status summary
 * - Refresh functionality
 *
 * Note: Reuses existing AgentStats component for detailed agent info
 *
 * Reference: Implementation_Roadmap_2.md - Day 28
 */

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Server } from 'lucide-react'

/**
 * Interface for service status
 */
interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  message?: string
}

/**
 * Interface for health summary
 */
interface HealthSummary {
  totalAgents: number
  activeAgents: number
  avgSuccessRate: number
  totalInteractions: number
}

/**
 * Interface for the health response
 */
interface SystemHealthData {
  services: ServiceStatus[]
  summary: HealthSummary
  timestamp: string
}

/**
 * Get status icon component
 */
function getStatusIcon(status: 'healthy' | 'degraded' | 'down') {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'degraded':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    case 'down':
      return <XCircle className="w-5 h-5 text-red-500" />
    default:
      return <AlertCircle className="w-5 h-5 text-gray-500" />
  }
}

/**
 * Get status color classes
 */
function getStatusColor(status: 'healthy' | 'degraded' | 'down') {
  switch (status) {
    case 'healthy':
      return 'bg-green-50 border-green-200 text-green-700'
    case 'degraded':
      return 'bg-yellow-50 border-yellow-200 text-yellow-700'
    case 'down':
      return 'bg-red-50 border-red-200 text-red-700'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700'
  }
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch health data
  async function fetchHealth() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/health')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch health')
      }

      setHealth(data.health)
      setError(null)
    } catch (err) {
      console.error('Error fetching health:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchHealth()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Error loading system health</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchHealth}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!health) return null

  // Calculate overall status
  const allHealthy = health.services.every((s) => s.status === 'healthy')
  const hasDown = health.services.some((s) => s.status === 'down')
  const overallStatus = hasDown ? 'down' : allHealthy ? 'healthy' : 'degraded'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
            <p className="text-sm text-gray-500">
              {allHealthy
                ? 'All systems operational'
                : hasDown
                ? 'Some systems are down'
                : 'Some systems degraded'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg border ${getStatusColor(overallStatus)}`}
      >
        {getStatusIcon(overallStatus)}
        <div>
          <p className="font-medium">
            {overallStatus === 'healthy'
              ? 'All Systems Operational'
              : overallStatus === 'degraded'
              ? 'Partial System Degradation'
              : 'System Outage Detected'}
          </p>
          <p className="text-sm opacity-80">
            Last checked:{' '}
            {new Date(health.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {health.services.map((service) => (
          <div
            key={service.name}
            className={`p-4 rounded-lg border ${getStatusColor(service.status)}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(service.status)}
              <span className="font-medium">{service.name}</span>
            </div>
            {service.message && (
              <p className="text-sm opacity-80">{service.message}</p>
            )}
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">AI System Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Agents</p>
            <p className="text-2xl font-bold text-gray-900">
              {health.summary.totalAgents}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Agents</p>
            <p className="text-2xl font-bold text-green-600">
              {health.summary.activeAgents}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Success Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {health.summary.avgSuccessRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Interactions</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatNumber(health.summary.totalInteractions)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
