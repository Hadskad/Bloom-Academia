/**
 * POST /api/teach/prefetch - Warm Teaching Context Caches
 *
 * Loads teaching context to populate in-memory caches (profile, lesson, mastery).
 * Called on page load to eliminate ~100-200ms from first student interaction.
 *
 * This is a fire-and-forget optimization — failures are non-critical.
 *
 * Cache Invalidation (Automatic):
 * - Mastery cache: refreshMasteryCache() called by mastery-detector.ts after evidence recording
 * - Profile cache: invalidateCache() called by profile-enricher.ts after pattern detection
 * - Lesson cache: No invalidation needed (static curriculum, 30-min TTL)
 *
 * Reference: MEMORY.md - Caching (context loading optimization)
 * Reference: lib/ai/teaching-helpers.ts - loadTeachingContext() (6 parallel queries)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIAgentManager } from '@/lib/ai/agent-manager';
import { loadTeachingContext } from '@/lib/ai/teaching-helpers';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { userId, sessionId, lessonId } = body;

    if (!userId || !sessionId || !lessonId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, sessionId, lessonId' },
        { status: 400 }
      );
    }

    console.log(`[Prefetch] Warming context for session ${sessionId.substring(0, 8)}...`);

    // Load context — this populates all caches:
    // - profileCache (lib/memory/profile-manager.ts) - 5-min TTL
    // - lessonCache (lib/ai/teaching-helpers.ts) - 30-min TTL
    // - masteryCache (lib/ai/mastery-tracker.ts) - 5-min TTL
    //
    // Cache invalidation happens automatically:
    // - Mastery: refreshMasteryCache() after recordMasteryEvidence()
    // - Profile: invalidateCache() after enrichProfileIfNeeded()
    const agentManager = new AIAgentManager();
    await loadTeachingContext(userId, sessionId, lessonId, agentManager);

    const duration = Date.now() - startTime;
    console.log(`[Prefetch] Context warmed in ${duration}ms`);

    return NextResponse.json({
      ok: true,
      duration,
      cacheStatus: {
        profile: 'warmed',
        lesson: 'warmed',
        mastery: 'warmed'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Prefetch] Error (${duration}ms):`, error);

    // Don't throw — prefetch failure is non-critical
    // Student's first message will populate caches on-demand
    return NextResponse.json(
      {
        ok: false,
        error: 'Prefetch failed (non-critical - caches will populate on first message)',
        duration
      },
      { status: 200 } // 200 because failure is acceptable
    );
  }
}
