/**
 * Learning Trajectory Analyzer (Criterion 4: Memory Persists - Option A)
 *
 * Analyzes student learning trajectory across sessions to detect trends.
 * Lightweight implementation focusing on trend detection and recent performance.
 *
 * Capabilities:
 * - Trend detection: improving/declining/stable
 * - Recent performance averaging
 * - Simple statistical analysis
 *
 * Flow:
 * 1. Fetch last N sessions with mastery scores
 * 2. Calculate trend based on score progression
 * 3. Return trajectory summary
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 4 (Option A: Lightweight)
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Learning trajectory result
 */
export interface LearningTrajectory {
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  recentAverage: number // Average mastery score from recent sessions (0-100)
  sessionCount: number // Number of sessions analyzed
  confidence: number // Confidence in trend detection (0-1)
  details: {
    firstSessionScore: number
    lastSessionScore: number
    scoreDelta: number // Change from first to last session
    volatility: number // Standard deviation of scores
  }
}

/**
 * Get learning trajectory for a user and subject
 *
 * Analyzes last 5 sessions to detect learning trends.
 *
 * Trend Detection Logic:
 * - Improving: Score delta > +10 points AND recent average > 60
 * - Declining: Score delta < -10 points OR recent average < 40
 * - Stable: Score delta between -10 and +10 points
 * - Insufficient Data: Less than 3 sessions available
 *
 * @param userId - User ID
 * @param subject - Subject to analyze (math, science, english, etc.)
 * @param sessionLimit - Number of recent sessions to analyze (default: 5)
 * @returns Learning trajectory summary
 */
export async function getLearningTrajectory(
  userId: string,
  subject: string,
  sessionLimit: number = 5
): Promise<LearningTrajectory> {
  // Fetch recent sessions with mastery scores
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      `
      id,
      started_at,
      effectiveness_score,
      lessons!inner(subject)
    `
    )
    .eq('user_id', userId)
    .eq('lessons.subject', subject)
    .not('ended_at', 'is', null) // Only completed sessions
    .not('effectiveness_score', 'is', null) // Must have score
    .order('started_at', { ascending: true }) // Chronological order (oldest first)
    .limit(sessionLimit)

  if (error) {
    throw new Error(`Failed to fetch learning trajectory: ${error.message}`)
  }

  // Check if enough data exists
  if (!sessions || sessions.length < 3) {
    return {
      trend: 'insufficient_data',
      recentAverage: 0,
      sessionCount: sessions?.length || 0,
      confidence: 0,
      details: {
        firstSessionScore: 0,
        lastSessionScore: 0,
        scoreDelta: 0,
        volatility: 0,
      },
    }
  }

  // Extract effectiveness scores (already in chronological order from query)
  const scores = sessions.map((s) => s.effectiveness_score as number)

  // Calculate statistics
  const firstScore = scores[0]
  const lastScore = scores[scores.length - 1]
  const scoreDelta = lastScore - firstScore

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  // Calculate standard deviation (volatility)
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) /
    scores.length
  const volatility = Math.sqrt(variance)

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable'

  if (scoreDelta > 10 && average > 60) {
    trend = 'improving'
  } else if (scoreDelta < -10 || average < 40) {
    trend = 'declining'
  }

  // Calculate confidence (higher for more sessions and lower volatility)
  // Confidence = (sessionCount / 5) * (1 - normalizedVolatility)
  const normalizedVolatility = Math.min(volatility / 50, 1) // Normalize to 0-1
  const sessionFactor = Math.min(sessions.length / 5, 1)
  const confidence = sessionFactor * (1 - normalizedVolatility * 0.5)

  return {
    trend,
    recentAverage: Math.round(average * 100) / 100, // Round to 2 decimals
    sessionCount: sessions.length,
    confidence: Math.round(confidence * 100) / 100,
    details: {
      firstSessionScore: firstScore,
      lastSessionScore: lastScore,
      scoreDelta: Math.round(scoreDelta * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
    },
  }
}

/**
 * Get overall learning trajectory across all subjects
 *
 * Aggregates trajectories from all subjects to give holistic view.
 *
 * @param userId - User ID
 * @returns Overall trajectory summary
 */
export async function getOverallTrajectory(userId: string): Promise<{
  overallTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  averageScore: number
  subjectTrajectories: Array<{
    subject: string
    trend: string
    recentAverage: number
  }>
}> {
  // Get all subjects this user has studied
  const { data: lessons, error } = await supabase
    .from('sessions')
    .select('lessons!inner(subject)')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)

  if (error || !lessons || lessons.length === 0) {
    return {
      overallTrend: 'insufficient_data',
      averageScore: 0,
      subjectTrajectories: [],
    }
  }

  // Get unique subjects
  const subjects = Array.from(
    new Set(lessons.map((l: any) => l.lessons.subject))
  )

  // Get trajectory for each subject
  const subjectTrajectories = await Promise.all(
    subjects.map(async (subject) => {
      const trajectory = await getLearningTrajectory(userId, subject)
      return {
        subject,
        trend: trajectory.trend,
        recentAverage: trajectory.recentAverage,
      }
    })
  )

  // Filter out insufficient data
  const validTrajectories = subjectTrajectories.filter(
    (t) => t.trend !== 'insufficient_data'
  )

  if (validTrajectories.length === 0) {
    return {
      overallTrend: 'insufficient_data',
      averageScore: 0,
      subjectTrajectories,
    }
  }

  // Calculate overall average
  const averageScore =
    validTrajectories.reduce((sum, t) => sum + t.recentAverage, 0) /
    validTrajectories.length

  // Determine overall trend (majority vote)
  const trendCounts = {
    improving: validTrajectories.filter((t) => t.trend === 'improving').length,
    declining: validTrajectories.filter((t) => t.trend === 'declining').length,
    stable: validTrajectories.filter((t) => t.trend === 'stable').length,
  }

  let overallTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (trendCounts.improving > trendCounts.declining && trendCounts.improving > trendCounts.stable) {
    overallTrend = 'improving'
  } else if (trendCounts.declining > trendCounts.improving && trendCounts.declining > trendCounts.stable) {
    overallTrend = 'declining'
  }

  return {
    overallTrend,
    averageScore: Math.round(averageScore * 100) / 100,
    subjectTrajectories,
  }
}

/**
 * Get trajectory summary formatted for display
 *
 * Returns human-readable summary of learning trajectory.
 *
 * @param userId - User ID
 * @param subject - Subject to analyze
 * @returns Formatted trajectory summary
 */
export async function getTrajectoryMessage(
  userId: string,
  subject: string
): Promise<string> {
  const trajectory = await getLearningTrajectory(userId, subject)

  if (trajectory.trend === 'insufficient_data') {
    return 'Keep learning! We need a few more sessions to track your progress.'
  }

  const trendEmoji = {
    improving: '📈',
    declining: '📉',
    stable: '➡️',
    insufficient_data: '❓',
  }

  const trendMessage = {
    improving: `Great work! Your ${subject} skills are improving.`,
    declining: `Let's focus on ${subject} fundamentals. Practice makes progress!`,
    stable: `You're maintaining steady progress in ${subject}.`,
    insufficient_data: '',
  }

  return `${trendEmoji[trajectory.trend]} ${trendMessage[trajectory.trend]} Average score: ${trajectory.recentAverage}%`
}

/**
 * Save trajectory snapshot to database for analytics
 *
 * Records trajectory calculation in trajectory_snapshots table.
 * This enables historical analysis and trend charting.
 *
 * @param userId - User ID
 * @param subject - Subject analyzed
 * @param trajectory - Trajectory result to save
 */
export async function saveTrajectorySnapshot(
  userId: string,
  subject: string,
  trajectory: LearningTrajectory
): Promise<void> {
  const { error } = await supabase.from('trajectory_snapshots').insert({
    user_id: userId,
    subject,
    trend: trajectory.trend,
    recent_average: trajectory.recentAverage,
    session_count: trajectory.sessionCount,
    confidence: trajectory.confidence,
    score_delta: trajectory.details.scoreDelta,
    volatility: trajectory.details.volatility,
    analyzed_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[trajectory-analyzer] Failed to save snapshot:', error)
    // Don't throw - this is non-critical
  }
}
