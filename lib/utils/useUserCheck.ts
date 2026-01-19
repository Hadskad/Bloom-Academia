/**
 * User Check Utility Hook
 *
 * Checks if a userId exists in localStorage.
 * Used to redirect existing users to /lessons and new users to /welcome.
 *
 * Usage:
 * - Landing page: Check if user exists, update CTA button
 * - Welcome page: Check on mount, redirect if user exists
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UseUserCheckOptions {
  redirectIfExists?: boolean
  redirectPath?: string
}

export function useUserCheck(options: UseUserCheckOptions = {}) {
  const {
    redirectIfExists = false,
    redirectPath = '/lessons'
  } = options

  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check localStorage for existing userId
    const storedUserId = localStorage.getItem('userId')
    setUserId(storedUserId)
    setIsChecking(false)

    // Redirect if user exists and option is enabled
    if (redirectIfExists && storedUserId) {
      router.push(redirectPath)
    }
  }, [redirectIfExists, redirectPath, router])

  return {
    userId,
    hasUser: userId !== null,
    isChecking
  }
}

/**
 * Get enrollment URL based on user existence
 * Returns /lessons if user exists, /welcome if not
 */
export function getEnrollmentUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: default to welcome
    return '/welcome'
  }

  const userId = localStorage.getItem('userId')
  return userId ? '/lessons' : '/welcome'
}
