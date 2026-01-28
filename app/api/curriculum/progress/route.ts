/**
 * Curriculum Progress API Route
 *
 * GET /api/curriculum/progress?userId=<uuid>
 *
 * Retrieves a student's progress across all curriculum paths (all subjects/grades)
 *
 * Returns:
 * - Array of progress objects for each subject/grade combination
 * - Empty array if student hasn't started any curriculum
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Curriculum Sequencing)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Get all curriculum progress for this user
    const { data: progressData, error } = await supabase
      .from('student_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })

    if (error) {
      console.error('Error fetching curriculum progress:', error)
      return NextResponse.json(
        { error: 'Failed to fetch curriculum progress', details: error.message },
        { status: 500 }
      )
    }

    // Calculate percentage complete for each progress record
    const progressWithStats = (progressData || []).map(progress => ({
      ...progress,
      percentComplete: progress.total_lessons > 0
        ? Math.round((progress.lessons_completed / progress.total_lessons) * 100)
        : 0,
      masteryPercentage: Math.round(progress.overall_mastery_score)
    }))

    return NextResponse.json({
      success: true,
      progress: progressWithStats
    })
  } catch (error) {
    console.error('Error in curriculum progress API route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
