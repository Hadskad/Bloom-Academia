/**
 * Profile Manager (Memory Layer 1: Persistent User Profile)
 *
 * Manages user profiles stored in the database.
 * This is the first layer of the 3-layer memory system.
 *
 * Lifespan: Permanent (across all sessions)
 * Purpose: Store fundamental user information and learning patterns
 *
 * Reference: Bloom_Academia_Backend.md - Section 5.1
 */

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
 * Fetch user profile from database
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`)
  }

  return data
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

  return data
}
