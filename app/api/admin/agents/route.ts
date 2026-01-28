/**
 * GET /api/admin/agents - Get all agents with performance metrics
 * POST /api/admin/agents/refresh - Refresh all agent metrics
 *
 * Day 18 Implementation: Agent Performance Tracking
 *
 * This endpoint provides admin access to AI agent performance data.
 *
 * GET Response:
 * {
 *   success: boolean,
 *   agents: Array<{
 *     id: string,
 *     name: string,
 *     role: string,
 *     status: string,
 *     performance_metrics: {
 *       total_interactions: number,
 *       avg_effectiveness: number,
 *       success_rate: number,
 *       last_updated: string
 *     }
 *   }>
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Day 18
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllAgentMetrics,
  refreshAllAgentMetrics
} from '@/lib/analytics/agent-performance';

/**
 * GET /api/admin/agents
 *
 * Fetch all active agents with their performance metrics.
 * Used by the admin dashboard to display agent stats.
 */
export async function GET() {
  try {
    const agents = await getAllAgentMetrics();

    return NextResponse.json({
      success: true,
      agents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agent metrics:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agent metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents
 *
 * Refresh all agent performance metrics.
 * Recalculates metrics from agent_interactions table.
 */
export async function POST(request: NextRequest) {
  try {
    // Check for refresh action
    const body = await request.json().catch(() => ({}));

    if (body.action === 'refresh') {
      await refreshAllAgentMetrics();

      return NextResponse.json({
        success: true,
        message: 'Agent metrics refreshed successfully',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use { "action": "refresh" }'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error refreshing agent metrics:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh agent metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
