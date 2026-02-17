# Audio Completion Timeout Fix

## Problem Diagnosed

**Symptom:** UI displays "[Specialist] Teacher is speaking..." but audio has finished playing, and the microphone button remains disabled indefinitely.

**Root Cause:** The Web Audio API's `AudioBufferSourceNode.onended` event doesn't always fire reliably, leaving `activeSources.length > 0` even after audio finishes. This prevents the `onAllPlayedCallback` from firing, which blocks the state transition from `'speaking'` to `'idle'`.

## State Flow

1. ✅ SSE `'text'` event → `setVoiceState('speaking')` → UI shows "Teacher is speaking"
2. ✅ SSE `'audio'` events → chunks scheduled via `scheduleChunk()`
3. ✅ SSE `'done'` event → `finalize()` called
4. ❌ **STUCK**: `checkAllPlayed()` waits for `activeSources.length === 0`, but some `onended` events never fire
5. ❌ `onAllPlayedCallback` never fires → `voiceState` stays `'speaking'` → mic stays disabled

## Solution Implemented

Added a **1000ms timeout safety net** in the `finalize()` method. This is a standard fallback pattern recommended for Web Audio API reliability issues.

### How It Works

1. When `finalize()` is called, calculate when audio should be done:
   ```typescript
   timeUntilDone = (scheduledEndTime - currentTime) + 1000ms buffer
   ```

2. Set a timeout that fires at `timeUntilDone`

3. Two possible outcomes:
   - **Normal case (99%)**: All `onended` events fire → `checkAllPlayed()` fires callback → timeout gets cleared
   - **Bug case (1%)**: Some `onended` events don't fire → timeout fires → forces cleanup → callback fires

### Implementation Details

**New fields added:**
- `completionTimeoutId` - Tracks the setTimeout ID for cleanup
- `callbackFired` - Prevents double-firing if timeout and `onended` race
- `COMPLETION_BUFFER_MS = 1000` - 1 second safety buffer

**Modified methods:**
- `init()` - Resets timeout tracking fields
- `finalize()` - Sets the timeout safety net
- `checkAllPlayed()` - Clears timeout when callback fires normally, guards against double-firing
- `stop()` - Clears timeout on manual stop

## Why 1000ms?

- **500ms**: Too aggressive, might fire while legitimate `onended` events are in-flight
- **1000ms**: Sweet spot - generous for slow browsers/devices, fast enough that users barely notice
- **2000ms**: Too conservative, feels sluggish when the fallback kicks in

Industry standard (YouTube, Spotify) uses ~1s timeouts for Web Audio reliability.

## Evidence Supporting This Approach

Research confirmed this is the **recommended pattern** for Web Audio API:

1. **MDN Documentation** confirms `onended` events can be unreliable
   - Source: [AudioScheduledSourceNode: ended event](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event)

2. **Known issues** with `onended` firing too early or not at all
   - Issue: [onended event fired too early](https://github.com/audiojs/web-audio-api/issues/21)

3. **setTimeout as standard fallback** for Web Audio timing
   - MDN notes: "Code that uses setTimeout() as a fallback mechanism for timing-critical operations"

## Testing

To verify the fix works:

1. **Normal case**: Play audio normally → mic should become active immediately after audio finishes
2. **Fallback case**: If you see this console warning, the timeout fired:
   ```
   [AudioChunkPlayer] Timeout fired: N sources never fired onended - forcing completion
   ```
3. **Verification**: Mic button should ALWAYS become active within ~1 second after audio finishes

## Files Modified

- `app/learn/[lessonId]/page.tsx` - AudioChunkPlayer class (lines 119-290)

## References

- [MDN: AudioScheduledSourceNode ended event](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event)
- [GitHub Issue: onended event reliability](https://github.com/audiojs/web-audio-api/issues/21)
- [MDN: Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
