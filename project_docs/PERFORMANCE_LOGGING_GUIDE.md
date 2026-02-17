# Comprehensive Performance Logging System

**Created**: 2026-02-14
**Purpose**: Track latency across the entire teaching-student conversation flow from recording stop → audio playback

---

## Overview

A comprehensive performance logging system has been implemented across the entire teaching pipeline to identify bottlenecks and measure the impact of optimizations.

## Architecture

### Performance Logger Utility

**Location**: `lib/utils/performance-logger.ts`

A lightweight timing utility that:
- Tracks performance markers with timestamps
- Logs elapsed time for each marker
- Generates summaries showing duration between consecutive operations
- Exports data for analysis

**Usage**:
```typescript
const perf = new PerformanceLogger(sessionId);
perf.mark('operation_start');
// ... do work ...
perf.mark('operation_complete');
perf.summary(); // Logs breakdown
```

---

## Frontend Logging (page.tsx)

### Tracking Points

| Marker | Description | When |
|--------|-------------|------|
| `frontend_request_start` | Request initiated | User stops recording or submits |
| `fetch_start` | SSE fetch begins | Immediately after request start |
| `fetch_response_received` | SSE connection established | Server responds with headers |
| `text_event_received` | Text/SVG received from SSE | First `event: text` arrives |
| `text_displayed` | Text rendered to DOM | React state updated |
| `first_audio_chunk_received` | First audio chunk arrives | First `event: audio` with data |
| `audio_decode_start` | Audio decode begins | First chunk enters Web Audio pipeline |
| `audio_decode_complete` | Audio decode finishes | AudioBuffer created |
| `first_audio_scheduled` | Audio scheduled for playback | source.start() called |
| `sse_done_event_received` | Done event received | `event: done` arrives |
| `audio_finalized` | Playback finalized | audioPlayer.finalize() called |

### Example Output

```
[PERF 1a2b3c4d] T+0ms | frontend_request_start {"hasAudio":true,"hasMedia":false}
[PERF 1a2b3c4d] T+12ms | fetch_start
[PERF 1a2b3c4d] T+845ms | fetch_response_received
[PERF 1a2b3c4d] T+1024ms | text_event_received {"agentName":"math_specialist","textLength":245}
[PERF 1a2b3c4d] T+1029ms | text_displayed
[PERF 1a2b3c4d] T+1187ms | first_audio_chunk_received {"index":0}
[PERF 1a2b3c4d] T+1191ms | audio_decode_start
[PERF 1a2b3c4d] T+1218ms | audio_decode_complete
[PERF 1a2b3c4d] T+1220ms | first_audio_scheduled {"startTime":0.5,"duration":1.2}
[PERF 1a2b3c4d] T+2450ms | sse_done_event_received
[PERF 1a2b3c4d] T+2452ms | audio_finalized

[PERF SUMMARY 1a2b3c4d] ═══════════════════════════════
Total elapsed: 2452ms

Breakdown:
  frontend_request_start → fetch_start: 12ms
  fetch_start → fetch_response_received: 833ms
  fetch_response_received → text_event_received: 179ms
  text_event_received → text_displayed: 5ms
  text_displayed → first_audio_chunk_received: 158ms
  first_audio_chunk_received → audio_decode_start: 4ms
  audio_decode_start → audio_decode_complete: 27ms
  audio_decode_complete → first_audio_scheduled: 2ms
  first_audio_scheduled → sse_done_event_received: 1230ms
  sse_done_event_received → audio_finalized: 2ms
═══════════════════════════════════════════════════════════
```

---

## Backend Logging (stream/route.ts)

### Tracking Points

| Phase | Marker | Description |
|-------|--------|-------------|
| **Start** | `backend_request_start` | SSE handler starts |
| **Phase 1** | `phase1_context_loading_start` | Context loading begins (6 parallel queries) |
| **Phase 1** | `phase1_context_loading_complete` | All context loaded |
| **Phase 2** | `phase2_adaptive_directives_start` | Directive generation begins |
| **Phase 2** | `phase2_adaptive_directives_complete` | Directives formatted |
| **Phase 2** | `phase2_context_built` | AgentContext built |
| **Phase 4** | `phase4_routing_start` | Specialist routing begins |
| **Phase 4** | `phase4_routing_complete` | Target agent determined |
| **Phase 5** | `phase5_specialist_response_start` | Gemini streaming begins |
| **Phase 5** | `phase5_first_sentence_extracted` | First sentence extracted from stream |
| **Phase 5** | `phase5_gemini_streaming_complete` | Full response streamed |
| **Phase 8** | `phase8_all_audio_sent` | All TTS chunks sent via SSE |
| **Phase 9** | `phase9_done_event_start` | Done event preparation |
| **Phase 9** | `phase9_done_event_sent` | Done event transmitted |

### Example Output

```
[PERF 1a2b3c4d] T+0ms | backend_request_start {"hasAudio":true,"hasMedia":false}
[PERF 1a2b3c4d] T+2ms | phase1_context_loading_start
[PERF 1a2b3c4d] T+156ms | phase1_context_loading_complete {"profile":true,"lesson":true,"mastery":72}
[PERF 1a2b3c4d] T+158ms | phase2_adaptive_directives_start
[PERF 1a2b3c4d] T+162ms | phase2_adaptive_directives_complete {"mastery":72,"directiveCount":8}
[PERF 1a2b3c4d] T+164ms | phase2_context_built
[PERF 1a2b3c4d] T+165ms | phase4_routing_start
[PERF 1a2b3c4d] T+723ms | phase4_routing_complete {"targetAgent":"math_specialist"}
[PERF 1a2b3c4d] T+725ms | phase5_specialist_response_start {"specialist":"math_specialist"}
[PERF 1a2b3c4d] T+892ms | phase5_first_sentence_extracted
[PERF 1a2b3c4d] T+1180ms | phase5_gemini_streaming_complete {"sentenceCount":4}
[PERF 1a2b3c4d] T+2420ms | phase8_all_audio_sent
[PERF 1a2b3c4d] T+2422ms | phase9_done_event_start
[PERF 1a2b3c4d] T+2424ms | phase9_done_event_sent

[PERF SUMMARY 1a2b3c4d] ═══════════════════════════════
Total elapsed: 2424ms

Breakdown:
  backend_request_start → phase1_context_loading_start: 2ms
  phase1_context_loading_start → phase1_context_loading_complete: 154ms
  phase1_context_loading_complete → phase2_adaptive_directives_start: 2ms
  phase2_adaptive_directives_start → phase2_adaptive_directives_complete: 4ms
  phase2_adaptive_directives_complete → phase2_context_built: 2ms
  phase2_context_built → phase4_routing_start: 1ms
  phase4_routing_start → phase4_routing_complete: 558ms
  phase4_routing_complete → phase5_specialist_response_start: 2ms
  phase5_specialist_response_start → phase5_first_sentence_extracted: 167ms
  phase5_first_sentence_extracted → phase5_gemini_streaming_complete: 288ms
  phase5_gemini_streaming_complete → phase8_all_audio_sent: 1240ms
  phase8_all_audio_sent → phase9_done_event_start: 2ms
  phase9_done_event_start → phase9_done_event_sent: 2ms
═══════════════════════════════════════════════════════════
```

---

## Interpreting the Logs

### Key Metrics to Watch

1. **Time to First Text** (`text_event_received` - `frontend_request_start`)
   - Target: ~800-1000ms
   - Includes: Backend processing + Gemini generation

2. **Time to First Audio** (`first_audio_scheduled` - `frontend_request_start`)
   - Target: ~1000-1200ms
   - Includes: Everything above + TTS for first sentence

3. **Context Loading** (`phase1_context_loading_complete` - `phase1_context_loading_start`)
   - Target: ~50-150ms (with caching)
   - Watch for: Cache misses causing 200ms+ delays

4. **Gemini Streaming** (`phase5_gemini_streaming_complete` - `phase5_specialist_response_start`)
   - Target: ~400-800ms
   - Watch for: >1000ms indicates slow model response

5. **Audio Decode** (`audio_decode_complete` - `audio_decode_start`)
   - Target: ~20-40ms per chunk
   - Watch for: >50ms may indicate CPU bottleneck

### Bottleneck Identification

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `phase1_context_loading` >200ms | Cache miss or slow DB | Check cache hit rate, add indexes |
| `phase4_routing` >600ms | Coordinator is generating response | Normal for coordinator routing |
| `phase5_gemini_streaming` >1000ms | Slow Gemini API | Check thinking level, prompt size |
| Large gap between `first_sentence_extracted` and `gemini_complete` | Long response | Normal for complex answers |
| `audio_decode` >50ms | CPU overload | Check browser performance |

---

## Using the Logs for Optimization

### Workflow

1. **Collect Baseline Metrics**
   ```bash
   # Run a typical interaction, copy console logs
   # Extract timing from summary
   ```

2. **Make an Optimization**
   ```typescript
   // Example: Reduce prompt size
   // Change something in adaptive-directives.ts
   ```

3. **Compare Before/After**
   ```
   Before: phase2_adaptive_directives: 15ms
   After:  phase2_adaptive_directives: 8ms
   Improvement: 7ms (47% faster)
   ```

4. **Document in MEMORY.md**
   ```markdown
   ## Latency (SSE route, optimizations)
   - **New optimization (2026-02-XX)**: Description (~XXms improvement)
   ```

### Export for Analysis

The performance logger supports exporting data as JSON:

```typescript
const data = perf.export();
// {
//   sessionId: "1a2b3c4d",
//   markers: [
//     { name: "start", timestamp: 1234567890, metadata: {} },
//     ...
//   ],
//   totalDuration: 2452
// }
```

This can be sent to analytics or saved for batch analysis.

---

## Best Practices

1. **Always log phase boundaries** - Makes it easy to see where time is spent
2. **Include metadata** - Context helps interpret outliers (e.g., `{specialist: "math"}`)
3. **Use consistent naming** - `phase{N}_{operation}_{start|complete}`
4. **Log first occurrences** - Track when first audio/text appears
5. **Call summary() at the end** - Provides complete breakdown

---

## Maintenance

### Adding New Markers

When adding new operations to the pipeline:

1. Add marker at start: `perf.mark('new_operation_start')`
2. Add marker at completion: `perf.mark('new_operation_complete')`
3. Include relevant metadata: `perf.mark('...', { keyInfo: value })`
4. Document in this file

### Removing Old Markers

If an operation is removed from the pipeline:
1. Remove the corresponding `perf.mark()` calls
2. Update this documentation
3. Update MEMORY.md if it was mentioned there

---

## Future Enhancements

Potential additions to the logging system:

1. **Server-side log aggregation** - Send perf data to analytics backend
2. **P50/P95/P99 metrics** - Track percentiles across all requests
3. **Alert thresholds** - Warn when operations exceed expected duration
4. **Correlation with errors** - Link slow requests to error rates
5. **User-facing metrics** - Show "Response generated in Xms" to students

---

## References

- **Performance Logger**: `lib/utils/performance-logger.ts`
- **Frontend Instrumentation**: `app/learn/[lessonId]/page.tsx` (search for `perf.mark`)
- **Backend Instrumentation**: `app/api/teach/stream/route.ts` (search for `perf.mark`)
- **Memory Notes**: `MEMORY.md` (Latency section)
