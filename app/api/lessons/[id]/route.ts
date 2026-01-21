/**
 * GET /api/lessons/[id]
 *
 * Fetches a single lesson by ID from the database.
 * Used by the lesson intro screen to display lesson details.
 *
 * Params:
 * - id: Lesson UUID
 *
 * Response:
 * - Lesson object with id, title, subject, grade_level,
 *   learning_objective, estimated_duration, difficulty
 *
 * Error Handling:
 * - 404: Lesson not found
 * - 500: Database error
 *
 * Reference: https://supabase.com/docs/reference/javascript/select
 * Reference: https://supabase.com/docs/reference/javascript/single
 * Reference: Day 17 - Implementation_Roadmap.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate ID exists
    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      )
    }

    // Fetch single lesson from database by ID
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Database error fetching lesson:', error)

      // Check if lesson not found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch lesson' },
        { status: 500 }
      )
    }

    // Return lesson data
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in /api/lessons/[id]:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
