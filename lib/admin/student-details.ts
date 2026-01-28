/**
 * Student Details Queries
 *
 * Backend functions for fetching individual student details.
 * Used by the admin dashboard to display detailed student information.
 *
 * Provides:
 * - Basic student info (name, age, grade)
 * - Progress across all subjects
 * - Recent session activity
 *
 * Reference: Implementation_Roadmap_2.md - Day 27 (Student List + Details)
 * Supabase Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Interface for student's curriculum progress by subject
 */
export interface SubjectProgress {
  id: string
  subject: string
  grade_level: number
  current_lesson_id: string | null
  next_lesson_id: string | null
  lessons_completed: number
  lessons_mastered: number
  total_lessons: number
  overall_mastery_score: number
  last_activity: string | null
  // Computed
  percentComplete: number
}

/**
 * Interface for recent session activity
 */
export interface RecentSession {
  id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  interaction_count: number
}

/**
 * Interface for complete student details
 */
export interface StudentDetails {
  user: {
    id: string
    name: string
    age: number
    grade_level: number
    learning_style: string | null
    strengths: string[]
    struggles: string[]
    total_learning_time: number
    created_at: string
  }
  progress: SubjectProgress[]
  recentSessions: RecentSession[]
  // Computed summaries
  totalLessonsCompleted: number
  totalLessonsMastered: number
  overallAvgMastery: number
  lastActiveAt: string | null
}

/**
 * Fetches detailed information for a specific student
 *
 * @param userId - The student's unique identifier
 * @returns Complete student details including progress and sessions
 *
 * @example
 * ```typescript
 * const details = await getStudentDetails('user-123')
 * console.log(`Student: ${details.user.name}`)
 * console.log(`Subjects: ${details.progress.length}`)
 * ```
 */
export async function getStudentDetails(userId: string): Promise<StudentDetails | null> {
  try {
    // 1. Fetch basic user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, age, grade_level, learning_style, strengths, struggles, total_learning_time, created_at')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return null
    }

    if (!user) {
      return null
    }

    // 2. Fetch progress across all subjects
    const { data: progressData, error: progressError } = await supabase
      .from('student_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })

    if (progressError) {
      console.error('Error fetching progress:', progressError)
    }

    // 3. Fetch recent sessions (last 10)
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, started_at, ended_at, interaction_count')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10)

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
    }

    // Process progress data
    const progress: SubjectProgress[] = (progressData || []).map(p => ({
      id: p.id,
      subject: p.subject,
      grade_level: p.grade_level,
      current_lesson_id: p.current_lesson_id,
      next_lesson_id: p.next_lesson_id,
      lessons_completed: p.lessons_completed || 0,
      lessons_mastered: p.lessons_mastered || 0,
      total_lessons: p.total_lessons || 0,
      overall_mastery_score: p.overall_mastery_score || 0,
      last_activity: p.last_activity,
      percentComplete: p.total_lessons > 0
        ? Math.round((p.lessons_completed / p.total_lessons) * 100)
        : 0
    }))

    // Process sessions data - calculate duration from started_at and ended_at
    const recentSessions: RecentSession[] = (sessionsData || []).map(s => {
      let duration_minutes: number | null = null
      if (s.started_at && s.ended_at) {
        const start = new Date(s.started_at)
        const end = new Date(s.ended_at)
        duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000)
      }
      return {
        id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_minutes,
        interaction_count: s.interaction_count || 0
      }
    })

    // Calculate summary statistics
    const totalLessonsCompleted = progress.reduce((sum, p) => sum + p.lessons_completed, 0)
    const totalLessonsMastered = progress.reduce((sum, p) => sum + p.lessons_mastered, 0)
    const overallAvgMastery = progress.length > 0
      ? Math.round((progress.reduce((sum, p) => sum + p.overall_mastery_score, 0) / progress.length) * 10) / 10
      : 0

    // Find last active from sessions (derived as requested)
    const lastActiveAt = recentSessions.length > 0 ? recentSessions[0].started_at : null

    return {
      user: {
        id: user.id,
        name: user.name,
        age: user.age,
        grade_level: user.grade_level,
        learning_style: user.learning_style,
        strengths: user.strengths || [],
        struggles: user.struggles || [],
        total_learning_time: user.total_learning_time || 0,
        created_at: user.created_at
      },
      progress,
      recentSessions,
      totalLessonsCompleted,
      totalLessonsMastered,
      overallAvgMastery,
      lastActiveAt
    }
  } catch (error) {
    console.error('Error in getStudentDetails:', error)
    return null
  }
}
