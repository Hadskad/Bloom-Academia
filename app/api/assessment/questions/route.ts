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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  console.log(`[${requestId}] 🎯 Assessment questions API called`, {
    url: request.url,
    method: request.method
  })

  try {
    // Extract lessonId from query parameters
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    console.log(`[${requestId}] 📋 Request parameters:`, {
      lessonId,
      allParams: Object.fromEntries(searchParams.entries())
    })

    // Validate lessonId parameter
    if (!lessonId) {
      console.warn(`[${requestId}] ⚠️ Missing lessonId parameter`)
      return NextResponse.json(
        {
          error: 'Missing required parameter: lessonId',
          code: 'MISSING_LESSON_ID',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Validate UUID format (basic validation)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(lessonId)) {
      console.warn(`[${requestId}] ⚠️ Invalid UUID format:`, { lessonId })
      return NextResponse.json(
        {
          error: 'Invalid lessonId format. Must be a valid UUID.',
          code: 'INVALID_LESSON_ID',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Load assessment from database
    // Uses assessment-loader.ts created in Day 23
    console.log(`[${requestId}] 📚 Loading assessment for lesson ${lessonId}...`)
    const assessment = await getAssessmentForLesson(lessonId)

    console.log(`[${requestId}] ✅ Assessment loaded successfully:`, {
      assessmentId: assessment.id,
      title: assessment.title,
      questionCount: assessment.questions.length
    })

    // Security: Remove correct answers from questions
    // Frontend should never see the correct answers
    console.log(`[${requestId}] 🔒 Sanitizing questions (removing correct answers)...`)
    const sanitizedQuestions = assessment.questions.map((question: any) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options || [],  // MCQ options
      points: question.points,
      hint: question.hint,
      // NOTE: correct_answer is INTENTIONALLY EXCLUDED
    }))

    const totalDuration = Date.now() - startTime
    console.log(`[${requestId}] ✅ SUCCESS: Returning sanitized assessment (${totalDuration}ms)`, {
      questionCount: sanitizedQuestions.length,
      assessmentId: assessment.id
    })

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
    const totalDuration = Date.now() - startTime
    console.error(`[${requestId}] ❌ ERROR fetching assessment questions (${totalDuration}ms):`, {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      lessonId: new URL(request.url).searchParams.get('lessonId')
    })

    // Handle specific error cases
    if (error instanceof Error) {
      // Assessment not found
      if (error.message.includes('No assessment found')) {
        console.warn(`[${requestId}] 📭 Assessment not found for lesson`)
        return NextResponse.json(
          {
            error: 'No assessment found for this lesson',
            code: 'ASSESSMENT_NOT_FOUND',
            lessonId: new URL(request.url).searchParams.get('lessonId'),
            requestId,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        )
      }

      // Database error
      if (error.message.includes('Failed to fetch assessment')) {
        console.error(`[${requestId}] 💥 Database error - check Supabase connection and credentials`)
        return NextResponse.json(
          {
            error: 'Database error while fetching assessment',
            code: 'DATABASE_ERROR',
            requestId,
            timestamp: new Date().toISOString(),
            debugInfo: {
              errorMessage: error.message,
              duration: `${Date.now() - startTime}ms`
            }
          },
          { status: 500 }
        )
      }
    }

    // Generic error
    console.error(`[${requestId}] ❌ Unexpected error - returning generic 500`)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while fetching assessment questions',
        code: 'INTERNAL_ERROR',
        requestId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
