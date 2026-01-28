/**
 * Admin Alerts API Route
 *
 * GET /api/admin/alerts - Get struggling students alerts
 *
 * Day 28 Implementation: Struggling Students Alert
 *
 * Returns:
 * {
 *   success: boolean,
 *   alerts: {
 *     lowMastery: Array<LowMasteryStudent>,
 *     inactive: Array<InactiveStudent>,
 *     timestamp: string
 *   },
 *   counts: {
 *     lowMastery: number,
 *     inactive: number
 *   }
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Day 28
 */

import { NextResponse } from 'next/server'
import { getStrugglingStudents } from '@/lib/admin/struggling-students'

/**
 * GET /api/admin/alerts
 *
 * Fetches struggling students data for the admin dashboard.
 * Returns both low mastery and inactive students.
 * No authentication required for MVP.
 *
 * @returns JSON response with alerts or error
 */
export async function GET() {
  try {
    const alerts = await getStrugglingStudents()

    return NextResponse.json({
      success: true,
      alerts,
      counts: {
        lowMastery: alerts.lowMastery.length,
        inactive: alerts.inactive.length
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching struggling students:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch struggling students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
