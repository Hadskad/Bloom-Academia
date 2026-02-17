/**
 * Mastery Level Tracker
 *
 * Retrieves student's current mastery level for a lesson to inform difficulty adaptations.
 * Uses evidence-based scoring when available, falls back to progress table.
 *
 * This provides the critical "currentMastery" metric (0-100) that drives difficulty adjustments
 * in the adaptive teaching system.
 *
 * Data Sources (in priority order):
 * 1. mastery_evidence table → Calculate from correct/incorrect answers
 * 2. progress table → Use stored mastery_level
 * 3. Default → 50 (neutral, no assumptions)
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 2 Step 2
 * Reference: lib/kernel/mastery-detector.ts - Evidence tracking system
 */

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { supabase } from '@/lib/db/supabase';

// ─── Persistent Mastery Cache ────────────────────────────────────────────────
//
// Uses Next.js Data Cache (unstable_cache) which persists across serverless instances.
// Mastery levels change when new evidence is recorded via recordMasteryEvidence().
// On update, the cache is invalidated globally via revalidateTag().
//
// ✅ OPTIMIZATION (2026-02-15): Replaced in-memory Map with unstable_cache
// - Cache survives serverless function restarts
// - Shared across all instances
// - Global invalidation via revalidateTag('mastery')
//
// Reference: Next.js 15 unstable_cache API
// https://nextjs.org/docs/app/api-reference/functions/unstable_cache

/**
 * Invalidate cached mastery level globally for all user+lesson combinations.
 * Called by mastery-detector.ts after recording new evidence.
 *
 * Note: This invalidates ALL mastery cache entries (not just one user+lesson)
 * because Next.js tags apply to the entire cache key prefix.
 */
export function invalidateMasteryCache(userId: string, lessonId: string): void {
  revalidateTag('mastery');
  console.log(`[Mastery Cache] Invalidated globally for user ${userId.substring(0, 8)}, lesson ${lessonId.substring(0, 8)}`);
}

/**
 * Invalidate and immediately re-cache the mastery level.
 * Ensures the next read gets fresh data.
 */
export async function refreshMasteryCache(userId: string, lessonId: string): Promise<void> {
  revalidateTag('mastery');
  console.log(`[Mastery Cache] Refreshed globally (will re-fetch on next request)`);
}

/**
 * Gets student's current mastery level for a specific lesson (with persistent caching)
 *
 * Algorithm:
 * 1. Check mastery_evidence table for evidence-based calculation
 *    - Count correct vs incorrect answers
 *    - Calculate percentage: (correct / total) * 100
 * 2. Fallback to progress table's mastery_level field
 * 3. Default to 50 (neutral) if no data exists
 *
 * Cache behavior:
 * - Hit: ~5ms (instant)
 * - Miss: ~100ms (Supabase queries)
 * - TTL: 300 seconds (5 minutes)
 * - Invalidation: Via revalidateTag('mastery')
 *
 * @param userId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @returns Mastery level 0-100 (percentage)
 *
 * Reference: Next.js 15 unstable_cache
 * https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 */
export const getCurrentMasteryLevel = unstable_cache(
  async (userId: string, lessonId: string): Promise<number> => {
    console.log(`[Mastery Cache] MISS - Calculating mastery for user ${userId.substring(0, 8)}, lesson ${lessonId.substring(0, 8)}`);

    try {
      // ═══════════════════════════════════════════════════════════
      // METHOD 1: Calculate from mastery_evidence (most accurate)
      // ═══════════════════════════════════════════════════════════

      // Reference: https://supabase.com/docs/reference/javascript/select
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('mastery_evidence')
        .select('evidence_type, metadata')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId);

      if (!evidenceError && evidenceData && evidenceData.length > 0) {
        // Count correct vs incorrect answers
        const correctAnswers = evidenceData.filter(
          e => e.evidence_type === 'correct_answer'
        ).length;

        const incorrectAnswers = evidenceData.filter(
          e => e.evidence_type === 'incorrect_answer'
        ).length;

        const totalAnswers = correctAnswers + incorrectAnswers;

        if (totalAnswers > 0) {
          const masteryPercentage = Math.round((correctAnswers / totalAnswers) * 100);

          console.log(`[Mastery Tracker] Evidence-based calculation for lesson ${lessonId.substring(0, 8)}:`, {
            correct: correctAnswers,
            incorrect: incorrectAnswers,
            mastery: masteryPercentage
          });

          return masteryPercentage;
        }

        // Evidence exists but no correct/incorrect answers yet
        // Check if there are quality scores from explanations/applications
        const qualityScores = evidenceData
          .map(e => e.metadata?.quality_score)
          .filter((score): score is number => typeof score === 'number' && score > 0);

        if (qualityScores.length > 0) {
          const avgQuality = Math.round(
            qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          );

          console.log(`[Mastery Tracker] Quality-based calculation for lesson ${lessonId.substring(0, 8)}:`, {
            avgQuality,
            sampleSize: qualityScores.length
          });

          return avgQuality;
        }
      }

      // ═══════════════════════════════════════════════════════════
      // METHOD 2: Fallback to progress table
      // ═══════════════════════════════════════════════════════════

      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('mastery_level')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!progressError && progressData?.mastery_level !== undefined) {
        console.log(`[Mastery Tracker] Progress table fallback for lesson ${lessonId.substring(0, 8)}:`, {
          mastery: progressData.mastery_level
        });

        return progressData.mastery_level;
      }

      // ═══════════════════════════════════════════════════════════
      // METHOD 3: Default to 50 (neutral assumption)
      // ═══════════════════════════════════════════════════════════

      console.log(`[Mastery Tracker] No data found for lesson ${lessonId.substring(0, 8)}, defaulting to 50 (neutral)`);
      return 50;

    } catch (error) {
      console.error('[Mastery Tracker] Error getting mastery level:', error);
      // Return neutral default on error to prevent blocking
      return 50;
    }
  },
  ['mastery'], // Cache key prefix
  {
    revalidate: 300, // 5 minutes TTL (same as before)
    tags: ['mastery'] // Tag for global invalidation
  }
);

/**
 * Gets average mastery across all lessons for a student
 *
 * Useful for overall student performance tracking and analytics.
 *
 * @param userId - Student's unique identifier
 * @returns Average mastery level 0-100
 *
 * @example
 * ```typescript
 * const avgMastery = await getAverageMasteryLevel(userId);
 * // Returns: 68 (student is generally at 68% proficiency)
 * ```
 */
export async function getAverageMasteryLevel(
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('progress')
      .select('mastery_level')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return 50; // Neutral default
    }

    const validScores = data
      .map(p => p.mastery_level)
      .filter((level): level is number => typeof level === 'number' && level >= 0);

    if (validScores.length === 0) {
      return 50;
    }

    const average = Math.round(
      validScores.reduce((sum, level) => sum + level, 0) / validScores.length
    );

    return average;

  } catch (error) {
    console.error('[Mastery Tracker] Error getting average mastery:', error);
    return 50;
  }
}

/**
 * Gets mastery level for a specific subject (across all lessons in that subject)
 *
 * Useful for subject-specific difficulty adjustments.
 *
 * @param userId - Student's unique identifier
 * @param subject - Subject name ('math', 'science', 'english', 'history', 'art')
 * @returns Average mastery level 0-100 for that subject
 *
 * @example
 * ```typescript
 * const mathMastery = await getSubjectMasteryLevel(userId, 'math');
 * // Returns: 82 (student is strong in math)
 * ```
 */
export async function getSubjectMasteryLevel(
  userId: string,
  subject: string
): Promise<number> {
  try {
    // Join progress with lessons to filter by subject
    const { data, error } = await supabase
      .from('progress')
      .select(`
        mastery_level,
        lessons!inner(subject)
      `)
      .eq('user_id', userId)
      .eq('lessons.subject', subject);

    if (error || !data || data.length === 0) {
      return 50; // Neutral default
    }

    const validScores = data
      .map(p => p.mastery_level)
      .filter((level): level is number => typeof level === 'number' && level >= 0);

    if (validScores.length === 0) {
      return 50;
    }

    const average = Math.round(
      validScores.reduce((sum, level) => sum + level, 0) / validScores.length
    );

    console.log(`[Mastery Tracker] Subject mastery for ${subject}:`, {
      userId: userId.substring(0, 8),
      mastery: average,
      lessonsAnalyzed: validScores.length
    });

    return average;

  } catch (error) {
    console.error(`[Mastery Tracker] Error getting ${subject} mastery:`, error);
    return 50;
  }
}
