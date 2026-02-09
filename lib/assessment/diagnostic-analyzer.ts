/**
 * Diagnostic Analyzer for Assessment Failures
 *
 * Purpose: Analyzes failed assessment questions to identify specific concept gaps
 *          for targeted remediation instead of generic "try again" feedback.
 *
 * Key Features:
 * - Groups failures by concept (not individual questions)
 * - Prioritizes gaps by severity (critical/moderate/minor)
 * - Generates actionable remediation recommendations
 *
 * Flow:
 * 1. Iterate through failed questions
 * 2. Extract concept tags from each question
 * 3. Calculate failure rate per concept
 * 4. Classify severity based on failure rate
 * 5. Generate human-readable recommendations
 *
 * Criterion 5: Failure → Remediation (Step 2 - Diagnostic Analysis)
 * Reference: ROADMAP_TO_100_PERCENT.md - Diagnostic Analyzer Implementation
 */

/**
 * Represents a single failed concept with severity classification
 */
export interface FailedConcept {
  concept: string                    // Internal identifier (e.g., "numerator_denominator")
  displayName: string                // Human-readable name (e.g., "Numerator & Denominator")
  questionsFailedCount: number       // Number of questions failed for this concept
  totalQuestionsForConcept: number   // Total questions testing this concept
  failureRate: number                // Percentage of questions failed (0-1)
  severity: 'critical' | 'moderate' | 'minor'  // Classification based on failure rate
  questionIds: string[]              // IDs of failed questions for this concept
}

/**
 * Complete diagnostic analysis result
 */
export interface DiagnosticResult {
  failedConcepts: FailedConcept[]    // Sorted by severity (most critical first)
  remediationNeeded: boolean         // Whether any remediation is required
  recommendedActions: string[]       // Human-readable action items
  totalQuestionsAnalyzed: number     // Total questions in assessment
  totalQuestionsFailed: number       // Total questions student got wrong
}

/**
 * Question structure (must include concepts array)
 */
export interface QuestionWithConcepts {
  id: string
  text: string
  concepts?: string[]                // Concept tags for diagnostic grouping
  [key: string]: any                // Allow other properties
}

/**
 * Per-question grading result from grading-engine.ts
 */
export interface PerQuestionResult {
  questionId: string
  isCorrect: boolean
  partialCredit: number
  pointsEarned: number
  pointsPossible: number
  feedback: string
  correctAnswerHint: string | null
}

/**
 * Concept metadata from assessment.concept_tags
 */
export interface ConceptMetadata {
  concept: string
  display_name: string
  description: string
  questions: string[]
}

/**
 * Analyzes failed assessment to identify specific concept gaps
 *
 * Algorithm:
 * 1. Extract failed questions from grading results
 * 2. For each failed question, get concept tags
 * 3. Group failures by concept
 * 4. Calculate failure rate per concept
 * 5. Classify severity: critical (≥75%), moderate (≥50%), minor (<50%)
 * 6. Sort by failure count (prioritize most-failed concepts)
 * 7. Generate actionable recommendations
 *
 * @param questions - Assessment questions with concept tags
 * @param gradingResults - Per-question grading results from grading-engine
 * @param conceptMetadata - Optional metadata for display names (from assessment.concept_tags)
 * @returns Diagnostic result with failed concepts and recommendations
 *
 * @example
 * ```typescript
 * const diagnosis = diagnoseConceptGaps(
 *   assessment.questions,
 *   gradingResult.perQuestionResults,
 *   assessment.concept_tags
 * );
 *
 * if (diagnosis.remediationNeeded) {
 *   console.log(diagnosis.failedConcepts);
 *   // [{ concept: "numerator_denominator", severity: "critical", ... }]
 * }
 * ```
 */
export function diagnoseConceptGaps(
  questions: QuestionWithConcepts[],
  gradingResults: PerQuestionResult[],
  conceptMetadata?: ConceptMetadata[]
): DiagnosticResult {
  // Track concept failures: concept -> {failed: count, total: count, questionIds: string[]}
  const conceptStats = new Map<string, {
    failed: number
    total: number
    failedQuestionIds: string[]
  }>();

  // Get concept display names from metadata
  const conceptDisplayNames = new Map<string, string>();
  if (conceptMetadata) {
    for (const meta of conceptMetadata) {
      conceptDisplayNames.set(meta.concept, meta.display_name || humanizeConceptName(meta.concept));
    }
  }

  // Count total questions analyzed and failed
  const totalQuestionsAnalyzed = gradingResults.length;
  const totalQuestionsFailed = gradingResults.filter(r => !r.isCorrect).length;

  // Analyze each grading result
  for (const result of gradingResults) {
    // Find corresponding question to get concept tags
    const question = questions.find(q => q.id === result.questionId);

    if (!question) {
      console.warn(`[diagnostic-analyzer] Question ${result.questionId} not found in questions array`);
      continue;
    }

    // Get concept tags (may not exist for all questions)
    const concepts = question.concepts || [];

    if (concepts.length === 0) {
      console.warn(`[diagnostic-analyzer] Question ${result.questionId} has no concept tags - skipping diagnostic`);
      continue;
    }

    // Update concept statistics
    for (const concept of concepts) {
      // Initialize if first time seeing this concept
      if (!conceptStats.has(concept)) {
        conceptStats.set(concept, {
          failed: 0,
          total: 0,
          failedQuestionIds: []
        });
      }

      const stats = conceptStats.get(concept)!;
      stats.total += 1;

      // If student got this question wrong, count as failure
      if (!result.isCorrect) {
        stats.failed += 1;
        stats.failedQuestionIds.push(result.questionId);
      }
    }
  }

  // Convert to FailedConcept objects with severity classification
  const failedConcepts: FailedConcept[] = [];

  for (const [concept, stats] of conceptStats.entries()) {
    // Only include concepts where student failed at least one question
    if (stats.failed === 0) continue;

    const failureRate = stats.failed / stats.total;

    // Classify severity based on failure rate
    let severity: 'critical' | 'moderate' | 'minor';
    if (failureRate >= 0.75) {
      severity = 'critical';  // Failed ≥75% of questions for this concept
    } else if (failureRate >= 0.50) {
      severity = 'moderate';  // Failed ≥50% of questions
    } else {
      severity = 'minor';     // Failed <50% of questions
    }

    failedConcepts.push({
      concept,
      displayName: conceptDisplayNames.get(concept) || humanizeConceptName(concept),
      questionsFailedCount: stats.failed,
      totalQuestionsForConcept: stats.total,
      failureRate,
      severity,
      questionIds: stats.failedQuestionIds
    });
  }

  // Sort by severity (critical first) then by failure count (most failed first)
  failedConcepts.sort((a, b) => {
    const severityOrder = { critical: 0, moderate: 1, minor: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // If same severity, sort by failure count descending
    return b.questionsFailedCount - a.questionsFailedCount;
  });

  // Generate human-readable recommendations
  const recommendedActions: string[] = [];

  if (failedConcepts.length === 0) {
    // Edge case: student failed but no concepts tagged
    recommendedActions.push('Review the entire lesson to strengthen your understanding');
  } else {
    // Focus on top 2-3 most critical concepts
    const topConcepts = failedConcepts.slice(0, 3);

    for (const concept of topConcepts) {
      const emoji = concept.severity === 'critical' ? '🔴' : concept.severity === 'moderate' ? '🟡' : '🔵';
      const action = `${emoji} ${concept.displayName}: ${concept.questionsFailedCount}/${concept.totalQuestionsForConcept} questions need review`;
      recommendedActions.push(action);
    }

    // Add motivational message
    if (failedConcepts.length > 3) {
      recommendedActions.push(`📚 Plus ${failedConcepts.length - 3} more concepts to review`);
    }
  }

  return {
    failedConcepts,
    remediationNeeded: failedConcepts.length > 0,
    recommendedActions,
    totalQuestionsAnalyzed,
    totalQuestionsFailed
  };
}

/**
 * Converts internal concept identifier to human-readable display name
 *
 * Example: "numerator_denominator" → "Numerator Denominator"
 *
 * @param concept - Internal concept identifier (snake_case)
 * @returns Human-readable display name (Title Case)
 */
export function humanizeConceptName(concept: string): string {
  return concept
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Filters diagnostic result to only include concepts of specified severity or higher
 *
 * @param diagnosis - Full diagnostic result
 * @param minSeverity - Minimum severity to include ('critical' > 'moderate' > 'minor')
 * @returns Filtered diagnostic result
 *
 * @example
 * ```typescript
 * // Only show critical and moderate gaps (hide minor ones)
 * const urgentGaps = filterBySeverity(diagnosis, 'moderate');
 * ```
 */
export function filterBySeverity(
  diagnosis: DiagnosticResult,
  minSeverity: 'critical' | 'moderate' | 'minor'
): DiagnosticResult {
  const severityOrder = { critical: 0, moderate: 1, minor: 2 };
  const threshold = severityOrder[minSeverity];

  const filteredConcepts = diagnosis.failedConcepts.filter(
    concept => severityOrder[concept.severity] <= threshold
  );

  return {
    ...diagnosis,
    failedConcepts: filteredConcepts,
    remediationNeeded: filteredConcepts.length > 0
  };
}

/**
 * Generates a summary sentence for diagnostic result
 *
 * @param diagnosis - Diagnostic result
 * @returns Human-readable summary string
 *
 * @example
 * ```typescript
 * const summary = getSummary(diagnosis);
 * // "You need help with 2 concepts: Numerator & Denominator (critical), Fraction Visualization (moderate)"
 * ```
 */
export function getSummary(diagnosis: DiagnosticResult): string {
  if (!diagnosis.remediationNeeded) {
    return 'No specific concept gaps identified';
  }

  const conceptCount = diagnosis.failedConcepts.length;
  const topConcepts = diagnosis.failedConcepts
    .slice(0, 2)
    .map(c => `${c.displayName} (${c.severity})`)
    .join(', ');

  if (conceptCount === 1) {
    return `You need help with: ${topConcepts}`;
  } else if (conceptCount === 2) {
    return `You need help with 2 concepts: ${topConcepts}`;
  } else {
    return `You need help with ${conceptCount} concepts: ${topConcepts}, and ${conceptCount - 2} more`;
  }
}
