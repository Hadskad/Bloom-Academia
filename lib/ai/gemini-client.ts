/**
 * Gemini 3 Flash Client
 *
 * Verified implementation using @google/genai official SDK
 * Model: gemini-3-flash-preview
 *
 * Official docs: https://ai.google.dev/gemini-api/docs/gemini-3
 * Structured output: https://ai.google.dev/gemini-api/docs/structured-output
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';

/**
 * Zod schema for structured teaching response
 * Separates audio text (for TTS) from display text and SVG
 */
const teachingResponseSchema = z.object({
  audioText: z.string().describe('Text optimized for speech synthesis (natural spoken language)'),
  displayText: z.string().describe('Text to display on screen that can reference the visual diagram'),
  svg: z.string().nullable().describe('SVG code for visual diagram (must be valid SVG XML or null)')
});

export type TeachingResponse = z.infer<typeof teachingResponseSchema>;

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
   * @param params.userMessage - The student's question or message
   * @param params.systemContext - System context with memory and personalization
   * @returns Structured response with audioText, displayText, and optional SVG
   * @throws Error if API call fails or response doesn't match schema
   */
  async teach(params: {
    userMessage: string;
    systemContext: string;
  }): Promise<TeachingResponse> {
    try {
      // Build the prompt with context and user message
      const prompt = `${params.systemContext}\n\nStudent: ${params.userMessage}`;

      // Call Gemini 3 Flash with JSON mode enabled
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          // Enable JSON mode for structured output
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(teachingResponseSchema),
          // Thinking config for better reasoning
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MEDIUM
          }
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
}
