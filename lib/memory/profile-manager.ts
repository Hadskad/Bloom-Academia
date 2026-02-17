/**
 * Profile Manager (Memory Layer 1: Persistent User Profile)
 *
 * Manages user profiles stored in the database.
 * This is the first layer of the 3-layer memory system.
 *
 * Lifespan: Permanent (across all sessions)
 * Purpose: Store fundamental user information and learning patterns
 *
 * ✅ OPTIMIZATION (2026-02-15): Persistent cache using Next.js Data Cache
 * - Replaced in-memory Map with unstable_cache (persists across serverless instances)
 * - Cache survives function restarts and deployments
 * - Expected improvement: 150ms → 5ms for cache hits (30x faster)
 *
 * Reference: Next.js 15 unstable_cache API
 * https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 */

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { supabase } from '@/lib/db/supabase'

export interface UserProfile {
  id: string
  name: string
  age: number
  grade_level: number
  learning_style: string | null
  strengths: string[]
  struggles: string[]
  preferences: Record<string, any>
  total_learning_time: number
  created_at: string
  updated_at: string
}

/**
 * Fetch user profile from database with persistent caching
 *
 * Uses Next.js Data Cache (unstable_cache) which persists across:
 * - Serverless function invocations
 * - Deployments
 * - All instances (unlike in-memory Map which was instance-specific)
 *
 * Cache behavior:
 * - Hit: ~5ms (instant)
 * - Miss: ~150ms (Supabase query)
 * - TTL: 300 seconds (5 minutes)
 * - Invalidation: Via revalidateTag('profile')
 *
 * Reference: Next.js 15 unstable_cache
 * https://nextjs.org/docs/app/api-reference/functions/unstable_cache
 */
export const getUserProfile = unstable_cache(
  async (userId: string): Promise<UserProfile> => {
    console.log(`[Profile Cache] MISS - Fetching profile from DB for user ${userId.substring(0, 8)}`);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch user profile: ${error.message}`)
    }

    console.log(`[Profile Cache] Cached profile for user ${userId.substring(0, 8)}`);
    return data;
  },
  ['user-profile'], // Cache key prefix
  {
    revalidate: 300, // 5 minutes TTL (same as before)
    tags: ['profile'] // Tag for global invalidation
  }
);

/**
 * Invalidate cached profile across ALL serverless instances
 *
 * Replaces old invalidateCache() which only cleared instance-local Map.
 * Now uses revalidateTag() which purges cache globally.
 *
 * Called by:
 * - profile-enricher.ts after profile updates
 * - updateLearningStyle() and updateLearningPatterns() after mutations
 *
 * Reference: Next.js 15 revalidateTag (single-parameter form)
 * https://nextjs.org/docs/app/api-reference/functions/revalidateTag
 */
export function invalidateCache(userId: string): void {
  revalidateTag('profile');
  console.log(`[Profile Cache] Invalidated globally for user ${userId.substring(0, 8)}`);
}

/**
 * Update user learning style (discovered over time)
 */
export async function updateLearningStyle(
  userId: string,
  learningStyle: 'visual' | 'auditory' | 'kinesthetic'
) {
  const { data, error } = await supabase
    .from('users')
    .update({ learning_style: learningStyle })
    .eq('id', userId)
    .select()

  if (error) {
    throw new Error(`Failed to update learning style: ${error.message}`)
  }

  // ✅ Invalidate cache globally after update
  revalidateTag('profile');
  console.log(`[Profile] Learning style updated for user ${userId.substring(0, 8)}, cache invalidated`);

  return data
}

/**
 * Update user strengths and struggles
 */
export async function updateLearningPatterns(
  userId: string,
  strengths: string[],
  struggles: string[]
) {
  const { data, error } = await supabase
    .from('users')
    .update({
      strengths,
      struggles
    })
    .eq('id', userId)
    .select()

  if (error) {
    throw new Error(`Failed to update learning patterns: ${error.message}`)
  }

  // ✅ Invalidate cache globally after update
  revalidateTag('profile');
  console.log(`[Profile] Learning patterns updated for user ${userId.substring(0, 8)}, cache invalidated`);

  return data
}
