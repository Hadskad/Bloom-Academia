import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/ai/gemini-client';
import { generateSpeech } from '@/lib/tts/google-tts';
import { buildAIContext } from '@/lib/ai/context-builder';
import { saveInteraction } from '@/lib/memory/session-manager';

/**
 * POST /api/teach - Main teaching endpoint
 *
 * Day 12-13 Implementation: Complete personalized teaching with 3-layer memory
 * - Builds context from user profile + session history + lesson
 * - Gemini 3 Flash for structured JSON responses (audioText, displayText, svg)
 * - Google Cloud TTS for audio synthesis (uses audioText only)
 * - Saves interaction to database
 *
 * Request body:
 * {
 *   userId: string,
 *   sessionId: string,
 *   lessonId: string,
 *   userMessage: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   teacherResponse: {
 *     audioText: string,        // Text for TTS (no SVG code)
 *     displayText: string,      // Text for screen display
 *     svg: string | null,       // Optional SVG diagram
 *     audioBase64: string       // MP3 audio from audioText
 *   },
 *   lessonComplete: boolean     // True when student has mastered all objectives
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { userId, sessionId, lessonId, userMessage } = await request.json();

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

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'userMessage is required and must be a string' },
        { status: 400 }
      );
    }

    // Build AI context with all memory layers
    const context = await buildAIContext(userId, sessionId, lessonId);

    // Initialize Gemini client
    const gemini = new GeminiClient();

    // Get structured AI response (audioText, displayText, svg)
    const aiResponse = await gemini.teach({
      userMessage,
      systemContext: context
    });

    // Generate audio from audioText ONLY (not displayText or SVG)
    // This prevents SVG code from being read aloud
    const audioBuffer = await generateSpeech(aiResponse.audioText);

    // Save interaction to database (Layer 2: Session Memory)
    // Store displayText for conversation history
    await saveInteraction(sessionId, {
      userMessage,
      aiResponse: aiResponse.displayText
    });

    // Convert audio buffer to base64 for JSON response
    const audioBase64 = audioBuffer.toString('base64');

    // Return structured response with separate audio/display text, SVG, and completion flag
    return NextResponse.json({
      success: true,
      teacherResponse: {
        audioText: aiResponse.audioText,
        displayText: aiResponse.displayText,
        svg: aiResponse.svg,
        audioBase64
      },
      lessonComplete: aiResponse.lessonComplete
    });

  } catch (error) {
    console.error('Error in /api/teach:', error);

    return NextResponse.json(
      {
        error: 'Failed to process teaching request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
