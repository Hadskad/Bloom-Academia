/**
 * Admin System Health API Route
 *
 * GET /api/admin/health - Get system health status
 *
 * Day 28 Implementation: System Health Monitoring
 *
 * Returns:
 * {
 *   success: boolean,
 *   health: {
 *     agents: Array<AgentHealth>,
 *     services: Array<ServiceStatus>,
 *     summary: { totalAgents, activeAgents, avgSuccessRate, totalInteractions },
 *     timestamp: string
 *   }
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Day 28
 */

import { NextResponse } from 'next/server'
import { getSystemHealth } from '@/lib/admin/system-health'

/**
 * GET /api/admin/health
 *
 * Fetches system health data for the admin dashboard.
 * Returns AI agent status and service health.
 * No authentication required for MVP.
 *
 * @returns JSON response with health data or error
 */
export async function GET() {
  try {
    const health = await getSystemHealth()

    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching system health:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch system health',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
