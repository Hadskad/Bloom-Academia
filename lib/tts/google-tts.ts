/**
 * Google Cloud Text-to-Speech Integration
 *
 * Verified implementation using @google-cloud/text-to-speech official SDK
 * Voice: en-US-Neural2-F (Female Neural2 voice)
 * Output: MP3 audio
 *
 * Official docs: https://cloud.google.com/text-to-speech/docs
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const credentials = JSON.parse(
  process.env.GOOGLE_TTS_CREDENTIALS!
);



const client = new TextToSpeechClient({
  credentials
});

/**
 * Generate speech audio from text using Google Cloud TTS
 *
 * @param text - The text to convert to speech
 * @returns Buffer containing MP3 audio data
 * @throws Error if TTS generation fails
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    // Call Google Cloud TTS API
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-F' // Female Neural2 voice (high quality)
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0, // Normal speed
        pitch: 0.0 // Normal pitch
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
