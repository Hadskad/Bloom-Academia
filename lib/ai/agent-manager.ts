/**
 * AI Agent Manager
 *
 * Manages the Multi-AI Agent system for Bloom Academia.
 * Handles agent loading, caching, routing, and response generation.
 *
 * Architecture:
 * - Coordinator: Routes requests to specialists
 * - Subject Specialists: Math, Science, English, History, Art
 * - Support Specialists: Assessor, Motivator
 *
 * Reference: Implementation_Roadmap_2.md - Section 3 (Days 15-18)
 * Supabase docs: https://supabase.com/docs/reference/javascript/select
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { supabase } from '@/lib/db/supabase';
import { updateAgentPerformance } from '@/lib/analytics/agent-performance';
import type {
  AIAgent,
  AgentContext,
  AgentResponse,
  RoutingDecision,
  AgentInteraction,
  AgentName
} from './types';

/**
 * Zod schema for structured teaching response
 * Same schema as in gemini-client.ts for consistency
 *
 * Reference: https://ai.google.dev/gemini-api/docs/structured-output
 */
const teachingResponseSchema = z.object({
  audioText: z.string().describe('Text optimized for speech synthesis (natural spoken language), should reference the visual diagram when available'),
  displayText: z.string().describe('Text to display on screen that can reference the visual diagram. Use markdown formatting (bold, headers, lists) to make it beautiful and readable.'),
  svg: z.string().nullable().describe('SVG code for visual diagram (must be valid SVG XML or null)'),
  lessonComplete: z.boolean().describe('Set to true ONLY when the student has demonstrated complete mastery of ALL lesson objectives through their responses and understanding. Be strict - partial understanding is not enough.')
});

/**
 * Cache entry for agents
 */
interface AgentCacheEntry {
  agents: Map<string, AIAgent>;
  timestamp: number;
}

/**
 * Module-level cache for agents
 * Using module scope for persistence across requests in serverless environment
 *
 * Cache Strategy:
 * - TTL: 5 minutes (agents don't change frequently)
 * - Stores all active agents in a single cache entry
 * - Invalidated on agent updates (manual for now)
 */
let agentCache: AgentCacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * AI Agent Manager Class
 *
 * Singleton-like behavior through module-level caching.
 * Each instance shares the same cached agents.
 */
export class AIAgentManager {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Load all active agents from database (with caching)
   *
   * Performance: Cache hit ~0ms, Cache miss ~50-100ms
   *
   * @returns Map of agent name to agent config
   */
  async loadAgents(): Promise<Map<string, AIAgent>> {
    const now = Date.now();

    // Return cached agents if valid
    if (agentCache && (now - agentCache.timestamp < CACHE_TTL_MS)) {
      return agentCache.agents;
    }

    // Fetch all active agents from database
    // Reference: https://supabase.com/docs/reference/javascript/select
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to load AI agents: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No active AI agents found in database');
    }

    // Build agents map
    const agents = new Map<string, AIAgent>();
    for (const agent of data) {
      agents.set(agent.name, agent as AIAgent);
    }

    // Update cache
    agentCache = {
      agents,
      timestamp: now
    };

    return agents;
  }

  /**
   * Get a specific agent by name
   *
   * @param name - Agent name (e.g., 'math_specialist')
   * @returns Agent config or throws if not found
   */
  async getAgent(name: AgentName | string): Promise<AIAgent> {
    const agents = await this.loadAgents();
    const agent = agents.get(name);

    if (!agent) {
      throw new Error(`Agent not found: ${name}`);
    }

    return agent;
  }

  /**
   * Get the currently active specialist for a session
   *
   * Queries the last agent interaction to determine which specialist
   * is actively teaching this student.
   *
   * Reference: https://supabase.com/docs/reference/javascript/select
   *
   * @param sessionId - Session UUID
   * @returns Agent name (e.g., 'math_specialist') or null if no active specialist
   */
  async getActiveSpecialist(sessionId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('agent_interactions')
      .select('ai_agents!inner(name)')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null; // No prior interactions
    }

    const agentName = (data as any).ai_agents.name;

    // Return null if last agent was Coordinator (means no active specialist)
    if (agentName === 'coordinator') {
      return null;
    }

    return agentName;
  }

  /**
   * Route a user message to the appropriate agent
   *
   * Uses the Coordinator AI to analyze the message and decide routing.
   *
   * @param userMessage - The student's message
   * @param context - Current context (user profile, conversation history)
   * @returns Routing decision with target agent and reason
   */
  async routeRequest(
    userMessage: string,
    context: AgentContext
  ): Promise<RoutingDecision> {
    const coordinator = await this.getAgent('coordinator');

    // Build routing prompt with context
    const routingPrompt = this.buildRoutingPrompt(coordinator, userMessage, context);

    try {
      // Call Gemini for routing decision
      // Using LOW thinking level for faster routing
      // Note: Not using responseMimeType: 'application/json' due to parsing issues with special characters
      const response = await this.ai.models.generateContent({
        model: coordinator.model,
        contents: routingPrompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          }
        }
      });

      const responseText = response.text;

      if (!responseText) {
        throw new Error('No response from coordinator');
      }

      // Parse JSON response with robust error handling
      let routing: RoutingDecision;
      try {
        // Clean the response text - remove any markdown code blocks if present
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Additional cleanup: escape problematic characters in string values
        // This handles cases where the model includes unescaped newlines in JSON strings
        routing = JSON.parse(cleanJson) as RoutingDecision;
      } catch (parseError) {
        console.error('Failed to parse routing JSON. Raw response:', responseText.substring(0, 500));

        // Attempt to extract route_to using regex as fallback
        const routeMatch = responseText.match(/"route_to"\s*:\s*"([^"]+)"/);
        const reasonMatch = responseText.match(/"reason"\s*:\s*"([^"]+)"/);

        if (routeMatch) {
          console.log('Using regex fallback for routing');
          routing = {
            route_to: routeMatch[1],
            reason: reasonMatch ? reasonMatch[1] : 'Extracted via fallback'
          };
        } else {
          throw new Error(`Invalid JSON from coordinator: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
        }
      }

      // Validate routing decision
      if (!routing.route_to) {
        throw new Error('Invalid routing decision: missing route_to');
      }

      return routing;

    } catch (error) {
      console.error('Error in routing:', error);

      // Fallback: return to coordinator for general handling
      return {
        route_to: 'self',
        reason: 'Routing error - handling directly',
        response: "I'm here to help! Could you tell me more about what you'd like to learn today?"
      };
    }
  }

  /**
   * Get a response from a specific agent
   *
   * @param agentName - Name of the agent to use
   * @param userMessage - The student's message
   * @param context - Current context
   * @returns Structured response with audio/display text
   */
  async getAgentResponse(
    agentName: string,
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const agent = await this.getAgent(agentName);
    const startTime = Date.now();

    // Build the full prompt with agent's system prompt and context
    const prompt = this.buildAgentPrompt(agent, userMessage, context);

    try {
      // Call Gemini with agent's configuration
      // Using MEDIUM thinking for teaching quality
      // JSON mode enabled for structured responses (prevents malformed output)
      // Reference: https://ai.google.dev/gemini-api/docs/structured-output
      const response = await this.ai.models.generateContent({
        model: agent.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MEDIUM
          }
        }
      });

      const responseText = response.text;

      if (!responseText) {
        throw new Error(`No response from ${agentName}`);
      }

      // Parse and validate JSON response against schema
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', responseText.substring(0, 500));
        throw new Error(
          `Invalid JSON response from ${agentName}: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        );
      }

      // Validate against Zod schema
      const validated = teachingResponseSchema.parse(parsedJson);

      // Extract SVG from displayText if Gemini embedded it there instead of using svg field
      // Gemini sometimes returns svg:null but puts [SVG]...[/SVG] in displayText
      let finalSvg = validated.svg;
      let finalDisplayText = validated.displayText;
      let finalAudioText = validated.audioText;

      // Check if SVG markers are present in displayText
      if (!finalSvg && finalDisplayText.includes('[SVG]')) {
        const displayExtracted = this.extractSvgFromText(finalDisplayText);
        if (displayExtracted.svg) {
          finalSvg = displayExtracted.svg;
          finalDisplayText = displayExtracted.cleanedText;
        }
      }

      // Clean SVG markers from audioText if present (TTS should not read SVG code)
      if (finalAudioText.includes('[SVG]') || finalAudioText.includes('<svg')) {
        const audioExtracted = this.extractSvgFromText(finalAudioText);
        finalAudioText = audioExtracted.cleanedText;
      }

      return {
        audioText: finalAudioText,
        displayText: finalDisplayText,
        svg: finalSvg,
        lessonComplete: validated.lessonComplete,
        agentName: agent.name
      };

    } catch (error) {
      console.error(`Error getting response from ${agentName}:`, error);
      throw new Error(
        `Agent ${agentName} error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Full teaching flow with session persistence
   *
   * Implements smart routing that prevents Coordinator interruption:
   * - If specialist is active → Send directly to them (FAST PATH)
   * - If specialist requests handoff → Route to new agent
   * - If lesson complete → Route to Assessor
   * - Otherwise → Use Coordinator to route
   *
   * @param userMessage - The student's message
   * @param context - Current context (profile, history, lesson)
   * @returns Agent response with routing info
   */
  async teach(
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResponse & { routingReason: string }> {

    // STEP 1: Check for active specialist in this session
    const activeSpecialist = await this.getActiveSpecialist(context.sessionId);

    if (activeSpecialist && activeSpecialist !== 'coordinator') {
      // FAST PATH: Active specialist exists - send directly to them
      console.log(`[Agent] Fast path: Continuing with ${activeSpecialist}`);

      const response = await this.getAgentResponse(
        activeSpecialist,
        userMessage,
        {
          ...context,
          previousAgent: activeSpecialist  // For context continuity
        }
      );

      // Check if specialist requests handoff
      if (response.lessonComplete) {
        // Lesson done → Automatically route to Assessor
        console.log('[Agent] Lesson complete - routing to Assessor');
        return await this.routeToAssessor(userMessage, context, response);
      }

      if (response.handoffRequest) {
        // Specialist requests specific agent (e.g., Motivator)
        console.log(`[Agent] Handoff requested to ${response.handoffRequest}`);
        return await this.handleHandoff(
          response.handoffRequest,
          userMessage,
          context,
          activeSpecialist,
          response
        );
      }

      // No handoff needed - specialist continues
      return {
        ...response,
        routingReason: `Continuing with ${activeSpecialist} (session-scoped)`
      };

    } else {
      // NO ACTIVE SPECIALIST: First message or Coordinator last spoke
      // Use Coordinator to determine appropriate specialist
      console.log('[Agent] No active specialist - using Coordinator to route');

      const routing = await this.routeRequest(userMessage, context);

      // If Coordinator handles directly
      if (routing.route_to === 'self' && routing.response) {
        return {
          audioText: routing.response,
          displayText: routing.response,
          svg: null,
          lessonComplete: false,
          agentName: 'coordinator',
          routingReason: routing.reason
        };
      }

      // Route to specialist
      const response = await this.getAgentResponse(
        routing.route_to,
        userMessage,
        {
          ...context,
          previousAgent: 'coordinator'
        }
      );

      // Add handoff message if Coordinator provided one
      if (routing.handoff_message) {
        response.handoffMessage = routing.handoff_message;
      }

      return {
        ...response,
        routingReason: routing.reason
      };
    }
  }

  /**
   * Handle automatic routing to Assessor when lesson completes
   */
  private async routeToAssessor(
    userMessage: string,
    context: AgentContext,
    priorResponse: AgentResponse
  ): Promise<AgentResponse & { routingReason: string }> {

    const response = await this.getAgentResponse(
      'assessor',
      userMessage,
      {
        ...context,
        previousAgent: priorResponse.agentName
      }
    );

    response.handoffMessage = `Great work! You've mastered this lesson. Let's test your understanding.`;

    return {
      ...response,
      routingReason: 'Lesson complete - automated assessment'
    };
  }

  /**
   * Handle specialist-requested handoffs (e.g., to Motivator)
   */
  private async handleHandoff(
    targetAgent: string,
    userMessage: string,
    context: AgentContext,
    fromAgent: string,
    priorResponse: AgentResponse
  ): Promise<AgentResponse & { routingReason: string }> {

    const response = await this.getAgentResponse(
      targetAgent,
      userMessage,
      {
        ...context,
        previousAgent: fromAgent
      }
    );

    // Preserve handoff message from requesting agent
    if (priorResponse.handoffMessage) {
      response.handoffMessage = priorResponse.handoffMessage;
    }

    return {
      ...response,
      routingReason: `Handoff from ${fromAgent} to ${targetAgent}`
    };
  }

  /**
   * Save an agent interaction to the database
   *
   * Also triggers performance metrics update for the agent.
   * Day 18: Added performance tracking integration.
   *
   * @param interaction - Interaction record to save
   */
  async saveInteraction(interaction: AgentInteraction): Promise<void> {
    const { error } = await supabase
      .from('agent_interactions')
      .insert(interaction);

    if (error) {
      console.error('Failed to save agent interaction:', error);
      // Don't throw - interaction logging shouldn't break the flow
      return;
    }

    // Day 18: Update agent performance metrics after saving interaction
    // Run in background to not block the response
    updateAgentPerformance(interaction.agent_id).catch((err) => {
      console.error('Failed to update agent performance metrics:', err);
    });
  }

  /**
   * Build the routing prompt for the Coordinator
   */
  private buildRoutingPrompt(
    coordinator: AIAgent,
    userMessage: string,
    context: AgentContext
  ): string {
    const studentInfo = `
STUDENT INFO:
- Name: ${context.userProfile.name}
- Age: ${context.userProfile.age}
- Grade: ${context.userProfile.grade_level}
${context.lessonContext ? `- Current Lesson: ${context.lessonContext.title} (${context.lessonContext.subject})` : ''}`;

    return `${coordinator.system_prompt}

${studentInfo}

STUDENT MESSAGE: "${userMessage}"

Analyze this message and respond with your routing decision in JSON format.`;
  }

  /**
   * Build the full prompt for a specialist agent
   */
  private buildAgentPrompt(
    agent: AIAgent,
    userMessage: string,
    context: AgentContext
  ): string {
    // Build student context
    const studentContext = `
STUDENT PROFILE:
- Name: ${context.userProfile.name}
- Age: ${context.userProfile.age} years old
- Grade Level: ${context.userProfile.grade_level}
${context.userProfile.learning_style ? `- Learning Style: ${context.userProfile.learning_style}` : ''}
${context.userProfile.strengths?.length ? `- Strengths: ${context.userProfile.strengths.join(', ')}` : ''}
${context.userProfile.struggles?.length ? `- Areas to improve: ${context.userProfile.struggles.join(', ')}` : ''}`;

    // Build conversation history (if available)
    let historyContext = '';
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      historyContext = '\nRECENT CONVERSATION:\n';
      for (const entry of context.conversationHistory.slice(-3)) {
        historyContext += `Student: ${entry.user_message}\n`;
        historyContext += `Teacher: ${entry.ai_response.substring(0, 200)}...\n\n`;
      }
    }

    // Build lesson context (if available)
    let lessonContext = '';
    if (context.lessonContext) {
      lessonContext = `
CURRENT LESSON:
- Title: ${context.lessonContext.title}
- Subject: ${context.lessonContext.subject}
- Objective: ${context.lessonContext.learning_objective}`;
    }

    // Build handoff context
    let handoffContext = '';
    if (context.previousAgent) {
      handoffContext = `\nNOTE: Student was just handed off to you from ${context.previousAgent}. Make a smooth transition.`;
    }

    return `${agent.system_prompt}

${studentContext}
${historyContext}
${lessonContext}
${handoffContext}

IMPORTANT: You MUST respond in JSON format with this exact structure:
{
  "audioText": "2-3 natural sentences optimized for text-to-speech (avoid special characters, code, or technical syntax)",
  "displayText": "Detailed explanation with markdown formatting (headers, bold, lists, etc.). If you include SVG code, put it ONLY in the svg field, NOT here.",
  "svg": "Full SVG code if helpful for visualization, or null if not needed",
  "lessonComplete": true only if student has demonstrated COMPLETE mastery of ALL lesson objectives
}

CRITICAL RULES:
- audioText: Natural spoken language only, NO code or special syntax
- displayText: Can use markdown, but NO SVG code here
- svg: Put SVG code ONLY in this field as a string, or null
- Do NOT use [SVG]...[/SVG] markers anywhere
- Do NOT include lessonComplete=true unless student has fully mastered the lesson

Student: ${userMessage}`;
  }

  /**
   * Extract SVG from text content
   * Handles both [SVG]...[/SVG] wrapper tags and raw <svg>...</svg> tags
   */
  private extractSvgFromText(text: string): { svg: string | null; cleanedText: string } {
    let svg: string | null = null;
    let cleanedText = text;

    // Method 1: Look for [SVG]...[/SVG] wrapper tags (case-insensitive, handles whitespace)
    // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier
    // Using *? (non-greedy) to match the FIRST closing tag, not the last
    const svgWrapperMatch = text.match(/\[SVG\]\s*([\s\S]*?)\s*\[\/SVG\]/i);
    if (svgWrapperMatch) {
      // Extract the inner content and find the actual <svg> tag
      const innerContent = svgWrapperMatch[1].trim();
      const actualSvg = innerContent.match(/<svg[\s\S]*?<\/svg>/i);
      svg = actualSvg ? actualSvg[0].trim() : innerContent;
      // Remove the entire [SVG]...[/SVG] block from text
      cleanedText = text.replace(/\[SVG\]\s*[\s\S]*?\s*\[\/SVG\]/gi, '').trim();
    } else {
      // Method 2: Look for raw <svg>...</svg> tags (model sometimes outputs without wrapper)
      const rawSvgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
      if (rawSvgMatch) {
        svg = rawSvgMatch[0].trim();
        // Remove the SVG from text
        cleanedText = text.replace(/<svg[\s\S]*?<\/svg>/gi, '').trim();
      }
    }

    return { svg, cleanedText };
  }

  /**
   * Parse agent response text and extract metadata
   *
   * Handles two response formats:
   * 1. JSON format: { audioText, displayText, svg, lessonComplete }
   * 2. Plain text with markers: [SVG]...[/SVG], [LESSON_COMPLETE]
   *
   * IMPORTANT: Always extracts SVG from text content, even if JSON response
   * has SVG embedded in displayText instead of svg field.
   */
  private parseAgentResponse(text: string): Omit<AgentResponse, 'agentName'> {
    let audioText: string;
    let displayText: string;
    let svg: string | null = null;
    let lessonComplete = false;
    let handoffRequest: string | undefined;

    // First, try to parse as JSON (model might return structured response)
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);

        if (parsed.audioText) {
          audioText = parsed.audioText;
          displayText = parsed.displayText || parsed.audioText;
          svg = parsed.svg || null;
          lessonComplete = parsed.lessonComplete || false;

          // CRITICAL: Even if we got JSON, check if SVG is embedded in displayText
          // Model sometimes returns svg:null but puts SVG in displayText
          if (!svg && displayText) {
            const extracted = this.extractSvgFromText(displayText);
            if (extracted.svg) {
              svg = extracted.svg;
              displayText = extracted.cleanedText;
              // Also clean audioText if it contains the SVG
              const audioExtracted = this.extractSvgFromText(audioText);
              audioText = audioExtracted.cleanedText;
            }
          }

          // Extract handoff request from text (after SVG extraction)
          const handoffMatch = text.match(/\[HANDOFF_TO:(\w+)\]/i);
          if (handoffMatch) {
            handoffRequest = handoffMatch[1].toLowerCase();
          }

          return { audioText, displayText, svg, lessonComplete, handoffRequest };
        }
      }
    } catch {
      // Not valid JSON, continue with text parsing
    }

    // Fallback: Parse as plain text with markers
    // Extract SVG from the raw text
    const extracted = this.extractSvgFromText(text);
    svg = extracted.svg;

    // Extract handoff request marker
    const handoffMatch = text.match(/\[HANDOFF_TO:(\w+)\]/i);
    if (handoffMatch) {
      handoffRequest = handoffMatch[1].toLowerCase();
    }

    // Detect lesson completion
    lessonComplete =
      text.includes('[LESSON_COMPLETE]') ||
      text.includes('[COMPLETE]') ||
      /you(?:'ve|\s+have)\s+mastered/i.test(text) ||
      /lesson\s+complete/i.test(text) ||
      /congratulations.*(?:completed|mastered)/i.test(text);

    // Clean text - remove markers and SVG code from display text
    const cleanText = extracted.cleanedText
      .replace(/\[LESSON_COMPLETE\]/gi, '')
      .replace(/\[COMPLETE\]/gi, '')
      .replace(/\[HANDOFF_TO:\w+\]/gi, '')
      .replace(/\[\/?\w+\]/g, '')
      .trim();

    return {
      audioText: cleanText,
      displayText: cleanText,
      svg,
      lessonComplete,
      handoffRequest
    };
  }
}

/**
 * Invalidate the agent cache
 * Call this when agents are updated in the database
 */
export function invalidateAgentCache(): void {
  agentCache = null;
}

/**
 * Get cached agent count (for debugging/monitoring)
 */
export function getCacheStatus(): { cached: boolean; agentCount: number; ageMs: number } {
  if (!agentCache) {
    return { cached: false, agentCount: 0, ageMs: 0 };
  }

  return {
    cached: true,
    agentCount: agentCache.agents.size,
    ageMs: Date.now() - agentCache.timestamp
  };
}
