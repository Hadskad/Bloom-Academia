/**
 * Assessment Attempt Saver
 *
 * Handles saving assessment attempts to the database and updating
 * student progress when assessments are passed.
 *
 * Flow:
 * 1. Count existing attempts for this assessment
 * 2. Save new attempt to assessment_attempts table
 * 3. Update progress table with assessment score
 * 4. If passed, mark lesson as complete via progress-updater
 *
 * Reference: Implementation_Roadmap_2.md - Day 24 (Assessment Conductor)
 * Supabase Insert: https://supabase.com/docs/reference/javascript/insert
 */

import { supabase } from '@/lib/db/supabase'
import { markLessonComplete } from '@/lib/curriculum/progress-updater'

/**
 * Interface for assessment attempt data
 */
export interface AssessmentAttemptData {
  userId: string
  assessmentId: string
  sessionId: string
  lessonId: string
  answers: Array<{
    questionId: string
    userAnswer: string
  }>
  score: number
  passed: boolean
  timeTakenSeconds?: number
  feedback?: any
}

/**
 * Interface for saved attempt result
 */
export interface SavedAttemptResult {
  attemptId: string
  attemptNumber: number
  score: number
  passed: boolean
  lessonCompleted: boolean
}

/**
 * Saves an assessment attempt to the database
 *
 * Also updates the progress table with assessment results
 * and marks the lesson complete if the student passed.
 *
 * @param attemptData - Assessment attempt information
 * @returns Saved attempt details
 *
 * @example
 * ```typescript
 * const result = await saveAssessmentAttempt({
 *   userId: "user-uuid",
 *   assessmentId: "assess-uuid",
 *   sessionId: "session-uuid",
 *   lessonId: "lesson-uuid",
 *   answers: [
 *     { questionId: "q1", userAnswer: "68" },
 *     { questionId: "q2", userAnswer: "27" }
 *   ],
 *   score: 93.33,
 *   passed: true,
 *   timeTakenSeconds: 145
 * })
 * ```
 */
export async function saveAssessmentAttempt(
  attemptData: AssessmentAttemptData
): Promise<SavedAttemptResult> {
  try {
    // 1. Count existing attempts for this user + assessment
    // This determines the attempt_number for this new attempt
    const { count: existingAttempts } = await supabase
      .from('assessment_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', attemptData.userId)
      .eq('assessment_id', attemptData.assessmentId)

    const attemptNumber = (existingAttempts || 0) + 1

    // 2. Insert new attempt into assessment_attempts table
    // Reference: https://supabase.com/docs/reference/javascript/insert
    const { data: savedAttempt, error: insertError } = await supabase
      .from('assessment_attempts')
      .insert({
        user_id: attemptData.userId,
        assessment_id: attemptData.assessmentId,
        session_id: attemptData.sessionId,
        answers: attemptData.answers, // Stored as JSONB
        score: attemptData.score,
        passed: attemptData.passed,
        time_taken_seconds: attemptData.timeTakenSeconds || null,
        feedback: attemptData.feedback || null,
        attempt_number: attemptNumber,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting assessment attempt:', insertError)
      throw new Error(`Failed to save assessment attempt: ${insertError.message}`)
    }

    // 3. Update progress table with assessment results
    // First, check if progress record exists for this lesson
    const { data: existingProgress } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', attemptData.userId)
      .eq('lesson_id', attemptData.lessonId)
      .single()

    if (existingProgress) {
      // Update existing progress record
      await supabase
        .from('progress')
        .update({
          assessment_score: attemptData.score,
          assessment_passed: attemptData.passed,
          assessment_attempts_count: attemptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', attemptData.userId)
        .eq('lesson_id', attemptData.lessonId)
    } else {
      // Create new progress record if it doesn't exist
      await supabase.from('progress').insert({
        user_id: attemptData.userId,
        lesson_id: attemptData.lessonId,
        assessment_score: attemptData.score,
        assessment_passed: attemptData.passed,
        assessment_attempts_count: attemptNumber,
        completed: false, // Will be set to true by markLessonComplete if passed
        mastery_level: 0, // Will be updated by markLessonComplete
      })
    }

    // 4. If passed, mark lesson as complete
    // This updates both progress and student_curriculum_progress tables
    let lessonCompleted = false

    if (attemptData.passed) {
      try {
        await markLessonComplete(
          attemptData.userId,
          attemptData.lessonId,
          attemptData.score
        )
        lessonCompleted = true
      } catch (error) {
        console.error('Error marking lesson complete:', error)
        // Non-fatal: assessment saved successfully but progress update failed
        // Continue and return success for the attempt itself
      }
    }

    return {
      attemptId: savedAttempt.id,
      attemptNumber,
      score: attemptData.score,
      passed: attemptData.passed,
      lessonCompleted,
    }
  } catch (error) {
    console.error('Error saving assessment attempt:', error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error('Unknown error occurred while saving assessment attempt')
  }
}

/**
 * Gets all attempts for a specific assessment and user
 *
 * Useful for showing attempt history or determining if max attempts reached
 *
 * @param userId - User ID
 * @param assessmentId - Assessment ID
 * @returns Array of attempt records
 */
export async function getAssessmentAttempts(
  userId: string,
  assessmentId: string
) {
  try {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .order('attempted_at', { ascending: false })

    if (error) {
      console.error('Error fetching assessment attempts:', error)
      throw new Error(`Failed to fetch attempts: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getAssessmentAttempts:', error)
    return []
  }
}

/**
 * Checks if a user has reached max attempts for an assessment
 *
 * @param userId - User ID
 * @param assessmentId - Assessment ID
 * @param maxAttempts - Maximum allowed attempts
 * @returns True if max attempts reached, false otherwise
 */
export async function hasReachedMaxAttempts(
  userId: string,
  assessmentId: string,
  maxAttempts: number
): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('assessment_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)

    return (count || 0) >= maxAttempts
  } catch (error) {
    console.error('Error checking max attempts:', error)
    return false
  }
}
