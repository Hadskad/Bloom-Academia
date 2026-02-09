/**
 * Assessment Loader Utility
 *
 * Loads pre-written assessments from the database for specific lessons.
 *
 * Flow:
 * 1. Query assessments table by lesson_id
 * 2. Parse JSONB questions data
 * 3. Return structured assessment object
 *
 * Reference: Implementation_Roadmap_2.md - Day 23 (Assessment Database + Question Bank)
 * Official Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Interface for individual assessment question
 */
export interface AssessmentQuestion {
  id: string
  text: string
  type: 'number' | 'sequence' | 'true_false' | 'open_ended' | 'fraction'
  correct_answer: string
  points: number
  hint?: string
}

/**
 * Interface for complete assessment data
 */
export interface Assessment {
  id: string
  lesson_id: string
  title: string
  description: string | null
  questions: AssessmentQuestion[]
  passing_score: number
  time_limit_minutes: number | null
  max_attempts: number
  created_at: string
  updated_at: string
}

/**
 * Retrieves an assessment for a specific lesson
 *
 * @param lessonId - The lesson's unique identifier
 * @returns Assessment data with parsed questions
 * @throws Error if no assessment found or database error occurs
 *
 * @example
 * ```typescript
 * const assessment = await getAssessmentForLesson(lessonId)
 * console.log(assessment.questions) // Array of question objects
 * ```
 */
export async function getAssessmentForLesson(
  lessonId: string
): Promise<Assessment> {
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  console.log(`[${queryId}] 🎯 Fetching assessment for lesson: ${lessonId}`)

  try {
    console.log(`[${queryId}] 📡 Querying Supabase assessments table...`)
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('lesson_id', lessonId)
      .single()

    const queryDuration = Date.now() - startTime

    if (error) {
      console.error(`[${queryId}] ❌ SUPABASE_ERROR (${queryDuration}ms):`, {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        lessonId,
        timestamp: new Date().toISOString()
      })

      // Log specific error scenarios
      if (error.code === 'PGRST116') {
        console.error(`[${queryId}] 🔍 No rows found - assessment doesn't exist for lesson ${lessonId}`)
      } else if (error.code === '42P01') {
        console.error(`[${queryId}] 🔍 Table 'assessments' does not exist - migration may not have run`)
      } else if (error.message.includes('JWT')) {
        console.error(`[${queryId}] 🔍 Authentication issue - check SUPABASE_SERVICE_ROLE_KEY`)
      }

      throw new Error(`Failed to fetch assessment: ${error.message}`)
    }

    if (!data) {
      console.error(`[${queryId}] ❌ NO_DATA_RETURNED (${queryDuration}ms)`, {
        lessonId,
        note: 'Query succeeded but returned null'
      })
      throw new Error(`No assessment found for lesson: ${lessonId}`)
    }

    console.log(`[${queryId}] ✅ SUCCESS (${queryDuration}ms):`, {
      assessmentId: data.id,
      title: data.title,
      questionCount: Array.isArray(data.questions) ? data.questions.length : 'Invalid format',
      hasQuestions: !!data.questions,
      questionsType: typeof data.questions,
      lessonId: data.lesson_id
    })

    // Validate questions structure
    if (!Array.isArray(data.questions)) {
      console.error(`[${queryId}] ⚠️ INVALID_QUESTIONS_FORMAT:`, {
        questionsType: typeof data.questions,
        questionsValue: data.questions
      })
      throw new Error('Assessment questions are not in valid array format')
    }

    // Parse JSONB questions field (Supabase returns it as parsed JSON already)
    // Official docs: https://supabase.com/docs/guides/database/json
    return {
      id: data.id,
      lesson_id: data.lesson_id,
      title: data.title,
      description: data.description,
      questions: data.questions as AssessmentQuestion[], // JSONB auto-parsed by Supabase
      passing_score: data.passing_score,
      time_limit_minutes: data.time_limit_minutes,
      max_attempts: data.max_attempts,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`[${queryId}] ❌ EXCEPTION_CAUGHT (${totalDuration}ms):`, {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      lessonId
    })

    // Re-throw with context
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while fetching assessment')
  }
}

/**
 * Retrieves all assessments for a specific subject and grade level
 *
 * @param subject - The subject name (e.g., 'math', 'science')
 * @param gradeLevel - The grade level (e.g., 3)
 * @returns Array of assessments
 *
 * @example
 * ```typescript
 * const assessments = await getAssessmentsBySubject('math', 3)
 * ```
 */
export async function getAssessmentsBySubject(
  subject: string,
  gradeLevel: number
): Promise<Assessment[]> {
  try {
    // Join with lessons table to filter by subject/grade
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        lessons!inner(subject, grade_level)
      `)
      .eq('lessons.subject', subject)
      .eq('lessons.grade_level', gradeLevel)

    if (error) {
      console.error('Database error fetching assessments:', error)
      throw new Error(`Failed to fetch assessments: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    // Map and parse each assessment
    return data.map((item) => ({
      id: item.id,
      lesson_id: item.lesson_id,
      title: item.title,
      description: item.description,
      questions: item.questions as AssessmentQuestion[],
      passing_score: item.passing_score,
      time_limit_minutes: item.time_limit_minutes,
      max_attempts: item.max_attempts,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while fetching assessments')
  }
}

/**
 * Checks if an assessment exists for a given lesson
 *
 * @param lessonId - The lesson's unique identifier
 * @returns True if assessment exists, false otherwise
 *
 * @example
 * ```typescript
 * const hasAssessment = await hasAssessmentForLesson(lessonId)
 * if (hasAssessment) {
 *   // Proceed with assessment
 * }
 * ```
 */
export async function hasAssessmentForLesson(
  lessonId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('id')
      .eq('lesson_id', lessonId)
      .single()

    if (error) {
      // Not found is not an error in this context
      if (error.code === 'PGRST116') {
        return false
      }
      console.error('Database error checking assessment existence:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking assessment existence:', error)
    return false
  }
}

/**
 * Gets the total question count for an assessment
 *
 * @param assessmentId - The assessment's unique identifier
 * @returns Number of questions in the assessment
 */
export async function getAssessmentQuestionCount(
  assessmentId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('questions')
      .eq('id', assessmentId)
      .single()

    if (error || !data) {
      return 0
    }

    const questions = data.questions as AssessmentQuestion[]
    return questions.length
  } catch (error) {
    console.error('Error getting question count:', error)
    return 0
  }
}
