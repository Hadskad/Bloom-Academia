/**
 * Admin Statistics Queries
 *
 * Backend functions for fetching school-wide statistics.
 * Used by the admin dashboard to display KPIs.
 *
 * KPIs:
 * - Total students (count from users table)
 * - Active students today (distinct users with sessions starting today)
 * - Average mastery score (from student_curriculum_progress)
 * - Lessons completed today (progress records marked complete with last_accessed today)
 *
 * Reference: Implementation_Roadmap_2.md - Day 26 (Admin Dashboard)
 * Supabase Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Interface for school-wide statistics
 */
export interface SchoolStats {
  totalStudents: number
  activeStudentsToday: number
  avgMasteryScore: number
  lessonsCompletedToday: number
  timestamp: string
}

/**
 * Interface for student list item
 */
export interface StudentListItem {
  id: string
  name: string
  age: number
  grade_level: number
  created_at: string
  total_learning_time: number
  // Computed from progress
  avgMastery: number
  lastActive: string | null
}

/**
 * Gets the start of today in ISO format (UTC)
 * Used for filtering "today" records
 */
function getTodayStart(): string {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return today.toISOString()
}

/**
 * Fetches total number of students
 *
 * @returns Total count of users in the database
 *
 * Reference: https://supabase.com/docs/reference/javascript/select
 * Uses count: 'exact' with head: true for efficient counting
 */
async function getTotalStudents(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Error fetching total students:', error)
    return 0
  }

  return count || 0
}

/**
 * Fetches count of students who started a session today
 *
 * @returns Count of unique users with sessions starting today
 *
 * Note: We fetch user_id from sessions with started_at >= today,
 * then count unique users in JavaScript since Supabase JS doesn't
 * support COUNT(DISTINCT) directly.
 */
async function getActiveStudentsToday(): Promise<number> {
  const todayStart = getTodayStart()

  const { data, error } = await supabase
    .from('sessions')
    .select('user_id')
    .gte('started_at', todayStart)

  if (error) {
    console.error('Error fetching active students:', error)
    return 0
  }

  if (!data || data.length === 0) {
    return 0
  }

  // Get unique user IDs
  const uniqueUsers = new Set(data.map(session => session.user_id))
  return uniqueUsers.size
}

/**
 * Calculates school-wide average mastery score
 *
 * @returns Average of all students' overall_mastery_score
 *
 * Fetches all progress records and calculates average in JavaScript.
 * This is acceptable for MVP scale. For large scale, use an RPC function.
 */
async function getAverageMasteryScore(): Promise<number> {
  const { data, error } = await supabase
    .from('student_curriculum_progress')
    .select('overall_mastery_score')

  if (error) {
    console.error('Error fetching mastery scores:', error)
    return 0
  }

  if (!data || data.length === 0) {
    return 0
  }

  // Calculate average
  const total = data.reduce((sum, record) => sum + (record.overall_mastery_score || 0), 0)
  return Math.round((total / data.length) * 10) / 10 // Round to 1 decimal
}

/**
 * Fetches count of lessons completed today
 *
 * @returns Count of progress records marked complete with last_accessed today
 *
 * Note: Uses last_accessed instead of completed_at since that field doesn't exist.
 * A lesson is considered "completed today" if:
 * - completed = true
 * - last_accessed >= today (indicating it was accessed/completed today)
 */
async function getLessonsCompletedToday(): Promise<number> {
  const todayStart = getTodayStart()

  const { count, error } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)
    .gte('last_accessed', todayStart)

  if (error) {
    console.error('Error fetching lessons completed today:', error)
    return 0
  }

  return count || 0
}

/**
 * Fetches all school statistics
 *
 * Aggregates all KPIs into a single response object.
 * Called by /api/admin/stats endpoint.
 *
 * @returns SchoolStats object with all KPIs
 *
 * @example
 * ```typescript
 * const stats = await getSchoolStats()
 * console.log(`Total students: ${stats.totalStudents}`)
 * console.log(`Active today: ${stats.activeStudentsToday}`)
 * ```
 */
export async function getSchoolStats(): Promise<SchoolStats> {
  // Fetch all stats in parallel for better performance
  const [totalStudents, activeStudentsToday, avgMasteryScore, lessonsCompletedToday] =
    await Promise.all([
      getTotalStudents(),
      getActiveStudentsToday(),
      getAverageMasteryScore(),
      getLessonsCompletedToday()
    ])

  return {
    totalStudents,
    activeStudentsToday,
    avgMasteryScore,
    lessonsCompletedToday,
    timestamp: new Date().toISOString()
  }
}

/**
 * Fetches list of all students with their progress summary
 *
 * @returns Array of students with computed stats
 *
 * Joins user data with their curriculum progress to compute:
 * - Average mastery across all subjects
 * - Last activity timestamp
 */
export async function getStudentList(): Promise<StudentListItem[]> {
  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, age, grade_level, created_at, total_learning_time')
    .order('created_at', { ascending: false })

  if (usersError) {
    console.error('Error fetching users:', usersError)
    return []
  }

  if (!users || users.length === 0) {
    return []
  }

  // Fetch all curriculum progress
  const { data: progressData, error: progressError } = await supabase
    .from('student_curriculum_progress')
    .select('user_id, overall_mastery_score, last_activity')

  if (progressError) {
    console.error('Error fetching progress:', progressError)
    // Continue with users only, set default values
  }

  // Create a map of user progress
  const progressByUser = new Map<string, { avgMastery: number; lastActive: string | null }>()

  if (progressData && progressData.length > 0) {
    // Group progress by user_id
    const userProgressMap = new Map<string, { scores: number[]; activities: string[] }>()

    for (const p of progressData) {
      if (!userProgressMap.has(p.user_id)) {
        userProgressMap.set(p.user_id, { scores: [], activities: [] })
      }
      const userProgress = userProgressMap.get(p.user_id)!
      if (p.overall_mastery_score !== null) {
        userProgress.scores.push(p.overall_mastery_score)
      }
      if (p.last_activity) {
        userProgress.activities.push(p.last_activity)
      }
    }

    // Calculate averages and find most recent activity
    for (const [userId, progress] of userProgressMap) {
      const avgMastery =
        progress.scores.length > 0
          ? Math.round(
              (progress.scores.reduce((a, b) => a + b, 0) / progress.scores.length) * 10
            ) / 10
          : 0

      // Find most recent activity
      const lastActive =
        progress.activities.length > 0
          ? progress.activities.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null

      progressByUser.set(userId, { avgMastery, lastActive })
    }
  }

  // Combine user data with progress
  return users.map(user => ({
    id: user.id,
    name: user.name,
    age: user.age,
    grade_level: user.grade_level,
    created_at: user.created_at,
    total_learning_time: user.total_learning_time || 0,
    avgMastery: progressByUser.get(user.id)?.avgMastery || 0,
    lastActive: progressByUser.get(user.id)?.lastActive || null
  }))
}
