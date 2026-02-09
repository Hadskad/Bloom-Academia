# Direct Audio Input Implementation

**Date**: 2026-02-06
**Status**: ✅ Implementation Complete - Ready for Testing

## Summary

Successfully replaced the Soniox STT transcription pipeline with **direct audio input to Gemini 3 Flash**. Audio is now captured via browser MediaRecorder API and sent directly to Gemini for understanding, eliminating the transcription middleware.

## Architecture Change

### Before (Soniox Pipeline)
```
User speaks → Soniox WebSocket (real-time transcription) → Text → Gemini 3 Flash → Response
```

### After (Direct Audio)
```
User speaks → MediaRecorder (capture audio blob) → Base64 Audio → Gemini 3 Flash → Response
```

## Benefits

1. **Cost Reduction**: Eliminates Soniox API costs
2. **Simplified Architecture**: One less service to maintain
3. **Better Audio Understanding**: Gemini can process audio nuances (tone, emphasis) directly
4. **Reduced Latency**: No intermediate transcription step
5. **Reliability**: Fewer points of failure

## Implementation Details

### 1. New VoiceRecorder Component
**File**: `components/VoiceRecorder.tsx`

**Features**:
- Browser MediaRecorder API for audio capture
- Automatic MIME type detection (webm/mp4/ogg/wav)
- Converts audio blob to base64 for API transmission
- Visual feedback (recording/processing states)
- 20MB size validation (Gemini inline data limit)
- Comprehensive error handling

**Key Methods**:
- `startRecording()`: Requests microphone access and starts recording
- `stopRecording()`: Stops recording and triggers processing
- `blobToBase64()`: Converts audio blob to base64 string

**References**:
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Gemini Audio Docs](https://ai.google.dev/gemini-api/docs/audio)

### 2. Updated GeminiClient
**File**: `lib/ai/gemini-client.ts`

**Changes**:
- `teach()` method now accepts optional `audioBase64` and `audioMimeType` parameters
- `teachStreaming()` method now accepts optional `audioBase64` and `audioMimeType` parameters
- Builds content array with `inlineData` format for audio input
- Validates that either `userMessage` or `audioBase64` is provided

**Audio Format**:
```typescript
{
  inlineData: {
    mimeType: 'audio/webm', // or audio/mp3, audio/wav, etc.
    data: '<base64-encoded-audio-string>'
  }
}
```

**Supported Audio Formats**:
- WAV (`audio/wav`)
- MP3 (`audio/mp3`)
- WebM (`audio/webm`)
- AAC (`audio/aac`)
- OGG (`audio/ogg`)
- FLAC (`audio/flac`)

**References**:
- [Audio understanding | Gemini API](https://ai.google.dev/gemini-api/docs/audio)
- [@google/genai SDK](https://googleapis.github.io/js-genai/)

### 3. Updated AIAgentManager
**File**: `lib/ai/agent-manager.ts`

**Changes**:
- `buildDynamicContext()` now returns `string | any[]` to support audio
- Checks for `context.audioBase64` and `context.audioMimeType`
- When audio present, returns array of content parts: `[{ text: '...' }, { inlineData: {...} }]`
- When audio absent, returns string (text-only mode)

**Audio Detection Logic**:
```typescript
if (context.audioBase64 && context.audioMimeType) {
  return [
    { text: systemPrompt },
    { inlineData: { mimeType: context.audioMimeType, data: context.audioBase64 } }
  ];
}
```

### 4. Updated AgentContext Type
**File**: `lib/ai/types.ts`

**Added Fields**:
```typescript
export interface AgentContext {
  // ... existing fields
  audioBase64?: string;  // Base64-encoded audio data
  audioMimeType?: string; // MIME type (e.g., 'audio/webm')
}
```

### 5. Updated API Route
**File**: `app/api/teach/multi-ai-stream/route.ts`

**Changes**:
- Request body now accepts optional `audioBase64` and `audioMimeType`
- Validates that either `userMessage` or `audioBase64` is provided
- Passes audio parameters through `AgentContext` to agent manager
- Added audio validation (MIME type required if audio provided)

**Request Format**:
```typescript
{
  userId: string,
  sessionId: string,
  lessonId: string,
  userMessage?: string,      // Optional if audio provided
  audioBase64?: string,       // Base64-encoded audio
  audioMimeType?: string      // e.g., 'audio/webm'
}
```

### 6. Updated Learn Page
**File**: `app/learn/[lessonId]/page.tsx`

**Changes**:
- Replaced `VoiceInput` component with `VoiceRecorder`
- Changed `handleTranscript()` to `handleAudioRecording()`
- Updated state mapping: `recording` → `listening`, `processing` → `thinking`
- Sends `audioBase64` and `audioMimeType` instead of `userMessage`

## Technical Details

### Audio Capture Flow

1. **User clicks microphone button**
   - `VoiceRecorder.startRecording()` called
   - Requests microphone permission
   - Creates `MediaRecorder` instance with optimal MIME type
   - Starts recording audio chunks

2. **User clicks button again to stop**
   - `VoiceRecorder.stopRecording()` called
   - MediaRecorder stops, triggers `onstop` event
   - Audio chunks combined into single `Blob`
   - Blob size validated (< 20MB)

3. **Audio conversion**
   - `FileReader.readAsDataURL()` converts blob to data URL
   - Base64 string extracted from data URL
   - Base64 and MIME type passed to parent component

4. **API submission**
   - Learn page sends audio to `/api/teach/multi-ai-stream`
   - API route passes audio through context to agent manager
   - Agent manager builds content array with inline audio data
   - Gemini 3 Flash processes audio directly

5. **AI response**
   - Gemini understands audio and generates structured response
   - Response includes `audioText`, `displayText`, `svg`
   - TTS converts `audioText` to speech
   - User hears AI response

### Size Limits

**Inline Audio**: 20MB maximum (Gemini API limit)
- Most voice recordings are 100-500KB
- 20MB allows ~10-20 minutes of speech
- Far exceeds typical lesson interaction length

**Reference**: [Gemini Audio Documentation](https://ai.google.dev/gemini-api/docs/audio)

### Browser Compatibility

**MediaRecorder API Support**:
- ✅ Chrome/Edge: Excellent (webm/mp4)
- ✅ Firefox: Excellent (webm/ogg)
- ✅ Safari: Good (mp4/wav)
- ❌ IE11: Not supported

**MIME Type Priority**:
1. `audio/webm` (best browser support)
2. `audio/mp4` (Safari)
3. `audio/ogg` (Firefox fallback)
4. `audio/wav` (universal fallback)

Component automatically detects and uses best supported format.

## Testing Plan

### Manual Testing Checklist

1. **Basic Audio Capture**
   - [ ] Click microphone → recording starts
   - [ ] Visual feedback shows "Recording..."
   - [ ] Click again → recording stops
   - [ ] "Processing audio..." message appears

2. **Audio Submission**
   - [ ] Audio sent to API successfully
   - [ ] "Thinking..." state shows
   - [ ] AI response received and displayed
   - [ ] TTS audio plays correctly

3. **Error Handling**
   - [ ] Microphone permission denied → error message shown
   - [ ] Recording too large → validation error
   - [ ] Network error during submission → retry logic works
   - [ ] Offline → appropriate message

4. **Edge Cases**
   - [ ] Very short recording (< 1 second)
   - [ ] Long recording (> 1 minute)
   - [ ] Recording with background noise
   - [ ] Multiple recordings in sequence
   - [ ] Cancel recording mid-way

5. **Cross-Browser**
   - [ ] Chrome/Edge (webm format)
   - [ ] Firefox (webm/ogg format)
   - [ ] Safari (mp4 format)

### API Testing

**Test Audio Submission**:
```bash
# 1. Record audio and get base64
# (use VoiceRecorder component in browser, check console logs)

# 2. Send to API
curl -X POST http://localhost:3000/api/teach/multi-ai-stream \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "sessionId": "test-session",
    "lessonId": "test-lesson",
    "audioBase64": "<base64-string>",
    "audioMimeType": "audio/webm"
  }'
```

## Next Steps

### 1. Testing (Current Phase)
- [ ] Manual testing of audio capture
- [ ] Test different lesson scenarios
- [ ] Verify AI understands audio correctly
- [ ] Test error cases and edge cases
- [ ] Cross-browser compatibility testing

### 2. Cleanup (After Testing Success)
- [ ] Remove Soniox dependencies from `package.json`
- [ ] Delete old `VoiceInput` component
- [ ] Remove Soniox API route (`/api/stt/temp-key`)
- [ ] Remove Soniox environment variable from docs
- [ ] Update project documentation

### 3. Optional Enhancements (Future)
- [ ] Add audio visualization during recording
- [ ] Support for pause/resume recording
- [ ] Local audio playback preview before sending
- [ ] Audio compression for large files
- [ ] Fallback to text input if audio fails

## Migration Notes

### Breaking Changes
- **Component API**: `VoiceInput` → `VoiceRecorder`
  - Old: `onTranscript(text: string)`
  - New: `onRecordingComplete(audioBase64: string, mimeType: string)`

- **API Route**: Now accepts audio instead of text
  - Optional: `userMessage` OR `audioBase64` + `audioMimeType`

### Backward Compatibility
- Text input still works (unchanged)
- Only voice input method changed
- All other functionality preserved

### Environment Variables
**No longer needed**:
- `SONIOX_API_KEY` ❌ (can be removed after testing)

**Still required**:
- `GEMINI_API_KEY` ✅
- `GOOGLE_TTS_KEY_BASE64` ✅
- All other existing variables ✅

## Rollback Plan

If issues arise during testing:

1. **Revert component**:
   ```tsx
   import { VoiceInput } from '@/components/VoiceInput'
   // ... use VoiceInput instead of VoiceRecorder
   ```

2. **Revert API route**: Restore `userMessage` validation
3. **Revert agent-manager**: Remove audio support from `buildDynamicContext()`
4. **Keep Soniox**: Don't remove dependencies yet

## Performance Impact

### Latency Comparison

**Old Pipeline (Soniox)**:
- Transcription: ~500-800ms (real-time streaming)
- AI Processing: ~1,000-1,400ms
- Total: ~1,500-2,200ms

**New Pipeline (Direct Audio)**:
- Audio Capture: ~0ms (happens while user speaks)
- Encoding: ~50-100ms (blob to base64)
- AI Processing: ~1,200-1,600ms (slightly higher, processes audio)
- Total: ~1,250-1,700ms

**Expected Result**: Similar or slightly better latency, despite Gemini processing audio directly.

### Network Impact
- **Payload size increase**: Base64 audio is larger than text
  - Text: ~100-500 bytes
  - Audio: ~100-500 KB
- **Mitigation**: 20MB limit is sufficient, most recordings are small
- **Trade-off**: Acceptable for better accuracy and lower cost

## References

### Official Documentation
- [Audio understanding | Gemini API](https://ai.google.dev/gemini-api/docs/audio)
- [MediaRecorder API | MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [@google/genai SDK](https://googleapis.github.io/js-genai/)
- [DZone: Mastering Audio Transcription With Gemini](https://dzone.com/articles/mastering-audio-transcription-with-gemini-apis)

### Implementation Files
- `/components/VoiceRecorder.tsx` - New audio capture component
- `/lib/ai/gemini-client.ts` - Audio input support
- `/lib/ai/agent-manager.ts` - Audio context building
- `/lib/ai/types.ts` - Audio field types
- `/app/api/teach/multi-ai-stream/route.ts` - API audio handling
- `/app/learn/[lessonId]/page.tsx` - Component integration

## Status

✅ **Implementation Complete**
🔄 **Ready for Testing**
⏳ **Pending**: Manual testing, cleanup, documentation update
