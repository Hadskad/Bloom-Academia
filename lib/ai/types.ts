/**
 * AI Agent Types
 *
 * TypeScript type definitions for the Multi-AI Agent system.
 * These types match the database schema defined in migration_001_multi_ai_system.sql
 *
 * Reference: Implementation_Roadmap_2.md - Section 1.2 Multi-AI Architecture
 */

/**
 * Agent role types - determines agent behavior
 */
export type AgentRole = 'coordinator' | 'subject' | 'support';

/**
 * Agent status - whether the agent is available for use
 */
export type AgentStatus = 'active' | 'maintenance' | 'disabled';

/**
 * Agent capabilities - what actions the agent can perform
 */
export interface AgentCapabilities {
  can_teach?: boolean;
  can_assess?: boolean;
  can_route?: boolean;
  can_motivate?: boolean;
  can_generate_svg?: boolean;
  can_grade?: boolean;
  specialties?: string[];
}

/**
 * Agent performance metrics - tracked over time
 */
export interface AgentPerformanceMetrics {
  total_interactions: number;
  avg_effectiveness: number;
  success_rate: number;
  last_updated?: string;
}

/**
 * AI Agent record from database
 * Matches the ai_agents table schema
 */
export interface AIAgent {
  id: string;
  name: string;
  role: AgentRole;
  model: string;
  system_prompt: string;
  subjects: string[];
  capabilities: AgentCapabilities;
  performance_metrics: AgentPerformanceMetrics;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Routing decision from the Coordinator AI
 */
export interface RoutingDecision {
  route_to: string;       // Agent name or 'self'
  reason: string;         // Why this agent was chosen
  handoff_message?: string; // Optional message for smooth transition
  response?: string;      // Only if coordinator handles directly (route_to: 'self')
}

/**
 * Agent interaction record
 * Matches the agent_interactions table schema
 */
export interface AgentInteraction {
  id?: string;
  session_id: string;
  agent_id: string;
  user_message: string;
  agent_response: string;
  routing_reason?: string;
  handoff_from?: string;
  effectiveness_score?: number;
  response_time_ms?: number;
  timestamp?: string;
}

/**
 * Context passed to agents for generating responses
 */
export interface AgentContext {
  userId: string;
  sessionId: string;
  lessonId?: string;
  userProfile: {
    name: string;
    age: number;
    grade_level: number;
    learning_style?: string | null;
    strengths?: string[];
    struggles?: string[];
  };
  conversationHistory?: Array<{
    user_message: string;
    ai_response: string;
    timestamp?: string;
  }>;
  lessonContext?: {
    title: string;
    subject: string;
    learning_objective: string;
  };
  previousAgent?: string; // For handoff context
}

/**
 * Response from a specialist agent
 */
export interface AgentResponse {
  audioText: string;      // Text for TTS
  displayText: string;    // Text for screen display
  svg?: string | null;    // Optional SVG diagram
  lessonComplete?: boolean;
  agentName: string;      // Which agent responded
  handoffMessage?: string; // Message shown during agent transition
  handoffRequest?: string; // Request handoff to specific agent (e.g., 'motivator', 'assessor')
}

/**
 * Available agent names (for type safety)
 */
export type AgentName =
  | 'coordinator'
  | 'math_specialist'
  | 'science_specialist'
  | 'english_specialist'
  | 'history_specialist'
  | 'art_specialist'
  | 'assessor'
  | 'motivator';
