/**
 * POST /api/tts - Text-to-Speech Fallback Endpoint
 *
 * Lightweight endpoint that converts text to speech audio.
 * Used as a fallback when the SSE stream drops after delivering text
 * but before all audio chunks arrive.
 *
 * Request body:
 * {
 *   text: string,        // Text to synthesize
 *   agentName?: string   // Agent name for voice selection (defaults to coordinator)
 * }
 *
 * Response:
 * {
 *   audioBase64: string  // Base64-encoded MP3 audio
 * }
 *
 * Reference: https://cloud.google.com/text-to-speech/docs
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSpeechChunked } from '@/lib/tts/google-tts';

export async function POST(request: NextRequest) {
  try {
    const { text, agentName } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Use chunked synthesis for parallel processing of sentences
    const audioBuffer = await generateSpeechChunked(text, agentName || 'coordinator');
    const audioBase64 = audioBuffer.toString('base64');

    return NextResponse.json({ audioBase64 });

  } catch (error) {
    console.error('[TTS Fallback] Error:', error);
    return NextResponse.json(
      { error: 'TTS generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
