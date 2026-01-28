/**
 * Assessment Questions API Endpoint
 *
 * GET /api/assessment/questions?lessonId=xxx
 *
 * Returns assessment questions for a lesson WITHOUT correct answers
 * (security measure to prevent cheating via browser DevTools)
 *
 * Flow:
 * 1. Validate lessonId parameter
 * 2. Load assessment from database
 * 3. Strip correct_answer from questions
 * 4. Return sanitized assessment data
 *
 * Reference: Implementation_Roadmap_2.md - Day 24 (Assessment Conductor)
 * Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAssessmentForLesson } from '@/lib/assessment/assessment-loader'

/**
 * GET handler for fetching assessment questions
 *
 * Query Parameters:
 * - lessonId: UUID of the lesson
 *
 * Security Note:
 * - correct_answer field is REMOVED from response
 * - This prevents students from viewing answers in browser DevTools
 * - Answers are only available to the grading endpoint
 *
 * @example
 * ```
 * GET /api/assessment/questions?lessonId=abc-123
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // Extract lessonId from query parameters
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    // Validate lessonId parameter
    if (!lessonId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: lessonId',
          code: 'MISSING_LESSON_ID',
        },
        { status: 400 }
      )
    }

    // Validate UUID format (basic validation)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(lessonId)) {
      return NextResponse.json(
        {
          error: 'Invalid lessonId format. Must be a valid UUID.',
          code: 'INVALID_LESSON_ID',
        },
        { status: 400 }
      )
    }

    // Load assessment from database
    // Uses assessment-loader.ts created in Day 23
    const assessment = await getAssessmentForLesson(lessonId)

    // Security: Remove correct answers from questions
    // Frontend should never see the correct answers
    const sanitizedQuestions = assessment.questions.map((question: any) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options || [],  // MCQ options
      points: question.points,
      hint: question.hint,
      // NOTE: correct_answer is INTENTIONALLY EXCLUDED
    }))

    // Return sanitized assessment data
    return NextResponse.json({
      assessmentId: assessment.id,
      lessonId: assessment.lesson_id,
      title: assessment.title,
      description: assessment.description,
      passingScore: assessment.passing_score,
      timeLimitMinutes: assessment.time_limit_minutes,
      maxAttempts: assessment.max_attempts,
      questionCount: sanitizedQuestions.length,
      questions: sanitizedQuestions,
    })
  } catch (error) {
    console.error('Error fetching assessment questions:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      // Assessment not found
      if (error.message.includes('No assessment found')) {
        return NextResponse.json(
          {
            error: 'No assessment found for this lesson',
            code: 'ASSESSMENT_NOT_FOUND',
            lessonId: new URL(request.url).searchParams.get('lessonId'),
          },
          { status: 404 }
        )
      }

      // Database error
      if (error.message.includes('Failed to fetch assessment')) {
        return NextResponse.json(
          {
            error: 'Database error while fetching assessment',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        )
      }
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while fetching assessment questions',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
