/**
 * Next Lesson API Route
 *
 * GET /api/curriculum/next-lesson?userId=<uuid>&subject=<subject>&gradeLevel=<number>
 *
 * Determines the next lesson a student should take based on:
 * - Curriculum sequencing
 * - Completion status
 * - Prerequisite requirements
 *
 * Returns:
 * - Next lesson object if available
 * - Completion message if all lessons done
 * - Error if parameters invalid or curriculum not found
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Curriculum Sequencing)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNextLesson, getCurriculumProgressSummary } from '@/lib/curriculum/next-lesson'

/**
 * GET handler for next lesson endpoint
 *
 * Query Parameters:
 * - userId (required): User's unique identifier
 * - subject (required): Subject name ('math', 'science', 'english', 'history', 'art')
 * - gradeLevel (required): Grade level (1-12)
 *
 * @example
 * GET /api/curriculum/next-lesson?userId=abc-123&subject=math&gradeLevel=3
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const subject = searchParams.get('subject')
    const gradeLevelStr = searchParams.get('gradeLevel')

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Missing required parameter: subject' },
        { status: 400 }
      )
    }

    if (!gradeLevelStr) {
      return NextResponse.json(
        { error: 'Missing required parameter: gradeLevel' },
        { status: 400 }
      )
    }

    // Parse and validate grade level
    const gradeLevel = parseInt(gradeLevelStr, 10)
    if (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
      return NextResponse.json(
        { error: 'Invalid gradeLevel: must be a number between 1 and 12' },
        { status: 400 }
      )
    }

    // Validate subject
    const validSubjects = ['math', 'science', 'english', 'history', 'art', 'other']
    if (!validSubjects.includes(subject.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Invalid subject: must be one of ${validSubjects.join(', ')}`,
          hint: 'Subject names should be lowercase'
        },
        { status: 400 }
      )
    }

    // Get next lesson
    const nextLesson = await getNextLesson(
      userId,
      subject.toLowerCase(),
      gradeLevel
    )

    // If no next lesson, curriculum is complete
    if (!nextLesson) {
      // Get progress summary for completion message
      const progressSummary = await getCurriculumProgressSummary(
        userId,
        subject.toLowerCase(),
        gradeLevel
      )

      return NextResponse.json({
        completed: true,
        message: `Congratulations! You've completed all ${progressSummary?.lessonsCompleted || 0} lessons for ${subject} Grade ${gradeLevel}.`,
        progress: progressSummary
      })
    }

    // Return next lesson with progress context
    const progressSummary = await getCurriculumProgressSummary(
      userId,
      subject.toLowerCase(),
      gradeLevel
    )

    return NextResponse.json({
      success: true,
      lesson: nextLesson,
      progress: progressSummary,
      message: `Ready for: ${nextLesson.title}`
    })
  } catch (error) {
    console.error('Error in next-lesson API route:', error)
    return NextResponse.json(
      {
        error: 'Failed to determine next lesson',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
