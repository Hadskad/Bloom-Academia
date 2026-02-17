/**
 * AI Cache Manager
 *
 * Manages context caching for AI agent system prompts to reduce latency and costs.
 *
 * Strategy:
 * - TWO separate caches (model-specific - caches cannot be shared across models):
 *   1. Flash cache: 8 agents using gemini-3-flash-preview
 *   2. Pro cache: 1 agent (validator) using gemini-3-pro-preview
 * - Initial TTL: 2 hours (7200s)
 * - Auto-renewal: Every 90 minutes to prevent mid-session expiration
 * - Warmup: Triggered on session start (non-blocking)
 *
 * Cost Savings: ~27% reduction (cached tokens cost 10% of normal input tokens)
 *
 * References:
 * - Official Docs: https://ai.google.dev/gemini-api/docs/caching
 * - TypeScript SDK: https://googleapis.github.io/js-genai/release_docs/classes/caches.Caches.html
 * - Package: @google/genai v1.35.0
 * - Model-specific caching: https://ai.google.dev/gemini-api/docs/caching#model-specific
 */

import { GoogleGenAI } from '@google/genai';
import type { CachedContent } from '@google/genai';
import { supabase } from '@/lib/db/supabase';
import type { AIAgent } from './types';

/**
 * Cache configuration constants
 */
const CACHE_TTL_SECONDS = 7200;  // 2 hours
const RENEWAL_THRESHOLD_MS = 90 * 60 * 1000;  // 90 minutes
const FLASH_MODEL_ID = 'gemini-3-flash-preview';
const PRO_MODEL_ID = 'gemini-3-pro-preview';

/**
 * Module-level cache state (separate caches per model)
 */
let flashCachedContent: CachedContent | null = null;
let flashLastUpdate = 0;
let proCachedContent: CachedContent | null = null;
let proLastUpdate = 0;
let warmupPromise: Promise<void> | null = null;

/**
 * Initialize GoogleGenAI client
 */
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Load all active agents from database
 *
 * @returns Array of active AI agents
 */
async function loadAllAgents(): Promise<AIAgent[]> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) {
    throw new Error(`Failed to load AI agents: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No active AI agents found in database');
  }

  return data as AIAgent[];
}

/**
 * Load lesson metadata (context) from database
 *
 * Fetches basic lesson information (title, subject, learning_objective).
 * This metadata provides context about what the lesson covers.
 *
 * Reference: https://supabase.com/docs/reference/javascript/v1/single
 *
 * @param lessonId - UUID of the lesson
 * @returns Lesson metadata object or null if not found
 */
async function loadLessonMetadata(lessonId: string): Promise<{ title: string; subject: string; learning_objective: string } | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select('title, subject, learning_objective')
    .eq('id', lessonId)
    .single();

  if (error) {
    console.warn(`[Cache] No lesson metadata found for ${lessonId.substring(0, 8)}:`, error.message);
    return null;
  }

  if (!data) {
    console.warn(`[Cache] Lesson metadata is empty for ${lessonId.substring(0, 8)}`);
    return null;
  }

  console.log(`[Cache] ✓ Loaded lesson metadata: ${data.title}`);
  return data;
}

/**
 * Load lesson curriculum from database
 *
 * Fetches the detailed teaching curriculum for a specific lesson.
 * This curriculum provides structured teaching guidance (6-part lesson flow,
 * examples, assessment questions, mastery indicators, etc.)
 *
 * Reference: https://supabase.com/docs/reference/javascript/v1/single
 *
 * @param lessonId - UUID of the lesson
 * @returns Curriculum content string or null if not found
 */
async function loadLessonCurriculum(lessonId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('lesson_curriculum')
    .select('curriculum_content')
    .eq('lesson_id', lessonId)
    .single();

  if (error) {
    console.warn(`[Cache] No curriculum found for lesson ${lessonId.substring(0, 8)}:`, error.message);
    return null;
  }

  if (!data || !data.curriculum_content) {
    console.warn(`[Cache] Curriculum content is empty for lesson ${lessonId.substring(0, 8)}`);
    return null;
  }

  console.log(`[Cache] ✓ Loaded curriculum for lesson (${Math.round(data.curriculum_content.length / 4)} tokens)`);
  return data.curriculum_content;
}

/**
 * Build combined system instruction from agent prompts, lesson context, and curriculum
 *
 * Creates a single text block containing:
 * 1. Lesson context (if provided) - metadata (title, subject, objective)
 * 2. Lesson curriculum (if provided) - detailed teaching plan
 * 3. Agent system prompts for a specific model, separated by identifiers
 *
 * Format:
 * ```
 * ═══════════════════════════════════════════
 * CURRENT LESSON
 * ═══════════════════════════════════════════
 * Title: Introduction to Algebra
 * Subject: math
 * Learning Objective: Understand basic algebraic concepts
 *
 * ═══════════════════════════════════════════
 * LESSON CURRICULUM (Follow this plan exactly)
 * ═══════════════════════════════════════════
 * [Detailed 6-part lesson structure...]
 *
 * ═══════════════════════════════════════════
 * AI AGENT SYSTEM PROMPTS
 * ═══════════════════════════════════════════
 * AGENT: coordinator
 * SYSTEM_PROMPT: [coordinator prompt]
 * ---
 * AGENT: math_specialist
 * SYSTEM_PROMPT: [math specialist prompt]
 * ---
 * ... (all agents for this model)
 * ```
 *
 * @param agents - Array of agents to cache
 * @param modelId - Model ID these agents use
 * @param lessonMetadata - Optional lesson metadata (title, subject, objective)
 * @param curriculum - Optional lesson curriculum content
 * @returns Combined system instruction text
 */
function buildCombinedSystemInstruction(
  agents: AIAgent[],
  modelId: string,
  lessonMetadata: { title: string; subject: string; learning_objective: string } | null = null,
  curriculum: string | null = null
): string {
  const sections: string[] = [];

  // Add lesson context at the top if available (basic metadata)
  if (lessonMetadata) {
    sections.push(
      '═══════════════════════════════════════════',
      'CURRENT LESSON',
      '═══════════════════════════════════════════',
      `Title: ${lessonMetadata.title}`,
      `Subject: ${lessonMetadata.subject}`,
      `Learning Objective: ${lessonMetadata.learning_objective}`,
      ''
    );
  }

  // Add curriculum if available (detailed teaching plan)
  if (curriculum) {
    sections.push(
      '═══════════════════════════════════════════',
      'LESSON CURRICULUM (Follow this plan exactly)',
      '═══════════════════════════════════════════',
      '',
      curriculum,
      ''
    );
  }

  // Add separator before agent prompts
  if (lessonMetadata || curriculum) {
    sections.push(
      '═══════════════════════════════════════════',
      'AI AGENT SYSTEM PROMPTS',
      '═══════════════════════════════════════════',
      ''
    );
  }

  // Add agent prompts
  const agentSections = agents.map(agent => {
    return `AGENT: ${agent.name}\nSYSTEM_PROMPT:\n${agent.system_prompt}`;
  });

  sections.push(...agentSections);

  return sections.join('\n\n---\n\n');
}

/**
 * Create a cache for agents using a specific model
 *
 * Reference: https://googleapis.github.io/js-genai/release_docs/classes/caches.Caches.html#create
 *
 * @param agents - Array of agents to cache
 * @param modelId - Model ID to use for this cache
 * @param lessonMetadata - Optional lesson metadata (title, subject, objective)
 * @param curriculum - Optional lesson curriculum content to include in cache
 * @returns Created cached content
 */
async function createCacheForModel(
  agents: AIAgent[],
  modelId: string,
  lessonMetadata: { title: string; subject: string; learning_objective: string } | null = null,
  curriculum: string | null = null
): Promise<CachedContent> {
  const ai = getAIClient();

  if (agents.length === 0) {
    throw new Error(`No agents to cache for model ${modelId}`);
  }

  const combinedInstruction = buildCombinedSystemInstruction(agents, modelId, lessonMetadata, curriculum);

  const tokenEstimate = Math.round(combinedInstruction.length / 4);
  console.log(`[Cache] Creating ${modelId} cache with ${agents.length} agents${lessonMetadata ? ' + lesson context' : ''}${curriculum ? ' + curriculum' : ''} (~${tokenEstimate} tokens)`);

  try {
    // Create cache using verified API signature
    const cache = await ai.caches.create({
      model: modelId,
      config: {
        displayName: `bloom_${modelId.replace(/-/g, '_')}_${Date.now()}`,
        systemInstruction: combinedInstruction,
        ttl: `${CACHE_TTL_SECONDS}s`  // 2 hours
      }
    });

    console.log(`[Cache] ✓ ${modelId} cache created: ${cache.name}`);
    console.log(`[Cache] TTL: ${CACHE_TTL_SECONDS}s (${CACHE_TTL_SECONDS / 3600}h)`);

    return cache;
  } catch (error) {
    console.error(`[Cache] Failed to create ${modelId} cache:`, error);
    throw new Error(`Cache creation failed for ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update cache TTL to extend expiration
 *
 * Called automatically when cache approaches expiration (90-minute mark).
 * Resets TTL to 2 hours from current time.
 *
 * Reference: https://googleapis.github.io/js-genai/release_docs/classes/caches.Caches.html#update
 *
 * @param cacheName - Server-generated cache resource name
 * @param modelId - Model ID for logging purposes
 * @returns Updated cached content
 */
async function renewCache(cacheName: string, modelId: string): Promise<CachedContent> {
  const ai = getAIClient();

  console.log(`[Cache] Renewing ${modelId} cache TTL (extending by ${CACHE_TTL_SECONDS / 3600}h)`);

  try {
    // Update cache using verified API signature
    const updated = await ai.caches.update({
      name: cacheName,
      config: {
        ttl: `${CACHE_TTL_SECONDS}s`  // Reset to 2 hours from now
      }
    });

    console.log(`[Cache] ✓ ${modelId} cache renewed successfully`);

    return updated;
  } catch (error) {
    console.error(`[Cache] Failed to renew ${modelId} cache:`, error);
    throw new Error(`Cache renewal failed for ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Warmup all caches on session start
 *
 * Creates TWO separate caches (Flash and Pro) if they don't exist,
 * or renews them if approaching expiration.
 * Uses singleton pattern to ensure only one warmup runs at a time.
 *
 * NOW INCLUDES LESSON CONTEXT + CURRICULUM: If lessonId is provided, loads both:
 * 1. Lesson metadata (title, subject, learning_objective) — ~80 tokens
 * 2. Detailed curriculum (6-part teaching plan) — ~5,000-8,000 tokens
 *
 * Both are included in the cache for immediate access by specialists, achieving
 * 90% cost savings on these tokens for all subsequent requests in the session.
 *
 * Called from: app/api/sessions/start/route.ts (non-blocking)
 *
 * @param lessonId - Optional lesson ID to include context + curriculum in cache
 */
export async function warmupAllCaches(lessonId?: string): Promise<void> {
  // Singleton pattern: only run one warmup at a time
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    try {
      const now = Date.now();

      // Load agents, lesson metadata, and curriculum in parallel if lessonId provided
      const [agents, lessonMetadata, curriculum] = await Promise.all([
        loadAllAgents(),
        lessonId ? loadLessonMetadata(lessonId) : Promise.resolve(null),
        lessonId ? loadLessonCurriculum(lessonId) : Promise.resolve(null)
      ]);

      // Group agents by model
      const flashAgents = agents.filter(a => a.model === FLASH_MODEL_ID);
      const proAgents = agents.filter(a => a.model === PRO_MODEL_ID);

      // Warmup Flash cache (8 agents: coordinator + 5 specialists + assessor + motivator)
      // NOW INCLUDES LESSON CONTEXT + CURRICULUM if lessonId was provided
      if (flashAgents.length > 0) {
        if (flashCachedContent && (now - flashLastUpdate) < RENEWAL_THRESHOLD_MS) {
          console.log(`[Cache] Flash cache still fresh (${Math.round((now - flashLastUpdate) / 60000)}min old), skipping warmup`);
        } else if (flashCachedContent && flashCachedContent.name) {
          // Renew existing cache
          try {
            const renewed = await renewCache(flashCachedContent.name, FLASH_MODEL_ID);
            flashCachedContent = renewed;
            flashLastUpdate = now;
          } catch (renewError) {
            console.warn('[Cache] Flash renewal failed, recreating:', renewError);
            const cache = await createCacheForModel(flashAgents, FLASH_MODEL_ID, lessonMetadata, curriculum);
            flashCachedContent = cache;
            flashLastUpdate = now;
          }
        } else {
          // Create new cache
          const cache = await createCacheForModel(flashAgents, FLASH_MODEL_ID, lessonMetadata, curriculum);
          flashCachedContent = cache;
          flashLastUpdate = now;
        }
      }

      // Warmup Pro cache (1 agent: validator)
      // Validator doesn't need lesson context or curriculum (only validates responses, doesn't teach)
      if (proAgents.length > 0) {
        if (proCachedContent && (now - proLastUpdate) < RENEWAL_THRESHOLD_MS) {
          console.log(`[Cache] Pro cache still fresh (${Math.round((now - proLastUpdate) / 60000)}min old), skipping warmup`);
        } else if (proCachedContent && proCachedContent.name) {
          // Renew existing cache
          try {
            const renewed = await renewCache(proCachedContent.name, PRO_MODEL_ID);
            proCachedContent = renewed;
            proLastUpdate = now;
          } catch (renewError) {
            console.warn('[Cache] Pro renewal failed, recreating:', renewError);
            const cache = await createCacheForModel(proAgents, PRO_MODEL_ID);
            proCachedContent = cache;
            proLastUpdate = now;
          }
        } else {
          // Create new cache
          const cache = await createCacheForModel(proAgents, PRO_MODEL_ID);
          proCachedContent = cache;
          proLastUpdate = now;
        }
      }

    } catch (error) {
      console.error('[Cache] Warmup failed:', error);
      // Don't throw - allow session to continue without cache
    } finally {
      warmupPromise = null;
    }
  })();

  return warmupPromise;
}

/**
 * Ensure cache is fresh before use
 *
 * Auto-renews cache if approaching expiration (90-minute threshold).
 * Called before each AI request to maintain cache freshness.
 *
 * @param modelId - Model ID to get cache for (flash or pro)
 * @returns Cache name for use in generateContent config, or null if cache unavailable
 */
export async function ensureCacheFresh(modelId: string = FLASH_MODEL_ID): Promise<string | null> {
  const isFlash = modelId === FLASH_MODEL_ID;
  const cachedContent = isFlash ? flashCachedContent : proCachedContent;
  const lastUpdate = isFlash ? flashLastUpdate : proLastUpdate;

  // If no cache exists, try to create one (but don't block)
  if (!cachedContent) {
    warmupAllCaches().catch((err) => {
      console.warn('[Cache] Background warmup failed:', err);
    });
    return null;
  }

  const timeSinceUpdate = Date.now() - lastUpdate;

  // If approaching expiration, renew in background
  if (timeSinceUpdate > RENEWAL_THRESHOLD_MS && cachedContent.name) {
    console.log(`[Cache] ${modelId} cache approaching expiration (${Math.round(timeSinceUpdate / 60000)}min old), renewing...`);

    // Renew in background (don't block request)
    renewCache(cachedContent.name, modelId)
      .then((renewed) => {
        if (isFlash) {
          flashCachedContent = renewed;
          flashLastUpdate = Date.now();
        } else {
          proCachedContent = renewed;
          proLastUpdate = Date.now();
        }
      })
      .catch((err) => {
        console.error(`[Cache] Background renewal failed for ${modelId}:`, err);
      });
  }

  return cachedContent.name ?? null;
}

/**
 * Get cached content name for use in API calls
 *
 * Returns cache name if available, null otherwise.
 * Does NOT trigger cache creation (use ensureCacheFresh for that).
 *
 * @param modelId - Model ID to get cache for (flash or pro)
 * @returns Cache name or null
 */
export function getCacheName(modelId: string = FLASH_MODEL_ID): string | null {
  const cachedContent = modelId === FLASH_MODEL_ID ? flashCachedContent : proCachedContent;
  return cachedContent?.name ?? null;
}

/**
 * Invalidate all caches manually
 *
 * Call this when agent prompts are updated in the database.
 * Forces recreation of caches on next warmup.
 */
export async function invalidateCache(): Promise<void> {
  const ai = getAIClient();
  let anyDeleted = false;

  // Invalidate Flash cache
  if (flashCachedContent?.name) {
    try {
      await ai.caches.delete({ name: flashCachedContent.name });
      console.log('[Cache] ✓ Flash cache invalidated');
      anyDeleted = true;
    } catch (error) {
      console.error('[Cache] Failed to delete Flash cache:', error);
    } finally {
      flashCachedContent = null;
      flashLastUpdate = 0;
    }
  }

  // Invalidate Pro cache
  if (proCachedContent?.name) {
    try {
      await ai.caches.delete({ name: proCachedContent.name });
      console.log('[Cache] ✓ Pro cache invalidated');
      anyDeleted = true;
    } catch (error) {
      console.error('[Cache] Failed to delete Pro cache:', error);
    } finally {
      proCachedContent = null;
      proLastUpdate = 0;
    }
  }

  if (!anyDeleted) {
    console.log('[Cache] No caches to invalidate');
  }
}

/**
 * Get cache status for monitoring/debugging
 *
 * @returns Cache status information for both Flash and Pro caches
 */
export function getCacheStatus(): {
  flash: {
    cached: boolean;
    cacheName: string | null;
    ageMinutes: number;
    willRenewSoon: boolean;
  };
  pro: {
    cached: boolean;
    cacheName: string | null;
    ageMinutes: number;
    willRenewSoon: boolean;
  };
} {
  const flashAgeMs = Date.now() - flashLastUpdate;
  const proAgeMs = Date.now() - proLastUpdate;

  return {
    flash: {
      cached: !!flashCachedContent,
      cacheName: flashCachedContent?.name ?? null,
      ageMinutes: flashCachedContent ? Math.round(flashAgeMs / 60000) : 0,
      willRenewSoon: flashCachedContent ? flashAgeMs > RENEWAL_THRESHOLD_MS : false
    },
    pro: {
      cached: !!proCachedContent,
      cacheName: proCachedContent?.name ?? null,
      ageMinutes: proCachedContent ? Math.round(proAgeMs / 60000) : 0,
      willRenewSoon: proCachedContent ? proAgeMs > RENEWAL_THRESHOLD_MS : false
    }
  };
}
