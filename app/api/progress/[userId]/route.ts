/**
 * Progress API Route
 *
 * GET /api/progress/[userId]
 * Retrieves learning progress for a specific user, including:
 * - All lessons attempted by the user
 * - Mastery levels, time spent, and completion status
 * - Associated lesson details
 *
 * Returns progress ordered by last_accessed (most recent first)
 *
 * Reference: Implementation_Roadmap.md - Day 24-25
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{
    userId: string
  }>
}

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
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Query progress with lesson details
    // Using Supabase's relational queries to join with lessons table
    const { data, error } = await supabase
      .from('progress')
      .select(`
        *,
        lessons (
          id,
          title,
          subject,
          grade_level,
          learning_objective,
          estimated_duration,
          difficulty
        )
      `)
      .eq('user_id', userId)
      .order('last_accessed', { ascending: false })

    if (error) {
      console.error('Supabase error fetching progress:', error)
      return NextResponse.json(
        { error: 'Failed to fetch progress data', details: error.message },
        { status: 500 }
      )
    }

    // Return empty array if no progress found (valid state for new users)
    return NextResponse.json({
      success: true,
      progress: data || []
    })

  } catch (error) {
    console.error('Error in progress API route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
