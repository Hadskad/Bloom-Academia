/**
 * Shared Teaching Helpers
 *
 * Reusable functions extracted from the multi-ai-stream route to avoid duplication
 * between the legacy JSON endpoint and the new SSE streaming endpoint.
 *
 * Functions:
 * - loadTeachingContext(): Parallel context loading (profile, history, lesson, specialist, mastery)
 * - buildTeachingContext(): Builds AgentContext from loaded data
 * - resolveSpecialist(): Routing decision (fast-path or coordinator)
 * - fireAndForgetSideEffects(): All non-blocking background operations
 *
 * Reference: app/api/teach/multi-ai-stream/route.ts (original implementation)
 */

import { unstable_cache } from 'next/cache';
import { AIAgentManager } from '@/lib/ai/agent-manager';
import { getUserProfile } from '@/lib/memory/profile-manager';
import type { UserProfile } from '@/lib/memory/profile-manager';
import { getSessionHistory, saveInteraction } from '@/lib/memory/session-manager';
import { supabase } from '@/lib/db/supabase';
import type { AgentContext, AgentResponse } from '@/lib/ai/types';
import { generateAdaptiveDirectives, formatDirectivesForPrompt } from '@/lib/ai/adaptive-directives';
import type { AdaptiveDirectives } from '@/lib/ai/adaptive-directives';
import { getCurrentMasteryLevel } from '@/lib/ai/mastery-tracker';
import { logAdaptation } from '@/lib/ai/adaptation-logger';
import { extractEvidenceQuality } from '@/lib/kernel/evidence-extractor';
import { recordMasteryEvidence } from '@/lib/kernel/mastery-detector';
import { enrichProfileIfNeeded } from '@/lib/memory/profile-enricher';
import { getPendingCorrection } from '@/lib/ai/pending-corrections';
import type { PendingCorrection } from '@/lib/ai/pending-corrections';

// ─── Persistent Lesson Cache ────────────────────────────────────────────────
//
// Lessons are static curriculum content — they don't change during a session.
// Uses Next.js Data Cache (unstable_cache) which persists across serverless instances.
//
// ✅ OPTIMIZATION (2026-02-15): Replaced in-memory Map with unstable_cache
// - Cache survives serverless function restarts
// - Shared across all instances (unlike Map which was instance-specific)
// - No invalidation needed (static curriculum content)
//
// Reference: Next.js 15 unstable_cache API
// https://nextjs.org/docs/app/api-reference/functions/unstable_cache

/**
 * Fetch lesson from database with persistent caching
 *
 * Uses Next.js Data Cache which persists across:
 * - Serverless function invocations
 * - Deployments
 * - All instances
 *
 * Cache behavior:
 * - Hit: ~5ms (instant)
 * - Miss: ~150ms (Supabase query)
 * - TTL: 1800 seconds (30 minutes)
 * - No invalidation needed (lessons are static curriculum)
 *
 * Reference: Next.js 15 unstable_cache
 * https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 */
const getCachedLesson = unstable_cache(
  async (lessonId: string) => {
    console.log(`[Lesson Cache] MISS - Fetching lesson from DB for ${lessonId.substring(0, 8)}`);

    const result = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (result.data) {
      console.log(`[Lesson Cache] Cached lesson ${lessonId.substring(0, 8)}: ${result.data.title}`);
    }

    return result;
  },
  ['lesson'], // Cache key prefix
  {
    revalidate: 1800, // 30 minutes TTL (same as before)
    tags: ['lesson'] // Tag for potential future invalidation
  }
);

/**
 * Loaded teaching context — all data needed before generating a response
 */
export interface TeachingContext {
  profile: UserProfile;
  recentHistory: Awaited<ReturnType<typeof getSessionHistory>>;
  lesson: {
    id: string;
    title: string;
    subject: string;
    grade_level: number;
    learning_objective: string;
    [key: string]: any;
  };
  activeSpecialist: string | null;
  currentMastery: number;
  /** Pending correction from a previously rejected response (null if none) */
  pendingCorrection: PendingCorrection | null;
}

/**
 * Request data passed from the route handler
 */
export interface TeachingRequestData {
  userId: string;
  sessionId: string;
  lessonId: string;
  userMessage?: string;
  audioBase64?: string;
  audioMimeType?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaType?: 'image' | 'video';
}

/**
 * Result from resolveSpecialist — tells us which agent to call
 */
export interface RoutingResult {
  agentName: string;
  routingReason: string;
  handoffMessage?: string;
  /** If coordinator handled the request directly, this contains the response text */
  coordinatorDirectResponse?: string;
}

/**
 * Load all teaching context in parallel.
 *
 * 6 independent queries run via Promise.all — none depends on another's result.
 *
 * @param userId - Student user ID
 * @param sessionId - Current session ID
 * @param lessonId - Current lesson ID
 * @param agentManager - Initialized AIAgentManager instance
 * @returns TeachingContext with all data needed for response generation
 * @throws Error if lesson not found
 */
export async function loadTeachingContext(
  userId: string,
  sessionId: string,
  lessonId: string,
  agentManager: AIAgentManager
): Promise<TeachingContext> {
  const [profile, recentHistory, lessonResult, activeSpecialist, currentMastery, pendingCorrection] = await Promise.all([
    getUserProfile(userId),
    getSessionHistory(sessionId, 5).catch((err) => {
      console.warn('[teaching-helpers] Session history unavailable, continuing with empty history:', err.message);
      return [] as Awaited<ReturnType<typeof getSessionHistory>>;
    }),
    getCachedLesson(lessonId),
    agentManager.getActiveSpecialist(sessionId),
    getCurrentMasteryLevel(userId, lessonId),
    getPendingCorrection(sessionId)
  ]);

  if (lessonResult.error || !lessonResult.data) {
    throw new Error(`Failed to fetch lesson: ${lessonResult.error?.message ?? 'Lesson not found'}`);
  }

  return {
    profile,
    recentHistory,
    lesson: lessonResult.data,
    activeSpecialist,
    currentMastery,
    pendingCorrection
  };
}

/**
 * Build adaptive directives from teaching context.
 *
 * @returns Object with directives and formatted instructions string
 */
export function buildAdaptiveTeachingDirectives(
  profile: UserProfile,
  recentHistory: TeachingContext['recentHistory'],
  currentMastery: number
): { directives: AdaptiveDirectives; instructions: string } {
  const directives = generateAdaptiveDirectives(profile, recentHistory, currentMastery);
  const instructions = formatDirectivesForPrompt(directives);
  return { directives, instructions };
}

/**
 * Build the AgentContext object passed to all agent methods.
 *
 * When a pending correction exists, self-correction instructions are prepended
 * to `adaptiveInstructions` so the specialist naturally corrects its earlier mistake.
 *
 * @param ctx - Loaded teaching context
 * @param request - Original request data
 * @param adaptiveInstructions - Formatted adaptive directives string
 * @returns AgentContext ready for agent calls
 */
export function buildAgentContext(
  ctx: TeachingContext,
  request: TeachingRequestData,
  adaptiveInstructions: string
): AgentContext {
  // Start with base adaptive instructions
  let finalInstructions = adaptiveInstructions;

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1 OPTIMIZATION: Inject Current Mastery Score (Real-Time Adaptation)
  // ═══════════════════════════════════════════════════════════════════════════
  // This enables mid-lesson difficulty adjustment based on real-time evidence.
  // The agent can now SEE the current mastery score and adapt accordingly.
  //
  // Mastery status mapping:
  // - 0-49%: Struggling (simplify, maximum scaffolding)
  // - 50-79%: Learning (standard difficulty, balanced support)
  // - 80-100%: Mastering (challenge mode, accelerate)
  //
  // Reference: MASTERY_LOOP_OPTIMIZATION.md - Tier 1, Fix #2
  const masteryStatus =
    ctx.currentMastery < 50 ? 'Struggling' :
    ctx.currentMastery < 80 ? 'Learning' :
    'Mastering';

  const masteryBlock = [
    `<current_mastery_level score="${ctx.currentMastery}" status="${masteryStatus}" />`,
    ''
  ].join('\n');

  // Inject mastery BEFORE all other adaptive directives (highest priority)
  finalInstructions = masteryBlock + finalInstructions;

  console.log(`[teaching-helpers] Injected mastery: ${ctx.currentMastery}% (${masteryStatus})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Self-Correction Block (if validator rejected previous response)
  // ═══════════════════════════════════════════════════════════════════════════
  if (ctx.pendingCorrection) {
    const correction = ctx.pendingCorrection;
    const correctionBlock = [
      '[SELF-CORRECTION REQUIRED]',
      `In your previous response, you made an error that needs to be corrected.`,
      ``,
      `Your incorrect statement: "${correction.original_response.displayText.substring(0, 300)}"`,
      ``,
      `Issues found:`,
      ...correction.validation_issues.map(issue => `- ${issue}`),
      ...(correction.required_fixes.length > 0
        ? [``, `Required fixes:`, ...correction.required_fixes.map(fix => `- ${fix}`)]
        : []),
      ``,
      `IMPORTANT: Before answering the student's current question, briefly and naturally acknowledge your earlier mistake.`,
      `Say something like "Before we continue, I want to correct something I said earlier..." then provide the correct information.`,
      `Keep the correction concise and age-appropriate, then seamlessly continue with the student's current question.`,
      `[END SELF-CORRECTION]`,
      ``
    ].join('\n');

    finalInstructions = correctionBlock + finalInstructions;
    console.log(`[teaching-helpers] Injected self-correction for ${correction.specialist_name} (correction ID: ${correction.id.substring(0, 8)})`);
  }

  return {
    userId: request.userId,
    sessionId: request.sessionId,
    lessonId: request.lessonId,
    userProfile: {
      name: ctx.profile.name,
      age: ctx.profile.age,
      grade_level: ctx.profile.grade_level,
      learning_style: ctx.profile.learning_style,
      strengths: ctx.profile.strengths,
      struggles: ctx.profile.struggles
    },
    conversationHistory: ctx.recentHistory.map(h => ({
      user_message: h.user_message,
      ai_response: h.ai_response,
      timestamp: h.timestamp
    })),
    lessonContext: {
      title: ctx.lesson.title,
      subject: ctx.lesson.subject,
      learning_objective: ctx.lesson.learning_objective
    },
    audioBase64: request.audioBase64 as any,
    audioMimeType: request.audioMimeType as any,
    mediaBase64: request.mediaBase64 as any,
    mediaMimeType: request.mediaMimeType as any,
    mediaType: request.mediaType as any,
    adaptiveInstructions: finalInstructions
  };
}

/**
 * Determine which specialist should handle the request.
 *
 * Fast path: If an active specialist exists, use them directly.
 * Slow path: Use coordinator to route based on message content.
 * Audio-only path: Route by lesson subject when no text message is available.
 *
 * @returns RoutingResult with agent name and reason
 */
export async function resolveSpecialist(
  agentManager: AIAgentManager,
  userMessage: string | undefined,
  context: AgentContext,
  activeSpecialist: string | null,
  lesson: TeachingContext['lesson']
): Promise<RoutingResult> {
  // Fast path: active specialist continues
  if (activeSpecialist && activeSpecialist !== 'coordinator') {
    return {
      agentName: activeSpecialist,
      routingReason: `Continuing with ${activeSpecialist}`
    };
  }

  // Audio/media-only input — route by lesson subject
  if (!userMessage) {
    const subjectToAgent: Record<string, string> = {
      'math': 'math_specialist',
      'science': 'science_specialist',
      'english': 'english_specialist',
      'history': 'history_specialist',
      'art': 'art_specialist'
    };

    const targetAgent = subjectToAgent[lesson.subject.toLowerCase()] || 'math_specialist';
    return {
      agentName: targetAgent,
      routingReason: `Routed to ${targetAgent} based on lesson subject (audio/media input)`
    };
  }

  // Text message — use coordinator to route
  const routing = await agentManager.routeRequest(userMessage, context);

  // Coordinator handles directly
  if (routing.route_to === 'self' && routing.response) {
    return {
      agentName: 'coordinator',
      routingReason: routing.reason,
      coordinatorDirectResponse: routing.response
    };
  }

  // Route to specialist
  return {
    agentName: routing.route_to,
    routingReason: routing.reason,
    handoffMessage: routing.handoff_message
  };
}

/**
 * Fire all non-blocking side effects after a response is generated.
 *
 * All operations use .catch() to prevent unhandled rejections.
 * None of these block response delivery — they run in the background.
 *
 * Side effects:
 * 1. Save agent interaction (agent_interactions table)
 * 2. Save interaction dual-write (interactions table)
 * 3. Log adaptation decision (adaptation_logs table)
 * 4. Enrich user profile (users table — struggles/strengths)
 * 5. Extract and record mastery evidence (mastery_evidence table)
 */
export function fireAndForgetSideEffects(params: {
  agentManager: AIAgentManager;
  aiResponse: AgentResponse;
  sessionId: string;
  userId: string;
  lessonId: string;
  userMessage: string;
  routingReason: string;
  responseTimeMs: number;
  adaptiveDirectives: AdaptiveDirectives;
  learningStyle: string | null | undefined;
  lessonTitle: string;
}): void {
  const {
    agentManager,
    aiResponse,
    sessionId,
    userId,
    lessonId,
    userMessage,
    routingReason,
    responseTimeMs,
    adaptiveDirectives,
    learningStyle,
    lessonTitle
  } = params;

  const messageForLogging = userMessage || '[Audio/Media input]';

  // 1. Save agent interaction
  agentManager.saveInteraction({
    session_id: sessionId,
    agent_id: aiResponse.agentId,
    user_message: messageForLogging,
    agent_response: aiResponse.displayText,
    routing_reason: routingReason,
    response_time_ms: responseTimeMs
  }).catch((err) => console.error('[teaching-helpers] Failed to save agent interaction:', err));

  // 2. Dual-write to interactions table
  saveInteraction(sessionId, {
    userMessage: messageForLogging,
    aiResponse: aiResponse.displayText
  }).catch((err) => console.error('[teaching-helpers] Failed to save interaction (dual-write):', err));

  // 3. Log adaptation decision (Criterion 2)
  logAdaptation(
    userId,
    lessonId,
    sessionId,
    adaptiveDirectives,
    learningStyle ?? null,
    aiResponse.displayText,
    aiResponse.svg !== null && aiResponse.svg !== undefined
  ).catch((err) => console.error('[teaching-helpers] Failed to log adaptation:', err));

  // 4. Enrich user profile (Criterion 4)
  enrichProfileIfNeeded(userId, lessonId, sessionId)
    .catch((err) => console.error('[teaching-helpers] Failed to enrich profile:', err));

  // 5. Extract and record mastery evidence (Criterion 3)
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1 OPTIMIZATION: Performance Logging for Evidence Extraction
  // ═══════════════════════════════════════════════════════════════════════════
  // Verify that evidence extraction is actually working in production.
  // Logs extraction results, confidence scores, and recording success/failure.
  //
  // Reference: MASTERY_LOOP_OPTIMIZATION.md - Tier 1, Fix #3
  if (messageForLogging !== '[Audio/Media input]' && aiResponse.displayText) {
    const evidenceStartTime = Date.now();

    extractEvidenceQuality(
      messageForLogging,
      aiResponse.displayText,
      lessonTitle
    ).then((evidence) => {
      const extractionTime = Date.now() - evidenceStartTime;

      console.log(`[Evidence Extraction] Completed in ${extractionTime}ms:`, {
        evidenceType: evidence.evidenceType,
        qualityScore: evidence.qualityScore,
        confidence: evidence.confidence,
        threshold: 0.7,
        willRecord: evidence.confidence > 0.7
      });

      if (evidence.confidence > 0.7) {
        console.log(`[Evidence Extraction] Recording evidence: ${evidence.evidenceType} (quality: ${evidence.qualityScore})`);

        return recordMasteryEvidence(
          userId,
          lessonId,
          sessionId,
          evidence.evidenceType,
          messageForLogging,
          {
            quality_score: evidence.qualityScore,
            confidence: evidence.confidence,
            context: lessonTitle
          }
        ).then(() => {
          console.log(`[Evidence Extraction] Successfully recorded ${evidence.evidenceType} evidence`);
        });
      } else {
        console.log(`[Evidence Extraction] Skipped recording (confidence ${evidence.confidence} < 0.7 threshold)`);
      }
    }).catch((err) => {
      console.error('[teaching-helpers] Evidence extraction failed:', {
        error: err.message,
        userMessage: messageForLogging.substring(0, 100),
        aiResponse: aiResponse.displayText.substring(0, 100)
      });
    });
  }
}
