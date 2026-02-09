/**
 * Mastery Evidence Recording API
 *
 * POST /api/kernel/mastery/record-evidence
 *
 * Records student learning evidence for rules-based mastery detection.
 * Called during lessons when student demonstrates learning behavior.
 *
 * Reference: Phase 1 - Curriculum Builder System
 */

import { NextRequest, NextResponse } from 'next/server'
import { recordMasteryEvidence } from '@/lib/kernel/mastery-detector'

/**
 * POST handler - Record mastery evidence
 *
 * Body:
 * {
 *   userId: string,
 *   lessonId: string,
 *   sessionId: string,
 *   evidenceType: 'correct_answer' | 'incorrect_answer' | 'explanation' | 'application' | 'struggle',
 *   content: string,
 *   metadata?: {
 *     quality_score?: number,
 *     confidence?: number,
 *     context?: string
 *   }
 * }
 *
 * Returns:
 * - Success confirmation
 *
 * @example
 * POST /api/kernel/mastery/record-evidence
 * Body: {
 *   userId: "abc-123",
 *   lessonId: "lesson-uuid",
 *   sessionId: "session-uuid",
 *   evidenceType: "correct_answer",
 *   content: "The answer is 68"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, lessonId, sessionId, evidenceType, content, metadata } = body

    // Validate required fields
    if (!userId || !lessonId || !sessionId || !evidenceType || !content) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['userId', 'lessonId', 'sessionId', 'evidenceType', 'content']
        },
        { status: 400 }
      )
    }

    // Validate evidence type
    const validTypes = ['correct_answer', 'incorrect_answer', 'explanation', 'application', 'struggle']
    if (!validTypes.includes(evidenceType)) {
      return NextResponse.json(
        {
          error: `Invalid evidenceType: must be one of ${validTypes.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Record evidence
    await recordMasteryEvidence(
      userId,
      lessonId,
      sessionId,
      evidenceType,
      content,
      metadata
    )

    return NextResponse.json({
      success: true,
      message: 'Evidence recorded successfully',
      evidenceType
    })
  } catch (error) {
    console.error('Error in POST /api/kernel/mastery/record-evidence:', error)
    return NextResponse.json(
      {
        error: 'Failed to record evidence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
