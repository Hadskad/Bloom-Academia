/**
 * Network Utility Functions
 *
 * Provides utilities for checking network connectivity and handling
 * network-related errors.
 *
 * Reference: Implementation_Roadmap.md - Day 21
 */

/**
 * Check if the browser is online
 * Uses the Navigator API
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Check network connectivity by making a lightweight request
 * More reliable than navigator.onLine for detecting actual connectivity
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a small resource from the same origin
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Wait for network to be available
 * Polls connectivity check until online
 */
export async function waitForNetwork(
  maxAttempts: number = 3,
  delayMs: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkConnectivity()) {
      return true
    }
    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

/**
 * Retry a network request with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if not a network error
      if (!isNetworkError(error)) {
        throw error
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

/**
 * Check if an error is network-related
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'NetworkError' ||
      error.name === 'AbortError'
    )
  }
  return false
}

/**
 * Setup network event listeners
 * Calls callback when network status changes
 */
export function onNetworkChange(
  callback: (isOnline: boolean) => void
): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
