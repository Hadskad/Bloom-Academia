/**
 * Profile Enricher (Criterion 4: Memory Persists - Real-Time Updates)
 *
 * Enriches user profiles during active learning sessions, not just at session end.
 * Detects patterns from recent evidence and updates profile immediately so the
 * SAME SESSION becomes adaptive.
 *
 * Flow:
 * 1. After each AI response, check recent mastery_evidence
 * 2. Detect patterns (3+ consecutive struggles, 80%+ mastery)
 * 3. Update profile immediately (fire-and-forget)
 * 4. Invalidate cache so next interaction loads fresh profile
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 4
 * Supabase Array Ops: https://supabase.com/docs/guides/database/arrays
 * Supabase RPC: https://github.com/orgs/supabase/discussions/2771
 */

import { supabase } from '@/lib/db/supabase'
import { invalidateCache as invalidateProfileCache } from './profile-manager'

/**
 * Evidence pattern detected from recent interactions
 */
interface EvidencePattern {
  newStruggles: string[] // Topics student is struggling with (3+ consecutive struggles)
  newStrengths: string[] // Topics student has mastered (80%+ mastery score)
}

/**
 * Analyze recent mastery evidence to detect learning patterns
 *
 * Pattern Detection Logic:
 * - Struggle: 3+ records of type 'incorrect_answer' or 'struggle' for a topic
 * - Strength: 'correct_answer' records with quality_score >= 80 for a topic
 *
 * Evidence table columns used:
 * - evidence_type: 'correct_answer' | 'incorrect_answer' | 'explanation' | 'application' | 'struggle'
 * - metadata: JSONB { quality_score: 0-100, confidence: 0-1, context: lesson_title }
 *
 * Topic is derived from metadata.context (the lesson title), set by
 * multi-ai-stream/route.ts when calling recordMasteryEvidence().
 *
 * @param sessionId - Current session ID
 * @param limit - Number of recent evidence records to analyze (default: 10)
 * @returns Detected patterns (struggles and strengths)
 */
async function analyzeEvidencePatterns(
  sessionId: string,
  limit: number = 10
): Promise<EvidencePattern> {
  // Query recent mastery evidence using the actual table columns
  // Reference: lib/kernel/mastery-detector.ts recordMasteryEvidence()
  const { data: evidence, error } = await supabase
    .from('mastery_evidence')
    .select('evidence_type, metadata')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[profile-enricher] Failed to fetch evidence:', error)
    return { newStruggles: [], newStrengths: [] }
  }

  if (!evidence || evidence.length === 0) {
    return { newStruggles: [], newStrengths: [] }
  }

  // Group evidence by topic (derived from metadata.context = lesson title)
  const topicStats = new Map<string, { struggles: number; highQualityCorrect: number }>()

  for (const record of evidence) {
    // Extract topic from metadata.context (lesson title)
    const meta = record.metadata as { quality_score?: number; confidence?: number; context?: string } | null
    const topic = meta?.context
    if (!topic) continue // Skip records without topic context

    if (!topicStats.has(topic)) {
      topicStats.set(topic, { struggles: 0, highQualityCorrect: 0 })
    }

    const stats = topicStats.get(topic)!
    const qualityScore = meta?.quality_score ?? 0

    // Count struggle indicators: incorrect answers and explicit struggle signals
    if (record.evidence_type === 'incorrect_answer' || record.evidence_type === 'struggle') {
      stats.struggles++
    }

    // Count high-quality correct answers (quality_score >= 80)
    if (record.evidence_type === 'correct_answer' && qualityScore >= 80) {
      stats.highQualityCorrect++
    }
  }

  // Detect struggles: 3+ incorrect/struggle records for a topic
  const struggles: string[] = []
  // Detect strengths: high-quality correct answers for a topic
  const strengths: string[] = []

  for (const [topic, stats] of topicStats.entries()) {
    if (stats.struggles >= 3) {
      struggles.push(topic)
    }
    if (stats.highQualityCorrect >= 2) {
      strengths.push(topic)
    }
  }

  return {
    newStruggles: struggles,
    newStrengths: strengths,
  }
}

/**
 * Add topics to user's struggles array (using database RPC)
 *
 * Uses PostgreSQL array concatenation to avoid duplicates.
 * Reference: https://github.com/orgs/supabase/discussions/1570
 *
 * Implementation Note:
 * Supabase JS client doesn't support partial array updates via REST API.
 * We use array concatenation with DISTINCT to add unique values:
 * UPDATE users SET struggles = ARRAY(SELECT DISTINCT unnest(struggles || $new_values))
 *
 * @param userId - User ID
 * @param topics - Topics to add to struggles
 */
async function addToStruggles(userId: string, topics: string[]): Promise<void> {
  if (topics.length === 0) return

  // Fetch current profile
  const { data: profile, error: fetchError } = await supabase
    .from('users')
    .select('struggles')
    .eq('id', userId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch user profile: ${fetchError.message}`)
  }

  // Merge arrays and deduplicate
  const currentStruggles = profile.struggles || []
  const mergedStruggles = Array.from(new Set([...currentStruggles, ...topics]))

  // Update with merged array
  const { error: updateError } = await supabase
    .from('users')
    .update({ struggles: mergedStruggles })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Failed to update struggles: ${updateError.message}`)
  }

  console.log(`[profile-enricher] Added struggles for user ${userId}:`, topics)
}

/**
 * Add topics to user's strengths array (using database RPC)
 *
 * Uses same deduplication logic as addToStruggles.
 *
 * @param userId - User ID
 * @param topics - Topics to add to strengths
 */
async function addToStrengths(userId: string, topics: string[]): Promise<void> {
  if (topics.length === 0) return

  // Fetch current profile
  const { data: profile, error: fetchError } = await supabase
    .from('users')
    .select('strengths')
    .eq('id', userId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch user profile: ${fetchError.message}`)
  }

  // Merge arrays and deduplicate
  const currentStrengths = profile.strengths || []
  const mergedStrengths = Array.from(new Set([...currentStrengths, ...topics]))

  // Update with merged array
  const { error: updateError } = await supabase
    .from('users')
    .update({ strengths: mergedStrengths })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Failed to update strengths: ${updateError.message}`)
  }

  console.log(`[profile-enricher] Added strengths for user ${userId}:`, topics)
}

// invalidateProfileCache is now imported from profile-manager.ts

/**
 * Enrich user profile based on recent learning evidence (real-time)
 *
 * This is the main entry point called from multi-ai-stream after each response.
 * It runs asynchronously (fire-and-forget) to avoid blocking student.
 *
 * Flow:
 * 1. Analyze recent mastery_evidence for patterns
 * 2. Update profile if thresholds met (3+ struggles, 80%+ mastery)
 * 3. Invalidate cache so next interaction uses updated profile
 *
 * @param userId - User ID
 * @param lessonId - Current lesson ID
 * @param sessionId - Current session ID
 * @throws Error if database operations fail (caught by caller)
 */
export async function enrichProfileIfNeeded(
  userId: string,
  lessonId: string,
  sessionId: string
): Promise<void> {
  try {
    // 1. Analyze recent evidence for patterns
    const patterns = await analyzeEvidencePatterns(sessionId, 10)

    // 2. Update profile if patterns detected
    let profileUpdated = false

    if (patterns.newStruggles.length > 0) {
      await addToStruggles(userId, patterns.newStruggles)
      profileUpdated = true
    }

    if (patterns.newStrengths.length > 0) {
      await addToStrengths(userId, patterns.newStrengths)
      profileUpdated = true
    }

    // 3. Invalidate cache if profile was updated
    if (profileUpdated) {
      invalidateProfileCache(userId)
      console.log(
        `[profile-enricher] Profile enriched for user ${userId}:`,
        {
          struggles: patterns.newStruggles,
          strengths: patterns.newStrengths,
        }
      )
    }
  } catch (error) {
    // Log error but don't throw - this is fire-and-forget
    console.error('[profile-enricher] Enrichment failed:', error)
    throw error // Re-throw so caller can handle
  }
}

/**
 * Get enrichment statistics for analytics
 *
 * Returns counts of how many times each topic appears in
 * struggles and strengths across all users.
 *
 * @returns Object with struggle and strength statistics
 */
export async function getEnrichmentStats(): Promise<{
  topStruggles: Array<{ topic: string; count: number }>
  topStrengths: Array<{ topic: string; count: number }>
}> {
  // Fetch all user profiles
  const { data: users, error } = await supabase
    .from('users')
    .select('struggles, strengths')

  if (error) {
    throw new Error(`Failed to fetch enrichment stats: ${error.message}`)
  }

  // Count occurrences of each topic
  const struggleCounts = new Map<string, number>()
  const strengthCounts = new Map<string, number>()

  for (const user of users) {
    // Count struggles
    for (const struggle of user.struggles || []) {
      struggleCounts.set(struggle, (struggleCounts.get(struggle) || 0) + 1)
    }

    // Count strengths
    for (const strength of user.strengths || []) {
      strengthCounts.set(strength, (strengthCounts.get(strength) || 0) + 1)
    }
  }

  // Convert to arrays and sort by count
  const topStruggles = Array.from(struggleCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const topStrengths = Array.from(strengthCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { topStruggles, topStrengths }
}
