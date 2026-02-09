/**
 * Learning Analyzer (Memory Layer 3: Long-term Learning Analysis)
 *
 * Analyzes session interactions using Gemini to discover learning patterns.
 * Updates user profile with discovered insights after each session.
 *
 * Lifespan: Permanent, updated after each session
 * Purpose: Discover learning patterns and adapt teaching style over time
 *
 * Reference: Bloom_Academia_Backend.md - Section 5.3
 * Reference: Implementation_Roadmap.md - Day 20
 */

import { GoogleGenAI } from '@google/genai'
import { supabase } from '@/lib/db/supabase'
import { getUserProfile, UserProfile, invalidateCache as invalidateProfileCache } from './profile-manager'
import { getSessionHistory, Interaction } from './session-manager'

/**
 * Analysis result returned by Gemini
 */
interface LearningAnalysis {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic'
  newStrengths: string[]
  newStruggles: string[]
  preferredPace: 'fast' | 'medium' | 'slow'
}

/**
 * Analyze a completed session to discover learning patterns
 *
 * Uses Gemini 3 Flash to analyze conversation interactions and identify:
 * - Learning style (visual, auditory, kinesthetic)
 * - Topics the student mastered (strengths)
 * - Topics needing more work (struggles)
 * - Preferred learning pace
 *
 * The analysis results are used to update the user's profile for future sessions.
 *
 * @param userId - UUID of the user
 * @param sessionId - UUID of the completed session
 * @returns Analysis results
 * @throws Error if Gemini API call fails or profile update fails
 */
export async function analyzeSessionLearning(
  userId: string,
  sessionId: string
): Promise<LearningAnalysis> {
  // Initialize Gemini client
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  const gemini = new GoogleGenAI({ apiKey })

  // Get current profile and session data
  const profile = await getUserProfile(userId)
  const interactions = await getSessionHistory(sessionId, 50)

  // Build prompt for Gemini analysis
  const prompt = `Analyze this learning session and identify patterns:

Current Profile:
- Learning style: ${profile.learning_style || 'unknown'}
- Strengths: ${profile.strengths?.join(', ') || 'none yet'}
- Struggles: ${profile.struggles?.join(', ') || 'none yet'}

Session interactions:
${JSON.stringify(interactions, null, 2)}

Identify:
1. Does this student learn better with visual explanations, step-by-step logic, real-world analogies, or practice problems?
2. What pace do they prefer? (fast/medium/slow)
3. What topics did they master?
4. What topics need more work?

Return ONLY valid JSON with these exact fields:
{
  "learningStyle": "visual" | "auditory" | "kinesthetic",
  "newStrengths": ["topic1", "topic2"],
  "newStruggles": ["topic3"],
  "preferredPace": "fast" | "medium" | "slow"
}`

  // Call Gemini API
  const response = await gemini.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  })

  // Parse response
  const analysisText = response.text

  // Validate response exists
  if (!analysisText) {
    throw new Error('No response received from Gemini for learning analysis')
  }

  const cleanJson = analysisText.replace(/```json|```/g, '').trim()
  const analysis: LearningAnalysis = JSON.parse(cleanJson)

  // Update user profile with discovered insights
  const { error } = await supabase
    .from('users')
    .update({
      learning_style: analysis.learningStyle,
      strengths: [
        ...new Set([...(profile.strengths || []), ...analysis.newStrengths]),
      ],
      struggles: [
        ...new Set([...(profile.struggles || []), ...analysis.newStruggles]),
      ],
      preferences: {
        ...profile.preferences,
        pace: analysis.preferredPace,
      },
    })
    .eq('id', userId)
    .select()

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`)
  }

  // Invalidate profile cache so next session loads fresh data
  invalidateProfileCache(userId)

  return analysis
}
