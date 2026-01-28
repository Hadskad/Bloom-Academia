/**
 * Prerequisite Checker Utility
 *
 * Validates whether a student has completed all prerequisites for a lesson.
 *
 * Flow:
 * 1. Fetch all prerequisites for the target lesson
 * 2. Check student's mastery level for each prerequisite
 * 3. Return true only if ALL prerequisites meet required mastery level
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Curriculum Sequencing)
 * Official Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Interface for lesson prerequisite data
 */
interface LessonPrerequisite {
  prerequisite_lesson_id: string
  required_mastery_level: number
}

/**
 * Interface for user's lesson progress
 */
interface UserLessonProgress {
  mastery_level: number
  completed: boolean
}

/**
 * Retrieves a user's progress for a specific lesson
 *
 * @param userId - The user's unique identifier
 * @param lessonId - The lesson's unique identifier
 * @returns Progress data or null if not found
 */
export async function getUserLessonProgress(
  userId: string,
  lessonId: string
): Promise<UserLessonProgress | null> {
  try {
    const { data, error } = await supabase
      .from('progress')
      .select('mastery_level, completed')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single()

    if (error) {
      // If no progress record exists, user hasn't started this lesson
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching user lesson progress:', error)
    throw error
  }
}

/**
 * Checks if a user has completed all prerequisites for a lesson
 *
 * Algorithm:
 * 1. Query lesson_prerequisites table for all prerequisites
 * 2. If no prerequisites exist, return true (lesson is accessible)
 * 3. For each prerequisite:
 *    - Check user's progress on that lesson
 *    - Verify mastery_level meets required_mastery_level
 * 4. Return false if ANY prerequisite is not met
 * 5. Return true if ALL prerequisites are satisfied
 *
 * @param userId - The user's unique identifier
 * @param lessonId - The lesson to check prerequisites for
 * @returns true if all prerequisites met, false otherwise
 *
 * @example
 * ```typescript
 * const canAccess = await hasCompletedPrerequisites('user-123', 'lesson-division')
 * if (!canAccess) {
 *   console.log('Student must complete multiplication first')
 * }
 * ```
 */
export async function hasCompletedPrerequisites(
  userId: string,
  lessonId: string
): Promise<boolean> {
  try {
    // 1. Get all prerequisites for this lesson
    const { data: prereqs, error: prereqError } = await supabase
      .from('lesson_prerequisites')
      .select('prerequisite_lesson_id, required_mastery_level')
      .eq('lesson_id', lessonId)

    if (prereqError) {
      console.error('Error fetching prerequisites:', prereqError)
      throw prereqError
    }

    // 2. If no prerequisites exist, lesson is accessible
    if (!prereqs || prereqs.length === 0) {
      return true
    }

    // 3. Check if student has mastered each prerequisite
    for (const prereq of prereqs as LessonPrerequisite[]) {
      const progress = await getUserLessonProgress(
        userId,
        prereq.prerequisite_lesson_id
      )

      // If no progress exists, prerequisite not met
      if (!progress) {
        return false
      }

      // If mastery level is below required threshold, prerequisite not met
      if (progress.mastery_level < prereq.required_mastery_level) {
        return false
      }
    }

    // 4. All prerequisites satisfied
    return true
  } catch (error) {
    console.error('Error checking prerequisites:', error)
    throw error
  }
}

/**
 * Gets all missing prerequisites for a lesson
 * Useful for showing students what they need to complete
 *
 * @param userId - The user's unique identifier
 * @param lessonId - The lesson to check
 * @returns Array of prerequisite lesson IDs that haven't been mastered
 */
export async function getMissingPrerequisites(
  userId: string,
  lessonId: string
): Promise<string[]> {
  try {
    const { data: prereqs, error } = await supabase
      .from('lesson_prerequisites')
      .select('prerequisite_lesson_id, required_mastery_level')
      .eq('lesson_id', lessonId)

    if (error) throw error
    if (!prereqs || prereqs.length === 0) return []

    const missingPrereqs: string[] = []

    for (const prereq of prereqs as LessonPrerequisite[]) {
      const progress = await getUserLessonProgress(
        userId,
        prereq.prerequisite_lesson_id
      )

      if (!progress || progress.mastery_level < prereq.required_mastery_level) {
        missingPrereqs.push(prereq.prerequisite_lesson_id)
      }
    }

    return missingPrereqs
  } catch (error) {
    console.error('Error getting missing prerequisites:', error)
    throw error
  }
}
