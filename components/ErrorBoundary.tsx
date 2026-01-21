/**
 * Error Boundary Component
 *
 * Catches React errors in child components and displays a fallback UI.
 * Prevents the entire app from crashing when an error occurs.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * Reference: Implementation_Roadmap.md - Day 21
 * React docs: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { logError } from '@/lib/utils/error-handler'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Class Component
 *
 * Note: Error boundaries must be class components in React.
 * They cannot be functional components with hooks.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  /**
   * Update state when an error is caught
   * This method is called during the render phase
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Log error information
   * This method is called during the commit phase
   */
  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log error with context
    logError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    })
  }

  /**
   * Reset error state and retry
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  /**
   * Reload the entire page
   */
  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Don't worry, your progress is
              safe.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  Error Details (Dev Only)
                </summary>
                <div className="bg-gray-100 p-4 rounded-lg text-xs font-mono text-gray-700 overflow-auto max-h-40">
                  <p className="font-bold mb-2">{this.state.error.name}</p>
                  <p className="mb-2">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap text-[10px]">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                className="bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="border-gray-300"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
                className="border-gray-300"
              >
                Go to Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="mt-6 text-sm text-gray-500">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
