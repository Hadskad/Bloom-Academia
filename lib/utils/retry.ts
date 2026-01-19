/**
 * Retry Utility with Exponential Backoff
 *
 * Provides robust retry logic for API calls with:
 * - Exponential backoff (delays: 1s, 2s, 4s)
 * - Max 3 retries
 * - Specific error handling for HTTP status codes
 *
 * Reference:
 * - MDN Web Docs: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * - Error handling patterns verified from Next.js docs
 */

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  shouldRetry?: (error: any, attempt: number) => boolean
  onRetry?: (attempt: number, error: any) => void
}

/**
 * Sleep utility for delays between retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry configuration
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    shouldRetry = defaultShouldRetry,
    onRetry
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break
      }

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s
      const delayMs = initialDelayMs * Math.pow(2, attempt)

      // Call retry callback if provided
      onRetry?.(attempt + 1, error)

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delayMs}ms...`, error)
      }

      await sleep(delayMs)
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * Default retry logic - retry on network errors and 5xx server errors
 * Following best practices from MDN and Next.js error handling patterns
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // Parse Response objects
  if (error instanceof Response) {
    const status = error.status

    // Retry on server errors (500-599)
    if (status >= 500 && status < 600) {
      return true
    }

    // Retry on rate limiting (429)
    if (status === 429) {
      return true
    }

    // Don't retry client errors (400-499, except 429)
    return false
  }

  // Retry on network errors (TypeError from fetch failures)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Retry on generic network failures
  if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
    return true
  }

  // Don't retry by default for unknown errors
  return false
}

/**
 * Helper to fetch with retry logic
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param retryOptions - Retry configuration
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init)

    // If response is not ok, throw it so retry logic can evaluate
    if (!response.ok) {
      throw response
    }

    return response
  }, retryOptions)
}

/**
 * Parse error into user-friendly message
 */
export function getErrorMessage(error: any): string {
  // Network/connectivity errors
  if (error instanceof TypeError || error.message?.includes('fetch') || error.message?.includes('network')) {
    return 'Check your internet connection and try again'
  }

  // HTTP Response errors
  if (error instanceof Response) {
    const status = error.status

    if (status >= 500 && status < 600) {
      return 'Server error. Please try again in a moment'
    }

    if (status === 429) {
      return 'Too many requests. Please wait a moment'
    }

    if (status === 401 || status === 403) {
      return 'Authentication error. Please refresh the page'
    }

    if (status === 404) {
      return 'Resource not found'
    }

    return `Server error (${status}). Please try again`
  }

  // Generic fallback
  return 'Something went wrong. Please try again'
}
