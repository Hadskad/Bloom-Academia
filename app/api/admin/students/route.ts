/**
 * Admin Students API Route
 *
 * GET /api/admin/students - Get list of all students with progress summary
 *
 * Day 26 Implementation: Admin Dashboard
 *
 * Returns:
 * {
 *   success: boolean,
 *   students: Array<{
 *     id: string,
 *     name: string,
 *     age: number,
 *     grade_level: number,
 *     created_at: string,
 *     total_learning_time: number,
 *     avgMastery: number,
 *     lastActive: string | null
 *   }>,
 *   count: number,
 *   timestamp: string
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Day 26
 */

import { NextResponse } from 'next/server'
import { getStudentList } from '@/lib/admin/stats-queries'

/**
 * GET /api/admin/students
 *
 * Fetches list of all students with their progress summary.
 * No authentication required for MVP (skip as per user instruction).
 *
 * @returns JSON response with student list or error
 */
export async function GET() {
  try {
    const students = await getStudentList()

    return NextResponse.json({
      success: true,
      students,
      count: students.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching student list:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch student list',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
