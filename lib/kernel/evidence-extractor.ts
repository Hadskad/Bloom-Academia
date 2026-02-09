/**
 * AI-Based Evidence Extraction System
 *
 * Uses Gemini API to intelligently extract learning evidence quality
 * from student-teacher interactions. More reliable than keyword matching.
 *
 * Flow:
 * 1. Student responds to teaching
 * 2. This module analyzes response quality using AI
 * 3. Returns evidence type, quality score, and confidence
 * 4. Evidence is recorded to mastery_evidence table
 *
 * References:
 * - Gemini Structured Output: https://ai.google.dev/gemini-api/docs/structured-output
 * - Gemini API JSON Schema: https://blog.google/technology/developers/gemini-api-structured-outputs/
 * - Phase 1 Implementation: ROADMAP_TO_100_PERCENT.md - Criterion 3
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

/**
 * Zod schema for evidence quality analysis
 * Used to structure AI's assessment of student responses
 */
const evidenceQualitySchema = z.object({
  evidenceType: z.enum([
    'correct_answer',
    'incorrect_answer',
    'explanation',
    'application',
    'struggle'
  ]).describe('Type of learning evidence detected in student response'),

  qualityScore: z.number()
    .min(0)
    .max(100)
    .describe('Quality score 0-100. For correct_answer: 100 if fully correct, 80 if mostly correct. For explanation: rate clarity and completeness. For application: rate success. For incorrect_answer: 0-30 (closer to correct = higher). For struggle: 0'),

  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence in classification (0.0-1.0). Higher = more certain'),

  reasoning: z.string()
    .describe('Brief explanation of why this classification was chosen')
});

export type EvidenceQuality = z.infer<typeof evidenceQualitySchema>;

/**
 * Extracts evidence quality from student response using AI analysis
 *
 * This replaces keyword-based heuristics (e.g., checking if AI said "correct")
 * with intelligent semantic analysis by Gemini.
 *
 * @param studentResponse - What the student said/wrote
 * @param teacherResponse - How the AI teacher responded
 * @param conceptBeingTaught - The lesson topic/concept
 * @returns Evidence quality analysis with type, score, and confidence
 *
 * @example
 * ```typescript
 * const evidence = await extractEvidenceQuality(
 *   "The answer is 68 because 23 + 45 = 68",
 *   "Perfect! That's exactly right. You added correctly!",
 *   "Introduction to Fractions"
 * )
 * // Returns: { evidenceType: 'correct_answer', qualityScore: 100, confidence: 0.95, ... }
 * ```
 */
export async function extractEvidenceQuality(
  studentResponse: string,
  teacherResponse: string,
  conceptBeingTaught: string
): Promise<EvidenceQuality> {
  try {
    // Initialize Gemini client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use Gemini 3 Flash for fast evidence extraction
    // Reference: https://ai.google.dev/gemini-api/docs/structured-output
    const model = ai.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      config: {
        // Request JSON-structured output matching our schema
        // Reference: https://blog.google/technology/developers/gemini-api-structured-outputs/
        responseMimeType: 'application/json',
        responseSchema: evidenceQualitySchema
      }
    });

    // Construct analysis prompt
    const prompt = `You are analyzing a student's learning evidence during a lesson.

CONCEPT BEING TAUGHT: ${conceptBeingTaught}

STUDENT RESPONSE: "${studentResponse}"

TEACHER RESPONSE: "${teacherResponse}"

Analyze the student's response and classify the evidence:

EVIDENCE TYPES:
- correct_answer: Student answered correctly
- incorrect_answer: Student answered incorrectly
- explanation: Student explained a concept (assess quality)
- application: Student applied knowledge to solve a problem
- struggle: Student showed confusion or asked for help

QUALITY SCORE (0-100):
- For correct_answer: 100 if fully correct, 80 if mostly correct
- For explanation: Rate clarity, completeness, understanding (0-100)
- For application: Rate success in applying concept (0-100)
- For incorrect_answer: 0-30 (closer to correct = higher)
- For struggle: 0 (indicates need for support)

CONFIDENCE (0-1): How certain are you of this classification?

Return JSON with: evidenceType, qualityScore, confidence, reasoning`;

    // Generate structured response
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    // The SDK with responseSchema guarantees JSON output
    const analysis = JSON.parse(responseText) as EvidenceQuality;

    console.log('[Evidence Extraction]', {
      student: studentResponse.substring(0, 50) + '...',
      type: analysis.evidenceType,
      quality: analysis.qualityScore,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning.substring(0, 80) + '...'
    });

    return analysis;

  } catch (error) {
    console.error('[Evidence Extraction] Failed:', error);

    // Fallback: Return neutral evidence on error (non-blocking)
    // This ensures teaching flow continues even if evidence extraction fails
    return {
      evidenceType: 'explanation',
      qualityScore: 50,
      confidence: 0.3,
      reasoning: `Evidence extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
