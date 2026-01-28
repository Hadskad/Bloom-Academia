/**
 * Admin Stats API Route
 *
 * GET /api/admin/stats - Get school-wide statistics
 *
 * Day 26 Implementation: Admin Dashboard KPIs
 *
 * Returns:
 * {
 *   success: boolean,
 *   stats: {
 *     totalStudents: number,
 *     activeStudentsToday: number,
 *     avgMasteryScore: number,
 *     lessonsCompletedToday: number,
 *     timestamp: string
 *   }
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Day 26
 * Supabase Docs: https://supabase.com/docs/reference/javascript/select
 */

import { NextResponse } from 'next/server'
import { getSchoolStats } from '@/lib/admin/stats-queries'

/**
 * GET /api/admin/stats
 *
 * Fetches school-wide statistics for the admin dashboard.
 * No authentication required for MVP (skip as per user instruction).
 *
 * @returns JSON response with stats or error
 */
export async function GET() {
  try {
    const stats = await getSchoolStats()

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch school statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
