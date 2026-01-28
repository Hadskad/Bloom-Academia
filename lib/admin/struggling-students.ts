/**
 * Struggling Students Queries
 *
 * Backend functions for identifying students who need attention.
 * Used by the admin dashboard to display alerts.
 *
 * Identifies:
 * - Low mastery students (avg mastery < 70%)
 * - Inactive students (no session in 7+ days)
 *
 * Reference: Implementation_Roadmap_2.md - Day 28 (Struggling Students Alert)
 * Supabase Docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Interface for a student with low mastery
 */
export interface LowMasteryStudent {
  user_id: string
  user_name: string
  user_age: number
  subject: string
  grade_level: number
  overall_mastery_score: number
  lessons_completed: number
  lessons_mastered: number
}

/**
 * Interface for an inactive student
 */
export interface InactiveStudent {
  id: string
  name: string
  age: number
  grade_level: number
  last_session_at: string | null
  days_inactive: number
}

/**
 * Interface for the complete struggling students response
 */
export interface StrugglingStudentsData {
  lowMastery: LowMasteryStudent[]
  inactive: InactiveStudent[]
  timestamp: string
}

/**
 * Gets students with average mastery below 70%
 *
 * Queries student_curriculum_progress table for records with
 * overall_mastery_score < 70 and joins with users for names.
 *
 * @returns Array of students with low mastery scores
 *
 * Reference: https://supabase.com/docs/reference/javascript/select
 */
async function getLowMasteryStudents(): Promise<LowMasteryStudent[]> {
  const { data, error } = await supabase
    .from('student_curriculum_progress')
    .select(`
      user_id,
      subject,
      grade_level,
      overall_mastery_score,
      lessons_completed,
      lessons_mastered,
      users (
        name,
        age
      )
    `)
    .lt('overall_mastery_score', 70)
    .gt('overall_mastery_score', 0) // Exclude 0 (no progress yet)
    .order('overall_mastery_score', { ascending: true })

  if (error) {
    console.error('Error fetching low mastery students:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Transform data to flatten user info
  // Note: Supabase returns joined data as an object (not array) when using .single() style relations
  // For foreign key joins, it returns the related record directly
  return data.map(record => {
    // Handle both array and object forms of the joined user data
    const userInfo = record.users as unknown
    let userName = 'Unknown'
    let userAge = 0

    if (userInfo) {
      if (Array.isArray(userInfo) && userInfo.length > 0) {
        // If returned as array, take first element
        userName = (userInfo[0] as { name: string; age: number }).name || 'Unknown'
        userAge = (userInfo[0] as { name: string; age: number }).age || 0
      } else if (typeof userInfo === 'object' && 'name' in (userInfo as object)) {
        // If returned as object directly
        userName = (userInfo as { name: string; age: number }).name || 'Unknown'
        userAge = (userInfo as { name: string; age: number }).age || 0
      }
    }

    return {
      user_id: record.user_id,
      user_name: userName,
      user_age: userAge,
      subject: record.subject,
      grade_level: record.grade_level,
      overall_mastery_score: record.overall_mastery_score || 0,
      lessons_completed: record.lessons_completed || 0,
      lessons_mastered: record.lessons_mastered || 0
    }
  })
}

/**
 * Gets students who haven't had a session in 7+ days
 *
 * Uses a subquery approach:
 * 1. Fetch all users
 * 2. For each user, check their most recent session
 * 3. If no session in 7+ days, include in results
 *
 * @returns Array of inactive students
 */
async function getInactiveStudents(): Promise<InactiveStudent[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoISO = sevenDaysAgo.toISOString()

  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, age, grade_level')

  if (usersError) {
    console.error('Error fetching users for inactive check:', usersError)
    return []
  }

  if (!users || users.length === 0) {
    return []
  }

  // Fetch all sessions to find most recent per user
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('user_id, started_at')
    .order('started_at', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching sessions for inactive check:', sessionsError)
    // If we can't fetch sessions, treat all users as potentially inactive
  }

  // Create map of user_id -> most recent session date
  const lastSessionByUser = new Map<string, string>()

  if (sessions && sessions.length > 0) {
    for (const session of sessions) {
      // Only keep the first (most recent) session per user
      if (!lastSessionByUser.has(session.user_id)) {
        lastSessionByUser.set(session.user_id, session.started_at)
      }
    }
  }

  // Find inactive students
  const inactiveStudents: InactiveStudent[] = []
  const now = new Date()

  for (const user of users) {
    const lastSessionAt = lastSessionByUser.get(user.id) || null

    // Check if inactive (no session ever, or last session > 7 days ago)
    let isInactive = false
    let daysInactive = 0

    if (!lastSessionAt) {
      // Never had a session - consider inactive
      isInactive = true
      daysInactive = 999 // Indicate "never active"
    } else {
      const lastSessionDate = new Date(lastSessionAt)
      if (lastSessionDate < sevenDaysAgo) {
        isInactive = true
        daysInactive = Math.floor(
          (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    }

    if (isInactive) {
      inactiveStudents.push({
        id: user.id,
        name: user.name,
        age: user.age,
        grade_level: user.grade_level,
        last_session_at: lastSessionAt,
        days_inactive: daysInactive
      })
    }
  }

  // Sort by days inactive (most inactive first)
  inactiveStudents.sort((a, b) => b.days_inactive - a.days_inactive)

  return inactiveStudents
}

/**
 * Fetches all struggling students data
 *
 * Combines low mastery and inactive student queries.
 * Called by /api/admin/alerts endpoint.
 *
 * @returns StrugglingStudentsData with both categories
 *
 * @example
 * ```typescript
 * const alerts = await getStrugglingStudents()
 * console.log(`Low mastery: ${alerts.lowMastery.length}`)
 * console.log(`Inactive: ${alerts.inactive.length}`)
 * ```
 */
export async function getStrugglingStudents(): Promise<StrugglingStudentsData> {
  // Fetch both in parallel for better performance
  const [lowMastery, inactive] = await Promise.all([
    getLowMasteryStudents(),
    getInactiveStudents()
  ])

  return {
    lowMastery,
    inactive,
    timestamp: new Date().toISOString()
  }
}
