/**
 * Centralized Error Handling Utility
 *
 * Provides custom error classes and error handling utilities
 * for consistent error management across the application.
 *
 * Reference: Implementation_Roadmap.md - Day 21
 */

/**
 * Base application error class
 * Extends Error with additional context (error code)
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Validation error (400 Bad Request)
 * Used when user input or request data is invalid
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

/**
 * Database error (500 Internal Server Error)
 * Used when database operations fail
 */
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500)
    this.name = 'DatabaseError'
  }
}

/**
 * Authentication error (401 Unauthorized)
 * Used when user authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Not found error (404 Not Found)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Network error
 * Used when network requests fail
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 503)
    this.name = 'NetworkError'
  }
}

/**
 * External API error
 * Used when third-party API calls fail (Gemini, Soniox, etc.)
 */
export class ExternalAPIError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} API error: ${message}`, 'EXTERNAL_API_ERROR', 502)
    this.name = 'ExternalAPIError'
  }
}

/**
 * Format error for user display
 * Converts technical errors into user-friendly messages
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Map common errors to user-friendly messages
    if (error.message.includes('fetch')) {
      return 'Network connection failed. Please check your internet and try again.'
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch')
    )
  }
  return false
}

/**
 * Log error with context
 * Use this for consistent error logging
 */
export function logError(
  error: unknown,
  context: string,
  additionalInfo?: Record<string, any>
) {
  console.error(`[${context}]`, error, additionalInfo || {})

  // In production, you could send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}
