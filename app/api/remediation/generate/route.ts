/**
 * Remediation Generation API Endpoint
 *
 * POST /api/remediation/generate
 *
 * Purpose: Analyzes failed assessment and generates targeted remediation content
 *          for specific concept gaps instead of generic "try again" feedback
 *
 * Flow:
 * 1. Load assessment with questions and concept tags
 * 2. Run diagnostic analyzer to identify concept gaps
 * 3. Generate remediation lessons for top 2-3 failed concepts
 * 4. Save remediation plan to database
 * 5. Return diagnostic result + generated content
 *
 * Criterion 5: Failure → Remediation (Step 4 - API Integration)
 * Reference: ROADMAP_TO_100_PERCENT.md - Remediation Flow
 * Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { diagnoseConceptGaps } from '@/lib/assessment/diagnostic-analyzer';
import type { QuestionWithConcepts, PerQuestionResult, ConceptMetadata } from '@/lib/assessment/diagnostic-analyzer';
import { generateRemediationLesson, validateRemediationLesson } from '@/lib/remediation/content-generator';
import type { RemediationLesson } from '@/lib/remediation/content-generator';
import type { UserProfile } from '@/lib/memory/profile-manager';

/**
 * Request body interface
 */
interface GenerateRemediationRequest {
  userId: string
  assessmentId: string
  lessonId: string
  perQuestionResults: PerQuestionResult[]  // From assessment grading
  userProfile: UserProfile
}

/**
 * Response interface
 */
interface GenerateRemediationResponse {
  success: true
  remediationPlanId: string
  diagnosis: {
    failedConcepts: any[]
    remediationNeeded: boolean
    recommendedActions: string[]
    totalQuestionsAnalyzed: number
    totalQuestionsFailed: number
  }
  remediationLessons: Array<{
    concept: string
    displayName: string
    severity: 'critical' | 'moderate' | 'minor'
    lesson: RemediationLesson
  }>
  message: string
}

/**
 * POST handler for generating remediation content
 *
 * Request Body:
 * {
 *   userId: string
 *   assessmentId: string
 *   lessonId: string
 *   perQuestionResults: PerQuestionResult[] // From grading
 *   userProfile: UserProfile
 * }
 *
 * Response:
 * {
 *   success: true
 *   remediationPlanId: string
 *   diagnosis: DiagnosticResult
 *   remediationLessons: [...]
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: GenerateRemediationRequest = await request.json();

    // Validate required fields
    const requiredFields: (keyof GenerateRemediationRequest)[] = [
      'userId',
      'assessmentId',
      'lessonId',
      'perQuestionResults',
      'userProfile'
    ];

    const missingFields = requiredFields.filter(
      field => !body[field]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate perQuestionResults is array
    if (!Array.isArray(body.perQuestionResults) || body.perQuestionResults.length === 0) {
      return NextResponse.json(
        {
          error: 'perQuestionResults must be a non-empty array',
          code: 'INVALID_RESULTS'
        },
        { status: 400 }
      );
    }

    console.log('[remediation/generate] Request:', {
      userId: body.userId.substring(0, 8),
      assessmentId: body.assessmentId.substring(0, 8),
      failedCount: body.perQuestionResults.filter(r => !r.isCorrect).length
    });

    // =====================================================
    // STEP 1: Load Assessment with Concept Tags
    // =====================================================

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, title, questions, concept_tags, lesson_id')
      .eq('id', body.assessmentId)
      .single();

    if (assessmentError || !assessment) {
      console.error('[remediation/generate] Assessment not found:', assessmentError);
      return NextResponse.json(
        {
          error: 'Assessment not found',
          code: 'ASSESSMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Verify assessment belongs to requested lesson
    if (assessment.lesson_id !== body.lessonId) {
      return NextResponse.json(
        {
          error: 'Assessment does not belong to this lesson',
          code: 'LESSON_MISMATCH'
        },
        { status: 400 }
      );
    }

    // Get lesson metadata for context
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('subject, grade_level, title')
      .eq('id', body.lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('[remediation/generate] Lesson not found:', lessonError);
      return NextResponse.json(
        {
          error: 'Lesson not found',
          code: 'LESSON_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // =====================================================
    // STEP 2: Run Diagnostic Analysis
    // =====================================================

    const questions = assessment.questions as QuestionWithConcepts[];
    const conceptMetadata = assessment.concept_tags as ConceptMetadata[] | undefined;

    const diagnosis = diagnoseConceptGaps(
      questions,
      body.perQuestionResults,
      conceptMetadata
    );

    console.log('[remediation/generate] Diagnosis:', {
      failedConceptsCount: diagnosis.failedConcepts.length,
      remediationNeeded: diagnosis.remediationNeeded,
      criticalConcepts: diagnosis.failedConcepts.filter(c => c.severity === 'critical').length
    });

    // If no remediation needed, return early
    if (!diagnosis.remediationNeeded) {
      return NextResponse.json({
        success: true,
        remediationPlanId: null,
        diagnosis,
        remediationLessons: [],
        message: 'No specific concept gaps identified. Consider reviewing the full lesson.'
      });
    }

    // =====================================================
    // STEP 3: Generate Remediation Lessons
    // =====================================================

    // Generate lessons for top 2-3 failed concepts
    // Prioritize critical and moderate severity
    const topConcepts = diagnosis.failedConcepts
      .filter(c => c.severity === 'critical' || c.severity === 'moderate')
      .slice(0, 3);

    if (topConcepts.length === 0) {
      // Fallback: if no critical/moderate, take top minor concept
      topConcepts.push(diagnosis.failedConcepts[0]);
    }

    const remediationLessons: Array<{
      concept: string
      displayName: string
      severity: 'critical' | 'moderate' | 'minor'
      lesson: RemediationLesson
    }> = [];

    for (const failedConcept of topConcepts) {
      try {
        console.log('[remediation/generate] Generating lesson for:', failedConcept.concept);

        const lesson = await generateRemediationLesson(
          failedConcept.concept,
          failedConcept.displayName,
          lesson.subject,
          lesson.grade_level,
          body.userProfile
        );

        // Validate generated lesson
        const validation = validateRemediationLesson(lesson);
        if (!validation.valid) {
          console.warn('[remediation/generate] Validation issues:', validation.issues);
          // Continue anyway - non-fatal
        }

        remediationLessons.push({
          concept: failedConcept.concept,
          displayName: failedConcept.displayName,
          severity: failedConcept.severity,
          lesson
        });

        console.log('[remediation/generate] Generated:', {
          concept: failedConcept.concept,
          title: lesson.title,
          estimatedTime: lesson.estimatedTimeMinutes
        });
      } catch (error) {
        console.error(`[remediation/generate] Failed to generate for ${failedConcept.concept}:`, error);
        // Continue with other concepts - don't fail entire request
      }
    }

    // If no lessons could be generated, return error
    if (remediationLessons.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to generate remediation content. Please try again.',
          code: 'GENERATION_FAILED'
        },
        { status: 500 }
      );
    }

    // =====================================================
    // STEP 4: Save Remediation Plan to Database
    // =====================================================

    const { data: savedPlan, error: saveError } = await supabase
      .from('remediation_plans')
      .insert({
        user_id: body.userId,
        assessment_id: body.assessmentId,
        lesson_id: body.lessonId,
        diagnosis: diagnosis as any,  // Store full diagnostic result
        remediation_content: remediationLessons as any,
        completed: false
      })
      .select('id')
      .single();

    if (saveError || !savedPlan) {
      console.error('[remediation/generate] Failed to save plan:', saveError);
      // Non-fatal: return content even if save fails
      return NextResponse.json({
        success: true,
        remediationPlanId: null,
        diagnosis,
        remediationLessons,
        message: `Generated ${remediationLessons.length} remediation lessons (save failed)`
      });
    }

    console.log('[remediation/generate] Saved plan:', savedPlan.id);

    // =====================================================
    // STEP 5: Return Results
    // =====================================================

    return NextResponse.json<GenerateRemediationResponse>({
      success: true,
      remediationPlanId: savedPlan.id,
      diagnosis,
      remediationLessons,
      message: `Generated ${remediationLessons.length} targeted remediation mini-lessons`
    });

  } catch (error) {
    console.error('[remediation/generate] Unexpected error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Gemini API error
      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          {
            error: 'AI service configuration error',
            code: 'SERVICE_CONFIG_ERROR'
          },
          { status: 500 }
        );
      }

      // Database error
      if (error.message.includes('Database') || error.message.includes('Supabase')) {
        return NextResponse.json(
          {
            error: 'Database error while generating remediation',
            code: 'DATABASE_ERROR'
          },
          { status: 500 }
        );
      }
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while generating remediation',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - retrieve existing remediation plan by ID
 *
 * GET /api/remediation/generate?planId=<uuid>
 *
 * Response:
 * {
 *   id: string
 *   diagnosis: DiagnosticResult
 *   remediation_content: RemediationLesson[]
 *   completed: boolean
 *   created_at: string
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get('planId');

  if (!planId) {
    return NextResponse.json(
      {
        error: 'planId query parameter is required',
        code: 'MISSING_PLAN_ID'
      },
      { status: 400 }
    );
  }

  try {
    const { data: plan, error } = await supabase
      .from('remediation_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      return NextResponse.json(
        {
          error: 'Remediation plan not found',
          code: 'PLAN_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[remediation/generate] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve remediation plan',
        code: 'RETRIEVAL_ERROR'
      },
      { status: 500 }
    );
  }
}
