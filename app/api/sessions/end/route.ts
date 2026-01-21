/**
 * POST /api/sessions/end
 *
 * Ends a learning session and calculates progress metrics.
 * Saves progress to database and suggests next lesson.
 *
 * Request Body:
 * - sessionId: UUID of the session to end
 *
 * Response:
 * - summary: Object containing session metrics and next lesson suggestion
 *   - studentName: Student's name
 *   - timeSpent: Minutes spent in session
 *   - questionsAsked: Number of interactions
 *   - masteryLevel: Calculated mastery percentage (0-100)
 *   - nextLesson: Suggested next lesson object
 *
 * Error Handling:
 * - 400: Missing sessionId
 * - 404: Session not found
 * - 500: Database error
 *
 * Reference: Implementation_Roadmap.md - Day 18-19, Day 20
 * Reference: Bloom_Academia_Backend.md - Progress tracking, Learning analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { analyzeSessionLearning } from '@/lib/memory/learning-analyzer'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    // Validate sessionId
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Get session data with user and lesson info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, users(*), lessons(*)')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('Database error fetching session:', sessionError)

      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      )
    }

    // Count interactions in this session
    const { count, error: countError } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (countError) {
      console.error('Error counting interactions:', countError)
      return NextResponse.json(
        { error: 'Failed to count interactions' },
        { status: 500 }
      )
    }

    // Calculate time spent in minutes
    const timeSpent = Math.round(
      (new Date().getTime() - new Date(session.started_at).getTime()) / 60000
    )

    // Simple mastery calculation (can be enhanced with AI later)
    // For MVP: each interaction = 10 points, capped at 100
    const masteryLevel = Math.min(100, (count || 0) * 10)

    // Update session with end time and metrics
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        ended_at: new Date().toISOString(),
        interaction_count: count || 0,
        effectiveness_score: masteryLevel,
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    // Upsert progress table
    const { error: progressError } = await supabase
      .from('progress')
      .upsert(
        {
          user_id: session.user_id,
          lesson_id: session.lesson_id,
          mastery_level: masteryLevel,
          time_spent: timeSpent,
          attempts: 1,
          completed: masteryLevel >= 70,
          last_accessed: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,lesson_id',
        }
      )
      .select()

    if (progressError) {
      console.error('Error upserting progress:', progressError)
      return NextResponse.json(
        { error: 'Failed to save progress' },
        { status: 500 }
      )
    }

    // Get next lesson (same subject, higher grade level)
    const { data: nextLesson, error: nextLessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('subject', session.lessons.subject)
      .gt('grade_level', session.lessons.grade_level)
      .order('grade_level', { ascending: true })
      .limit(1)
      .maybeSingle() // Use maybeSingle() instead of single() to handle no results

    if (nextLessonError) {
      console.error('Error fetching next lesson:', nextLessonError)
      // Don't fail the request, just use current lesson as fallback
    }

    // Trigger learning analysis in background (don't await - fire and forget)
    // This analyzes the session with Gemini and updates the user profile
    // Analysis runs asynchronously to keep response fast
    analyzeSessionLearning(session.user_id, sessionId).catch((error) => {
      console.error('Background learning analysis failed:', error)
      // Don't fail the request - analysis is non-critical for user experience
    })

    // Return summary
    return NextResponse.json({
      summary: {
        studentName: session.users.name,
        timeSpent,
        questionsAsked: count || 0,
        masteryLevel,
        nextLesson: nextLesson || session.lessons, // Fallback to current lesson
      },
    })
  } catch (error) {
    console.error('Error in /api/sessions/end:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
