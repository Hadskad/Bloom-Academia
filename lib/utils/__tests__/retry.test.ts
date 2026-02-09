/**
 * retry.test.ts
 *
 * Tests for retryWithBackoff, HttpError, fetchWithRetry, and getErrorMessage.
 *
 * retryWithBackoff uses a local sleep() backed by setTimeout, so we use
 * vi.useFakeTimers() + vi.advanceTimersByTimeAsync() to keep tests instant.
 *
 * fetchWithRetry wraps the global fetch – stubbed via vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff, HttpError, fetchWithRetry, getErrorMessage } from '@/lib/utils/retry'

// ── retryWithBackoff ─────────────────────────────────────────────────────────

describe('retryWithBackoff – success paths', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns immediately on first success (no retries)', async () => {
    const fn = vi.fn().mockResolvedValue('ok')

    const promise = retryWithBackoff(fn, { maxRetries: 3 })
    // No timers need advancing – first call succeeds
    const result = await promise

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new HttpError(500, 'server error'))
      .mockResolvedValueOnce('recovered')

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 100 })

    // Advance past the first backoff delay (100ms * 2^0 = 100ms)
    await vi.advanceTimersByTimeAsync(100)

    const result = await promise
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 (rate-limit) and succeeds on third attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new HttpError(429))
      .mockRejectedValueOnce(new HttpError(429))
      .mockResolvedValueOnce('done')

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 100 })

    // 1st retry delay: 100ms, 2nd retry delay: 200ms
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(200)

    const result = await promise
    expect(result).toBe('done')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('retryWithBackoff – exhaustion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws the last error after all retries are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(503, 'unavailable'))

    // Attach .catch immediately so the rejection is handled before vitest's
    // unhandled-rejection detector fires.  We capture the error for assertion.
    let caughtError: unknown
    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 50 })
      .catch((e) => { caughtError = e })

    // Delays: 50ms (attempt 0→1), 100ms (attempt 1→2). Attempt 2 = maxRetries – no sleep.
    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(100)

    await promise // settled (caught)

    expect(caughtError).toBeInstanceOf(HttpError)
    expect((caughtError as HttpError).status).toBe(503)
    // Initial call + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('retryWithBackoff – shouldRetry controls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does NOT retry when shouldRetry returns false (client error 400)', async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(400, 'bad request'))

    // defaultShouldRetry returns false for 400 – so it throws immediately
    await expect(retryWithBackoff(fn, { maxRetries: 3 })).rejects.toThrow('bad request')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry 404', async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(404, 'not found'))
    await expect(retryWithBackoff(fn, { maxRetries: 3 })).rejects.toThrow('not found')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does NOT retry 401', async () => {
    const fn = vi.fn().mockRejectedValue(new HttpError(401, 'unauthorized'))
    await expect(retryWithBackoff(fn, { maxRetries: 3 })).rejects.toThrow('unauthorized')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('custom shouldRetry can override default behaviour', async () => {
    // Custom: never retry anything
    const fn = vi.fn().mockRejectedValue(new HttpError(500))
    await expect(
      retryWithBackoff(fn, { maxRetries: 3, shouldRetry: () => false })
    ).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('onRetry callback is called with attempt number and error', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn()
      .mockRejectedValueOnce(new HttpError(500))
      .mockResolvedValueOnce('ok')

    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 50, onRetry })
    await vi.advanceTimersByTimeAsync(50)
    await promise

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(HttpError))
  })
})

describe('retryWithBackoff – network error retries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries on TypeError with "fetch" in message (network failure)', async () => {
    const networkError = new TypeError('Failed to fetch')
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('recovered')

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 50 })
    await vi.advanceTimersByTimeAsync(50)

    const result = await promise
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on error with "network" in message', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network unreachable'))
      .mockResolvedValueOnce('back online')

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 50 })
    await vi.advanceTimersByTimeAsync(50)

    const result = await promise
    expect(result).toBe('back online')
  })

  it('does NOT retry on generic unknown errors (no network/fetch keywords)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('something else entirely'))
    await expect(retryWithBackoff(fn, { maxRetries: 3 })).rejects.toThrow('something else entirely')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

// ── HttpError ────────────────────────────────────────────────────────────────

describe('HttpError', () => {
  it('stores status and details', () => {
    const err = new HttpError(503, 'Service Unavailable')
    expect(err.status).toBe(503)
    expect(err.details).toBe('Service Unavailable')
    expect(err.message).toBe('Service Unavailable')
    expect(err.name).toBe('HttpError')
  })

  it('defaults message to "HTTP <status>" when details omitted', () => {
    const err = new HttpError(500)
    expect(err.message).toBe('HTTP 500')
    expect(err.details).toBeUndefined()
  })

  it('is an instance of Error', () => {
    const err = new HttpError(400)
    expect(err instanceof Error).toBe(true)
    expect(err instanceof HttpError).toBe(true)
  })
})

// ── fetchWithRetry ───────────────────────────────────────────────────────────

describe('fetchWithRetry', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    vi.useFakeTimers()
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('returns response directly when ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }) as any

    const res = await fetchWithRetry('https://example.com/api')
    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
  })

  it('throws HttpError with body details when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ error: 'validation failed' }),
    }) as any

    // 422 is a client error – defaultShouldRetry returns false, so no retry
    await expect(fetchWithRetry('https://example.com/api')).rejects.toThrow('validation failed')
  })

  it('throws HttpError with status when body is not JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('not json')),
    }) as any

    // 500 will be retried – exhaust retries
    const promise = fetchWithRetry('https://example.com/api', undefined, { maxRetries: 0 })
    await expect(promise).rejects.toThrow('HTTP 500')
  })

  it('retries on 500 and succeeds on second call', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          json: vi.fn().mockResolvedValue({ error: 'internal' }),
        }
      }
      return { ok: true, status: 200 }
    }) as any

    const promise = fetchWithRetry('https://example.com/api', undefined, {
      maxRetries: 2,
      initialDelayMs: 50,
    })
    await vi.advanceTimersByTimeAsync(50)

    const res = await promise
    expect(res.ok).toBe(true)
    expect(callCount).toBe(2)
  })
})

// ── getErrorMessage ──────────────────────────────────────────────────────────

describe('getErrorMessage – human-readable messages', () => {
  it('returns connectivity message for TypeError with fetch', () => {
    const msg = getErrorMessage(new TypeError('Failed to fetch'))
    expect(msg).toMatch(/internet connection/i)
  })

  it('returns connectivity message for error with "network" in message', () => {
    const msg = getErrorMessage(new Error('network error'))
    expect(msg).toMatch(/internet connection/i)
  })

  it('returns server error message for HttpError 500', () => {
    const msg = getErrorMessage(new HttpError(500))
    expect(msg).toMatch(/[Ss]erver error/i)
  })

  it('returns server error message for HttpError 503', () => {
    const msg = getErrorMessage(new HttpError(503))
    expect(msg).toMatch(/[Ss]erver error/i)
  })

  it('returns rate-limit message for HttpError 429', () => {
    const msg = getErrorMessage(new HttpError(429))
    expect(msg).toMatch(/too many requests/i)
  })

  it('returns auth message for HttpError 401', () => {
    const msg = getErrorMessage(new HttpError(401))
    expect(msg).toMatch(/[Aa]uthentication/i)
  })

  it('returns auth message for HttpError 403', () => {
    const msg = getErrorMessage(new HttpError(403))
    expect(msg).toMatch(/[Aa]uthentication/i)
  })

  it('returns not-found message for HttpError 404', () => {
    const msg = getErrorMessage(new HttpError(404))
    expect(msg).toMatch(/not found/i)
  })

  it('returns generic status message for other HttpError codes', () => {
    const msg = getErrorMessage(new HttpError(418))
    expect(msg).toContain('418')
  })

  it('returns generic fallback for completely unknown errors', () => {
    const msg = getErrorMessage({ unknown: true })
    expect(msg).toMatch(/something went wrong/i)
  })
})
