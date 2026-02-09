/**
 * VoiceInput Component
 *
 * Provides microphone button for voice input using Soniox Speech-to-Text.
 * Handles real-time transcription via WebSocket connection.
 *
 * Features:
 * - Secure temporary API key fetching
 * - Real-time transcription display
 * - Manual stop control (user clicks when done)
 * - Visual feedback (animated while listening)
 * - Error handling
 *
 * Usage:
 * <VoiceInput onTranscript={(text) => console.log(text)} />
 *
 * References:
 * - Soniox Web SDK: https://soniox.com/docs/stt/SDKs/web-sdk
 * - GitHub: https://github.com/soniox/speech-to-text-web
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'
import { SonioxClient } from '@soniox/speech-to-text-web'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  onStateChange?: (state: 'idle' | 'listening' | 'connecting') => void
}

export function VoiceInput({ onTranscript, disabled = false, onStateChange }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false) // New state for connection phase
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const sonioxClient = useRef<SonioxClient | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const apiKeyCache = useRef<string | null>(null)
  const apiKeyExpiresAt = useRef<Date | null>(null)
  const retryCountRef = useRef<number>(0)
  const wsRetryCountRef = useRef<number>(0)
  const maxWsRetries = 3

  // Use ref to always have latest callback (avoids stale closure in SonioxClient callbacks)
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange

  // Fetch API key with exponential backoff retry logic
  // Retries on network errors and server errors (429, 500)
  // Reference: https://soniox.com/docs/stt/api-reference/auth/create_temporary_api_key
  async function fetchApiKeyWithRetry(maxRetries = 3): Promise<{ api_key: string; expires_at: string }> {
    const baseDelay = 1000 // Start with 1 second
    const sessionId = `session_${Date.now()}`

    console.log(`[${sessionId}] 🔑 Starting API key fetch (max retries: ${maxRetries})`)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now()
      console.log(`[${sessionId}] 📡 Attempt ${attempt + 1}/${maxRetries + 1} - fetching from /api/stt/temp-key`)

      try {
        const response = await fetch('/api/stt/temp-key')
        const fetchDuration = Date.now() - attemptStartTime

        console.log(`[${sessionId}] 📥 Response received (${fetchDuration}ms)`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            contentType: response.headers.get('content-type')
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`[${sessionId}] ❌ API returned error:`, {
            attempt: attempt + 1,
            status: response.status,
            errorData,
            duration: fetchDuration
          })

          const shouldRetry = errorData.shouldRetry || response.status === 429 || response.status >= 500

          // If this is the last attempt or error is not retryable, throw
          if (attempt === maxRetries || !shouldRetry) {
            console.error(`[${sessionId}] ❌ FINAL_FAILURE (attempt ${attempt + 1}/${maxRetries + 1})`, {
              reason: attempt === maxRetries ? 'Max retries reached' : 'Error not retryable',
              errorMessage: errorData.error,
              requestId: errorData.requestId
            })
            throw new Error(errorData.error || 'Failed to fetch temporary API key')
          }

          // Calculate exponential backoff delay: 1s, 2s, 4s
          const delay = baseDelay * Math.pow(2, attempt)
          console.warn(`[${sessionId}] ⏱️ Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        const data = await response.json()
        const totalDuration = Date.now() - attemptStartTime

        console.log(`[${sessionId}] ✅ SUCCESS: API key fetched (${totalDuration}ms)`, {
          attempt: attempt + 1,
          expiresAt: data.expires_at,
          hasApiKey: !!data.api_key
        })

        retryCountRef.current = 0 // Reset retry count on success
        return data
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime

        console.error(`[${sessionId}] ❌ EXCEPTION on attempt ${attempt + 1}/${maxRetries + 1} (${attemptDuration}ms):`, {
          errorType: error?.constructor?.name,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          isNetworkError: error instanceof TypeError,
          userAgent: navigator.userAgent,
          online: navigator.onLine,
          connection: (navigator as any).connection ? {
            effectiveType: (navigator as any).connection.effectiveType,
            downlink: (navigator as any).connection.downlink,
            rtt: (navigator as any).connection.rtt
          } : 'Not available'
        })

        // Network errors or JSON parse errors
        if (attempt === maxRetries) {
          console.error(`[${sessionId}] ❌ FINAL_FAILURE: All retries exhausted`)
          throw error
        }

        const delay = baseDelay * Math.pow(2, attempt)
        console.warn(`[${sessionId}] ⏱️ Network error - retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    console.error(`[${sessionId}] ❌ CRITICAL: Fell through retry loop without returning`)
    throw new Error('Failed to fetch API key after retries')
  }

  // Pre-initialize Soniox client on component mount
  // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
  useEffect(() => {
    async function initializeSonioxClient() {
      const initStartTime = Date.now()
      console.log('🚀 Initializing VoiceInput component...', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        online: navigator.onLine,
        language: navigator.language
      })

      try {
        // Check microphone support
        console.log('🎤 Checking microphone support...')
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('❌ Microphone API not available:', {
            hasMediaDevices: !!navigator.mediaDevices,
            hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia
          })
          setError('Microphone access is not supported in this browser')
          setIsInitializing(false)
          return
        }
        console.log('✅ Microphone API available')

        // Check microphone permission early
        console.log('🔐 Requesting microphone permission...')
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          console.log('✅ Microphone permission granted:', {
            tracks: stream.getTracks().map(t => ({
              kind: t.kind,
              label: t.label,
              enabled: t.enabled
            }))
          })
          stream.getTracks().forEach(track => track.stop())
        } catch (permissionError) {
          console.error('❌ Microphone permission denied:', {
            error: permissionError instanceof Error ? permissionError.message : permissionError,
            name: (permissionError as any)?.name,
            constraint: (permissionError as any)?.constraint
          })
          setError('Microphone access denied. Please allow microphone access to use voice input.')
          setIsInitializing(false)
          return
        }

        // Pre-fetch API key during initialization to eliminate delay on first start()
        // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
        // "Audio data is buffered in memory until the API key function resolves"
        console.log('🔑 Pre-fetching Soniox API key...')
        try {
          const { api_key, expires_at } = await fetchApiKeyWithRetry()
          apiKeyCache.current = api_key
          // Store expiration time from Soniox response
          // Reference: https://soniox.com/docs/stt/api-reference/auth/create_temporary_api_key
          apiKeyExpiresAt.current = expires_at ? new Date(expires_at) : null
          console.log('✅ API key pre-fetched successfully:', {
            expiresAt: expires_at,
            keyLength: api_key?.length,
            validUntil: apiKeyExpiresAt.current?.toISOString()
          })
        } catch (apiKeyError) {
          console.error('❌ Failed to pre-fetch API key:', {
            error: apiKeyError instanceof Error ? apiKeyError.message : apiKeyError,
            stack: apiKeyError instanceof Error ? apiKeyError.stack : undefined
          })
          const errorMsg = apiKeyError instanceof Error ? apiKeyError.message : 'Failed to initialize voice service'
          setError(errorMsg)
          setIsInitializing(false)
          return
        }

        // Initialize Soniox client once with callbacks
        // This client will be reused for all recordings (per Soniox best practices)
        console.log('⚙️ Initializing SonioxClient...')
        sonioxClient.current = new SonioxClient({
          // Return cached API key, refreshing if expired or expiring soon
          // Reference: https://soniox.com/docs/stt/guides/best-practices
          apiKey: async () => {
            // Check if key exists and is not expired/expiring soon (5 min buffer)
            const now = new Date()
            const bufferMs = 5 * 60 * 1000 // 5 minutes buffer before expiry
            const isExpired = apiKeyExpiresAt.current &&
              (apiKeyExpiresAt.current.getTime() - now.getTime()) < bufferMs

            if (apiKeyCache.current && !isExpired) {
              return apiKeyCache.current
            }

            // Key is expired or missing, fetch a new one with retry logic
            console.log('API key expired or missing, fetching new key...')
            const { api_key, expires_at } = await fetchApiKeyWithRetry()
            apiKeyCache.current = api_key
            apiKeyExpiresAt.current = expires_at ? new Date(expires_at) : null
            console.log('API key refreshed, expires at:', expires_at)
            return api_key
          },

          // Called after WebSocket connection is established
          onStarted: () => {
            console.log('Transcription started')
            wsRetryCountRef.current = 0 // Reset retry count on successful connection
            // Clear connecting state and set listening state
            setIsConnecting(false)
            setIsListening(true)
            onStateChangeRef.current?.('listening')
          },

          // Called when transcription session ends
          onFinished: () => {
            console.log('Transcription finished')
            setIsConnecting(false)
            setIsListening(false)
            onStateChangeRef.current?.('idle')

            // Send final transcript to parent component
            if (finalTranscriptRef.current.trim()) {
              onTranscript(finalTranscriptRef.current.trim())
              finalTranscriptRef.current = ''
            }
          },

          // Called with partial transcription results
          onPartialResult: (result) => {
            // Track finalized text (tokens with is_final: true)
            const finalTokens = result.tokens.filter(t => t.is_final)
            if (finalTokens.length > 0) {
              finalTranscriptRef.current = finalTokens.map(t => t.text).join('')
            }
          },

          // Called on state changes
          onStateChange: ({ newState, oldState }) => {
            console.log(`Soniox state: ${oldState} -> ${newState}`)
          },

          // Called on errors
          // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
          onError: (status, message, errorCode) => {
            console.error('Soniox error:', { status, message, errorCode })

            // Map Soniox error statuses to user-friendly messages
            // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
            let userMessage = message
            let shouldRetry = false

            switch (status) {
              case 'get_user_media_failed':
                userMessage = 'Microphone access denied. Please allow microphone access and try again.'
                break

              case 'api_key_fetch_failed':
                userMessage = 'Failed to authenticate with voice service. Please try again.'
                shouldRetry = true
                break

              case 'queue_limit_exceeded':
                userMessage = 'Voice service is processing too much data. Please try again in a moment.'
                shouldRetry = true
                break

              case 'media_recorder_error':
                userMessage = 'Microphone recording error. Please check your microphone and try again.'
                break

              case 'api_error':
                // Handle specific API error codes
                // Reference: https://soniox.com/docs/stt/api-reference/websocket-api
                if (errorCode === 401) {
                  userMessage = 'Voice service authentication failed. Your session may have expired.'
                  shouldRetry = true
                } else if (errorCode === 429) {
                  userMessage = 'Voice service is busy. Please try again in a moment.'
                  shouldRetry = true
                } else if (errorCode && errorCode >= 500) {
                  userMessage = 'Voice service is temporarily unavailable. Please try again.'
                  shouldRetry = true
                } else {
                  userMessage = `Voice service error: ${message}`
                }
                break

              case 'websocket_error':
                userMessage = 'Connection to voice service failed. Please check your internet connection.'
                shouldRetry = true
                break

              default:
                userMessage = `Voice input error: ${message}`
                break
            }

            setError(userMessage)
            setIsConnecting(false)
            setIsListening(false)

            // Attempt automatic retry for recoverable errors
            if (shouldRetry && wsRetryCountRef.current < maxWsRetries) {
              wsRetryCountRef.current += 1
              const retryDelay = 2000 * wsRetryCountRef.current // 2s, 4s, 6s
              console.log(`Will retry voice input in ${retryDelay}ms (attempt ${wsRetryCountRef.current}/${maxWsRetries})`)

              setTimeout(() => {
                console.log('Retrying voice input after error...')
                setError(null)
                startListening()
              }, retryDelay)
            } else if (shouldRetry) {
              console.log('Max WebSocket retries reached')
              setError(userMessage + ' Please refresh the page if the problem persists.')
            }
          }
        })

        const initDuration = Date.now() - initStartTime
        console.log(`✅ VoiceInput initialization complete (${initDuration}ms)`)
        setIsInitializing(false)
      } catch (err) {
        const initDuration = Date.now() - initStartTime
        console.error(`❌ Error initializing Soniox client (${initDuration}ms):`, {
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined,
          errorType: err?.constructor?.name
        })
        setError('Failed to initialize voice input')
        setIsInitializing(false)
      }
    }

    initializeSonioxClient()

    // Cleanup on unmount
    return () => {
      if (sonioxClient.current) {
        sonioxClient.current.cancel()
      }
    }
  }, [])

  async function startListening() {
    // Client is already initialized, just start recording
    // Audio will be buffered during WebSocket connection establishment
    // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
    try {
      setError(null)
      setIsConnecting(true) // Show "Please wait..." immediately
      onStateChange?.('connecting') // Notify parent component
      finalTranscriptRef.current = ''

      if (!sonioxClient.current) {
        setError('Voice input not ready. Please refresh the page.')
        setIsConnecting(false)
        onStateChange?.('idle')
        return
      }

      // Check if client is already active to prevent "already active" error
      // The client exposes a 'state' property to check current status
      // Valid states to start from:
      // - 'Init': Fresh client, never started
      // - 'idle': Ready state
      // - 'Finished': Previous recording completed successfully
      // - 'Canceled': Previous recording was canceled
      const currentState = (sonioxClient.current as any).state
      const validStartStates = ['Init', 'idle', 'Finished', 'Canceled']
      if (currentState && !validStartStates.includes(currentState)) {
        console.warn('Soniox client is already active, state:', currentState)
        setIsConnecting(false)
        onStateChange?.('idle')
        return
      }

      // Start transcription with configuration
      // The client reuses the same instance for multiple recordings
      sonioxClient.current.start({
        model: 'stt-rt-preview',
        languageHints: ['en'],
        enableEndpointDetection: false // User controls when to stop
      })
    } catch (err) {
      console.error('Error starting voice input:', err)
      setError('Failed to start voice input')
      setIsConnecting(false)
      setIsListening(false)
      onStateChange?.('idle')
    }
  }

  function stopListening() {
    // Gracefully stop and wait for final results
    sonioxClient.current?.stop()
  }

  return (
    <div className="flex flex-col items-center">
      {/* Microphone Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled || isInitializing || (isConnecting && !isListening)}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? 'bg-error animate-pulse'
            : 'bg-primary hover:bg-primary/90'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        <Mic className="text-white" size={32} />
      </button>

      {/* Status Messages - Only show one at a time */}
      {isInitializing && !error && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-gray-600 text-sm font-medium">Preparing voice input...</p>
        </div>
      )}

      {!isInitializing && isConnecting && !isListening && !error && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <p className="text-accent text-sm font-medium">Please wait...</p>
        </div>
      )}

      {!isInitializing && isListening && !error && (
        <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-primary text-sm font-medium">Click the button again when you're done speaking</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
