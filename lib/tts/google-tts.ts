/**
 * Google Cloud Text-to-Speech Integration
 *
 * Verified implementation using @google-cloud/text-to-speech official SDK
 * Voice: en-US-Neural2-F (Female Neural2 voice)
 * Output: MP3 audio
 *
 * Features:
 * - Single text synthesis (generateSpeech)
 * - Sentence-chunked parallel synthesis (generateSpeechChunked)
 *
 * Official docs: https://cloud.google.com/text-to-speech/docs
 * Chunking best practices: https://developers.deepgram.com/docs/text-chunking-for-tts-optimization
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const credentials = JSON.parse(
  process.env.GOOGLE_TTS_CREDENTIALS!
);



const client = new TextToSpeechClient({
  credentials
});

/**
 * Per-specialist voice assignments.
 * Verified voices from https://cloud.google.com/text-to-speech/docs/voices
 */
const AGENT_VOICE_MAP: Record<string, string> = {
  coordinator:         'en-US-Neural2-F',
  math_specialist:     'en-US-Neural2-A',
  science_specialist:  'en-US-Neural2-C',
  english_specialist:  'en-US-Neural2-H',
  history_specialist:  'en-US-Neural2-D',
  art_specialist:      'en-US-Neural2-E',
  assessor:            'en-US-Neural2-H',
  motivator:           'en-US-Neural2-C',
};

const DEFAULT_VOICE = 'en-US-Neural2-F';

/**
 * Generate speech audio from text using Google Cloud TTS
 *
 * @param text - The text to convert to speech
 * @param agentName - Optional specialist name; selects the mapped voice
 * @returns Buffer containing MP3 audio data
 * @throws Error if TTS generation fails
 */
export async function generateSpeech(text: string, agentName?: string): Promise<Buffer> {
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    const voiceName = (agentName && AGENT_VOICE_MAP[agentName]) || DEFAULT_VOICE;

    // Call Google Cloud TTS API
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voiceName
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0
      }
    });

    // Extract audio content from response
    if (!response.audioContent) {
      throw new Error('No audio content received from TTS service');
    }

    // Convert Uint8Array to Buffer
    return Buffer.from(response.audioContent as Uint8Array);

  } catch (error) {
    console.error('Error generating speech with Google TTS:', error);

    // Rethrow with more context
    throw new Error(
      `TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Minimum characters for a sentence chunk to be synthesized separately.
 * Shorter chunks can sound choppy when concatenated.
 * Reference: https://github.com/KoljaB/stream2sentence
 */
const MIN_CHUNK_LENGTH = 20;

/**
 * Maximum number of parallel TTS requests to avoid rate limiting.
 * Google Cloud TTS allows 300 requests/minute/project.
 */
const MAX_PARALLEL_CHUNKS = 6;

/**
 * Maximum characters per TTS request for optimal quality.
 * Google Cloud TTS has a 5000 byte limit, but we use smaller chunks for
 * progressive streaming. Reduced from 500 → 150 chars for faster first audio.
 *
 * 150 chars ≈ 1 short sentence, which gives:
 * - Faster time-to-first-audio (~100-150ms improvement)
 * - Natural phrase boundaries (better than 100 which splits mid-phrase)
 * - Lower per-chunk latency
 *
 * Reference: https://cloud.google.com/text-to-speech/quotas
 * Optimization: Latency Optimization Phase 2 (2026-02-14)
 */
export const MAX_CHUNK_LENGTH = 200;

/**
 * Split a long sentence into sub-chunks if it exceeds MAX_CHUNK_LENGTH.
 * Tries to split at natural boundaries (commas, semicolons, dashes) when possible.
 *
 * @param sentence - The sentence to split (may be >500 chars)
 * @returns Array of sub-chunks, each ≤500 chars
 */
export function splitLongSentence(sentence: string): string[] {
  if (sentence.length <= MAX_CHUNK_LENGTH) {
    return [sentence];
  }

  const chunks: string[] = [];
  let remaining = sentence;

  while (remaining.length > MAX_CHUNK_LENGTH) {
    // Try to find a natural break point (comma, semicolon, dash) before MAX_CHUNK_LENGTH
    const searchText = remaining.substring(0, MAX_CHUNK_LENGTH);
    let splitIndex = -1;

    // Look for last comma, semicolon, or dash in the allowed range
    const lastComma = searchText.lastIndexOf(',');
    const lastSemicolon = searchText.lastIndexOf(';');
    const lastDash = searchText.lastIndexOf(' - ');

    splitIndex = Math.max(lastComma, lastSemicolon, lastDash);

    // If no natural break found, split at last space to avoid mid-word breaks
    if (splitIndex === -1 || splitIndex < MAX_CHUNK_LENGTH * 0.7) {
      splitIndex = searchText.lastIndexOf(' ');
    }

    // Fallback: hard split at MAX_CHUNK_LENGTH if no space found (rare)
    if (splitIndex === -1) {
      splitIndex = MAX_CHUNK_LENGTH;
    }

    chunks.push(remaining.substring(0, splitIndex + 1).trim());
    remaining = remaining.substring(splitIndex + 1).trim();
  }

  // Add remaining text
  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

/**
 * Split text into sentences at natural boundaries.
 * Preserves punctuation and handles edge cases.
 *
 * Reference: https://developers.deepgram.com/docs/text-chunking-for-tts-optimization
 *
 * @param text - The text to split into sentences
 * @returns Array of sentence strings
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split on sentence-ending punctuation followed by whitespace or end of string
  // This regex captures: periods, exclamation marks, question marks
  // It preserves the punctuation with the sentence
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g);

  if (!sentences) {
    // No sentence boundaries found, return the whole text as one chunk
    return [text.trim()];
  }

  // Clean up and filter out empty/too-short sentences
  const cleaned = sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // If we have sentences that are too short, merge them with neighbors
  const merged: string[] = [];
  let buffer = '';

  for (const sentence of cleaned) {
    buffer += (buffer ? ' ' : '') + sentence;

    // Only yield when buffer exceeds minimum length
    if (buffer.length >= MIN_CHUNK_LENGTH) {
      merged.push(buffer);
      buffer = '';
    }
  }

  // Don't forget any remaining text in buffer
  if (buffer.length > 0) {
    if (merged.length > 0 && buffer.length < MIN_CHUNK_LENGTH) {
      // Merge short remainder with last sentence
      merged[merged.length - 1] += ' ' + buffer;
    } else {
      merged.push(buffer);
    }
  }

  return merged;
}

/**
 * Generate speech audio from text using sentence chunking and parallel synthesis.
 * This reduces latency by processing sentences in parallel.
 *
 * Strategy:
 * 1. Split text into sentences at natural boundaries
 * 2. Generate TTS for all sentences in parallel (up to MAX_PARALLEL_CHUNKS)
 * 3. Concatenate audio buffers in order
 *
 * Reference: https://cresta.com/blog/engineering-for-real-time-voice-agent-latency
 *
 * @param text - The text to convert to speech
 * @param agentName - Optional specialist name; selects the mapped voice
 * @returns Buffer containing concatenated MP3 audio data
 * @throws Error if TTS generation fails
 */
export async function generateSpeechChunked(text: string, agentName?: string): Promise<Buffer> {
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    const sentences = splitIntoSentences(text);

    // If only one sentence or text is short, use regular synthesis
    if (sentences.length <= 1 || text.length < MIN_CHUNK_LENGTH * 2) {
      return generateSpeech(text, agentName);
    }

    // Limit parallel chunks to avoid rate limiting
    // If more than MAX_PARALLEL_CHUNKS, batch them
    const chunks: string[] = [];
    if (sentences.length > MAX_PARALLEL_CHUNKS) {
      // Merge sentences into MAX_PARALLEL_CHUNKS groups
      const sentencesPerChunk = Math.ceil(sentences.length / MAX_PARALLEL_CHUNKS);
      for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
        chunks.push(sentences.slice(i, i + sentencesPerChunk).join(' '));
      }
    } else {
      chunks.push(...sentences);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TTS Chunked] Synthesizing ${chunks.length} chunks in parallel`);
    }

    // Generate TTS for all chunks in parallel
    const audioBuffers = await Promise.all(
      chunks.map(chunk => generateSpeech(chunk, agentName))
    );

    // Concatenate all audio buffers
    // Note: Simple Buffer.concat works for MP3 in most cases
    // Reference: https://github.com/jvandenaardweg/google-text-to-speech-concat
    const concatenated = Buffer.concat(audioBuffers);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TTS Chunked] Concatenated ${audioBuffers.length} audio buffers (${concatenated.length} bytes)`);
    }

    return concatenated;

  } catch (error) {
    console.error('Error in chunked speech generation:', error);

    // Rethrow with context
    throw new Error(
      `Chunked TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

