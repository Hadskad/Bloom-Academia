/**
 * POST /api/teach/stream - SSE Streaming Teaching Endpoint
 *
 * Streams teaching responses to the frontend progressively using Server-Sent Events.
 * Text/SVG arrives immediately after Gemini finishes, audio chunks follow as each
 * sentence is synthesized — eliminating the 2-4s "thinking" wait.
 *
 * SSE Event Protocol:
 *   event: text    → { displayText, audioText, svg, agentName, handoffMessage? }
 *   event: audio   → { index, audioBase64, sentenceText }   (per-sentence, ordered)
 *   event: audio   → { index, audioBase64: null, sentenceText }  (TTS failure — skip)
 *   event: done    → { lessonComplete, routing }
 *   event: error   → { message }
 *
 * Validator Integration (Deferred Self-Correction):
 *   Runs non-blocking in the background with no timeout. On rejection:
 *   1. Stores a pending correction in `pending_corrections` table
 *   2. Logs to `validation_failures` table for teacher dashboard
 *   3. On the student's NEXT interaction, the specialist reads the pending
 *      correction and naturally self-corrects ("Sorry, I made a mistake...")
 *   Never blocks delivery — corrections are deferred to the next interaction.
 *
 * Fallback:
 *   If Gemini streaming fails completely, sends an error event. The frontend
 *   can then fall back to a full /api/tts request if needed.
 *
 * References:
 *   - Next.js SSE: https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events
 *   - MDN ReadableStream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
 *   - Google Cloud TTS: https://cloud.google.com/text-to-speech/docs
 */

import { NextRequest } from 'next/server';
import { AIAgentManager } from '@/lib/ai/agent-manager';
import { generateSpeech, splitIntoSentences, splitLongSentence, MAX_CHUNK_LENGTH } from '@/lib/tts/google-tts';
import type { AgentResponse } from '@/lib/ai/types';
import {
  loadTeachingContext,
  buildAdaptiveTeachingDirectives,
  buildAgentContext,
  resolveSpecialist,
  fireAndForgetSideEffects
} from '@/lib/ai/teaching-helpers';
import { savePendingCorrection, markCorrectionDelivered } from '@/lib/ai/pending-corrections';
import { PerformanceLogger } from '@/lib/utils/performance-logger';

// Force dynamic rendering — SSE must not be cached
// Reference: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
export const dynamic = 'force-dynamic';

/** Agents that skip validation (non-teaching roles) */
const SKIP_VALIDATION_AGENTS = ['coordinator', 'motivator', 'assessor'];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // --- Parse and validate request body ---
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      formatSSE('error', { message: 'Invalid JSON body' }),
      { status: 400, headers: sseHeaders() }
    );
  }

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
  } = body;

  // Required field validation
  if (!userId || typeof userId !== 'string') {
    return errorResponse('userId is required and must be a string');
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return errorResponse('sessionId is required and must be a string');
  }
  if (!lessonId || typeof lessonId !== 'string') {
    return errorResponse('lessonId is required and must be a string');
  }
  if (!userMessage && !requestAudioBase64 && !requestMediaBase64) {
    return errorResponse('At least one of userMessage, audioBase64, or mediaBase64 must be provided');
  }
  if (requestAudioBase64 && !requestAudioMimeType) {
    return errorResponse('audioMimeType is required when audioBase64 is provided');
  }

  // Media validation
  if (requestMediaBase64) {
    if (!requestMediaMimeType || !requestMediaType) {
      return errorResponse('mediaMimeType and mediaType are required when mediaBase64 is provided');
    }
    if (requestMediaType !== 'image' && requestMediaType !== 'video') {
      return errorResponse('mediaType must be "image" or "video"');
    }
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm'];
    if (requestMediaType === 'image' && !validImageTypes.includes(requestMediaMimeType)) {
      return errorResponse(`Invalid image MIME type. Supported: ${validImageTypes.join(', ')}`);
    }
    if (requestMediaType === 'video' && !validVideoTypes.includes(requestMediaMimeType)) {
      return errorResponse(`Invalid video MIME type. Supported: ${validVideoTypes.join(', ')}`);
    }
  }

  // --- Create the SSE stream ---
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Performance tracking for this request
      const perf = new PerformanceLogger(sessionId);
      perf.mark('backend_request_start', { hasAudio: !!requestAudioBase64, hasMedia: !!requestMediaBase64 });
      const startTime = Date.now();

      /** Send an SSE event to the client */
      function send(event: string, data: Record<string, any>) {
        try {
          controller.enqueue(encoder.encode(formatSSE(event, data)));
        } catch {
          // Controller may be closed if client disconnected
        }
      }

      try {
        // --- Phase 1: Load context (parallel) ---
        perf.mark('phase1_context_loading_start');
        const agentManager = new AIAgentManager();

        const ctx = await loadTeachingContext(userId, sessionId, lessonId, agentManager);
        perf.mark('phase1_context_loading_complete', {
          profile: !!ctx.profile,
          lesson: !!ctx.lesson,
          mastery: ctx.currentMastery
        });

        // --- Phase 2: Generate adaptive directives ---
        perf.mark('phase2_adaptive_directives_start');
        const { directives: adaptiveDirectives, instructions: adaptiveInstructions } =
          buildAdaptiveTeachingDirectives(ctx.profile, ctx.recentHistory, ctx.currentMastery);

        const directiveCount = adaptiveDirectives.styleAdjustments.length +
                               adaptiveDirectives.difficultyAdjustments.length +
                               adaptiveDirectives.scaffoldingNeeds.length;
        perf.mark('phase2_adaptive_directives_complete', { mastery: ctx.currentMastery, directiveCount });

        console.log('[SSE] Adaptive directives generated:', {
          userId: userId.substring(0, 8),
          lessonId: lessonId.substring(0, 8),
          mastery: ctx.currentMastery,
          directiveCount
        });

        const context = buildAgentContext(ctx, {
          userId, sessionId, lessonId, userMessage,
          audioBase64: requestAudioBase64,
          audioMimeType: requestAudioMimeType,
          mediaBase64: requestMediaBase64,
          mediaMimeType: requestMediaMimeType,
          mediaType: requestMediaType
        }, adaptiveInstructions);
        perf.mark('phase2_context_built');

        // --- Phase 3: Handle AUTO_START ---
        if (userMessage && userMessage.startsWith('[AUTO_START]')) {
          console.log('[SSE] AUTO_START detected — Coordinator handling directly');

          // Progressive TTS: fire per-sentence during streaming
          const sentenceTTSPromises: Array<{ promise: Promise<Buffer | null>; sentence: string }> = [];

          const aiResponse = await agentManager.getAgentResponseStreamingWithSentenceCallbacks(
            'coordinator',
            userMessage,
            context,
            (sentence, index) => {
              // Each sentence fires TTS immediately during streaming
              console.log(`[SSE] AUTO_START sentence ${index} TTS fired at T+${Date.now() - startTime}ms`);
              const chunks = sentence.length > MAX_CHUNK_LENGTH
                ? splitLongSentence(sentence)
                : [sentence];

              for (const chunkText of chunks) {
                sentenceTTSPromises.push({
                  promise: generateSpeech(chunkText, 'coordinator').catch((err) => {
                    console.warn(`[SSE TTS] Chunk failed: "${chunkText.substring(0, 40)}..."`, err);
                    return null;
                  }),
                  sentence: chunkText
                });
              }
            }
          );

          // Send text event now that we have the full response (displayText + svg)
          send('text', {
            displayText: aiResponse.displayText,
            audioText: aiResponse.audioText,
            svg: aiResponse.svg ?? null,
            agentName: 'coordinator'
          });
          console.log(`[SSE] AUTO_START text sent at T+${Date.now() - startTime}ms`);

          // Flush TTS results as SSE audio events IN ORDER
          // By the time we get here, many TTS calls may already be complete
          await flushTTSResults(sentenceTTSPromises, send);

          // Fall back to streamAudioChunks if no sentences were extracted
          if (sentenceTTSPromises.length === 0) {
            await streamAudioChunks(aiResponse.audioText, 'coordinator', send);
          }

          // Done
          send('done', {
            lessonComplete: false,
            routing: { agentName: 'coordinator', reason: 'AUTO_START lesson introduction by Coordinator' }
          });

          // Fire-and-forget side effects
          fireAndForgetSideEffects({
            agentManager,
            aiResponse,
            sessionId, userId, lessonId,
            userMessage,
            routingReason: 'AUTO_START lesson introduction by Coordinator',
            responseTimeMs: Date.now() - startTime,
            adaptiveDirectives,
            learningStyle: ctx.profile.learning_style,
            lessonTitle: ctx.lesson.title
          });

          controller.close();
          return;
        }

        // --- Phase 4: Routing ---
        perf.mark('phase4_routing_start');
        const routing = await resolveSpecialist(
          agentManager, userMessage, context, ctx.activeSpecialist, ctx.lesson
        );
        perf.mark('phase4_routing_complete', { targetAgent: routing.agentName });

        // Coordinator handled directly (short response, no specialist needed)
        if (routing.coordinatorDirectResponse) {
          send('text', {
            displayText: routing.coordinatorDirectResponse,
            audioText: routing.coordinatorDirectResponse,
            svg: null,
            agentName: 'coordinator'
          });

          await streamAudioChunks(routing.coordinatorDirectResponse, 'coordinator', send);

          send('done', {
            lessonComplete: false,
            routing: { agentName: 'coordinator', reason: routing.routingReason }
          });

          controller.close();
          return;
        }

        // --- Phase 5: Get specialist response with progressive per-sentence TTS ---
        perf.mark('phase5_specialist_response_start', { specialist: routing.agentName });
        console.log(`[SSE] Getting response from ${routing.agentName}`);

        let aiResponse: AgentResponse;
        // Progressive TTS: fire per-sentence during Gemini streaming
        const sentenceTTSPromises: Array<{ promise: Promise<Buffer | null>; sentence: string }> = [];
        let firstSentenceFired = false;

        try {
          aiResponse = await agentManager.getAgentResponseStreamingWithSentenceCallbacks(
            routing.agentName,
            userMessage || '',
            {
              ...context,
              previousAgent: ctx.activeSpecialist || 'coordinator'
            },
            (sentence, index) => {
              // Each sentence fires TTS immediately during streaming
              if (!firstSentenceFired) {
                perf.mark('phase5_first_sentence_extracted');
                firstSentenceFired = true;
              }
              console.log(`[SSE] Sentence ${index} TTS fired at T+${Date.now() - startTime}ms`);
              const chunks = sentence.length > MAX_CHUNK_LENGTH
                ? splitLongSentence(sentence)
                : [sentence];

              for (const chunkText of chunks) {
                sentenceTTSPromises.push({
                  promise: generateSpeech(chunkText, routing.agentName).catch((err) => {
                    console.warn(`[SSE TTS] Chunk failed: "${chunkText.substring(0, 40)}..."`, err);
                    return null;
                  }),
                  sentence: chunkText
                });
              }
            }
          );
          perf.mark('phase5_gemini_streaming_complete', { sentenceCount: sentenceTTSPromises.length });
        } catch (streamingError) {
          // Fallback to non-streaming
          console.warn(`[SSE] Streaming failed for ${routing.agentName}, falling back to non-streaming:`, streamingError);
          aiResponse = await agentManager.getAgentResponse(
            routing.agentName,
            userMessage || '',
            {
              ...context,
              previousAgent: ctx.activeSpecialist || 'coordinator'
            }
          );
        }

        // Apply handoff message if coordinator provided one
        if (routing.handoffMessage) {
          aiResponse.handoffMessage = routing.handoffMessage;
        }

        let routingReason = `${routing.routingReason} (SSE stream)`;

        // --- Phase 5b: Handle specialist handoffRequest (e.g., to motivator) ---
        // Supports handoff chains: specialist → motivator → specialist (rare but possible)
        // Prevents infinite loops with max 3 handoffs per request
        const handoffChain: string[] = [aiResponse.agentName];
        let currentResponse = aiResponse;
        let maxHandoffs = 3;  // Prevent infinite loops

        while (currentResponse.handoffRequest && maxHandoffs > 0) {
          const targetAgent = currentResponse.handoffRequest;
          const fromAgent = currentResponse.agentName;

          console.log(`[SSE] Handoff chain: ${fromAgent} → ${targetAgent}`);

          try {
            // Get response from handoff target (non-streaming for simplicity)
            // Handoffs are rare, so we prioritize correctness over streaming performance
            const handoffResponse = await agentManager.getAgentResponse(
              targetAgent,
              userMessage || '',
              {
                ...context,
                previousAgent: fromAgent  // Critical: set to the agent who requested handoff
              }
            );

            // Preserve handoff message from the requesting agent
            if (currentResponse.handoffMessage) {
              handoffResponse.handoffMessage = currentResponse.handoffMessage;
            }

            handoffChain.push(targetAgent);
            currentResponse = handoffResponse;
            maxHandoffs--;

          } catch (handoffError) {
            console.error(`[SSE] Handoff failed (${fromAgent} → ${targetAgent}):`, handoffError);
            // On handoff failure, use the last successful response
            break;
          }
        }

        if (maxHandoffs === 0 && currentResponse.handoffRequest) {
          console.warn('[SSE] Max handoffs reached (3), breaking chain:', handoffChain);
        }

        // Use the final response from the handoff chain
        aiResponse = currentResponse;

        if (handoffChain.length > 1) {
          routingReason = `Handoff chain: ${handoffChain.join(' → ')}`;
        }

        // Clear TTS promises if handoff occurred (handoff responses are non-streaming)
        if (handoffChain.length > 1) {
          sentenceTTSPromises.length = 0;
        }

        // --- Phase 6: Send text event with full response (displayText + svg) ---
        send('text', {
          displayText: aiResponse.displayText,
          audioText: aiResponse.audioText,
          svg: aiResponse.svg ?? null,
          agentName: aiResponse.agentName,
          handoffMessage: aiResponse.handoffMessage
        });
        console.log(`[SSE] Text sent at T+${Date.now() - startTime}ms`);

        // --- Phase 7: Validator (non-blocking, deferred self-correction) ---
        // Runs in the background with no timeout. On rejection, stores a pending
        // correction that the specialist will deliver in the next interaction.
        if (!SKIP_VALIDATION_AGENTS.includes(aiResponse.agentName)) {
          agentManager.validateResponse(aiResponse, context)
            .then(async (result) => {
              if (!result.approved) {
                console.warn('[SSE Validator] Rejected:', result.issues);

                // Store pending correction for deferred self-correction
                await savePendingCorrection(
                  sessionId,
                  aiResponse.agentName,
                  {
                    audioText: aiResponse.audioText,
                    displayText: aiResponse.displayText,
                    svg: aiResponse.svg ?? null
                  },
                  result
                );

                // Also log to validation_failures for teacher dashboard
                await agentManager.logValidationFailure({
                  session_id: sessionId,
                  agent_id: aiResponse.agentId,
                  specialist_name: aiResponse.agentName,
                  original_response: {
                    audioText: aiResponse.audioText,
                    displayText: aiResponse.displayText,
                    svg: aiResponse.svg ?? null
                  },
                  validation_result: result,
                  retry_count: 0,
                  final_action: 'failed_validation'
                });
              } else {
                console.log(`[SSE Validator] Approved (confidence: ${result.confidenceScore})`);
              }
            })
            .catch((err) => console.error('[SSE Validator] Error:', err));
        }

        // --- Phase 7b: Mark pending correction as delivered ---
        // If a correction was injected into this specialist's context
        // (via buildAgentContext), mark it as delivered now that the
        // specialist has responded (and presumably self-corrected).
        if (ctx.pendingCorrection) {
          markCorrectionDelivered(ctx.pendingCorrection.id)
            .catch((err) => console.error('[SSE] Failed to mark correction as delivered:', err));
        }

        // --- Phase 8: Flush progressive TTS results as SSE audio events ---
        // TTS calls were fired per-sentence during streaming (Phase 5).
        // By now, many may already be resolved. Flush in order.
        if (sentenceTTSPromises.length > 0) {
          await flushTTSResults(sentenceTTSPromises, send);
        } else {
          // No sentences were extracted during streaming — fall back to batch TTS
          await streamAudioChunks(aiResponse.audioText, aiResponse.agentName, send);
        }

        perf.mark('phase8_all_audio_sent');
        console.log(`[SSE] All audio sent at T+${Date.now() - startTime}ms`);

        // --- Phase 9: Done ---
        perf.mark('phase9_done_event_start');
        send('done', {
          lessonComplete: aiResponse.lessonComplete ?? false,
          routing: { agentName: aiResponse.agentName, reason: routingReason }
        });
        perf.mark('phase9_done_event_sent');
        perf.summary();

        // --- Phase 10: Fire-and-forget side effects ---
        fireAndForgetSideEffects({
          agentManager,
          aiResponse,
          sessionId, userId, lessonId,
          userMessage: userMessage || '',
          routingReason,
          responseTimeMs: Date.now() - startTime,
          adaptiveDirectives,
          learningStyle: ctx.profile.learning_style,
          lessonTitle: ctx.lesson.title
        });

      } catch (err) {
        console.error('[SSE] Fatal error:', err);
        send('error', {
          message: err instanceof Error ? err.message : 'Failed to process teaching request'
        });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    }
  });

  return new Response(stream, { headers: sseHeaders() });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stream TTS audio as individual SSE events, one per sentence.
 *
 * Strategy:
 * 1. Split audioText into sentences at natural boundaries
 * 2. Fire TTS for each sentence (respect rate limit of 6 concurrent)
 * 3. Send each audio chunk as an SSE event IN ORDER as they complete
 *
 * Order preservation: We use indexed Promise tracking so chunks are
 * sent to the client in sentence order, not completion order.
 *
 * @param audioText - Full text to synthesize
 * @param agentName - Agent name for voice selection
 * @param send - SSE send function
 */
async function streamAudioChunks(
  audioText: string,
  agentName: string,
  send: (event: string, data: Record<string, any>) => void
): Promise<void> {
  if (!audioText || audioText.trim().length === 0) return;

  const sentences = splitIntoSentences(audioText);
  if (sentences.length === 0) return;

  // Sub-chunk any sentence that exceeds the 500-char TTS limit
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length > MAX_CHUNK_LENGTH) {
      chunks.push(...splitLongSentence(sentence));
    } else {
      chunks.push(sentence);
    }
  }

  // Fire all TTS requests and track by index for ordered delivery
  // Max 6 concurrent TTS calls (Google Cloud TTS rate limit: 300 req/min)
  const MAX_CONCURRENT = 6;
  const results: Array<{ audioBase64: string | null; sentenceText: string }> = [];

  // Process in batches of MAX_CONCURRENT to respect rate limits
  for (let batchStart = 0; batchStart < chunks.length; batchStart += MAX_CONCURRENT) {
    const batch = chunks.slice(batchStart, batchStart + MAX_CONCURRENT);

    const batchResults = await Promise.all(
      batch.map(async (chunkText) => {
        try {
          const buffer = await generateSpeech(chunkText, agentName);
          return { audioBase64: buffer.toString('base64'), sentenceText: chunkText };
        } catch (err) {
          console.warn(`[SSE TTS] Chunk failed: "${chunkText.substring(0, 40)}..."`, err);
          return { audioBase64: null, sentenceText: chunkText };
        }
      })
    );

    results.push(...batchResults);

    // Send this batch's results as SSE events immediately (in order)
    for (let i = 0; i < batchResults.length; i++) {
      const globalIndex = batchStart + i;
      send('audio', {
        index: globalIndex,
        audioBase64: batchResults[i].audioBase64,
        sentenceText: batchResults[i].sentenceText
      });
    }
  }
}

/**
 * Flush progressive TTS results as SSE audio events IN ORDER.
 *
 * TTS promises were fired per-sentence during Gemini streaming. By the time
 * this function is called, many may already be resolved. We await each
 * sequentially to preserve sentence order for the frontend's gapless playback.
 *
 * @param promises - Ordered array of TTS promises with their sentence text
 * @param send - SSE send function
 */
async function flushTTSResults(
  promises: Array<{ promise: Promise<Buffer | null>; sentence: string }>,
  send: (event: string, data: Record<string, any>) => void
): Promise<void> {
  for (let i = 0; i < promises.length; i++) {
    const { promise, sentence } = promises[i];
    const buffer = await promise;
    send('audio', {
      index: i,
      audioBase64: buffer ? buffer.toString('base64') : null,
      sentenceText: sentence
    });
  }
}

/**
 * Format an SSE event string.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
function formatSSE(event: string, data: Record<string, any>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Standard SSE response headers */
function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering (Vercel proxy)
  };
}

/** Quick error response for validation failures */
function errorResponse(message: string): Response {
  return new Response(
    formatSSE('error', { message }),
    { status: 400, headers: sseHeaders() }
  );
}
