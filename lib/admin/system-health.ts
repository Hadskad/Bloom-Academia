/**
 * System Health Queries
 *
 * Backend functions for fetching system health status.
 * Used by the admin dashboard to display system status.
 *
 * Reports:
 * - AI agent status and performance
 * - API status (static for MVP)
 * - Database status (static for MVP)
 *
 * Reference: Implementation_Roadmap_2.md - Day 28 (System Health)
 * Supabase Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Interface for AI agent health info
 */
export interface AgentHealth {
  id: string
  name: string
  role: string
  status: string
  total_interactions: number
  success_rate: number
  avg_effectiveness: number
  last_updated: string | null
}

/**
 * Interface for service status
 */
export interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  message?: string
}

/**
 * Interface for the complete system health response
 */
export interface SystemHealthData {
  agents: AgentHealth[]
  services: ServiceStatus[]
  summary: {
    totalAgents: number
    activeAgents: number
    avgSuccessRate: number
    totalInteractions: number
  }
  timestamp: string
}

/**
 * Fetches AI agent health and performance data
 *
 * @returns Array of agent health information
 */
async function getAgentHealth(): Promise<AgentHealth[]> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, role, status, performance_metrics')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching agent health:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map(agent => {
    const metrics = agent.performance_metrics as {
      total_interactions?: number
      success_rate?: number
      avg_effectiveness?: number
      last_updated?: string
    } | null

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status || 'unknown',
      total_interactions: metrics?.total_interactions || 0,
      success_rate: metrics?.success_rate || 0,
      avg_effectiveness: metrics?.avg_effectiveness || 0,
      last_updated: metrics?.last_updated || null
    }
  })
}

/**
 * Gets service status (static for MVP)
 *
 * Returns static "healthy" status for all services.
 * In production, this would include actual health checks.
 *
 * @returns Array of service statuses
 */
function getServiceStatus(): ServiceStatus[] {
  return [
    {
      name: 'Gemini API',
      status: 'healthy',
      message: 'All AI services operational'
    },
    {
      name: 'Database',
      status: 'healthy',
      message: 'Supabase connection active'
    },
    {
      name: 'Voice Services',
      status: 'healthy',
      message: 'STT/TTS services available'
    }
  ]
}

/**
 * Fetches complete system health data
 *
 * Aggregates agent health and service status.
 * Called by /api/admin/health endpoint.
 *
 * @returns SystemHealthData with all health info
 *
 * @example
 * ```typescript
 * const health = await getSystemHealth()
 * console.log(`Active agents: ${health.summary.activeAgents}`)
 * console.log(`Services: ${health.services.length}`)
 * ```
 */
export async function getSystemHealth(): Promise<SystemHealthData> {
  const agents = await getAgentHealth()
  const services = getServiceStatus()

  // Calculate summary statistics
  const activeAgents = agents.filter(a => a.status === 'active').length
  const totalInteractions = agents.reduce((sum, a) => sum + a.total_interactions, 0)
  const avgSuccessRate =
    agents.length > 0
      ? Math.round(
          (agents.reduce((sum, a) => sum + a.success_rate, 0) / agents.length) * 10
        ) / 10
      : 0

  return {
    agents,
    services,
    summary: {
      totalAgents: agents.length,
      activeAgents,
      avgSuccessRate,
      totalInteractions
    },
    timestamp: new Date().toISOString()
  }
}
