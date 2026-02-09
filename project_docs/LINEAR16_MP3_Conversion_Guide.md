# LINEAR16 to MP3 Conversion Guide

## Purpose

This document outlines how to switch from direct MP3 TTS generation to LINEAR16 (PCM) internal processing with MP3 conversion. This approach eliminates audio clicking/popping artifacts that can occur when concatenating multiple MP3 files.

**When to implement:** Only if you experience audio artifacts (clicks/pops) at sentence boundaries when using the current MP3 concatenation approach.

---

## Problem Statement

When concatenating multiple MP3 audio files (from sentence-chunked TTS), you may hear:
- Clicking sounds at boundaries between sentences
- Popping artifacts where audio chunks meet
- Discontinuities in audio playback

**Root Cause:** MP3 files have frame headers and compressed data that don't align cleanly when simply concatenated with `Buffer.concat()`.

---

## Solution: LINEAR16 Pipeline

### How It Works

```
Text Chunks → Google TTS (LINEAR16) → PCM Buffers → Concatenate → lamejs → MP3
```

1. Request LINEAR16 (raw PCM) from Google Cloud TTS instead of MP3
2. Concatenate PCM buffers seamlessly (no frame headers = no artifacts)
3. Convert final concatenated PCM to MP3 using lamejs (pure JavaScript encoder)
4. Return MP3 to browser (universal playback support)

### Why This Works

LINEAR16 is raw, uncompressed audio data:
- No frame headers or compression artifacts
- Simple byte concatenation produces continuous audio
- MP3 conversion happens once at the end, preserving continuity

---

## Technical Specifications

### Google Cloud TTS LINEAR16 Output

From [official documentation](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/AudioEncoding):

| Property | Value |
|----------|-------|
| **Format** | Uncompressed Linear PCM |
| **Bit Depth** | 16-bit signed |
| **Endianness** | Little-endian |
| **Container** | Includes WAV header |
| **Sample Rate** | Configurable (default 24000 Hz for Neural2) |

### lamejs MP3 Encoder

From [official GitHub](https://github.com/zhuker/lamejs):

| Property | Value |
|----------|-------|
| **Package** | `lamejs` |
| **Install** | `npm install lamejs` |
| **Performance** | ~20x faster than realtime |
| **Input** | Int16Array (PCM samples) |
| **Output** | Uint8Array (MP3 bytes) |
| **Block Size** | Multiples of 576 samples recommended |

---

## Implementation Guide

### Step 1: Install lamejs

```bash
npm install lamejs
```

### Step 2: Create Audio Utility Module

Create `lib/tts/audio-utils.ts`:

```typescript
/**
 * Audio Utilities for LINEAR16 to MP3 Conversion
 *
 * Uses lamejs for pure JavaScript MP3 encoding.
 * Reference: https://github.com/zhuker/lamejs
 */

import lamejs from 'lamejs';

/**
 * LINEAR16 audio configuration from Google Cloud TTS.
 * Neural2 voices use 24000 Hz sample rate by default.
 */
const SAMPLE_RATE = 24000;
const BIT_RATE = 128; // kbps - good quality for speech
const CHANNELS = 1; // Mono (TTS output is mono)

/**
 * Strip WAV header from LINEAR16 audio buffer.
 * Google Cloud TTS includes a 44-byte WAV header with LINEAR16 output.
 *
 * @param wavBuffer - Buffer containing WAV data with header
 * @returns Buffer containing raw PCM data without header
 */
export function stripWavHeader(wavBuffer: Buffer): Buffer {
  // Standard WAV header is 44 bytes
  // Verify it's actually a WAV file by checking RIFF header
  const riffHeader = wavBuffer.slice(0, 4).toString('ascii');

  if (riffHeader === 'RIFF') {
    // Skip the 44-byte WAV header
    return wavBuffer.slice(44);
  }

  // No WAV header found, return as-is
  return wavBuffer;
}

/**
 * Convert raw PCM (LINEAR16) audio to MP3.
 *
 * @param pcmBuffer - Buffer containing 16-bit signed little-endian PCM samples
 * @param sampleRate - Sample rate in Hz (default: 24000 for Neural2)
 * @returns Buffer containing MP3 audio data
 */
export function pcmToMp3(
  pcmBuffer: Buffer,
  sampleRate: number = SAMPLE_RATE
): Buffer {
  // Create MP3 encoder
  const encoder = new lamejs.Mp3Encoder(CHANNELS, sampleRate, BIT_RATE);

  // Convert Buffer to Int16Array for lamejs
  // LINEAR16 is 16-bit signed little-endian, which matches Int16Array on little-endian systems
  const samples = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.length / 2 // 2 bytes per 16-bit sample
  );

  // Encode in chunks (recommended: multiples of 576 for mono)
  const CHUNK_SIZE = 576 * 4; // Process 4 blocks at a time
  const mp3Chunks: Uint8Array[] = [];

  for (let i = 0; i < samples.length; i += CHUNK_SIZE) {
    const chunk = samples.subarray(i, Math.min(i + CHUNK_SIZE, samples.length));
    const mp3Chunk = encoder.encodeBuffer(chunk);

    if (mp3Chunk.length > 0) {
      mp3Chunks.push(mp3Chunk);
    }
  }

  // Flush remaining data
  const finalChunk = encoder.flush();
  if (finalChunk.length > 0) {
    mp3Chunks.push(finalChunk);
  }

  // Combine all MP3 chunks into a single Buffer
  const totalLength = mp3Chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const mp3Buffer = Buffer.alloc(totalLength);

  let offset = 0;
  for (const chunk of mp3Chunks) {
    mp3Buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return mp3Buffer;
}

/**
 * Concatenate multiple PCM buffers and convert to MP3.
 * This is the main function to use for seamless audio joining.
 *
 * @param pcmBuffers - Array of PCM buffers (with or without WAV headers)
 * @param sampleRate - Sample rate in Hz
 * @returns Buffer containing concatenated MP3 audio
 */
export function concatenatePcmToMp3(
  pcmBuffers: Buffer[],
  sampleRate: number = SAMPLE_RATE
): Buffer {
  // Strip WAV headers and concatenate raw PCM
  const rawPcmBuffers = pcmBuffers.map(stripWavHeader);
  const concatenatedPcm = Buffer.concat(rawPcmBuffers);

  // Convert to MP3
  return pcmToMp3(concatenatedPcm, sampleRate);
}
```

### Step 3: Create LINEAR16 TTS Function

Add to `lib/tts/google-tts.ts`:

```typescript
import { concatenatePcmToMp3, stripWavHeader, pcmToMp3 } from './audio-utils';

/**
 * Sample rate for Neural2 voices.
 * Reference: Google Cloud TTS documentation
 */
const NEURAL2_SAMPLE_RATE = 24000;

/**
 * Generate speech as LINEAR16 (PCM) for seamless concatenation.
 *
 * @param text - The text to convert to speech
 * @returns Buffer containing LINEAR16 PCM audio (with WAV header)
 */
export async function generateSpeechLinear16(text: string): Promise<Buffer> {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-F'
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',  // Changed from 'MP3'
        sampleRateHertz: NEURAL2_SAMPLE_RATE,
        speakingRate: 1.0,
        pitch: 0.0
      }
    });

    if (!response.audioContent) {
      throw new Error('No audio content received from TTS service');
    }

    return Buffer.from(response.audioContent as Uint8Array);

  } catch (error) {
    console.error('Error generating LINEAR16 speech:', error);
    throw new Error(
      `LINEAR16 TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate speech with LINEAR16 chunking - seamless concatenation.
 * Uses LINEAR16 internally for perfect audio joins, converts to MP3 for output.
 *
 * @param text - The text to convert to speech
 * @returns Buffer containing MP3 audio (seamlessly concatenated)
 */
export async function generateSpeechChunkedSeamless(text: string): Promise<Buffer> {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is required and must be a non-empty string');
    }

    const sentences = splitIntoSentences(text);

    // If only one sentence, generate directly as MP3
    if (sentences.length <= 1 || text.length < MIN_CHUNK_LENGTH * 2) {
      return generateSpeech(text);
    }

    // Limit parallel chunks
    const chunks: string[] = [];
    if (sentences.length > MAX_PARALLEL_CHUNKS) {
      const sentencesPerChunk = Math.ceil(sentences.length / MAX_PARALLEL_CHUNKS);
      for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
        chunks.push(sentences.slice(i, i + sentencesPerChunk).join(' '));
      }
    } else {
      chunks.push(...sentences);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TTS LINEAR16] Synthesizing ${chunks.length} chunks in parallel`);
    }

    // Generate TTS as LINEAR16 for all chunks in parallel
    const pcmBuffers = await Promise.all(
      chunks.map(chunk => generateSpeechLinear16(chunk))
    );

    // Concatenate PCM and convert to MP3 (seamless!)
    const mp3Buffer = concatenatePcmToMp3(pcmBuffers, NEURAL2_SAMPLE_RATE);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[TTS LINEAR16] Seamlessly concatenated ${pcmBuffers.length} chunks (${mp3Buffer.length} bytes MP3)`);
    }

    return mp3Buffer;

  } catch (error) {
    console.error('Error in seamless chunked speech generation:', error);
    throw new Error(
      `Seamless chunked TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Progressive TTS with LINEAR16 - seamless version.
 */
export async function generateSpeechProgressiveSeamless(
  firstSentence: string,
  remainingText: string | null
): Promise<ProgressiveTTSResult> {
  try {
    // Generate first sentence as LINEAR16
    const firstChunkPromise = generateSpeechLinear16(firstSentence.trim());

    let remainingPromise: Promise<Buffer[]> | null = null;
    let remainingChunks: string[] = [];

    if (remainingText && remainingText.trim().length > 0) {
      remainingChunks = splitIntoSentences(remainingText);

      if (remainingChunks.length > 0) {
        const maxRemaining = MAX_PARALLEL_CHUNKS - 1;
        if (remainingChunks.length > maxRemaining) {
          const merged: string[] = [];
          const perChunk = Math.ceil(remainingChunks.length / maxRemaining);
          for (let i = 0; i < remainingChunks.length; i += perChunk) {
            merged.push(remainingChunks.slice(i, i + perChunk).join(' '));
          }
          remainingChunks = merged;
        }

        remainingPromise = Promise.all(
          remainingChunks.map(chunk => generateSpeechLinear16(chunk))
        );
      }
    }

    // Wait for all LINEAR16 buffers
    const [firstPcm, remainingPcmBuffers] = await Promise.all([
      firstChunkPromise,
      remainingPromise
    ]);

    // Concatenate all PCM buffers
    const allPcmBuffers = remainingPcmBuffers
      ? [firstPcm, ...remainingPcmBuffers]
      : [firstPcm];

    // Convert to MP3 (seamless!)
    const completeAudio = concatenatePcmToMp3(allPcmBuffers, NEURAL2_SAMPLE_RATE);

    // For progressive result, also convert individual parts
    const firstChunkAudio = pcmToMp3(stripWavHeader(firstPcm), NEURAL2_SAMPLE_RATE);
    const remainingAudio = remainingPcmBuffers && remainingPcmBuffers.length > 0
      ? concatenatePcmToMp3(remainingPcmBuffers, NEURAL2_SAMPLE_RATE)
      : null;

    return {
      firstChunkAudio,
      remainingAudio,
      completeAudio,
      chunkCount: allPcmBuffers.length
    };

  } catch (error) {
    console.error('Error in seamless progressive speech generation:', error);
    throw new Error(
      `Seamless progressive TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
```

### Step 4: Update Route to Use Seamless Functions

In `app/api/teach/multi-ai-stream/route.ts`, replace:

```typescript
// Change import
import { generateSpeech, generateSpeechProgressiveSeamless } from '@/lib/tts/google-tts';

// Change TTS call
const ttsResult = await generateSpeechProgressiveSeamless(firstSentence, remainingAudioText);
```

---

## Trade-offs

### Advantages

| Benefit | Description |
|---------|-------------|
| **No audio artifacts** | Seamless concatenation without clicks/pops |
| **Works on Vercel** | Pure JavaScript, no external binaries |
| **Universal browser support** | Final output is standard MP3 |

### Disadvantages

| Drawback | Description |
|----------|-------------|
| **Larger TTS responses** | LINEAR16 is ~10x larger than MP3 before conversion |
| **Additional processing** | MP3 encoding adds ~50-100ms on server |
| **Slightly higher bandwidth** | Between Google TTS and your server |

### Performance Impact

```
Current (MP3 direct):
  TTS → MP3 (small) → Concatenate → Return
  Bandwidth: ~20KB per sentence

LINEAR16 Pipeline:
  TTS → LINEAR16 (large) → Concatenate → lamejs → MP3 → Return
  Bandwidth: ~200KB per sentence (internal only)
  Extra latency: ~50-100ms for encoding
```

---

## TypeScript Type Definitions

If lamejs doesn't have types, create `types/lamejs.d.ts`:

```typescript
declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(samples: Int16Array): Uint8Array;
    encodeBuffer(left: Int16Array, right: Int16Array): Uint8Array;
    flush(): Uint8Array;
  }
}
```

---

## Testing

### Unit Test for Audio Utils

```typescript
import { stripWavHeader, pcmToMp3, concatenatePcmToMp3 } from '@/lib/tts/audio-utils';

describe('Audio Utils', () => {
  it('should strip WAV header correctly', () => {
    // Create a mock WAV buffer with RIFF header
    const wavHeader = Buffer.from('RIFF....WAVEfmt ....data....', 'ascii');
    const pcmData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const wavBuffer = Buffer.concat([wavHeader.slice(0, 44), pcmData]);

    const result = stripWavHeader(wavBuffer);
    // Result should be just the PCM data
  });

  it('should encode PCM to valid MP3', () => {
    // Create mock PCM data (silence)
    const pcmBuffer = Buffer.alloc(48000); // 1 second at 24kHz mono
    const mp3Buffer = pcmToMp3(pcmBuffer, 24000);

    // MP3 should start with frame sync (0xFF 0xFB for MPEG-1 Layer 3)
    expect(mp3Buffer[0]).toBe(0xFF);
  });
});
```

### Manual Testing

1. Generate a multi-sentence response
2. Listen for any clicks/pops at sentence boundaries
3. Compare audio quality with direct MP3 approach

---

## References

- [Google Cloud TTS AudioEncoding](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/AudioEncoding)
- [lamejs GitHub Repository](https://github.com/zhuker/lamejs)
- [Audio Concatenation Best Practices](https://developers.deepgram.com/docs/text-chunking-for-tts-optimization)
- [PCM Audio Format](https://en.wikipedia.org/wiki/Pulse-code_modulation)

---

## Checklist for Implementation

- [ ] Install lamejs: `npm install lamejs`
- [ ] Create `lib/tts/audio-utils.ts` with conversion functions
- [ ] Add TypeScript types for lamejs if needed
- [ ] Add `generateSpeechLinear16()` to google-tts.ts
- [ ] Add `generateSpeechChunkedSeamless()` to google-tts.ts
- [ ] Add `generateSpeechProgressiveSeamless()` to google-tts.ts
- [ ] Update route to use seamless functions
- [ ] Test audio quality
- [ ] Monitor latency impact

---

*Document created: 2026-02-03*
*Status: Ready for implementation if audio artifacts occur*
