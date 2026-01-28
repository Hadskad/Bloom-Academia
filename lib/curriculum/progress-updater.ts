/**
 * Progress Updater Utility
 *
 * Synchronizes lesson completion between two progress systems:
 * 1. Lesson-level progress (progress table)
 * 2. Curriculum-level progress (student_curriculum_progress table)
 *
 * When a lesson is completed, this utility:
 * - Updates the progress table with mastery level and completion status
 * - Updates student_curriculum_progress with aggregated statistics
 * - Recalculates overall mastery score for the subject
 * - Increments lessons_completed and lessons_mastered counts
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Day 22: Progress Tracking)
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Marks a lesson as complete and updates both progress tables
 *
 * @param userId - The user's unique identifier
 * @param lessonId - The lesson's unique identifier
 * @param score - The mastery score achieved (0-100)
 * @returns Success status
 *
 * @example
 * ```typescript
 * await markLessonComplete('user-123', 'lesson-456', 85.5)
 * ```
 */
export async function markLessonComplete(
  userId: string,
  lessonId: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get lesson details to know subject and grade
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('subject, grade_level')
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      throw new Error('Lesson not found')
    }

    // 2. Update lesson-level progress
    const { error: progressError } = await supabase
      .from('progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          mastery_level: score,
          completed: score >= 80, // Completed if mastery >= 80%
          last_accessed: new Date().toISOString()
        },
        {
          onConflict: 'user_id,lesson_id'
        }
      )

    if (progressError) {
      throw progressError
    }

    // 3. Update curriculum-level progress
    await updateCurriculumProgress(userId, lesson.subject, lesson.grade_level, score)

    return { success: true }
  } catch (error) {
    console.error('Error marking lesson complete:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Updates curriculum-level progress statistics
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject (e.g., 'math', 'science')
 * @param gradeLevel - The grade level (1-12)
 * @param latestScore - The most recent lesson score
 */
async function updateCurriculumProgress(
  userId: string,
  subject: string,
  gradeLevel: number,
  latestScore: number
): Promise<void> {
  try {
    // Get existing curriculum progress
    const { data: existing, error: fetchError } = await supabase
      .from('student_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    // Calculate new statistics
    const stats = await calculateCurriculumStats(userId, subject, gradeLevel)

    if (fetchError?.code === 'PGRST116') {
      // No record exists - create one
      const { error: createError } = await supabase
        .from('student_curriculum_progress')
        .insert({
          user_id: userId,
          subject,
          grade_level: gradeLevel,
          lessons_completed: stats.lessonsCompleted,
          lessons_mastered: stats.lessonsMastered,
          total_lessons: stats.totalLessons,
          overall_mastery_score: stats.averageMastery,
          last_activity: new Date().toISOString()
        })

      if (createError) throw createError
    } else if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('student_curriculum_progress')
        .update({
          lessons_completed: stats.lessonsCompleted,
          lessons_mastered: stats.lessonsMastered,
          overall_mastery_score: stats.averageMastery,
          last_activity: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('subject', subject)
        .eq('grade_level', gradeLevel)

      if (updateError) throw updateError
    }
  } catch (error) {
    console.error('Error updating curriculum progress:', error)
    throw error
  }
}

/**
 * Calculates curriculum statistics from lesson-level progress
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject
 * @param gradeLevel - The grade level
 * @returns Aggregated statistics
 */
async function calculateCurriculumStats(
  userId: string,
  subject: string,
  gradeLevel: number
): Promise<{
  lessonsCompleted: number
  lessonsMastered: number
  totalLessons: number
  averageMastery: number
}> {
  try {
    // Get all lessons for this subject/grade
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)

    if (lessonsError) throw lessonsError

    const totalLessons = allLessons?.length || 0

    // Get user's progress for this subject/grade
    const { data: progressData, error: progressError } = await supabase
      .from('progress')
      .select('mastery_level, completed')
      .eq('user_id', userId)
      .in(
        'lesson_id',
        allLessons?.map((l) => l.id) || []
      )

    if (progressError) throw progressError

    const progress = progressData || []

    // Calculate statistics
    const lessonsCompleted = progress.filter((p) => p.completed).length
    const lessonsMastered = progress.filter((p) => p.mastery_level >= 80).length
    const averageMastery =
      progress.length > 0
        ? progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length
        : 0

    return {
      lessonsCompleted,
      lessonsMastered,
      totalLessons,
      averageMastery
    }
  } catch (error) {
    console.error('Error calculating curriculum stats:', error)
    return {
      lessonsCompleted: 0,
      lessonsMastered: 0,
      totalLessons: 0,
      averageMastery: 0
    }
  }
}

/**
 * Updates progress after a lesson session (even if not completed)
 * Used to track attempts, time spent, and partial progress
 *
 * @param userId - The user's unique identifier
 * @param lessonId - The lesson's unique identifier
 * @param updates - Fields to update
 */
export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  updates: {
    masteryLevel?: number
    timeSpent?: number
    attempts?: number
    commonMistakes?: string[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get existing progress or create new record
    const { data: existing, error: fetchError } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single()

    const updateData: any = {
      user_id: userId,
      lesson_id: lessonId,
      last_accessed: new Date().toISOString()
    }

    if (updates.masteryLevel !== undefined) {
      updateData.mastery_level = updates.masteryLevel
      updateData.completed = updates.masteryLevel >= 80
    }

    if (updates.timeSpent !== undefined) {
      updateData.time_spent = existing
        ? (existing.time_spent || 0) + updates.timeSpent
        : updates.timeSpent
    }

    if (updates.attempts !== undefined) {
      updateData.attempts = existing ? (existing.attempts || 0) + 1 : 1
    }

    if (updates.commonMistakes !== undefined) {
      updateData.common_mistakes = updates.commonMistakes
    }

    const { error: upsertError } = await supabase
      .from('progress')
      .upsert(updateData, {
        onConflict: 'user_id,lesson_id'
      })

    if (upsertError) throw upsertError

    // If lesson completed (mastery >= 80%), update curriculum progress
    if (updates.masteryLevel !== undefined && updates.masteryLevel >= 80) {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('subject, grade_level')
        .eq('id', lessonId)
        .single()

      if (lesson) {
        await updateCurriculumProgress(
          userId,
          lesson.subject,
          lesson.grade_level,
          updates.masteryLevel
        )
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating lesson progress:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Initializes curriculum progress for a new user/subject/grade combination
 *
 * @param userId - The user's unique identifier
 * @param subject - The subject
 * @param gradeLevel - The grade level
 */
export async function initializeCurriculumProgress(
  userId: string,
  subject: string,
  gradeLevel: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get total lessons from curriculum path
    const { data: path } = await supabase
      .from('curriculum_paths')
      .select('total_lessons')
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    const totalLessons = path?.total_lessons || 0

    const { error } = await supabase.from('student_curriculum_progress').insert({
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

    if (error) {
      // Ignore unique constraint violations (already exists)
      if (error.code === '23505') {
        return { success: true }
      }
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error initializing curriculum progress:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
