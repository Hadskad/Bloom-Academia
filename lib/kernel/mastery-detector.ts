/**
 * Rules-Based Mastery Detection System
 *
 * This module implements deterministic mastery detection using evidence tracking
 * and teacher-configured rules. No AI opinions - 100% rules-based decisions.
 *
 * Flow:
 * 1. During lesson: Record evidence (correct/incorrect answers, explanations, etc.)
 * 2. At lesson end: Apply configured rules to accumulated evidence
 * 3. Return mastery decision with 100% confidence (deterministic)
 *
 * Evidence Types:
 * - correct_answer: Student answered a question correctly
 * - incorrect_answer: Student answered incorrectly
 * - explanation: Student explained a concept
 * - application: Student applied knowledge to solve a problem
 * - struggle: Student showed signs of struggle (help requests, multiple attempts)
 *
 * Reference: Phase 1 - Curriculum Builder System
 */

import { supabase } from '@/lib/db/supabase'

/**
 * Mastery rules configuration (teacher-configurable)
 */
export interface MasteryRules {
  minCorrectAnswers: number         // Minimum correct answers required (e.g., 3)
  minExplanationQuality: number     // Min quality score 0-100 (e.g., 70)
  minApplicationAttempts: number    // Min times student applied knowledge (e.g., 2)
  minOverallQuality: number         // Min average quality 0-100 (e.g., 75)
  maxStruggleRatio: number          // Max ratio of struggles to total interactions (e.g., 0.3)
  minTimeSpentMinutes: number       // Minimum time spent in lesson (e.g., 5)
}

/**
 * Evidence record structure
 */
export interface Evidence {
  evidence_type: 'correct_answer' | 'incorrect_answer' | 'explanation' | 'application' | 'struggle'
  content: string
  metadata?: {
    quality_score?: number
    confidence?: number
    context?: string
  }
  recorded_at: string
}

/**
 * Mastery determination result
 */
export interface MasteryResult {
  hasMastered: boolean
  confidence: number  // Always 1.0 (deterministic)
  criteriaMet: {
    correctAnswers: boolean
    explanationQuality: boolean
    applicationAttempts: boolean
    overallQuality: boolean
    struggleRatio: boolean
    timeSpent: boolean
  }
  evidence: {
    correctAnswers: number
    incorrectAnswers: number
    explanations: number
    applications: number
    struggles: number
    avgQuality: number
    timeSpentMinutes: number
  }
  rulesApplied: MasteryRules
}

/**
 * Records evidence of student learning during a lesson
 *
 * Call this function whenever student demonstrates learning behavior:
 * - After answering a question (correct or incorrect)
 * - After explaining a concept
 * - After applying knowledge
 * - When showing signs of struggle
 *
 * @param userId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @param sessionId - Current session ID
 * @param evidenceType - Type of evidence
 * @param content - The actual student response or behavior
 * @param metadata - Optional quality scores or context
 *
 * @example
 * ```typescript
 * // Student answers correctly
 * await recordMasteryEvidence(
 *   userId,
 *   lessonId,
 *   sessionId,
 *   'correct_answer',
 *   'The answer is 68 because 23 + 45 = 68'
 * )
 *
 * // Student explains concept
 * await recordMasteryEvidence(
 *   userId,
 *   lessonId,
 *   sessionId,
 *   'explanation',
 *   'Fractions represent parts of a whole...',
 *   { quality_score: 85 }
 * )
 * ```
 */
export async function recordMasteryEvidence(
  userId: string,
  lessonId: string,
  sessionId: string,
  evidenceType: Evidence['evidence_type'],
  content: string,
  metadata?: Evidence['metadata']
): Promise<void> {
  try {
    const { error } = await supabase
      .from('mastery_evidence')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        session_id: sessionId,
        evidence_type: evidenceType,
        content,
        metadata: metadata || {}
      })

    if (error) {
      console.error('Error recording mastery evidence:', error)
      throw error
    }

    console.log(`[Mastery] Recorded evidence: ${evidenceType} for lesson ${lessonId.slice(0, 8)}`)
  } catch (error) {
    console.error('Failed to record mastery evidence:', error)
    // Don't throw - evidence recording should not break lesson flow
  }
}

/**
 * Retrieves all evidence for a lesson
 *
 * @param userId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @returns Array of evidence records
 */
export async function getEvidenceForLesson(
  userId: string,
  lessonId: string
): Promise<Evidence[]> {
  try {
    const { data, error } = await supabase
      .from('mastery_evidence')
      .select('evidence_type, content, metadata, recorded_at')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .order('recorded_at', { ascending: true })

    if (error) throw error

    return (data || []) as Evidence[]
  } catch (error) {
    console.error('Error fetching evidence:', error)
    return []
  }
}

/**
 * Gets effective mastery rules for a subject/grade
 * Loads teacher-configured rules from database, falls back to system defaults
 *
 * @param subject - Subject name ('math', 'science', etc.)
 * @param gradeLevel - Grade level (1-12)
 * @returns Mastery rules configuration
 */
export async function getEffectiveRulesForSubject(
  subject: string,
  gradeLevel: number
): Promise<MasteryRules> {
  try {
    const { data, error } = await supabase
      .from('subject_configurations')
      .select('default_mastery_rules')
      .eq('subject', subject)
      .eq('grade_level', gradeLevel)
      .single()

    if (error || !data) {
      // No configuration found - return system defaults
      console.log(`[Mastery] No config for ${subject} Grade ${gradeLevel}, using defaults`)
      return {
        minCorrectAnswers: 3,
        minExplanationQuality: 0,
        minApplicationAttempts: 0,
        minOverallQuality: 60,
        maxStruggleRatio: 0.4,
        minTimeSpentMinutes: 3
      }
    }

    return data.default_mastery_rules as MasteryRules
  } catch (error) {
    console.error('Error fetching mastery rules:', error)
    // Return system defaults on error
    return {
      minCorrectAnswers: 3,
      minExplanationQuality: 0,
      minApplicationAttempts: 0,
      minOverallQuality: 60,
      maxStruggleRatio: 0.4,
      minTimeSpentMinutes: 3
    }
  }
}

/**
 * Determines if student has mastered a lesson using rules-based analysis
 *
 * This is a DETERMINISTIC function - no AI involved, 100% confidence.
 * Applies teacher-configured rules to accumulated evidence.
 *
 * Algorithm:
 * 1. Load all evidence for the lesson
 * 2. Calculate statistics (counts, averages, ratios)
 * 3. Load effective mastery rules for this subject/grade
 * 4. Check each criterion against rules
 * 5. Return mastery = true only if ALL criteria met
 *
 * @param userId - Student's unique identifier
 * @param lessonId - Lesson's unique identifier
 * @param subject - Lesson subject
 * @param gradeLevel - Lesson grade level
 * @param sessionStartTime - When session started (to calculate time spent)
 * @returns Mastery determination with detailed breakdown
 *
 * @example
 * ```typescript
 * const result = await determineMastery(
 *   userId,
 *   lessonId,
 *   'math',
 *   3,
 *   sessionStart
 * )
 *
 * if (result.hasMastered) {
 *   console.log('Student mastered the lesson!')
 *   console.log('Criteria met:', result.criteriaMetCount, '/', 6)
 * } else {
 *   console.log('More practice needed')
 *   console.log('Failed criteria:', result.criteriaNotMet)
 * }
 * ```
 */
export async function determineMastery(
  userId: string,
  lessonId: string,
  subject: string,
  gradeLevel: number,
  sessionStartTime: Date
): Promise<MasteryResult> {
  try {
    // 1. Get all evidence
    const evidence = await getEvidenceForLesson(userId, lessonId)

    // 2. Calculate statistics
    const correctAnswers = evidence.filter(e => e.evidence_type === 'correct_answer').length
    const incorrectAnswers = evidence.filter(e => e.evidence_type === 'incorrect_answer').length
    const explanations = evidence.filter(e => e.evidence_type === 'explanation')
    const applications = evidence.filter(e => e.evidence_type === 'application').length
    const struggles = evidence.filter(e => e.evidence_type === 'struggle').length

    // Calculate average explanation quality
    const explanationQualities = explanations
      .map(e => e.metadata?.quality_score || 0)
      .filter(q => q > 0)
    const avgExplanationQuality = explanationQualities.length > 0
      ? explanationQualities.reduce((a, b) => a + b, 0) / explanationQualities.length
      : 0

    // Calculate overall quality (weighted average of all quality scores)
    const allQualityScores = evidence
      .map(e => e.metadata?.quality_score || 0)
      .filter(q => q > 0)
    const avgOverallQuality = allQualityScores.length > 0
      ? allQualityScores.reduce((a, b) => a + b, 0) / allQualityScores.length
      : 0

    // Calculate struggle ratio
    const totalInteractions = evidence.length
    const struggleRatio = totalInteractions > 0 ? struggles / totalInteractions : 0

    // Calculate time spent (in minutes)
    const timeSpentMs = Date.now() - sessionStartTime.getTime()
    const timeSpentMinutes = timeSpentMs / (1000 * 60)

    // 3. Load mastery rules for this subject/grade
    const rules = await getEffectiveRulesForSubject(subject, gradeLevel)

    // 4. Check each criterion
    const criteriaResults = {
      correctAnswers: correctAnswers >= rules.minCorrectAnswers,
      explanationQuality: avgExplanationQuality >= rules.minExplanationQuality,
      applicationAttempts: applications >= rules.minApplicationAttempts,
      overallQuality: avgOverallQuality >= rules.minOverallQuality,
      struggleRatio: struggleRatio <= rules.maxStruggleRatio,
      timeSpent: timeSpentMinutes >= rules.minTimeSpentMinutes
    }

    // 5. Determine mastery (ALL criteria must be met)
    const hasMastered = Object.values(criteriaResults).every(met => met)

    const result: MasteryResult = {
      hasMastered,
      confidence: 1.0, // Deterministic - always 100% confident
      criteriaMet: criteriaResults,
      evidence: {
        correctAnswers,
        incorrectAnswers,
        explanations: explanations.length,
        applications,
        struggles,
        avgQuality: Math.round(avgOverallQuality),
        timeSpentMinutes: Math.round(timeSpentMinutes * 10) / 10 // 1 decimal place
      },
      rulesApplied: rules
    }

    console.log(`[Mastery] Determination for lesson ${lessonId.slice(0, 8)}:`, {
      hasMastered,
      criteriaMetCount: Object.values(criteriaResults).filter(Boolean).length,
      totalCriteria: Object.keys(criteriaResults).length
    })

    return result
  } catch (error) {
    console.error('Error determining mastery:', error)
    // Return conservative result on error (not mastered)
    const defaultRules: MasteryRules = {
      minCorrectAnswers: 3,
      minExplanationQuality: 0,
      minApplicationAttempts: 0,
      minOverallQuality: 60,
      maxStruggleRatio: 0.4,
      minTimeSpentMinutes: 3
    }

    return {
      hasMastered: false,
      confidence: 1.0,
      criteriaMet: {
        correctAnswers: false,
        explanationQuality: false,
        applicationAttempts: false,
        overallQuality: false,
        struggleRatio: false,
        timeSpent: false
      },
      evidence: {
        correctAnswers: 0,
        incorrectAnswers: 0,
        explanations: 0,
        applications: 0,
        struggles: 0,
        avgQuality: 0,
        timeSpentMinutes: 0
      },
      rulesApplied: defaultRules
    }
  }
}
