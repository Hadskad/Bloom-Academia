/**
 * Toast Notification Component
 *
 * Displays temporary error/info messages at the top of the screen.
 * Auto-dismisses after a set duration or can be manually closed.
 *
 * Design: Follows Bloom Academia design system colors
 * Reference: Implementation_Roadmap.md - Error handling patterns
 */

'use client'

import { useEffect } from 'react'
import { X, AlertCircle, Wifi, WifiOff } from 'lucide-react'

export type ToastType = 'error' | 'warning' | 'info' | 'success'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number // milliseconds, 0 = don't auto-dismiss
  onClose: () => void
  icon?: 'error' | 'offline' | 'online' | 'none'
}

export function Toast({
  message,
  type = 'error',
  duration = 5000,
  onClose,
  icon = 'error'
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  // Style configurations per type
  const typeStyles = {
    error: 'bg-error/10 border-error text-error',
    warning: 'bg-accent/10 border-accent text-accent',
    info: 'bg-primary/10 border-primary text-primary',
    success: 'bg-success/10 border-success text-success'
  }

  // Icon components
  const iconComponents = {
    error: <AlertCircle className="w-4 h-4" />,
    offline: <WifiOff className="w-4 h-4" />,
    online: <Wifi className="w-4 h-4" />,
    none: null
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg min-w-[320px] max-w-[600px] animate-in slide-in-from-top-5 duration-300 ${typeStyles[type]}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      {icon !== 'none' && (
        <div className="flex-shrink-0">
          {iconComponents[icon]}
        </div>
      )}

      {/* Message */}
      <p className="flex-1 text-sm font-medium">
        {message}
      </p>

      {/* Close button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/**
 * Persistent Banner Component (for offline status)
 */
interface BannerProps {
  message: string
  type?: ToastType
  icon?: 'offline' | 'online' | 'none'
}

export function Banner({ message, type = 'warning', icon = 'offline' }: BannerProps) {
  const typeStyles = {
    error: 'bg-error/10 border-b-2 border-error text-error',
    warning: 'bg-accent/10 border-b-2 border-accent text-accent',
    info: 'bg-primary/10 border-b-2 border-primary text-primary',
    success: 'bg-success/10 border-b-2 border-success text-success'
  }

  const iconComponents = {
    offline: <WifiOff className="w-4 h-4" />,
    online: <Wifi className="w-4 h-4" />,
    none: null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 ${typeStyles[type]}`}
      role="alert"
      aria-live="polite"
    >
      {icon !== 'none' && iconComponents[icon]}
      <p className="text-sm font-medium">
        {message}
      </p>
    </div>
  )
}
