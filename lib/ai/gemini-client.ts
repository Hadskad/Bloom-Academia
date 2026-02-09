/**
 * Gemini 3 Flash Client
 *
 * Verified implementation using @google/genai official SDK
 * Model: gemini-3-flash-preview
 *
 * Official docs: https://ai.google.dev/gemini-api/docs/gemini-3
 * Structured output: https://ai.google.dev/gemini-api/docs/structured-output
 * Media resolution: https://ai.google.dev/gemini-api/docs/media-resolution
 * SDK reference: https://googleapis.github.io/js-genai/
 */

import { GoogleGenAI, ThinkingLevel, MediaResolution } from '@google/genai';
import { z } from 'zod';

/**
 * Zod schema for structured teaching response
 * Separates audio text (for TTS) from display text and SVG
 * Includes lessonComplete flag for AI-triggered lesson completion
 */
const teachingResponseSchema = z.object({
  audioText: z.string().describe('Text optimized for speech synthesis (natural spoken language), should reference the visual diagram when available'),
  displayText: z.string().describe('Text to display on screen that can reference the visual diagram. Use markdown formatting (bold, headers, lists) to make it beautiful and readable.'),
  svg: z.string().nullable().describe('SVG code for visual diagram (must be valid SVG XML or null)'),
  lessonComplete: z.boolean().describe('Set to true ONLY when the student has demonstrated complete mastery of ALL lesson objectives through their responses and understanding. Be strict - partial understanding is not enough.')
});

export type TeachingResponse = z.infer<typeof teachingResponseSchema>;

/**
 * Result from streaming generator - includes accumulated text and parsed metadata
 */
export interface StreamingResult {
  fullText: string;
  response: TeachingResponse;
}

export class GeminiClient {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate structured teaching response for student question
   *
   * Returns JSON with separate fields for audio (TTS), display text, and SVG.
   * This prevents SVG code from being read aloud by TTS.
   *
   * Supports both text and audio input (audio is processed directly by Gemini).
   *
   * @param params.userMessage - The student's question or message (optional if audio provided)
   * @param params.systemContext - System context with memory and personalization
   * @param params.audioBase64 - Base64-encoded audio data (optional)
   * @param params.audioMimeType - MIME type of audio (e.g., 'audio/webm', 'audio/mp3')
   * @returns Structured response with audioText, displayText, and optional SVG
   * @throws Error if API call fails or response doesn't match schema
   *
   * References:
   * - Audio input: https://ai.google.dev/gemini-api/docs/audio
   * - Inline data format: https://googleapis.github.io/js-genai/
   */
  async teach(params: {
    userMessage?: string;
    systemContext: string;
    audioBase64?: string;
    audioMimeType?: string;
    mediaBase64?: string;
    mediaMimeType?: string;
    mediaType?: 'image' | 'video';
  }): Promise<TeachingResponse> {
    try {
      // Validate input - must have at least one input type
      if (!params.userMessage && !params.audioBase64 && !params.mediaBase64) {
        throw new Error('At least one of userMessage, audioBase64, or mediaBase64 must be provided');
      }

      // Build contents array based on input type
      // Reference: https://ai.google.dev/gemini-api/docs/audio
      const contents: any[] = [];

      // Add system context as text
      contents.push({ text: params.systemContext });

      // Add user input (media, audio, or text)
      // Priority: media > audio > text
      if (params.mediaBase64 && params.mediaMimeType && params.mediaType) {
        // Media input mode (image or video)
        contents.push({
          text: `Student uploaded a ${params.mediaType}:`
        });
        contents.push({
          inlineData: {
            mimeType: params.mediaMimeType,
            data: params.mediaBase64
          }
        });
        // Add text context if provided
        if (params.userMessage) {
          contents.push({ text: params.userMessage });
        }
      } else if (params.audioBase64 && params.audioMimeType) {
        // Audio input mode
        contents.push({
          text: 'Student (via voice):'
        });
        contents.push({
          inlineData: {
            mimeType: params.audioMimeType,
            data: params.audioBase64
          }
        });
      } else if (params.userMessage) {
        // Text input mode
        contents.push({
          text: `Student: ${params.userMessage}`
        });
      }

      // Call Gemini 3 Flash with JSON mode enabled
      // Reference: https://googleapis.github.io/js-genai/
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          // Enable JSON mode for structured output
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
          // Thinking config for better reasoning
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MEDIUM
          },
          // Media resolution for high-fidelity image/video analysis
          // Reference: https://ai.google.dev/gemini-api/docs/media-resolution
          // HIGH provides optimal performance (1,120 tokens/image, ~$0.00056/image)
          // Recommended by Google for most use cases over ULTRA_HIGH
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH
        }
      });

      const responseText = response.text;

      // Validate response exists
      if (!responseText) {
        throw new Error('No response received from Gemini');
      }

      // Parse and validate JSON response against schema
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', responseText);
        throw new Error(
          `Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        );
      }

      // Validate against Zod schema
      const validatedResponse = teachingResponseSchema.parse(parsedJson);

      return validatedResponse;

    } catch (error) {
      console.error('Error calling Gemini API:', error);

      // Provide detailed error context
      if (error instanceof z.ZodError) {
        throw new Error(
          `Gemini response validation failed: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }

      throw new Error(
        `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stream teaching response for lower latency
   *
   * Yields text chunks as they're generated, enabling sentence-level TTS processing.
   * Uses plain text format with markers instead of strict JSON schema for streaming compatibility.
   *
   * Supports both text and audio input (audio is processed directly by Gemini).
   *
   * Format markers:
   * - [SVG]...svg code...[/SVG] for visual diagrams
   * - [LESSON_COMPLETE] when student has mastered objectives
   *
   * @param params.userMessage - The student's question or message (optional if audio provided)
   * @param params.systemContext - System context with memory and personalization
   * @param params.audioBase64 - Base64-encoded audio data (optional)
   * @param params.audioMimeType - MIME type of audio (e.g., 'audio/webm', 'audio/mp3')
   * @yields Text chunks as they're generated by the model
   * @returns Promise that resolves to StreamingResult with full text and parsed metadata
   * @throws Error if API call fails or streaming is interrupted
   *
   * References:
   * - Official streaming docs: https://googleapis.github.io/js-genai/
   * - GitHub example: https://github.com/googleapis/js-genai/blob/main/sdk-samples/generate_content_streaming.ts
   * - Audio input: https://ai.google.dev/gemini-api/docs/audio
   */
  async *teachStreaming(params: {
    userMessage?: string;
    systemContext: string;
    audioBase64?: string;
    audioMimeType?: string;
    mediaBase64?: string;
    mediaMimeType?: string;
    mediaType?: 'image' | 'video';
  }): AsyncGenerator<string, StreamingResult, unknown> {
    try {
      // Validate input - must have at least one input type
      if (!params.userMessage && !params.audioBase64 && !params.mediaBase64) {
        throw new Error('At least one of userMessage, audioBase64, or mediaBase64 must be provided');
      }

      // Build contents array based on input type
      // Reference: https://ai.google.dev/gemini-api/docs/audio
      const contents: any[] = [];

      // Add system context with formatting instructions
      const systemPrompt = `${params.systemContext}

RESPONSE FORMAT INSTRUCTIONS:
- Write naturally as if speaking directly to the student
- Use complete sentences separated by periods
- Keep sentences clear and concise for speech synthesis
- If a visual diagram helps understanding, include it at the END using this exact format:
  [SVG]<svg>...your svg code...</svg>[/SVG]
- When the student has demonstrated complete mastery of ALL lesson objectives, include at the very end: [LESSON_COMPLETE]

IMPORTANT: Your response will be read aloud via text-to-speech, so write conversationally and naturally.`;

      contents.push({ text: systemPrompt });

      // Add user input (media, audio, or text)
      // Priority: media > audio > text
      if (params.mediaBase64 && params.mediaMimeType && params.mediaType) {
        // Media input mode (image or video)
        contents.push({
          text: `\n\nStudent uploaded a ${params.mediaType}:`
        });
        contents.push({
          inlineData: {
            mimeType: params.mediaMimeType,
            data: params.mediaBase64
          }
        });
        // Add text context if provided
        if (params.userMessage) {
          contents.push({ text: params.userMessage });
        }
      } else if (params.audioBase64 && params.audioMimeType) {
        // Audio input mode
        contents.push({
          text: '\n\nStudent (via voice):'
        });
        contents.push({
          inlineData: {
            mimeType: params.audioMimeType,
            data: params.audioBase64
          }
        });
      } else if (params.userMessage) {
        // Text input mode
        contents.push({
          text: `\n\nStudent: ${params.userMessage}`
        });
      }

      // Call Gemini streaming API with LOW thinking level for faster responses
      // Reference: https://ai.google.dev/gemini-api/docs/gemini-3
      // Reference: https://googleapis.github.io/js-genai/
      const stream = await this.ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          // Use LOW thinking level for reduced latency
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW
          },
          // Media resolution for high-fidelity image/video analysis
          // Reference: https://ai.google.dev/gemini-api/docs/media-resolution
          // HIGH provides optimal performance (1,120 tokens/image, ~$0.00056/image)
          // Recommended by Google for most use cases over ULTRA_HIGH
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH
        }
      });

      let fullText = '';

      // Stream chunks as they arrive
      // Each chunk has a .text property per official docs
      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          fullText += text;
          yield text; // Emit chunk immediately for processing
        }
      }

      // Validate minimum response length (mitigation for parsing errors)
      if (!fullText || fullText.trim().length < 10) {
        throw new Error('AI response too short - likely generation error');
      }

      // Parse metadata from complete response with robust fallbacks
      const parsedResponse = this.parseStreamedResponse(fullText);

      return {
        fullText,
        response: parsedResponse
      };

    } catch (error) {
      console.error('Error in streaming Gemini API:', error);
      throw new Error(
        `Gemini streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse streamed text response and extract metadata
   *
   * Implements robust parsing with multiple fallback strategies for reliability.
   *
   * @param fullText - Complete streamed text with markers
   * @returns TeachingResponse with parsed fields
   * @private
   */
  private parseStreamedResponse(fullText: string): TeachingResponse {
    // Extract SVG with robust regex (handles multiline)
    const svgMatch = fullText.match(/\[SVG\]([\s\S]*?)\[\/SVG\]/i);
    const svgCode = svgMatch ? svgMatch[1].trim() : null;

    // Validate SVG if present
    if (svgCode && !svgCode.startsWith('<svg')) {
      console.warn('Extracted SVG does not start with <svg tag, ignoring');
    }

    // Detect lesson completion with multiple fallback patterns (mitigation strategy)
    const lessonComplete =
      fullText.includes('[LESSON_COMPLETE]') ||
      fullText.includes('[COMPLETE]') ||
      /you(?:'ve|\s+have)\s+mastered/i.test(fullText) ||
      /lesson\s+complete/i.test(fullText) ||
      /congratulations.*(?:completed|mastered)/i.test(fullText);

    // Clean text - remove all markers
    let cleanText = fullText
      .replace(/\[SVG\][\s\S]*?\[\/SVG\]/gi, '')
      .replace(/\[LESSON_COMPLETE\]/gi, '')
      .replace(/\[COMPLETE\]/gi, '')
      .trim();

    // Additional cleanup: remove any stray markers
    cleanText = cleanText
      .replace(/\[\/?\w+\]/g, '')
      .trim();

    // Validate cleaned text
    if (!cleanText || cleanText.length < 5) {
      throw new Error('Parsed text is empty or too short after cleanup');
    }

    return {
      audioText: cleanText,
      displayText: cleanText,
      svg: svgCode,
      lessonComplete
    };
  }
}
