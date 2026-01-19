/**
 * Session Manager (Memory Layer 2: Session Memory)
 *
 * Manages session history and interactions for conversation continuity.
 * This is the second layer of the 3-layer memory system.
 *
 * Lifespan: Current learning session only
 * Purpose: Maintain conversation continuity and track immediate progress
 *
 * Reference: Bloom_Academia_Backend.md - Section 5.2
 */

import { supabase } from '@/lib/db/supabase'

export interface Interaction {
  id: string
  session_id: string
  timestamp: string
  user_message: string
  ai_response: string
  was_helpful: boolean | null
}

/**
 * Get recent conversation history for a session
 * Returns interactions in chronological order (oldest first)
 */
export async function getSessionHistory(
  sessionId: string,
  limit: number = 10
): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch session history: ${error.message}`)
  }

  // Reverse to get chronological order (oldest first)
  return data.reverse()
}

/**
 * Save a new interaction to the database
 */
export async function saveInteraction(
  sessionId: string,
  interaction: {
    userMessage: string
    aiResponse: string
  }
): Promise<Interaction> {
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      session_id: sessionId,
      user_message: interaction.userMessage,
      ai_response: interaction.aiResponse,
      timestamp: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save interaction: ${error.message}`)
  }

  return data
}

/**
 * Get interaction count for a session
 */
export async function getInteractionCount(sessionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if (error) {
    throw new Error(`Failed to count interactions: ${error.message}`)
  }

  return count || 0
}
