/**
 * GET /api/lessons
 *
 * Fetches all lessons from the database, ordered by grade level.
 * Used by the lesson selection screen to display available lessons.
 *
 * Response:
 * - lessons: Array of lesson objects with id, title, subject, grade_level,
 *   learning_objective, estimated_duration, difficulty
 *
 * Error Handling:
 * - 500: Database error
 *
 * Reference: https://supabase.com/docs/reference/javascript/select
 * Reference: https://supabase.com/docs/reference/javascript/order
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET() {
  try {
    // Fetch all lessons from database, ordered by grade level
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('grade_level', { ascending: true })

    if (error) {
      console.error('Database error fetching lessons:', error)
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      )
    }

    // Return lessons array
    return NextResponse.json({ lessons: data })
  } catch (error) {
    console.error('Error in /api/lessons:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
