/**
 * useOnlineStatus Hook
 *
 * Detects network connectivity using the Navigator Online API.
 * Returns true if online, false if offline.
 *
 * Reference:
 * - MDN: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
 * - Verified for React 18+ and Next.js 15 compatibility
 */

'use client'

import { useState, useEffect } from 'react'

export function useOnlineStatus(): boolean {
  // Initialize with current online status
  // Use optional chaining for SSR safety
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    // Update state when online/offline events fire
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    // Add event listeners
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
