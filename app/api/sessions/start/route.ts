/**
 * POST /api/sessions/start
 *
 * Starts a new learning session for a user and lesson.
 * Creates a session record in the database to track interactions and progress.
 *
 * Request Body:
 * - userId: UUID of the user
 * - lessonId: UUID of the lesson
 *
 * Response:
 * - sessionId: UUID of the created session
 * - startedAt: Timestamp when session started
 *
 * Error Handling:
 * - 400: Missing required fields
 * - 500: Database error
 *
 * Reference: Database schema - sessions table
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { userId, lessonId } = await request.json()

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId is required' },
        { status: 400 }
      )
    }

    // Create session in database
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        lesson_id: lessonId
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating session:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Return session ID and start time
    return NextResponse.json({
      sessionId: data.id,
      startedAt: data.started_at
    })
  } catch (error) {
    console.error('Error in /api/sessions/start:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
