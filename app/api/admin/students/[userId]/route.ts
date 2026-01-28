/**
 * Individual Student Details API Route
 *
 * GET /api/admin/students/[userId] - Get detailed info for a specific student
 *
 * Day 27 Implementation: Student List + Individual Progress View
 *
 * Returns:
 * {
 *   success: boolean,
 *   student: {
 *     user: { id, name, age, grade_level, ... },
 *     progress: Array<SubjectProgress>,
 *     recentSessions: Array<RecentSession>,
 *     totalLessonsCompleted: number,
 *     totalLessonsMastered: number,
 *     overallAvgMastery: number,
 *     lastActiveAt: string | null
 *   }
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Day 27
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStudentDetails } from '@/lib/admin/student-details'

/**
 * Route params interface for Next.js 15
 * In Next.js 15, params is a Promise that must be awaited
 */
interface RouteParams {
  params: Promise<{
    userId: string
  }>
}

/**
 * GET /api/admin/students/[userId]
 *
 * Fetches detailed information for a specific student.
 * No authentication required for MVP (skip as per user instruction).
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing userId
 * @returns JSON response with student details or error
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Await params in Next.js 15
    const { userId } = await params

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: userId'
        },
        { status: 400 }
      )
    }

    // Fetch student details
    const student = await getStudentDetails(userId)

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      student,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching student details:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch student details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
