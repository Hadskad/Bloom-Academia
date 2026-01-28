/**
 * Agent Performance Analytics
 *
 * Tracks and updates AI agent performance metrics.
 * Used to monitor agent effectiveness and identify areas for improvement.
 *
 * Metrics tracked:
 * - total_interactions: Total number of interactions handled
 * - avg_effectiveness: Average effectiveness score (0-100)
 * - success_rate: Percentage of successful interactions
 *
 * Reference: Implementation_Roadmap_2.md - Day 18
 * Supabase docs: https://supabase.com/docs/reference/javascript/select
 */

import { supabase } from '@/lib/db/supabase';
import type { AgentPerformanceMetrics } from '@/lib/ai/types';

/**
 * Feedback types for student feedback on interactions
 */
export type StudentFeedback = 'helpful' | 'not_helpful' | null;

/**
 * Raw metrics data from database aggregation
 */
interface RawMetrics {
  total_interactions: number;
  avg_effectiveness: number | null;
  successful_count: number;
}

/**
 * Calculate performance metrics for a specific agent
 *
 * Queries the agent_interactions table to compute:
 * - Total number of interactions
 * - Average effectiveness score
 * - Success rate (interactions with effectiveness >= 70)
 *
 * @param agentId - The UUID of the agent
 * @returns Calculated metrics object
 */
export async function calculateAgentMetrics(
  agentId: string
): Promise<AgentPerformanceMetrics> {
  // Query agent_interactions for this agent's stats
  // Reference: https://supabase.com/docs/reference/javascript/select
  const { data, error } = await supabase
    .from('agent_interactions')
    .select('effectiveness_score')
    .eq('agent_id', agentId);

  if (error) {
    console.error(`Error fetching metrics for agent ${agentId}:`, error);
    // Return default metrics on error
    return {
      total_interactions: 0,
      avg_effectiveness: 0,
      success_rate: 0,
      last_updated: new Date().toISOString()
    };
  }

  // Calculate metrics from raw data
  const interactions = data || [];
  const totalInteractions = interactions.length;

  if (totalInteractions === 0) {
    return {
      total_interactions: 0,
      avg_effectiveness: 0,
      success_rate: 0,
      last_updated: new Date().toISOString()
    };
  }

  // Calculate average effectiveness (only from interactions with scores)
  const scoredInteractions = interactions.filter(
    (i) => i.effectiveness_score !== null && i.effectiveness_score !== undefined
  );

  let avgEffectiveness = 0;
  if (scoredInteractions.length > 0) {
    const totalScore = scoredInteractions.reduce(
      (sum, i) => sum + (i.effectiveness_score || 0),
      0
    );
    avgEffectiveness = totalScore / scoredInteractions.length;
  }

  // Calculate success rate (effectiveness >= 70 is considered successful)
  const successfulCount = scoredInteractions.filter(
    (i) => (i.effectiveness_score || 0) >= 70
  ).length;

  // If no scored interactions yet, use total interactions for success rate calculation
  const successRate = scoredInteractions.length > 0
    ? (successfulCount / scoredInteractions.length) * 100
    : 0;

  return {
    total_interactions: totalInteractions,
    avg_effectiveness: Math.round(avgEffectiveness * 100) / 100, // Round to 2 decimal places
    success_rate: Math.round(successRate * 100) / 100,
    last_updated: new Date().toISOString()
  };
}

/**
 * Update an agent's performance metrics in the database
 *
 * Calculates fresh metrics and updates the ai_agents table.
 *
 * @param agentId - The UUID of the agent to update
 */
export async function updateAgentPerformance(agentId: string): Promise<void> {
  // Calculate current metrics
  const metrics = await calculateAgentMetrics(agentId);

  // Update the agent record
  // Reference: https://supabase.com/docs/reference/javascript/update
  const { error } = await supabase
    .from('ai_agents')
    .update({
      performance_metrics: metrics
    })
    .eq('id', agentId);

  if (error) {
    console.error(`Error updating performance metrics for agent ${agentId}:`, error);
    // Don't throw - metrics update shouldn't break the main flow
  }
}

/**
 * Track agent performance after an interaction
 *
 * This is the main entry point called after each teaching interaction.
 * It updates the effectiveness score if feedback is provided,
 * then recalculates and updates the agent's metrics.
 *
 * @param agentId - The UUID of the agent
 * @param interactionId - The UUID of the interaction to update
 * @param feedback - Optional student feedback ('helpful' or 'not_helpful')
 */
export async function trackAgentPerformance(
  agentId: string,
  interactionId?: string,
  feedback?: StudentFeedback
): Promise<void> {
  // If feedback is provided, update the interaction's effectiveness score
  if (interactionId && feedback) {
    const effectivenessScore = feedback === 'helpful' ? 100 : 0;

    const { error } = await supabase
      .from('agent_interactions')
      .update({ effectiveness_score: effectivenessScore })
      .eq('id', interactionId);

    if (error) {
      console.error(`Error updating interaction ${interactionId} with feedback:`, error);
    }
  }

  // Recalculate and update agent metrics
  await updateAgentPerformance(agentId);
}

/**
 * Get performance metrics for all active agents
 *
 * Returns an array of all agents with their current performance metrics.
 *
 * @returns Array of agents with performance data
 */
export async function getAllAgentMetrics(): Promise<Array<{
  id: string;
  name: string;
  role: string;
  status: string;
  performance_metrics: AgentPerformanceMetrics;
}>> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, role, status, performance_metrics')
    .eq('status', 'active')
    .order('role', { ascending: true });

  if (error) {
    console.error('Error fetching agent metrics:', error);
    return [];
  }

  return data || [];
}

/**
 * Batch update all agent metrics
 *
 * Recalculates and updates metrics for all active agents.
 * Useful for periodic maintenance or after bulk operations.
 */
export async function refreshAllAgentMetrics(): Promise<void> {
  // Get all active agents
  const { data: agents, error } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('status', 'active');

  if (error || !agents) {
    console.error('Error fetching agents for metrics refresh:', error);
    return;
  }

  // Update each agent's metrics (in parallel for efficiency)
  await Promise.all(
    agents.map((agent) => updateAgentPerformance(agent.id))
  );

  console.log(`Refreshed metrics for ${agents.length} agents`);
}

/**
 * Get interaction count for a specific agent in a time period
 *
 * @param agentId - The UUID of the agent
 * @param since - Start date for the time period
 * @returns Count of interactions
 */
export async function getAgentInteractionCount(
  agentId: string,
  since?: Date
): Promise<number> {
  let query = supabase
    .from('agent_interactions')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId);

  if (since) {
    query = query.gte('timestamp', since.toISOString());
  }

  const { count, error } = await query;

  if (error) {
    console.error(`Error getting interaction count for agent ${agentId}:`, error);
    return 0;
  }

  return count || 0;
}
