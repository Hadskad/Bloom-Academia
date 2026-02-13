'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays fallback UI.
 * Specifically handles ChunkLoadError by automatically reloading the page.
 *
 * Reference: https://react.dev/reference/react/Component
 * Pattern based on: https://legacy.reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error (webpack chunk failed to load)
    const isChunkError =
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details (in production, send to error tracking service like Sentry)
    console.error('Error caught by boundary:', error, errorInfo);

    // Auto-reload for chunk errors after 1 second
    // This handles stale webpack chunks when new code is deployed
    if (this.state.isChunkError) {
      console.log('Chunk loading error detected. Reloading page in 1 second...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Chunk error fallback: Show loading state while auto-reloading
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Loading update...
              </h2>
              <p className="text-gray-600">
                We're refreshing the page to load the latest version.
              </p>
            </div>
          </div>
        );
      }

      // Generic error fallback: User can manually refresh
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
