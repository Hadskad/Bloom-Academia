/**
 * Adaptation Logger
 *
 * Tracks adaptation decisions for analytics, debugging, and verification.
 * Enables the teacher dashboard to show:
 * - How often each adaptation type triggers
 * - Distribution of difficulty levels per student
 * - Correlation: mastery level → difficulty adjustment
 * - Visual learners → SVG generation rate
 *
 * This is critical for proving Criterion 2 works (AI actually adapts behavior).
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 2 Step 6
 */

import { supabase } from '@/lib/db/supabase';
import type { AdaptiveDirectives } from './adaptive-directives';

/**
 * Adaptation log entry structure
 * Matches the adaptation_logs table schema
 */
export interface AdaptationLog {
  id?: string;
  user_id: string;
  lesson_id: string;
  session_id: string;
  mastery_level: number;
  learning_style: string | null;
  difficulty_level: 'simplified' | 'standard' | 'accelerated';
  scaffolding_level: 'minimal' | 'standard' | 'high';
  response_preview: string;
  has_svg: boolean;
  directive_count: number;
  created_at?: string;
}

/**
 * Logs an adaptation decision to the database
 *
 * This creates a permanent record of how the AI adapted its teaching for analytics.
 * Runs in background (fire-and-forget) to avoid blocking the teaching flow.
 *
 * @param userId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @param sessionId - Current session ID
 * @param directives - Adaptive directives that were applied
 * @param learningStyle - Student's learning style (from profile)
 * @param responseGenerated - The actual AI response (for preview/verification)
 * @param hasSvg - Whether response included SVG diagram
 *
 * @example
 * ```typescript
 * // After generating adapted response
 * logAdaptation(
 *   userId,
 *   lessonId,
 *   sessionId,
 *   adaptiveDirectives,
 *   profile.learning_style,
 *   aiResponse.displayText,
 *   aiResponse.svg !== null
 * ).catch(err => console.error('Adaptation logging failed:', err));
 * ```
 */
export async function logAdaptation(
  userId: string,
  lessonId: string,
  sessionId: string,
  directives: AdaptiveDirectives,
  learningStyle: string | null,
  responseGenerated: string,
  hasSvg: boolean
): Promise<void> {
  try {
    // Determine difficulty level from directives
    const difficultyLevel = determineDifficultyLevel(directives);

    // Count total directive instructions
    const directiveCount =
      directives.styleAdjustments.length +
      directives.difficultyAdjustments.length +
      directives.scaffoldingNeeds.length;

    // Create log entry
    const logEntry: Omit<AdaptationLog, 'id' | 'created_at'> = {
      user_id: userId,
      lesson_id: lessonId,
      session_id: sessionId,
      mastery_level: directives.currentMastery,
      learning_style: learningStyle,
      difficulty_level: difficultyLevel,
      scaffolding_level: directives.encouragementLevel,
      response_preview: responseGenerated.substring(0, 200), // First 200 chars
      has_svg: hasSvg,
      directive_count: directiveCount
    };

    // Insert into database
    // Reference: https://supabase.com/docs/reference/javascript/insert
    const { error } = await supabase
      .from('adaptation_logs')
      .insert(logEntry);

    if (error) {
      console.error('[Adaptation Logger] Database insert failed:', error);
      // Don't throw - logging should not break teaching flow
      return;
    }

    console.log('[Adaptation Logger] Logged adaptation:', {
      userId: userId.substring(0, 8),
      lessonId: lessonId.substring(0, 8),
      mastery: directives.currentMastery,
      difficulty: difficultyLevel,
      scaffolding: directives.encouragementLevel,
      hasSvg
    });

  } catch (error) {
    console.error('[Adaptation Logger] Error logging adaptation:', error);
    // Silently fail - logging is non-critical
  }
}

/**
 * Determines difficulty level from adaptive directives
 *
 * Extracts the difficulty classification based on which directives were applied.
 *
 * @param directives - Adaptive directives object
 * @returns Difficulty level classification
 */
function determineDifficultyLevel(
  directives: AdaptiveDirectives
): 'simplified' | 'standard' | 'accelerated' {
  // Check which difficulty mode was activated
  const difficultyText = directives.difficultyAdjustments.join(' ').toLowerCase();

  if (difficultyText.includes('simplification mode') || difficultyText.includes('low mastery')) {
    return 'simplified';
  } else if (difficultyText.includes('acceleration mode') || difficultyText.includes('high mastery')) {
    return 'accelerated';
  } else {
    return 'standard';
  }
}

/**
 * Gets adaptation statistics for a student
 *
 * Useful for analytics dashboard to show how often adaptations occur.
 *
 * @param userId - Student's unique identifier
 * @returns Adaptation statistics object
 *
 * @example
 * ```typescript
 * const stats = await getAdaptationStats(userId);
 * // {
 * //   totalAdaptations: 42,
 * //   avgMastery: 67,
 * //   difficultyDistribution: { simplified: 10, standard: 25, accelerated: 7 },
 * //   svgGenerationRate: 0.65 (65% of visual learner responses had SVGs)
 * // }
 * ```
 */
export async function getAdaptationStats(userId: string): Promise<{
  totalAdaptations: number;
  avgMastery: number;
  difficultyDistribution: Record<string, number>;
  scaffoldingDistribution: Record<string, number>;
  svgGenerationRate: number | null; // Only for visual learners
}> {
  try {
    const { data, error } = await supabase
      .from('adaptation_logs')
      .select('*')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return {
        totalAdaptations: 0,
        avgMastery: 0,
        difficultyDistribution: {},
        scaffoldingDistribution: {},
        svgGenerationRate: null
      };
    }

    // Calculate average mastery
    const avgMastery = Math.round(
      data.reduce((sum, log) => sum + log.mastery_level, 0) / data.length
    );

    // Count difficulty distribution
    const difficultyDistribution: Record<string, number> = {
      simplified: data.filter(log => log.difficulty_level === 'simplified').length,
      standard: data.filter(log => log.difficulty_level === 'standard').length,
      accelerated: data.filter(log => log.difficulty_level === 'accelerated').length
    };

    // Count scaffolding distribution
    const scaffoldingDistribution: Record<string, number> = {
      minimal: data.filter(log => log.scaffolding_level === 'minimal').length,
      standard: data.filter(log => log.scaffolding_level === 'standard').length,
      high: data.filter(log => log.scaffolding_level === 'high').length
    };

    // Calculate SVG generation rate (only for visual learners)
    const visualLearnerLogs = data.filter(log => log.learning_style === 'visual');
    const svgGenerationRate = visualLearnerLogs.length > 0
      ? visualLearnerLogs.filter(log => log.has_svg).length / visualLearnerLogs.length
      : null;

    return {
      totalAdaptations: data.length,
      avgMastery,
      difficultyDistribution,
      scaffoldingDistribution,
      svgGenerationRate
    };

  } catch (error) {
    console.error('[Adaptation Logger] Error getting stats:', error);
    return {
      totalAdaptations: 0,
      avgMastery: 0,
      difficultyDistribution: {},
      scaffoldingDistribution: {},
      svgGenerationRate: null
    };
  }
}

/**
 * Gets adaptation logs for a specific lesson
 *
 * Useful for lesson-specific analytics and debugging.
 *
 * @param lessonId - Lesson's unique identifier
 * @param limit - Maximum number of logs to return
 * @returns Array of adaptation logs
 */
export async function getAdaptationLogsForLesson(
  lessonId: string,
  limit: number = 50
): Promise<AdaptationLog[]> {
  try {
    const { data, error } = await supabase
      .from('adaptation_logs')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Adaptation Logger] Error fetching logs:', error);
      return [];
    }

    return (data || []) as AdaptationLog[];

  } catch (error) {
    console.error('[Adaptation Logger] Error fetching logs:', error);
    return [];
  }
}

/**
 * Verifies that visual learners are getting more SVGs than other learners
 *
 * This is a KEY METRIC for proving Criterion 2 works.
 * Target: Visual learners should get 3x more SVGs than non-visual learners.
 *
 * @returns Verification result with SVG generation rates by learning style
 */
export async function verifySvgAdaptation(): Promise<{
  visualLearnerSvgRate: number;
  otherLearnerSvgRate: number;
  ratioMultiplier: number; // How many times more SVGs visual learners get
  passesThreshold: boolean; // True if ratio >= 2.0 (200% more)
}> {
  try {
    const { data, error } = await supabase
      .from('adaptation_logs')
      .select('learning_style, has_svg');

    if (error || !data || data.length === 0) {
      return {
        visualLearnerSvgRate: 0,
        otherLearnerSvgRate: 0,
        ratioMultiplier: 0,
        passesThreshold: false
      };
    }

    // Calculate SVG rate for visual learners
    const visualLogs = data.filter(log => log.learning_style === 'visual');
    const visualSvgCount = visualLogs.filter(log => log.has_svg).length;
    const visualSvgRate = visualLogs.length > 0
      ? visualSvgCount / visualLogs.length
      : 0;

    // Calculate SVG rate for other learners
    const otherLogs = data.filter(log => log.learning_style !== 'visual' && log.learning_style !== null);
    const otherSvgCount = otherLogs.filter(log => log.has_svg).length;
    const otherSvgRate = otherLogs.length > 0
      ? otherSvgCount / otherLogs.length
      : 0;

    // Calculate multiplier
    const ratioMultiplier = otherSvgRate > 0
      ? visualSvgRate / otherSvgRate
      : (visualSvgRate > 0 ? Infinity : 0);

    // Passes if visual learners get at least 2x more SVGs
    const passesThreshold = ratioMultiplier >= 2.0;

    console.log('[Adaptation Verification] SVG adaptation check:', {
      visualSvgRate: `${(visualSvgRate * 100).toFixed(1)}%`,
      otherSvgRate: `${(otherSvgRate * 100).toFixed(1)}%`,
      multiplier: `${ratioMultiplier.toFixed(2)}x`,
      passes: passesThreshold
    });

    return {
      visualLearnerSvgRate: visualSvgRate,
      otherLearnerSvgRate: otherSvgRate,
      ratioMultiplier,
      passesThreshold
    };

  } catch (error) {
    console.error('[Adaptation Verification] Error:', error);
    return {
      visualLearnerSvgRate: 0,
      otherLearnerSvgRate: 0,
      ratioMultiplier: 0,
      passesThreshold: false
    };
  }
}
