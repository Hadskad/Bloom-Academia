/**
 * Performance Logger Utility
 *
 * Tracks timing for all operations in the teaching-student conversation flow.
 * Provides detailed breakdown of latency from recording stop → audio playback.
 *
 * Usage:
 * ```typescript
 * const perf = new PerformanceLogger('session-123');
 * perf.mark('recording_stop');
 * perf.mark('gemini_start');
 * perf.mark('gemini_end');
 * perf.summary(); // Logs full breakdown
 * ```
 *
 * Reference: Latency optimization efforts (2026-02-14)
 */

interface PerformanceMarker {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceLogger {
  private sessionId: string;
  private markers: PerformanceMarker[] = [];
  private startTime: number;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }

  /**
   * Add a performance marker with optional metadata
   */
  mark(name: string, metadata?: Record<string, any>): void {
    const timestamp = Date.now();
    this.markers.push({ name, timestamp, metadata });

    const elapsed = timestamp - this.startTime;
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.log(`[PERF ${this.sessionId.substring(0, 8)}] T+${elapsed}ms | ${name}${metaStr}`);
  }

  /**
   * Get elapsed time since logger creation
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get time between two markers
   */
  duration(startMarker: string, endMarker: string): number | null {
    const start = this.markers.find(m => m.name === startMarker);
    const end = this.markers.find(m => m.name === endMarker);

    if (!start || !end) return null;
    return end.timestamp - start.timestamp;
  }

  /**
   * Log summary with durations between consecutive markers
   */
  summary(): void {
    console.log(`\n[PERF SUMMARY ${this.sessionId.substring(0, 8)}] ═══════════════════════════════`);
    console.log(`Total elapsed: ${this.elapsed()}ms`);
    console.log(`\nBreakdown:`);

    for (let i = 1; i < this.markers.length; i++) {
      const prev = this.markers[i - 1];
      const curr = this.markers[i];
      const duration = curr.timestamp - prev.timestamp;
      console.log(`  ${prev.name} → ${curr.name}: ${duration}ms`);
    }

    console.log(`═══════════════════════════════════════════════════════════\n`);
  }

  /**
   * Export markers as JSON for analysis
   */
  export(): { sessionId: string; markers: PerformanceMarker[]; totalDuration: number } {
    return {
      sessionId: this.sessionId,
      markers: this.markers,
      totalDuration: this.elapsed()
    };
  }
}

/**
 * Singleton for frontend performance tracking
 * Resets on each new request
 */
class FrontendPerformanceTracker {
  private currentLogger: PerformanceLogger | null = null;

  start(sessionId: string): PerformanceLogger {
    this.currentLogger = new PerformanceLogger(sessionId);
    return this.currentLogger;
  }

  get(): PerformanceLogger | null {
    return this.currentLogger;
  }

  reset(): void {
    if (this.currentLogger) {
      this.currentLogger.summary();
    }
    this.currentLogger = null;
  }
}

export const frontendPerf = new FrontendPerformanceTracker();
