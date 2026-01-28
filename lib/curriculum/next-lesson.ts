/**
 * Next Lesson Calculator
 *
 * Determines the next available lesson for a student based on:
 * - Curriculum path sequencing
 * - Lesson completion status
 * - Prerequisite requirements
 *
 * Algorithm:
 * 1. Load curriculum path for subject/grade
 * 2. Iterate through lesson sequence
 * 3. Find first incomplete lesson with satisfied prerequisites
 * 4. Return null if all lessons complete (student ready for next grade)
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Curriculum Sequencing)
 * Official Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'
import { hasCompletedPrerequisites } from './prerequisite-checker'

/**
 * Interface for curriculum path data
 */
interface CurriculumPath {
  id: string
  subject: string
  grade_level: number
  lesson_sequence: string[] // Array of lesson UUIDs in order
  total_lessons: number
  estimated_duration_weeks: number | null
  description: string | null
}

/**
 * Interface for lesson data
 */
interface Lesson {
  id: string
  title: string
  subject: string
  grade_level: number
  learning_objective: string
  estimated_duration: number | null
  difficulty: string | null
}

/**
 * Interface for student curriculum progress
 */
interface StudentCurriculumProgress {
  user_id: string
  subject: string
  grade_level: number
  current_lesson_id: string | null
  next_lesson_id: string | null
  lessons_completed: number
  lessons_mastered: number
  total_lessons: number
  overall_mastery_score: number
  last_activity: string
}

/**
 * Checks if a user has completed a specific lesson
 *
 * @param userId - The user's unique identifier
 * @param lessonId - The lesson's unique identifier
 * @returns true if lesson is completed, false otherwise
 */
export async function isLessonCompleted(
  userId: string,
  lessonId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('progress')
      .select('completed, mastery_level')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single()

    if (error) {
      // If no progress record exists, lesson not started
      if (error.code === 'PGRST116') {
        return false
      }
      throw error
    }

    // Lesson is completed if marked complete OR mastery >= 80%
    return data.completed === true || data.mastery_level >= 80
  } catch (error) {
    console.error('Error checking lesson completion:', error)
    // Default to false on error (safer to require completion)
    return false
  }
}

/**
 * Retrieves a lesson by ID
 *
 * @param lessonId - The lesson's unique identifier
 * @returns Lesson object or null if not found
 */
export async function getLesson(lessonId: string): Promise<Lesson | null> {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data as Lesson
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return null
  }
}

/**
 * Gets or creates student curriculum progress record
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject (e.g., 'math', 'science')
 * @param gradeLevel - The grade level (1-12)
 * @returns Student curriculum progress object
 */
export async function getOrCreateCurriculumProgress(
  userId: string,
  subject: string,
  gradeLevel: number
): Promise<StudentCurriculumProgress | null> {
  try {
    // First, try to get existing progress
    const { data: existing, error: fetchError } = await supabase
      .from('student_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    if (existing) {
      return existing as StudentCurriculumProgress
    }

    // If not found, create new progress record
    if (fetchError?.code === 'PGRST116') {
      // Get total lessons from curriculum path
      const { data: path } = await supabase
        .from('curriculum_paths')
        .select('total_lessons')
        .eq('subject', subject)
        .eq('grade_level', gradeLevel)
        .single()

      const totalLessons = path?.total_lessons || 0

      // Create new progress record
      const { data: newProgress, error: createError } = await supabase
        .from('student_curriculum_progress')
        .insert({
          user_id: userId,
          subject,
          grade_level: gradeLevel,
          total_lessons: totalLessons,
          lessons_completed: 0,
          lessons_mastered: 0,
          overall_mastery_score: 0,
          current_lesson_id: null,
          next_lesson_id: null
        })
        .select()
        .single()

      if (createError) throw createError
      return newProgress as StudentCurriculumProgress
    }

    throw fetchError
  } catch (error) {
    console.error('Error getting/creating curriculum progress:', error)
    return null
  }
}

/**
 * Determines the next lesson a student should take
 *
 * Algorithm:
 * 1. Get curriculum path for subject/grade
 * 2. Get student's progress in this curriculum
 * 3. Iterate through lesson sequence:
 *    - Skip completed lessons
 *    - Check if prerequisites are met
 *    - Return first available lesson
 * 4. Return null if all lessons complete
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject (e.g., 'math', 'science')
 * @param gradeLevel - The grade level (1-12)
 * @returns Next lesson to take, or null if curriculum complete
 *
 * @example
 * ```typescript
 * const nextLesson = await getNextLesson('user-123', 'math', 3)
 * if (nextLesson) {
 *   console.log(`Next lesson: ${nextLesson.title}`)
 * } else {
 *   console.log('Curriculum complete!')
 * }
 * ```
 */
export async function getNextLesson(
  userId: string,
  subject: string,
  gradeLevel: number
): Promise<Lesson | null> {
  try {
    // 1. Get curriculum path for this subject/grade
    const { data: path, error: pathError } = await supabase
      .from('curriculum_paths')
      .select('*')
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    if (pathError) {
      console.error('No curriculum path found:', pathError)
      return null
    }

    const curriculumPath = path as CurriculumPath

    if (!curriculumPath.lesson_sequence || curriculumPath.lesson_sequence.length === 0) {
      console.error('Curriculum path has no lessons')
      return null
    }

    // 2. Ensure student has progress record
    await getOrCreateCurriculumProgress(userId, subject, gradeLevel)

    // 3. Find next incomplete lesson that has prerequisites met
    for (const lessonId of curriculumPath.lesson_sequence) {
      // Skip if lesson is completed
      const completed = await isLessonCompleted(userId, lessonId)
      if (completed) continue

      // Check if prerequisites are met
      const prereqsMet = await hasCompletedPrerequisites(userId, lessonId)
      if (!prereqsMet) continue // Skip - not ready yet

      // This is the next available lesson!
      const lesson = await getLesson(lessonId)
      if (lesson) {
        // Update student_curriculum_progress with next lesson
        await supabase
          .from('student_curriculum_progress')
          .update({
            next_lesson_id: lessonId,
            current_lesson_id: lessonId
          })
          .eq('user_id', userId)
          .eq('subject', subject)
          .eq('grade_level', gradeLevel)

        return lesson
      }
    }

    // 4. All lessons completed - curriculum finished!
    return null
  } catch (error) {
    console.error('Error calculating next lesson:', error)
    throw error
  }
}

/**
 * Gets all available lessons for a student (prerequisites met, not completed)
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject
 * @param gradeLevel - The grade level
 * @returns Array of available lessons
 */
export async function getAvailableLessons(
  userId: string,
  subject: string,
  gradeLevel: number
): Promise<Lesson[]> {
  try {
    const { data: path, error } = await supabase
      .from('curriculum_paths')
      .select('lesson_sequence')
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    if (error || !path) return []

    const available: Lesson[] = []

    for (const lessonId of path.lesson_sequence as string[]) {
      const completed = await isLessonCompleted(userId, lessonId)
      if (completed) continue

      const prereqsMet = await hasCompletedPrerequisites(userId, lessonId)
      if (!prereqsMet) continue

      const lesson = await getLesson(lessonId)
      if (lesson) available.push(lesson)
    }

    return available
  } catch (error) {
    console.error('Error getting available lessons:', error)
    return []
  }
}

/**
 * Gets curriculum progress summary for a student
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject
 * @param gradeLevel - The grade level
 * @returns Progress summary with completion statistics
 */
export async function getCurriculumProgressSummary(
  userId: string,
  subject: string,
  gradeLevel: number
) {
  try {
    const progress = await getOrCreateCurriculumProgress(userId, subject, gradeLevel)
    if (!progress) return null

    const { data: path } = await supabase
      .from('curriculum_paths')
      .select('*')
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    return {
      subject: progress.subject,
      gradeLevel: progress.grade_level,
      lessonsCompleted: progress.lessons_completed,
      lessonsMastered: progress.lessons_mastered,
      totalLessons: progress.total_lessons,
      overallMasteryScore: progress.overall_mastery_score,
      percentComplete: progress.total_lessons > 0
        ? (progress.lessons_completed / progress.total_lessons) * 100
        : 0,
      estimatedWeeksRemaining: path
        ? Math.ceil(
            ((progress.total_lessons - progress.lessons_completed) /
              progress.total_lessons) *
              (path.estimated_duration_weeks || 0)
          )
        : null,
      lastActivity: progress.last_activity
    }
  } catch (error) {
    console.error('Error getting curriculum progress summary:', error)
    return null
  }
}
