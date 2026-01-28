/**
 * Assessment Grading API Endpoint
 *
 * POST /api/assessment/grade
 *
 * Grades student answers using Assessor AI, saves attempt to database,
 * and updates progress if the assessment is passed.
 *
 * Flow:
 * 1. Validate request body
 * 2. Load assessment with correct answers
 * 3. Grade each answer using Assessor AI
 * 4. Calculate final score
 * 5. Save attempt to database
 * 6. Update lesson progress if passed
 * 7. Get next lesson if unlocked
 * 8. Return detailed results
 *
 * Reference: Implementation_Roadmap_2.md - Day 24 (Assessment Conductor)
 * Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAssessmentForLesson } from '@/lib/assessment/assessment-loader'
import { gradeAssessment } from '@/lib/assessment/grading-engine'
import {
  saveAssessmentAttempt,
  hasReachedMaxAttempts,
} from '@/lib/assessment/attempt-saver'
import { getNextLesson } from '@/lib/curriculum/next-lesson'

/**
 * Request body interface
 */
interface GradeAssessmentRequest {
  userId: string
  sessionId: string
  assessmentId: string
  lessonId: string
  answers: Array<{
    questionId: string
    userAnswer: string
  }>
  timeTakenSeconds?: number
}

/**
 * POST handler for grading assessments
 *
 * Request Body:
 * {
 *   userId: string
 *   sessionId: string
 *   assessmentId: string
 *   lessonId: string
 *   answers: [{ questionId: string, userAnswer: string }]
 *   timeTakenSeconds?: number
 * }
 *
 * Response:
 * {
 *   score: number (0-100)
 *   passed: boolean
 *   feedback: string
 *   perQuestionResults: [...]
 *   attemptNumber: number
 *   lessonCompleted: boolean
 *   nextLesson: {...} | null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: GradeAssessmentRequest = await request.json()

    // Validate required fields
    const requiredFields = [
      'userId',
      'sessionId',
      'assessmentId',
      'lessonId',
      'answers',
    ]
    const missingFields = requiredFields.filter((field) => !body[field as keyof GradeAssessmentRequest])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'MISSING_FIELDS',
        },
        { status: 400 }
      )
    }

    // Validate answers array
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json(
        {
          error: 'answers must be a non-empty array',
          code: 'INVALID_ANSWERS',
        },
        { status: 400 }
      )
    }

    // Validate each answer has required fields
    for (const answer of body.answers) {
      if (!answer.questionId || answer.userAnswer === undefined) {
        return NextResponse.json(
          {
            error: 'Each answer must have questionId and userAnswer',
            code: 'INVALID_ANSWER_FORMAT',
          },
          { status: 400 }
        )
      }
    }

    // Load assessment with correct answers (server-side only)
    const assessment = await getAssessmentForLesson(body.lessonId)

    // Verify assessmentId matches
    if (assessment.id !== body.assessmentId) {
      return NextResponse.json(
        {
          error: 'Assessment ID does not match lesson',
          code: 'ASSESSMENT_MISMATCH',
        },
        { status: 400 }
      )
    }

    // Check if max attempts reached
    const maxAttemptsReached = await hasReachedMaxAttempts(
      body.userId,
      body.assessmentId,
      assessment.max_attempts
    )

    if (maxAttemptsReached) {
      return NextResponse.json(
        {
          error: `Maximum attempts (${assessment.max_attempts}) reached for this assessment`,
          code: 'MAX_ATTEMPTS_REACHED',
          maxAttempts: assessment.max_attempts,
        },
        { status: 403 }
      )
    }

    // Grade the assessment using Assessor AI
    // This handles answer variations intelligently
    const gradingResult = await gradeAssessment(assessment.questions, body.answers)

    const passed = gradingResult.score >= assessment.passing_score

    // Generate overall feedback based on performance
    let overallFeedback = ''
    if (passed) {
      if (gradingResult.score >= 95) {
        overallFeedback =
          'Outstanding work! You showed excellent mastery of this lesson. Keep up the great work!'
      } else if (gradingResult.score >= 85) {
        overallFeedback =
          'Great job! You demonstrated strong understanding of the material.'
      } else {
        overallFeedback =
          'Well done! You passed the assessment. Keep practicing to build even stronger skills.'
      }
    } else {
      if (gradingResult.score >= 70) {
        overallFeedback =
          "You're almost there! Review the lesson and try again. You can do this!"
      } else if (gradingResult.score >= 50) {
        overallFeedback =
          'Good effort! Take some time to review the lesson, and give it another try when ready.'
      } else {
        overallFeedback =
          "Don't worry - learning takes practice! Review the lesson carefully and try the quiz again."
      }
    }

    // Save attempt to database
    const savedAttempt = await saveAssessmentAttempt({
      userId: body.userId,
      assessmentId: body.assessmentId,
      sessionId: body.sessionId,
      lessonId: body.lessonId,
      answers: body.answers,
      score: gradingResult.score,
      passed,
      timeTakenSeconds: body.timeTakenSeconds,
      feedback: {
        overall: overallFeedback,
        perQuestion: gradingResult.perQuestionResults,
      },
    })

    // Get next lesson if this lesson was completed
    let nextLesson = null
    if (savedAttempt.lessonCompleted) {
      try {
        // Get the lesson to find subject and grade level
        const { data: lessonData } = await import('@/lib/db/supabase').then(
          (mod) =>
            mod.supabase
              .from('lessons')
              .select('subject, grade_level')
              .eq('id', body.lessonId)
              .single()
        )

        if (lessonData) {
          nextLesson = await getNextLesson(
            body.userId,
            lessonData.subject,
            lessonData.grade_level
          )
        }
      } catch (error) {
        console.error('Error fetching next lesson:', error)
        // Non-fatal: continue without next lesson info
      }
    }

    // Return comprehensive results
    return NextResponse.json({
      success: true,
      score: Math.round(gradingResult.score * 100) / 100, // Round to 2 decimal places
      totalPoints: gradingResult.totalPoints,
      earnedPoints: Math.round(gradingResult.earnedPoints * 100) / 100,
      passed,
      passingScore: assessment.passing_score,
      feedback: overallFeedback,
      perQuestionResults: gradingResult.perQuestionResults,
      attemptNumber: savedAttempt.attemptNumber,
      lessonCompleted: savedAttempt.lessonCompleted,
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            title: nextLesson.title,
            subject: nextLesson.subject,
            gradeLevel: nextLesson.grade_level,
          }
        : null,
    })
  } catch (error) {
    console.error('Error grading assessment:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      // Assessment not found
      if (error.message.includes('No assessment found')) {
        return NextResponse.json(
          {
            error: 'Assessment not found for this lesson',
            code: 'ASSESSMENT_NOT_FOUND',
          },
          { status: 404 }
        )
      }

      // Assessor AI not available
      if (error.message.includes('Assessor AI not available')) {
        return NextResponse.json(
          {
            error: 'Grading service temporarily unavailable',
            code: 'GRADING_SERVICE_ERROR',
          },
          { status: 503 }
        )
      }

      // Database error
      if (
        error.message.includes('Failed to save') ||
        error.message.includes('Database error')
      ) {
        return NextResponse.json(
          {
            error: 'Failed to save assessment results',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        )
      }
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while grading the assessment',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
