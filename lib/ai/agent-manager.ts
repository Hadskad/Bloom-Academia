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
import { generateSpeech, splitLongSentence, MAX_CHUNK_LENGTH } from '@/lib/tts/google-tts';
import { ensureCacheFresh } from './cache-manager';
import type {
  AIAgent,
  AgentContext,
  AgentResponse,
  RoutingDecision,
  AgentInteraction,
  AgentName,
  ProgressiveAgentResponse,
  ValidationResult,
  ValidationFailure
} from './types';

/**
 * Zod schema for structured teaching response
 * Same schema as in gemini-client.ts for consistency
 *
 * Reference: https://ai.google.dev/gemini-api/docs/structured-output
 */
const teachingResponseSchema = z.object({
  audioText: z.string().describe('Text optimized for speech synthesis (natural spoken language), should reference the visual diagram when available'),
  displayText: z.string().describe('Text to display on screen that can reference the visual diagram. Use markdown formatting to make it beautiful and readable.'),
  svg: z.string().nullable().describe('SVG code for visual diagram (must be valid SVG XML or null)'),
  lessonComplete: z.boolean().describe('Set to true ONLY when the student has demonstrated complete mastery of ALL lesson objectives through their responses and understanding. Be strict - partial understanding is not enough.'),
  teachingPhase: z.number().min(1).max(5).optional().describe('Current teaching phase: 1=Hook & Activate, 2=Direct Instruction, 3=Guided Practice, 4=Independent Practice, 5=Consolidation. Report your current phase accurately.')
});

/**
 * Zod schema for validation result
 * Used by the Validator agent to verify specialist responses
 *
 * Reference: https://ai.google.dev/gemini-api/docs/structured-output
 */
const validationResultSchema = z.object({
  approved: z.boolean().describe('Whether the response passed all validation checks'),
  confidenceScore: z.number().min(0).max(1).describe('Confidence score (0.0-1.0). Threshold for approval: >= 0.80'),
  issues: z.array(z.string()).describe('List of specific issues found (empty if approved)'),
  requiredFixes: z.array(z.string()).nullable().describe('Specific actionable fixes required if rejected (null if approved)')
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
 * Agent name aliases
 *
 * Maps shortened/alternate names to canonical agent names.
 * The Coordinator AI sometimes returns abbreviated names (e.g., "math" instead of "math_specialist").
 * This mapping ensures routing works regardless of the name format returned.
 */
const AGENT_NAME_ALIASES: Record<string, string> = {
  'math': 'math_specialist',
  'science': 'science_specialist',
  'english': 'english_specialist',
  'history': 'history_specialist',
  'art': 'art_specialist',
};

/**
 * TTS Progressive Chunking Constants
 * Used by getAgentResponseProgressiveStreaming for Tier 3 optimization
 */
const MAX_PARALLEL_TTS_CHUNKS = 6; // Rate limiting: max concurrent TTS requests
const MAX_TTS_FAILURE_THRESHOLD = 3; // Allow 3 failures before full fallback

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
   * Resolve agent name using alias mapping
   *
   * @param name - Agent name or alias (e.g., 'math' or 'math_specialist')
   * @returns Canonical agent name
   */
  private resolveAgentName(name: string): string {
    return AGENT_NAME_ALIASES[name] || name;
  }

  /**
   * Get the appropriate thinking level for a specific agent
   *
   * Different agents have different cognitive requirements:
   * - Coordinator: LOW - Fast routing decisions
   * - Math Specialist: HIGH - Precise multi-step logical reasoning
   * - Science Specialist: MEDIUM - Balanced inquiry-based explanations
   * - English Specialist: HIGH - Nuanced language understanding
   * - History Specialist: HIGH - Complex historical analysis
   * - Art Specialist: LOW - Intuitive creative encouragement
   * - Assessor: MEDIUM - Fair evaluation without over-analysis
   * - Motivator: LOW - Quick, genuine emotional support
   *
   * Reference: https://ai.google.dev/gemini-api/docs/thinking
   *
   * @param agentName - Name of the agent
   * @returns ThinkingLevel enum value
   */
  private getThinkingLevelForAgent(agentName: string): ThinkingLevel {
    switch (agentName) {
      // HIGH thinking - Complex reasoning tasks
      case 'math_specialist':
        return ThinkingLevel.HIGH; // Precise multi-step logical reasoning
      case 'english_specialist':
        return ThinkingLevel.HIGH; // Nuanced language and literary analysis
      case 'history_specialist':
        return ThinkingLevel.HIGH; // Complex historical context and analysis

      // MEDIUM thinking - Balanced tasks
      case 'science_specialist':
        return ThinkingLevel.MEDIUM; // Inquiry-based conceptual understanding
      case 'assessor':
        return ThinkingLevel.MEDIUM; // Fair grading without over-analysis

      // LOW thinking - Quick, intuitive responses
      case 'coordinator':
        return ThinkingLevel.LOW; // Fast routing decisions
      case 'art_specialist':
        return ThinkingLevel.LOW; // Intuitive creative encouragement
      case 'motivator':
        return ThinkingLevel.LOW; // Quick, genuine emotional support

      // Default to MEDIUM for unknown agents
      default:
        console.warn(`Unknown agent "${agentName}", using MEDIUM thinking level`);
        return ThinkingLevel.MEDIUM;
    }
  }

  /**
   * Determine if an agent should use Google Search grounding
   *
   * Google Search grounding provides real-time factual information and citations,
   * reducing hallucinations for subjects that require up-to-date factual accuracy.
   *
   * Agents that benefit from grounding:
   * - history_specialist: Historical facts, dates, events, current historical research
   * - science_specialist: Scientific facts, recent discoveries, research findings
   *
   * Agents that don't need grounding:
   * - math_specialist: Math is deterministic, doesn't require web search
   * - english_specialist: Grammar/literature analysis doesn't need web search
   * - art_specialist: Creative/subjective, doesn't need factual grounding
   * - coordinator, assessor, motivator: Support roles, no factual teaching
   *
   * Cost: $14 per 1,000 Google Search queries (as of Jan 5, 2026)
   * Latency: Adds ~1-3 seconds when search is triggered
   *
   * Reference: https://ai.google.dev/gemini-api/docs/google-search
   *
   * @param agentName - Name of the agent
   * @returns true if agent should use Google Search grounding
   */
  private shouldUseGoogleSearch(agentName: string): boolean {
    switch (agentName) {
      case 'history_specialist':
      case 'science_specialist':
        return true;
      default:
        return false;
    }
  }

  /**
   * Get a specific agent by name
   *
   * Supports both canonical names (e.g., 'math_specialist') and aliases (e.g., 'math').
   *
   * @param name - Agent name or alias
   * @returns Agent config or throws if not found
   */
  async getAgent(name: AgentName | string): Promise<AIAgent> {
    const agents = await this.loadAgents();
    const resolvedName = this.resolveAgentName(name);
    const agent = agents.get(resolvedName);

    if (!agent) {
      throw new Error(`Agent not found: ${name} (resolved to: ${resolvedName})`);
    }

    return agent;
  }

  /**
   * Validate a specialist response using the Validator agent
   *
   * This method acts as the quality assurance layer between specialist generation
   * and student delivery. It verifies factual accuracy, curriculum alignment,
   * and pedagogical soundness.
   *
   * Validation checks performed:
   * 1. Factual consistency (definitions, facts, calculations)
   * 2. Curriculum alignment (grade-appropriate, prerequisites met)
   * 3. Internal consistency (text/SVG alignment, no contradictions)
   * 4. Pedagogical soundness (logical explanation order, scaffolding)
   * 5. Visual-text alignment (SVG matches descriptions)
   *
   * Timeout: 10 seconds (fail-safe to prevent blocking student experience)
   *
   * @param response - The specialist response to validate
   * @param context - Current context (grade level, subject, lesson)
   * @returns ValidationResult with approval status and issues/fixes
   */
  async validateResponse(
    response: AgentResponse,
    context: AgentContext
  ): Promise<ValidationResult> {
    try {
      const validator = await this.getAgent('validator');

      // Build validation prompt with full context
      const validationPrompt = this.buildValidationPrompt(response, context);

      // Call Gemini Validator with HIGH thinking level and JSON schema
      // Timeout: 10 seconds (fail-safe)
      // Reference: https://ai.google.dev/gemini-api/docs/structured-output
      const validationPromise = this.ai.models.generateContent({
        model: validator.model,
        contents: validationPrompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(validationResultSchema),
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH // Thorough verification
          }
        }
      });

      // Race against timeout (10s fail-safe)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Validation timeout')), 10000)
      );

      const validationResponse = await Promise.race([
        validationPromise,
        timeoutPromise
      ]);

      const responseText = validationResponse.text;

      if (!responseText) {
        throw new Error('No response from validator');
      }

      // Parse and validate JSON response
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse validator JSON response:', responseText.substring(0, 500));
        throw new Error(
          `Invalid JSON response from validator: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        );
      }

      // Validate against Zod schema
      const validated = validationResultSchema.parse(parsedJson);

      return validated;

    } catch (error) {
      console.error('Error in validation:', error);

      // FAIL-SAFE: Auto-approve on validation errors to prevent blocking students
      // Log the error but don't break the learning flow
      console.warn('Validation failed - auto-approving to prevent blocking student. Error:', error instanceof Error ? error.message : 'Unknown error');

      return {
        approved: true, // Auto-approve on error
        confidenceScore: 0.5, // Low confidence indicates validation issue
        issues: ['Validation system error - auto-approved as fail-safe'],
        requiredFixes: null
      };
    }
  }

  /**
   * Build validation prompt for the Validator agent
   *
   * @param response - The specialist response to validate
   * @param context - Current context (grade level, subject, lesson)
   * @returns Validation prompt as string
   * @private
   */
  private buildValidationPrompt(
    response: AgentResponse,
    context: AgentContext
  ): string {
    return `VALIDATE THE FOLLOWING TEACHING RESPONSE:

CONTEXT:
- Student Grade: ${context.userProfile.grade_level}
- Student Age: ${context.userProfile.age} years old
${context.lessonContext ? `- Lesson: ${context.lessonContext.title} (${context.lessonContext.subject})` : ''}
${context.lessonContext ? `- Learning Objective: ${context.lessonContext.learning_objective}` : ''}
- Specialist: ${response.agentName}

RESPONSE TO VALIDATE:
Audio Text (for TTS):
${response.audioText}

Display Text (for screen):
${response.displayText}

${response.svg ? `SVG Diagram:\n${response.svg}` : 'SVG: None'}

---

YOUR TASK:
Run all 5 validation checks from your system prompt:
1. Factual Consistency
2. Curriculum Alignment
3. Internal Consistency
4. Pedagogical Soundness
5. Visual-Text Alignment (if SVG present)

Respond in JSON format with your validation decision.`;
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
      // Using LOW thinking level for faster routing (coordinator doesn't need deep reasoning)
      // Reference: https://ai.google.dev/gemini-api/docs/thinking
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
        response: "I'm here to help! Could you tell me what you're to learn today?"
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

    // Ensure cache is fresh (auto-renews if needed)
    // Pass agent's model ID to get the correct cache (Flash or Pro)
    const cacheName = await ensureCacheFresh(agent.model);

    // Build the dynamic context (student profile, history, lesson, user message)
    // System prompt is in the cache, so we don't include it here
    const dynamicPrompt = this.buildDynamicContext(agent, userMessage, context);

    try {
      // Determine if this agent should use Google Search grounding
      // Reference: https://ai.google.dev/gemini-api/docs/google-search
      const useGrounding = this.shouldUseGoogleSearch(agent.name);
      const tools = useGrounding ? [{ googleSearch: {} }] : undefined;

      // Call Gemini with agent's configuration
      // Using agent-specific thinking levels for distinct cognitive styles
      // Reference: https://ai.google.dev/gemini-api/docs/thinking
      // JSON mode enabled for structured responses (prevents malformed output)
      // Reference: https://ai.google.dev/gemini-api/docs/structured-output
      // Google Search grounding enabled for history/science specialists
      const response = await this.ai.models.generateContent({
        model: agent.model,
        contents: dynamicPrompt,
        config: {
          // Use cached content if available (contains all agent system prompts)
          ...(cacheName && { cachedContent: cacheName }),
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
          thinkingConfig: {
            thinkingLevel: this.getThinkingLevelForAgent(agent.name)
          },
          // Add Google Search tool for grounded agents
          ...(tools && { tools })
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

      // CRITICAL FIX: Convert literal escape sequences to actual newlines
      // Gemini's JSON mode returns literal "\n" characters instead of newlines
      // This breaks markdown rendering in React
      //
      // IMPORTANT: Must preserve LaTeX backslashes (\frac, \sqrt, \alpha, etc.)
      // Strategy: Protect LaTeX commands before replacing newline sequences
      //
      // Step 1: Temporarily replace LaTeX backslashes with a safe placeholder
      const LATEX_PLACEHOLDER = '___LATEX_BACKSLASH___';
      const latexCommands = [
        // Fractions and roots
        'frac', 'sqrt', 'cbrt',
        // Binary operators
        'times', 'div', 'pm', 'mp', 'cdot',
        // Relations
        'leq', 'geq', 'neq', 'approx', 'equiv',
        // Sums and integrals
        'sum', 'prod', 'int', 'oint',
        // Delimiters
        'left', 'right',
        // Environments
        'begin', 'end',
        // Text formatting
        'text', 'mathbf', 'mathrm', 'mathit', 'mathcal',
        // Greek letters (lowercase)
        'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
        'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
        // Greek letters (uppercase)
        'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
        'Phi', 'Psi', 'Omega',
        // Dots
        'ldots', 'cdots', 'vdots', 'ddots',
        // Other common commands
        'infty', 'partial', 'nabla', 'angle'
      ];

      let protectedText = finalDisplayText;

      // Protect all LaTeX commands by replacing backslash with placeholder
      latexCommands.forEach(cmd => {
        const regex = new RegExp(`\\\\${cmd}`, 'g');
        protectedText = protectedText.replace(regex, `${LATEX_PLACEHOLDER}${cmd}`);
      });

      // Step 2: Now safe to replace newline/tab sequences (won't affect protected LaTeX)
      protectedText = protectedText
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');

      // Step 3: Restore LaTeX backslashes
      finalDisplayText = protectedText.replace(new RegExp(LATEX_PLACEHOLDER, 'g'), '\\');

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

      // Extract grounding metadata if Google Search was used
      // Reference: https://ai.google.dev/gemini-api/docs/google-search
      const groundingMetadata = this.extractGroundingMetadata(response);

      return {
        audioText: finalAudioText,
        displayText: finalDisplayText,
        svg: finalSvg,
        lessonComplete: validated.lessonComplete,
        teachingPhase: validated.teachingPhase,
        agentName: agent.name,
        agentId: agent.id,
        ...(groundingMetadata && { groundingMetadata })
      };

    } catch (error) {
      console.error(`Error getting response from ${agentName}:`, error);
      throw new Error(
        `Agent ${agentName} error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a response from a specific agent using STREAMING
   *
   * Streams response from Gemini with JSON schema validation.
   * Buffers complete JSON before parsing for reliability.
   *
   * Reference: https://ai.google.dev/gemini-api/docs/structured-output
   *
   * @param agentName - Name of the agent to use
   * @param userMessage - The student's message
   * @param context - Current context
   * @returns Structured response with audio/display text
   */
  async getAgentResponseStreaming(
    agentName: string,
    userMessage: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const agent = await this.getAgent(agentName);
    const startTime = Date.now();

    // Ensure cache is fresh (auto-renews if needed)
    // Pass agent's model ID to get the correct cache (Flash or Pro)
    const cacheName = await ensureCacheFresh(agent.model);

    // Build the dynamic context (student profile, history, lesson, user message)
    const dynamicPrompt = this.buildDynamicContext(agent, userMessage, context);

    try {
      // Determine if this agent should use Google Search grounding
      // Reference: https://ai.google.dev/gemini-api/docs/google-search
      const useGrounding = this.shouldUseGoogleSearch(agent.name);
      const tools = useGrounding ? [{ googleSearch: {} }] : undefined;

      // Call Gemini streaming API with JSON schema validation
      // Reference: https://ai.google.dev/gemini-api/docs/structured-output
      // Verified: generateContentStream supports responseMimeType + responseJsonSchema
      const stream = await this.ai.models.generateContentStream({
        model: agent.model,
        contents: dynamicPrompt,
        config: {
          // Use cached content if available
          ...(cacheName && { cachedContent: cacheName }),
          // Enable JSON mode for structured output (same as non-streaming)
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
          // Using agent-specific thinking levels for distinct cognitive styles
          // Reference: https://ai.google.dev/gemini-api/docs/thinking
          thinkingConfig: {
            thinkingLevel: this.getThinkingLevelForAgent(agent.name)
          },
          // Add Google Search tool for grounded agents
          ...(tools && { tools })
        }
      });

      // Buffer all JSON chunks until complete
      // Per official docs: "streamed chunks will be valid partial JSON strings,
      // which can be concatenated to form the final, complete JSON object"
      let jsonBuffer = '';

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          jsonBuffer += text;
        }
      }

      // Validate we received a response
      if (!jsonBuffer || jsonBuffer.trim().length === 0) {
        throw new Error(`No response from ${agentName} (streaming)`);
      }

      // Parse complete JSON with fallback sanitization
      // Known Gemini API bug: https://github.com/googleapis/python-genai/issues/20
      // The API sometimes returns unescaped control characters in JSON strings
      let parsedJson: unknown;
      try {
        // First attempt: parse as-is (in case API fixed the bug)
        parsedJson = JSON.parse(jsonBuffer);
      } catch (parseError) {
        // Fallback: sanitize unescaped control characters within JSON string values
        // This regex targets literal newlines/tabs INSIDE quoted strings only
        try {
          const sanitized = jsonBuffer.replace(
            /"([^"\\]*(\\.[^"\\]*)*)"/g,
            (match) => {
              // Only escape literal control chars, don't double-escape already escaped ones
              return match
                .replace(/(?<!\\)\n/g, '\\n')
                .replace(/(?<!\\)\r/g, '\\r')
                .replace(/(?<!\\)\t/g, '\\t');
            }
          );
          parsedJson = JSON.parse(sanitized);
          console.warn(`[Streaming] Applied control character sanitization for ${agentName} (Gemini API bug)`);
        } catch (sanitizeError) {
          console.error('Failed to parse Gemini streaming JSON response:', jsonBuffer.substring(0, 500));
          throw new Error(
            `Invalid JSON response from ${agentName} (streaming): ${parseError instanceof Error ? parseError.message : 'Parse error'}`
          );
        }
      }

      // Validate against Zod schema (same validation as non-streaming)
      const validated = teachingResponseSchema.parse(parsedJson);

      // Extract SVG from displayText if Gemini embedded it there instead of using svg field
      // (Same fallback logic as non-streaming for consistency)
      let finalSvg = validated.svg;
      let finalDisplayText = validated.displayText;
      let finalAudioText = validated.audioText;

      // CRITICAL FIX: Convert literal escape sequences to actual newlines
      // Gemini's JSON mode returns literal "\n" characters instead of newlines
      // This breaks markdown rendering in React
      //
      // IMPORTANT: Must preserve LaTeX backslashes (\frac, \sqrt, \alpha, etc.)
      // Strategy: Protect LaTeX commands before replacing newline sequences
      //
      // Step 1: Temporarily replace LaTeX backslashes with a safe placeholder
      const LATEX_PLACEHOLDER = '___LATEX_BACKSLASH___';
      const latexCommands = [
        // Fractions and roots
        'frac', 'sqrt', 'cbrt',
        // Binary operators
        'times', 'div', 'pm', 'mp', 'cdot',
        // Relations
        'leq', 'geq', 'neq', 'approx', 'equiv',
        // Sums and integrals
        'sum', 'prod', 'int', 'oint',
        // Delimiters
        'left', 'right',
        // Environments
        'begin', 'end',
        // Text formatting
        'text', 'mathbf', 'mathrm', 'mathit', 'mathcal',
        // Greek letters (lowercase)
        'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
        'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
        // Greek letters (uppercase)
        'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
        'Phi', 'Psi', 'Omega',
        // Dots
        'ldots', 'cdots', 'vdots', 'ddots',
        // Other common commands
        'infty', 'partial', 'nabla', 'angle'
      ];

      let protectedText = finalDisplayText;

      // Protect all LaTeX commands by replacing backslash with placeholder
      latexCommands.forEach(cmd => {
        const regex = new RegExp(`\\\\${cmd}`, 'g');
        protectedText = protectedText.replace(regex, `${LATEX_PLACEHOLDER}${cmd}`);
      });

      // Step 2: Now safe to replace newline/tab sequences (won't affect protected LaTeX)
      protectedText = protectedText
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');

      // Step 3: Restore LaTeX backslashes
      finalDisplayText = protectedText.replace(new RegExp(LATEX_PLACEHOLDER, 'g'), '\\');

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

      // Extract grounding metadata if Google Search was used
      // Note: Streaming responses may have different metadata structure
      // Reference: https://ai.google.dev/gemini-api/docs/google-search
      const groundingMetadata = this.extractGroundingMetadata({ candidates: [stream] });

      return {
        audioText: finalAudioText,
        displayText: finalDisplayText,
        svg: finalSvg,
        lessonComplete: validated.lessonComplete,
        teachingPhase: validated.teachingPhase,
        agentName: agent.name,
        agentId: agent.id,
        ...(groundingMetadata && { groundingMetadata })
      };

    } catch (error) {
      console.error(`Error getting streaming response from ${agentName}:`, error);
      throw new Error(
        `Agent ${agentName} streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get agent response with TRUE PROGRESSIVE streaming - extracts ALL sentences during streaming.
   *
   * This is the Tier 3 latency optimization that:
   * 1. Streams Gemini response
   * 2. Extracts ALL sentences from audioText progressively as they arrive
   * 3. Fires TTS for each sentence immediately during streaming
   * 4. Returns all sentence audio buffers for concatenation
   *
   * This provides maximum parallelism: TTS generation runs concurrently with
   * Gemini streaming for ALL sentences, not just the first one.
   *
   * Safeguards:
   * - Per-sentence length checking with sub-chunking (max 500 chars/chunk)
   * - Rate limiting (max 6 concurrent TTS requests)
   * - TTS failure handling (max 3 failures before full fallback)
   * - Empty/short response early exit
   * - Partial sentence cleanup after stream completes
   * - Graceful degradation with try-catch
   *
   * Reference: https://cresta.com/blog/engineering-for-real-time-voice-agent-latency
   *
   * @param agentName - Name of the agent to query
   * @param userMessage - The student's message
   * @param context - Current context (profile, history, lesson)
   * @returns ProgressiveAgentResponse with all sentence audio buffers
   */
  async getAgentResponseProgressiveStreaming(
    agentName: string,
    userMessage: string,
    context: AgentContext
  ): Promise<ProgressiveAgentResponse> {
    const agent = await this.getAgent(agentName);

    // Ensure cache is fresh (auto-renews if needed)
    const cacheName = await ensureCacheFresh(agent.model);

    // Build the dynamic context (student profile, history, lesson, user message)
    const dynamicPrompt = this.buildDynamicContext(agent, userMessage, context);

    try {
      // Determine if this agent should use Google Search grounding
      const useGrounding = this.shouldUseGoogleSearch(agent.name);
      const tools = useGrounding ? [{ googleSearch: {} }] : undefined;

      // Call Gemini streaming API with JSON schema validation
      const stream = await this.ai.models.generateContentStream({
        model: agent.model,
        contents: dynamicPrompt,
        config: {
          ...(cacheName && { cachedContent: cacheName }),
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
          thinkingConfig: {
            thinkingLevel: this.getThinkingLevelForAgent(agent.name)
          },
          ...(tools && { tools })
        }
      });

      // TIER 3: Progressive sentence extraction with parallel TTS
      let jsonBuffer = '';
      let extractedLength = 0; // Track how much text we've already processed
      let audioTextFieldComplete = false;

      // Track all sentences and their TTS promises
      const allSentences: string[] = [];
      const ttsPromises: Array<Promise<Buffer | null>> = [];
      let ttsFailureCount = 0;

      // Graceful degradation: if too many TTS failures, stop firing new ones
      let shouldContinueTTS = true;

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          jsonBuffer += text;
        }

        // Try to extract NEW sentences progressively
        if (!audioTextFieldComplete && shouldContinueTTS) {
          const extracted = this.tryExtractNextSentences(jsonBuffer, extractedLength);

          if (extracted.newSentences.length > 0) {
            // Process each new sentence
            for (const sentence of extracted.newSentences) {
              allSentences.push(sentence);

              // SAFEGUARD 1: Per-sentence length check with sub-chunking
              const chunks = sentence.length > MAX_CHUNK_LENGTH
                ? splitLongSentence(sentence)
                : [sentence];

              // SAFEGUARD 2: Rate limiting - only fire if under MAX_PARALLEL_TTS_CHUNKS
              const currentActiveTTS = ttsPromises.length - (await Promise.allSettled(ttsPromises)).filter(p => p.status === 'fulfilled').length;

              if (currentActiveTTS < MAX_PARALLEL_TTS_CHUNKS) {
                // Fire TTS for each chunk immediately
                for (const chunkText of chunks) {
                  const ttsPromise = generateSpeech(chunkText, agent.name)
                    .catch((err) => {
                      ttsFailureCount++;
                      console.warn(`[Tier3 TTS] Sentence chunk TTS failed (${ttsFailureCount}/${MAX_TTS_FAILURE_THRESHOLD}): ${err.message}`);

                      // SAFEGUARD 3: Failure threshold
                      if (ttsFailureCount >= MAX_TTS_FAILURE_THRESHOLD) {
                        shouldContinueTTS = false;
                        console.error(`[Tier3 TTS] Max failures reached (${MAX_TTS_FAILURE_THRESHOLD}), falling back to full TTS`);
                      }

                      return null;
                    });

                  ttsPromises.push(ttsPromise);
                }

                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Tier3] Extracted ${chunks.length} chunk(s) from sentence, fired TTS: "${sentence.substring(0, 50)}..."`);
                }
              } else {
                // Rate limit reached - wait for some to complete before firing more
                await Promise.race(ttsPromises);
              }
            }

            extractedLength = extracted.totalExtractedLength;
          }

          audioTextFieldComplete = extracted.fieldComplete;
        }
      }

      // SAFEGUARD 4: Empty/short response early exit
      if (!jsonBuffer || jsonBuffer.trim().length === 0) {
        throw new Error(`No response from ${agentName} (progressive streaming)`);
      }

      // Parse complete JSON with fallback sanitization
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonBuffer);
      } catch (parseError) {
        try {
          const sanitized = jsonBuffer.replace(
            /"([^"\\]*(\\.[^"\\]*)*)"/g,
            (match) => {
              return match
                .replace(/(?<!\\)\n/g, '\\n')
                .replace(/(?<!\\)\r/g, '\\r')
                .replace(/(?<!\\)\t/g, '\\t');
            }
          );
          parsedJson = JSON.parse(sanitized);
          console.warn(`[Progressive] Applied control character sanitization for ${agentName}`);
        } catch (sanitizeError) {
          console.error('Failed to parse progressive streaming JSON:', jsonBuffer.substring(0, 500));
          throw new Error(
            `Invalid JSON response from ${agentName} (progressive): ${parseError instanceof Error ? parseError.message : 'Parse error'}`
          );
        }
      }

      // Validate against Zod schema
      const validated = teachingResponseSchema.parse(parsedJson);

      // Extract SVG from displayText if needed
      let finalSvg = validated.svg;
      let finalDisplayText = validated.displayText;
      let finalAudioText = validated.audioText;

      // CRITICAL FIX: Convert literal escape sequences to actual newlines
      finalDisplayText = finalDisplayText
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');

      if (!finalSvg && finalDisplayText.includes('[SVG]')) {
        const displayExtracted = this.extractSvgFromText(finalDisplayText);
        if (displayExtracted.svg) {
          finalSvg = displayExtracted.svg;
          finalDisplayText = displayExtracted.cleanedText;
        }
      }

      if (finalAudioText.includes('[SVG]') || finalAudioText.includes('<svg')) {
        const audioExtracted = this.extractSvgFromText(finalAudioText);
        finalAudioText = audioExtracted.cleanedText;
      }

      // SAFEGUARD 5: Partial sentence cleanup
      // Check if there's remaining text after all extracted sentences
      const allExtractedText = allSentences.join(' ');
      let remainingAudioText: string | null = null;

      if (finalAudioText.length > allExtractedText.length) {
        const remainingText = finalAudioText.substring(allExtractedText.length).trim();
        if (remainingText.length > 0) {
          // There's a partial sentence or text without sentence boundaries
          remainingAudioText = remainingText;

          // Fire TTS for remaining text if we're still within failure threshold
          if (shouldContinueTTS) {
            const chunks = remainingText.length > MAX_CHUNK_LENGTH
              ? splitLongSentence(remainingText)
              : [remainingText];

            for (const chunkText of chunks) {
              const ttsPromise = generateSpeech(chunkText, agent.name).catch(() => null);
              ttsPromises.push(ttsPromise);
            }
          }
        }
      }

      // Resolve all TTS promises
      const audioBuffers = await Promise.all(ttsPromises);

      // Filter out failed requests (null values)
      const validBuffers = audioBuffers.filter((buf): buf is Buffer => buf !== null);

      // SAFEGUARD 6: Graceful degradation - fallback if too many failures
      let firstSentenceAudio: Buffer | null = null;
      const usedProgressiveExtraction = validBuffers.length > 0 && ttsFailureCount < MAX_TTS_FAILURE_THRESHOLD;

      if (usedProgressiveExtraction) {
        // Concatenate all valid audio buffers
        firstSentenceAudio = Buffer.concat(validBuffers);

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Tier3] Successfully generated ${validBuffers.length} TTS chunks, ${ttsFailureCount} failures`);
        }
      } else {
        // Too many failures - return null to trigger full fallback in route handler
        console.warn(`[Tier3] Progressive TTS failed (${ttsFailureCount} failures), route will use full fallback`);
        firstSentenceAudio = null;
      }

      // Extract first sentence for backward compatibility with route handler
      // If no sentences were extracted (e.g., very short response), use the full audioText
      const firstSentence = allSentences.length > 0 ? allSentences[0] : finalAudioText;

      // Extract grounding metadata if Google Search was used
      const groundingMetadata = this.extractGroundingMetadata({ candidates: [stream] });

      return {
        audioText: finalAudioText,
        displayText: finalDisplayText,
        svg: finalSvg,
        lessonComplete: validated.lessonComplete,
        teachingPhase: validated.teachingPhase,
        agentName: agent.name,
        agentId: agent.id,
        firstSentence,
        remainingAudioText,
        usedProgressiveExtraction,
        firstSentenceAudio,
        ...(groundingMetadata && { groundingMetadata })
      };

    } catch (error) {
      console.error(`Error in progressive streaming from ${agentName}:`, error);
      throw new Error(
        `Agent ${agentName} progressive streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Try to extract the first sentence from a partial JSON buffer.
   *
   * This function attempts to find and extract the audioText field's first
   * sentence from an incomplete JSON string during streaming.
   *
   * @param jsonBuffer - The partial JSON string accumulated so far
   * @returns Object with firstSentence (if found) and whether the field is complete
   */
  private tryExtractFirstSentence(jsonBuffer: string): {
    firstSentence: string | null;
    fieldComplete: boolean;
  } {
    // Look for the audioText field pattern
    // Pattern: "audioText" followed by : and then a quoted string
    const audioTextMatch = jsonBuffer.match(/"audioText"\s*:\s*"((?:[^"\\]|\\.)*)(")?/);

    if (!audioTextMatch) {
      return { firstSentence: null, fieldComplete: false };
    }

    const partialText = audioTextMatch[1];
    const fieldComplete = audioTextMatch[2] === '"'; // Check if closing quote found

    // Unescape the JSON string
    const unescaped = partialText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    // Try to find a complete sentence (ends with . ! or ?)
    const sentenceMatch = unescaped.match(/^[^.!?]+[.!?]+/);

    if (sentenceMatch) {
      return {
        firstSentence: sentenceMatch[0].trim(),
        fieldComplete
      };
    }

    // If field is complete but no sentence boundary found, use the whole text
    if (fieldComplete && unescaped.length > 0) {
      return {
        firstSentence: unescaped.trim(),
        fieldComplete: true
      };
    }

    return { firstSentence: null, fieldComplete };
  }

  /**
   * Try to extract ALL complete sentences from a partial JSON buffer progressively.
   *
   * This is the Tier 3 optimization that extracts all sentences as they arrive,
   * not just the first one. Each sentence fires TTS immediately during streaming.
   *
   * @param jsonBuffer - The partial JSON string accumulated so far
   * @param lastExtractedLength - Length of text already extracted in previous calls
   * @returns Object with new sentences found and field completion status
   */
  private tryExtractNextSentences(
    jsonBuffer: string,
    lastExtractedLength: number
  ): {
    newSentences: string[];
    totalExtractedLength: number;
    fieldComplete: boolean;
  } {
    // Look for the audioText field pattern
    const audioTextMatch = jsonBuffer.match(/"audioText"\s*:\s*"((?:[^"\\]|\\.)*)(")?/);

    if (!audioTextMatch) {
      return { newSentences: [], totalExtractedLength: lastExtractedLength, fieldComplete: false };
    }

    const partialText = audioTextMatch[1];
    const fieldComplete = audioTextMatch[2] === '"'; // Check if closing quote found

    // Unescape the JSON string
    const unescaped = partialText
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    // Only look at NEW text since last extraction
    const newText = unescaped.substring(lastExtractedLength);

    if (newText.length === 0) {
      return { newSentences: [], totalExtractedLength: lastExtractedLength, fieldComplete };
    }

    // Find all complete sentences in the new text
    // Regex: Match text up to and including sentence-ending punctuation
    const sentenceMatches = newText.match(/[^.!?]+[.!?]+/g);

    if (!sentenceMatches || sentenceMatches.length === 0) {
      // No complete sentences yet
      if (fieldComplete && newText.trim().length > 0) {
        // Field is complete but ends without punctuation - treat as final sentence
        return {
          newSentences: [newText.trim()],
          totalExtractedLength: unescaped.length,
          fieldComplete: true
        };
      }
      return { newSentences: [], totalExtractedLength: lastExtractedLength, fieldComplete };
    }

    // Extract all complete sentences from new text
    const newSentences = sentenceMatches.map(s => s.trim()).filter(s => s.length > 0);

    // Calculate how much text we've now extracted
    const extractedText = sentenceMatches.join(' ');
    const totalExtractedLength = lastExtractedLength + extractedText.length;

    return {
      newSentences,
      totalExtractedLength,
      fieldComplete
    };
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

      // SPECIAL CASE: Handle [AUTO_START] messages directly with Coordinator
      // These are system-generated lesson introductions that should not go through routing
      if (userMessage.startsWith('[AUTO_START]')) {
        console.log('[Agent] AUTO_START detected - Coordinator handling directly');

        const response = await this.getAgentResponse(
          'coordinator',
          userMessage,
          context
        );

        return {
          ...response,
          routingReason: 'AUTO_START lesson introduction by Coordinator'
        };
      }

      // Use Coordinator to determine appropriate specialist
      console.log('[Agent] No active specialist - using Coordinator to route');

      const routing = await this.routeRequest(userMessage, context);

      // If Coordinator handles directly
      if (routing.route_to === 'self' && routing.response) {
        const coordinator = await this.getAgent('coordinator'); // hits module cache — no DB round-trip
        return {
          audioText: routing.response,
          displayText: routing.response,
          svg: null,
          lessonComplete: false,
          agentName: 'coordinator',
          agentId: coordinator.id,
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
   * Log a validation failure to the database for teacher review
   *
   * This creates a record in the validation_failures table that can be
   * reviewed by teachers/admins to identify patterns and improve agent prompts.
   *
   * @param failure - Validation failure record to save
   */
  async logValidationFailure(failure: Omit<ValidationFailure, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('validation_failures')
        .insert(failure);

      if (error) {
        console.error('Failed to log validation failure:', error);
        // Don't throw - logging shouldn't break the flow
      }
    } catch (error) {
      console.error('Error logging validation failure:', error);
      // Silently fail - logging is non-critical
    }
  }

  /**
   * Build dynamic context for cached requests
   *
   * When using cached content, the system prompt is already in the cache.
   * This method builds only the dynamic parts: student profile, conversation history,
   * lesson context, adaptive directives, and the current user message.
   *
   * The cache contains ALL agent prompts, so we need to tell the model which agent
   * to use by referencing it in the context.
   *
   * Supports both text and audio input (audio is sent as inline data).
   *
   * @param agent - The agent to use (for reference in context)
   * @param userMessage - The student's message (optional if audio provided)
   * @param context - Current context (includes optional audioBase64/audioMimeType and adaptiveInstructions)
   * @returns Dynamic context as string or array of content parts (for audio)
   */
  private buildDynamicContext(
    agent: AIAgent,
    userMessage: string,
    context: AgentContext
  ): string | any[] {
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

    // NEW: Build adaptive teaching directives (Criterion 2: AI Adapts)
    // These explicit instructions modify teaching behavior based on student context
    let adaptiveContext = '';
    if (context.adaptiveInstructions) {
      adaptiveContext = `\n${context.adaptiveInstructions}\n`;
    }

    // Check if audio input is provided
    // If so, return as array of content parts (text + inline audio)
    // Reference: https://ai.google.dev/gemini-api/docs/audio
    if (context.audioBase64 && context.audioMimeType) {
      const textPrompt = `You are acting as the "${agent.name}" agent. Use the system prompt for "${agent.name}" from the cached content.

${studentContext}
${adaptiveContext}
${historyContext}
${lessonContext}
${handoffContext}

IMPORTANT: Respond using the structured JSON schema provided by the system.
Key field guidance:
- audioText: Natural spoken language (what you SAY to the student). No code or symbols.
- displayText: Written board notes with markdown (what you WRITE). No SVG code here.
- svg: Full SVG diagram string, or null. SVG code goes ONLY here.
- teachingPhase: Your current Teaching Progression phase (1-5). Report accurately.
- lessonComplete: Set to true ONLY when you have completed Phase 5 and the student has demonstrated mastery. The student will then take an MCQ assessment.

Refer to your TRADITIONAL CLASSROOM FORMAT instructions for audioText vs displayText guidance.

Student (via voice):`;

      return [
        { text: textPrompt },
        {
          inlineData: {
            mimeType: context.audioMimeType,
            data: context.audioBase64
          }
        }
      ];
    }

    // Text-only mode: return string format
    // IMPORTANT: Reference which agent should respond
    // The cache contains all agent prompts, so we tell the model which one to use
    return `You are acting as the "${agent.name}" agent. Use the system prompt for "${agent.name}" from the cached content.

${studentContext}
${adaptiveContext}
${historyContext}
${lessonContext}
${handoffContext}

IMPORTANT: Respond using the structured JSON schema provided by the system.
Key field guidance:
- audioText: Natural spoken language (what you SAY to the student). No code or symbols.
- displayText: Written board notes with markdown (what you WRITE). No SVG code here.
- svg: Full SVG diagram string, or null. SVG code goes ONLY here.
- teachingPhase: Your current Teaching Progression phase (1-5). Report accurately.
- lessonComplete: Set to true ONLY when you have completed Phase 5 and the student has demonstrated mastery. The student will then take an MCQ assessment.

Refer to your TRADITIONAL CLASSROOM FORMAT instructions for audioText vs displayText guidance.

Student: ${userMessage}`;
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
   * Build the full prompt for a specialist agent (FALLBACK - includes system prompt)
   *
   * This method is kept as a fallback for when cache is unavailable.
   * In normal operation, use buildDynamicContext() with cached system prompts.
   *
   * @deprecated Use buildDynamicContext() with cached content instead
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

    // Build adaptive teaching directives (if available)
    let adaptiveContext = '';
    if (context.adaptiveInstructions) {
      adaptiveContext = `\n${context.adaptiveInstructions}\n`;
    }

    return `${agent.system_prompt}

${studentContext}
${adaptiveContext}
${historyContext}
${lessonContext}
${handoffContext}

IMPORTANT: Respond using the structured JSON schema provided by the system.
Key field guidance:
- audioText: Natural spoken language (what you SAY to the student). No code or symbols.
- displayText: Written board notes with markdown (what you WRITE). No SVG code here.
- svg: Full SVG diagram string, or null. SVG code goes ONLY here.
- teachingPhase: Your current Teaching Progression phase (1-5). Report accurately.
- lessonComplete: Set to true ONLY when you have completed Phase 5 and the student has demonstrated mastery. The student will then take an MCQ assessment.

Refer to your TRADITIONAL CLASSROOM FORMAT instructions for audioText vs displayText guidance.

Student: ${userMessage}`;
  }

  /**
   * Extract grounding metadata from Gemini API response
   *
   * Parses the grounding metadata to extract web search queries and sources.
   * Provides structured citation information for display to students.
   *
   * Reference: https://ai.google.dev/gemini-api/docs/google-search
   *
   * @param response - Raw response from Gemini API
   * @returns Grounding metadata with parsed sources, or null if not available
   */
  private extractGroundingMetadata(response: any): import('./types').GroundingMetadata | null {
    try {
      // Check if grounding metadata exists in the response
      // Reference: Official SDK returns groundingMetadata in candidates[0]
      const metadata = response.candidates?.[0]?.groundingMetadata;

      if (!metadata) {
        return null;
      }

      // Extract search queries
      const webSearchQueries = metadata.webSearchQueries || metadata.searchQueries || [];

      // Extract grounding chunks (sources)
      const groundingChunks = metadata.groundingChunks || [];

      // Parse sources for easier display
      const sources: import('./types').GroundingSource[] = groundingChunks
        .filter((chunk: any) => chunk.web) // Only web sources
        .map((chunk: any) => ({
          title: chunk.web.title || 'Source',
          url: chunk.web.uri,
          snippet: chunk.web.snippet || undefined
        }));

      // Only return metadata if we have actual grounding data
      if (webSearchQueries.length === 0 && sources.length === 0) {
        return null;
      }

      return {
        webSearchQueries,
        groundingChunks,
        sources
      };

    } catch (error) {
      // Silently fail - grounding metadata is optional
      console.warn('Failed to extract grounding metadata:', error);
      return null;
    }
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
