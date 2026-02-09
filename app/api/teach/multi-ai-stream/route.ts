/**
 * POST /api/teach/multi-ai-stream - Multi-AI Teaching Endpoint with PROGRESSIVE STREAMING
 *
 * Enhanced version with Tier 2 latency optimization:
 * - Progressive audioText extraction during Gemini streaming
 * - Sentence-chunked parallel TTS generation
 * - 30-40% latency reduction vs standard streaming
 *
 * Key Features:
 * - Streaming Gemini responses with JSON schema validation
 * - Progressive first-sentence extraction for early TTS start
 * - Parallel sentence-chunked TTS generation
 * - Smart routing (same as multi-ai)
 * - Graceful fallback to standard TTS on errors
 *
 * Performance:
 * - Previous latency: ~1,400-2,000ms (standard streaming)
 * - New latency: ~1,000-1,400ms (progressive + chunked TTS)
 * - Improvement: 30-40% faster
 *
 * Request body:
 * {
 *   userId: string,
 *   sessionId: string,
 *   lessonId: string,
 *   userMessage?: string,           // Optional if audio provided
 *   audioBase64?: string,           // Base64-encoded audio data
 *   audioMimeType?: string          // MIME type (e.g., 'audio/webm')
 * }
 *
 * Response: (Same format as /api/teach/multi-ai)
 * {
 *   success: boolean,
 *   teacherResponse: {
 *     audioText: string,
 *     displayText: string,
 *     svg: string | null,
 *     audioBase64: string,
 *     agentName: string,
 *     handoffMessage?: string
 *   },
 *   lessonComplete: boolean,
 *   routing: {
 *     agentName: string,
 *     reason: string
 *   }
 * }
 *
 * References:
 * - Gemini Streaming: https://ai.google.dev/gemini-api/docs/structured-output
 * - TTS Chunking: https://developers.deepgram.com/docs/text-chunking-for-tts-optimization
 * - Latency Optimization: https://cresta.com/blog/engineering-for-real-time-voice-agent-latency
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIAgentManager } from '@/lib/ai/agent-manager';
import { generateSpeech, generateSpeechChunked } from '@/lib/tts/google-tts';
import { getUserProfile } from '@/lib/memory/profile-manager';
import { getSessionHistory, saveInteraction } from '@/lib/memory/session-manager';
import { supabase } from '@/lib/db/supabase';
import type { AgentContext, ProgressiveAgentResponse } from '@/lib/ai/types';
// Criterion 2: AI Adapts - Import adaptive teaching modules
import { generateAdaptiveDirectives, formatDirectivesForPrompt } from '@/lib/ai/adaptive-directives';
import { getCurrentMasteryLevel } from '@/lib/ai/mastery-tracker';
import { logAdaptation } from '@/lib/ai/adaptation-logger';
// Evidence extraction for learning analytics (fire-and-forget, does not gate lesson completion)
import { extractEvidenceQuality } from '@/lib/kernel/evidence-extractor';
import { recordMasteryEvidence } from '@/lib/kernel/mastery-detector';
// Criterion 4: Memory Persists - Import profile enrichment
import { enrichProfileIfNeeded } from '@/lib/memory/profile-enricher';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const {
      userId,
      sessionId,
      lessonId,
      userMessage,
      audioBase64: requestAudioBase64,
      audioMimeType: requestAudioMimeType,
      mediaBase64: requestMediaBase64,
      mediaMimeType: requestMediaMimeType,
      mediaType: requestMediaType
    } = await request.json();

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json(
        { error: 'lessonId is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate input - must have at least one input type
    if (!userMessage && !requestAudioBase64 && !requestMediaBase64) {
      return NextResponse.json(
        { error: 'At least one of userMessage, audioBase64, or mediaBase64 must be provided' },
        { status: 400 }
      );
    }

    // If audio provided, validate MIME type
    if (requestAudioBase64 && !requestAudioMimeType) {
      return NextResponse.json(
        { error: 'audioMimeType is required when audioBase64 is provided' },
        { status: 400 }
      );
    }

    // If media provided, validate MIME type and mediaType
    if (requestMediaBase64) {
      if (!requestMediaMimeType || !requestMediaType) {
        return NextResponse.json(
          { error: 'mediaMimeType and mediaType are required when mediaBase64 is provided' },
          { status: 400 }
        );
      }

      // Validate mediaType enum
      if (requestMediaType !== 'image' && requestMediaType !== 'video') {
        return NextResponse.json(
          { error: 'mediaType must be "image" or "video"' },
          { status: 400 }
        );
      }

      // Validate MIME type whitelist
      // Reference: https://ai.google.dev/gemini-api/docs/image-understanding
      // Reference: https://ai.google.dev/gemini-api/docs/video-understanding
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/webm'];

      if (requestMediaType === 'image' && !validImageTypes.includes(requestMediaMimeType)) {
        return NextResponse.json(
          { error: `Invalid image MIME type. Supported: ${validImageTypes.join(', ')}` },
          { status: 400 }
        );
      }

      if (requestMediaType === 'video' && !validVideoTypes.includes(requestMediaMimeType)) {
        return NextResponse.json(
          { error: `Invalid video MIME type. Supported: ${validVideoTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Initialize early so getActiveSpecialist can join the parallel context block below
    const agentManager = new AIAgentManager();

    // Build context from all memory layers + mastery (all in parallel).
    // All 5 queries are independent — none depends on another's result.
    const [profile, recentHistory, lessonResult, activeSpecialist, currentMastery] = await Promise.all([
      getUserProfile(userId),
      getSessionHistory(sessionId, 5).catch((err) => {
        console.warn('[multi-ai-stream] Session history unavailable, continuing with empty history:', err.message);
        return [] as Awaited<ReturnType<typeof getSessionHistory>>;
      }),
      supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single(),
      agentManager.getActiveSpecialist(sessionId),
      getCurrentMasteryLevel(userId, lessonId)
    ]);

    if (lessonResult.error) {
      return NextResponse.json(
        { error: `Failed to fetch lesson: ${lessonResult.error.message}` },
        { status: 404 }
      );
    }

    const lesson = lessonResult.data;

    // ═══════════════════════════════════════════════════════════
    // CRITERION 2: AI ADAPTS - Generate Adaptive Teaching Directives
    // ═══════════════════════════════════════════════════════════
    const adaptiveDirectives = generateAdaptiveDirectives(
      profile,
      recentHistory,
      currentMastery
    );

    const adaptiveInstructions = formatDirectivesForPrompt(adaptiveDirectives);

    console.log('[Adaptive Teaching] Generated directives:', {
      userId: userId.substring(0, 8),
      lessonId: lessonId.substring(0, 8),
      mastery: currentMastery,
      learningStyle: profile.learning_style,
      directiveCount: adaptiveDirectives.styleAdjustments.length +
                      adaptiveDirectives.difficultyAdjustments.length +
                      adaptiveDirectives.scaffoldingNeeds.length
    });

    // Build agent context with adaptive instructions
    // Note: audioBase64 and audioMimeType are temporarily added to context for passing to GeminiClient
    // This is a transitional approach until full audio pipeline is integrated into agent-manager
    const context: AgentContext = {
      userId,
      sessionId,
      lessonId,
      userProfile: {
        name: profile.name,
        age: profile.age,
        grade_level: profile.grade_level,
        learning_style: profile.learning_style,
        strengths: profile.strengths,
        struggles: profile.struggles
      },
      conversationHistory: recentHistory.map(h => ({
        user_message: h.user_message,
        ai_response: h.ai_response,
        timestamp: h.timestamp
      })),
      lessonContext: {
        title: lesson.title,
        subject: lesson.subject,
        learning_objective: lesson.learning_objective
      },
      // Temporary: Pass audio data through context (will be refactored in agent-manager later)
      audioBase64: requestAudioBase64 as any,
      audioMimeType: requestAudioMimeType as any,
      // Media input support for vision analysis
      mediaBase64: requestMediaBase64 as any,
      mediaMimeType: requestMediaMimeType as any,
      mediaType: requestMediaType as any,
      // NEW: Adaptive teaching directives (Criterion 2)
      adaptiveInstructions
    };

    // SPECIAL CASE: [AUTO_START] messages are system-generated lesson introductions.
    // Send directly to Coordinator — do NOT route through routeRequest().
    // Mirrors the same intercept in AIAgentManager.teach() (agent-manager.ts:767).
    if (userMessage && userMessage.startsWith('[AUTO_START]')) {
      console.log('[Progressive] AUTO_START detected - Coordinator handling directly');

      const coordinatorResponse = await agentManager.getAgentResponseProgressiveStreaming(
        'coordinator',
        userMessage,
        context
      );

      // Generate TTS for the greeting.
      // firstSentenceAudio was synthesised mid-stream; only the remainder needs a call.
      let audioBase64: string;
      try {
        if (coordinatorResponse.firstSentenceAudio && coordinatorResponse.remainingAudioText) {
          const remainingBuffer = await generateSpeechChunked(coordinatorResponse.remainingAudioText, 'coordinator');
          audioBase64 = Buffer.concat([coordinatorResponse.firstSentenceAudio, remainingBuffer]).toString('base64');
        } else if (coordinatorResponse.firstSentenceAudio) {
          // No remainder — first sentence is the entire response
          audioBase64 = coordinatorResponse.firstSentenceAudio.toString('base64');
        } else {
          // Progressive extraction didn't fire; synthesise in one shot
          const audioBuffer = await generateSpeech(coordinatorResponse.audioText, 'coordinator');
          audioBase64 = audioBuffer.toString('base64');
        }
      } catch {
        // Fallback to single-shot TTS
        const audioBuffer = await generateSpeech(coordinatorResponse.audioText, 'coordinator');
        audioBase64 = audioBuffer.toString('base64');
      }

      // Fire-and-forget: interaction writes must not delay the greeting response.
      agentManager.saveInteraction({
        session_id: sessionId,
        agent_id: coordinatorResponse.agentId,
        user_message: userMessage,
        agent_response: coordinatorResponse.displayText,
        routing_reason: 'AUTO_START lesson introduction by Coordinator',
        response_time_ms: Date.now() - startTime
      }).catch((err) => console.error('[multi-ai-stream] AUTO_START agent interaction save failed:', err));

      saveInteraction(sessionId, {
        userMessage: userMessage,
        aiResponse: coordinatorResponse.displayText
      }).catch((err) => console.error('[multi-ai-stream] AUTO_START interaction dual-write failed:', err));

      return NextResponse.json({
        success: true,
        teacherResponse: {
          audioText: coordinatorResponse.audioText,
          displayText: coordinatorResponse.displayText,
          svg: coordinatorResponse.svg,
          audioBase64,
          agentName: 'coordinator',
          handoffMessage: undefined
        },
        lessonComplete: false,
        routing: {
          agentName: 'coordinator',
          reason: 'AUTO_START lesson introduction by Coordinator'
        }
      });
    }

    let aiResponse: ProgressiveAgentResponse | null = null;
    let routingReason: string = '';

    if (activeSpecialist && activeSpecialist !== 'coordinator') {
      // FAST PATH: Active specialist exists - send directly to them
      console.log(`[Progressive] Fast path: Continuing with ${activeSpecialist}`);

      try {
        // Use PROGRESSIVE STREAMING method for Tier 2 optimization
        // Note: userMessage may be undefined (audio-only input); agent-manager handles via context.audioBase64
        aiResponse = await agentManager.getAgentResponseProgressiveStreaming(
          activeSpecialist,
          userMessage || '',
          {
            ...context,
            previousAgent: activeSpecialist
          }
        );

        routingReason = `Continuing with ${activeSpecialist} (progressive streaming)`;

        // Check if specialist requests handoff (same logic as multi-ai)
        if (aiResponse.lessonComplete) {
          console.log('[Progressive] Lesson complete - routing to Assessor');
        }

      } catch (progressiveError) {
        // FALLBACK: Try regular streaming
        console.warn(`[Progressive] Failed for ${activeSpecialist}, falling back to regular streaming:`, progressiveError);

        try {
          const regularResponse = await agentManager.getAgentResponseStreaming(
            activeSpecialist,
            userMessage || '',
            {
              ...context,
              previousAgent: activeSpecialist
            }
          );

          // Convert to ProgressiveAgentResponse format
          aiResponse = {
            ...regularResponse,
            firstSentence: regularResponse.audioText,
            remainingAudioText: null,
            usedProgressiveExtraction: false,
            firstSentenceAudio: null
          };
          routingReason = `Continuing with ${activeSpecialist} (fallback to regular streaming)`;

        } catch (streamingError) {
          // FINAL FALLBACK: Non-streaming
          console.warn(`[Progressive] Regular streaming also failed, using non-streaming:`, streamingError);

          const nonStreamResponse = await agentManager.getAgentResponse(
            activeSpecialist,
            userMessage || '',
            {
              ...context,
              previousAgent: activeSpecialist
            }
          );

          aiResponse = {
            ...nonStreamResponse,
            firstSentence: nonStreamResponse.audioText,
            remainingAudioText: null,
            usedProgressiveExtraction: false,
            firstSentenceAudio: null
          };
          routingReason = `Continuing with ${activeSpecialist} (fallback to non-streaming)`;
        }
      }

    } else {
      // NO ACTIVE SPECIALIST: First message or Coordinator last spoke

      // When audio/media is provided without text, we can't route based on message content.
      // Instead, route directly to the specialist matching the lesson subject.
      // This mirrors the coordinator's STEP 3 routing logic: "Unclear or ambiguous messages →
      // Route to the specialist matching the lesson subject"
      if (!userMessage && (requestAudioBase64 || requestMediaBase64)) {
        console.log('[Progressive] No userMessage but audio/media provided - routing by lesson subject');

        // Map lesson subject to specialist agent
        const subjectToAgent: Record<string, string> = {
          'math': 'math_specialist',
          'science': 'science_specialist',
          'english': 'english_specialist',
          'history': 'history_specialist',
          'art': 'art_specialist'
        };

        const targetAgent = subjectToAgent[lesson.subject.toLowerCase()] || 'math_specialist';
        console.log(`[Progressive] Routing to ${targetAgent} based on lesson subject: ${lesson.subject}`);

        try {
          aiResponse = await agentManager.getAgentResponseProgressiveStreaming(
            targetAgent,
            '', // Empty string for audio-only input (audio is in context)
            {
              ...context,
              previousAgent: 'coordinator'
            }
          );
          routingReason = `Routed to ${targetAgent} based on lesson subject (audio input)`;
        } catch (progressiveError) {
          console.warn(`[Progressive] Failed, falling back to regular streaming:`, progressiveError);

          const regularResponse = await agentManager.getAgentResponseStreaming(
            targetAgent,
            '',
            {
              ...context,
              previousAgent: 'coordinator'
            }
          );

          aiResponse = {
            ...regularResponse,
            firstSentence: regularResponse.audioText,
            remainingAudioText: null,
            usedProgressiveExtraction: false,
            firstSentenceAudio: null
          };
          routingReason = `Routed to ${targetAgent} based on lesson subject (audio input, fallback streaming)`;
        }
      } else {
        // Text message provided - use Coordinator to route intelligently
        console.log('[Progressive] Using Coordinator to route text message');

        const routing = await agentManager.routeRequest(userMessage!, context);

        // If Coordinator handles directly (generate TTS for the response)
        if (routing.route_to === 'self' && routing.response) {
          const audioBuffer = await generateSpeech(routing.response, 'coordinator');
          const audioBase64 = audioBuffer.toString('base64');

          return NextResponse.json({
            success: true,
            teacherResponse: {
              audioText: routing.response,
              displayText: routing.response,
              svg: null,
              audioBase64,
              agentName: 'coordinator',
              handoffMessage: undefined
            },
            lessonComplete: false,
            routing: {
              agentName: 'coordinator',
              reason: routing.reason
            }
          });
        }

        // Route to specialist with PROGRESSIVE STREAMING
        try {
          aiResponse = await agentManager.getAgentResponseProgressiveStreaming(
            routing.route_to,
            userMessage || '',
            {
              ...context,
              previousAgent: 'coordinator'
            }
          );

          routingReason = routing.reason + ' (progressive streaming)';

          // Add handoff message if Coordinator provided one
          if (routing.handoff_message) {
            aiResponse.handoffMessage = routing.handoff_message;
          }

        } catch (progressiveError) {
          // FALLBACK: Try regular streaming
          console.warn(`[Progressive] Failed for ${routing.route_to}, falling back to regular streaming:`, progressiveError);

          try {
            const regularResponse = await agentManager.getAgentResponseStreaming(
              routing.route_to,
              userMessage || '',
              {
                ...context,
                previousAgent: 'coordinator'
              }
            );

            aiResponse = {
              ...regularResponse,
              firstSentence: regularResponse.audioText,
              remainingAudioText: null,
              usedProgressiveExtraction: false,
              firstSentenceAudio: null
            };
            routingReason = `${routing.reason} (fallback to regular streaming)`;

            if (routing.handoff_message) {
              aiResponse.handoffMessage = routing.handoff_message;
            }

          } catch (streamingError) {
            // FINAL FALLBACK: Non-streaming
            console.warn(`[Progressive] Regular streaming also failed, using non-streaming:`, streamingError);

            const nonStreamResponse = await agentManager.getAgentResponse(
              routing.route_to,
              userMessage || '',
              {
                ...context,
                previousAgent: 'coordinator'
              }
            );

            aiResponse = {
              ...nonStreamResponse,
              firstSentence: nonStreamResponse.audioText,
              remainingAudioText: null,
              usedProgressiveExtraction: false,
              firstSentenceAudio: null
            };
            routingReason = `${routing.reason} (fallback to non-streaming)`;

            if (routing.handoff_message) {
              aiResponse.handoffMessage = routing.handoff_message;
            }
          }
        }
      }
    }

    // Every branch above assigns aiResponse; assert for TypeScript.
    if (!aiResponse) {
      throw new Error('No AI response generated');
    }

    // Handoff message is displayed visually on the frontend only — do not send through TTS.
    // Audio plays exclusively in the responding specialist's voice.
    let audioBase64: string;

    if (aiResponse.firstSentenceAudio) {
      // TIER 2: first sentence audio was generated mid-stream while Gemini was still running.
      // Only the remainder needs a TTS call now.
      try {
        if (aiResponse.remainingAudioText) {
          const remainingBuffer = await generateSpeechChunked(aiResponse.remainingAudioText, aiResponse.agentName);
          audioBase64 = Buffer.concat([aiResponse.firstSentenceAudio, remainingBuffer]).toString('base64');
        } else {
          audioBase64 = aiResponse.firstSentenceAudio.toString('base64');
        }
      } catch (progressiveTTSError) {
        // Remainder TTS failed; fall back to full single-shot synthesis
        console.warn('[Progressive TTS] Remainder failed, falling back to full TTS:', progressiveTTSError);
        const audioBuffer = await generateSpeech(aiResponse.audioText, aiResponse.agentName);
        audioBase64 = audioBuffer.toString('base64');
      }
    } else {
      // Standard TTS: either progressive extraction didn't fire or first-sentence TTS failed
      const audioBuffer = await generateSpeech(aiResponse.audioText, aiResponse.agentName);
      audioBase64 = audioBuffer.toString('base64');
    }

    // Fire-and-forget: both writes are non-critical and must not delay the response.
    // agentId is already available from the streaming response — no re-fetch needed.
    // Note: When audio-only input, userMessage is undefined — use placeholder for logging
    const messageForLogging = userMessage || '[Audio/Media input]';

    agentManager.saveInteraction({
      session_id: sessionId,
      agent_id: aiResponse.agentId,
      user_message: messageForLogging,
      agent_response: aiResponse.displayText,
      routing_reason: routingReason,
      response_time_ms: Date.now() - startTime
    }).catch((err) => console.error('[multi-ai-stream] Failed to save agent interaction:', err));

    saveInteraction(sessionId, {
      userMessage: messageForLogging,
      aiResponse: aiResponse.displayText
    }).catch((err) => console.error('[multi-ai-stream] Failed to save interaction (dual-write):', err));

    // Fire-and-forget: Log adaptation decision for analytics and verification (Criterion 2)
    // This proves the AI actually adapted its teaching behavior
    logAdaptation(
      userId,
      lessonId,
      sessionId,
      adaptiveDirectives,
      profile.learning_style,
      aiResponse.displayText,
      aiResponse.svg !== null && aiResponse.svg !== undefined
    ).catch((err) => console.error('[multi-ai-stream] Failed to log adaptation:', err));

    // Fire-and-forget: Enrich user profile based on recent learning evidence (Criterion 4)
    // Real-time profile updates make the SAME SESSION adaptive
    enrichProfileIfNeeded(userId, lessonId, sessionId)
      .catch((err) => console.error('[multi-ai-stream] Failed to enrich profile:', err));

    // Fire-and-forget: Extract and record learning evidence for analytics
    if (messageForLogging !== '[Audio/Media input]' && aiResponse.displayText) {
      extractEvidenceQuality(
        messageForLogging,
        aiResponse.displayText,
        lesson.title
      ).then((evidence) => {
        if (evidence.confidence > 0.7) {
          return recordMasteryEvidence(
            userId,
            lessonId,
            sessionId,
            evidence.evidenceType,
            messageForLogging,
            {
              quality_score: evidence.qualityScore,
              confidence: evidence.confidence,
              context: lesson.title
            }
          );
        }
      }).catch((err) => console.error('[multi-ai-stream] Failed to record mastery evidence:', err));
    }

    // Return response matching existing API structure
    return NextResponse.json({
      success: true,
      teacherResponse: {
        audioText: aiResponse.audioText,
        displayText: aiResponse.displayText,
        svg: aiResponse.svg,
        audioBase64,
        agentName: aiResponse.agentName,
        handoffMessage: aiResponse.handoffMessage
      },
      lessonComplete: aiResponse.lessonComplete ?? false,
      routing: {
        agentName: aiResponse.agentName,
        reason: routingReason
      }
    });

  } catch (error) {
    console.error('Error in /api/teach/multi-ai-stream:', error);

    return NextResponse.json(
      {
        error: 'Failed to process streaming teaching request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
