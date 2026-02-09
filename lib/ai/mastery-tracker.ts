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

import { supabase } from '@/lib/db/supabase';

/**
 * Gets student's current mastery level for a specific lesson
 *
 * Algorithm:
 * 1. Check mastery_evidence table for evidence-based calculation
 *    - Count correct vs incorrect answers
 *    - Calculate percentage: (correct / total) * 100
 * 2. Fallback to progress table's mastery_level field
 * 3. Default to 50 (neutral) if no data exists
 *
 * @param userId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @returns Mastery level 0-100 (percentage)
 *
 * @example
 * ```typescript
 * const mastery = await getCurrentMasteryLevel(userId, lessonId);
 * // Returns: 75 (student is 75% proficient)
 *
 * // Use for difficulty adaptation:
 * if (mastery < 50) {
 *   // Simplify teaching
 * } else if (mastery > 80) {
 *   // Challenge the student
 * }
 * ```
 */
export async function getCurrentMasteryLevel(
  userId: string,
  lessonId: string
): Promise<number> {
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
}

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
