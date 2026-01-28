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
  onStateChange?: (state: 'idle' | 'listening') => void
}

export function VoiceInput({ onTranscript, disabled = false, onStateChange }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const sonioxClient = useRef<SonioxClient | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const apiKeyCache = useRef<string | null>(null)
  const apiKeyExpiresAt = useRef<Date | null>(null)

  // Pre-initialize Soniox client on component mount
  // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
  useEffect(() => {
    async function initializeSonioxClient() {
      try {
        // Check microphone support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Microphone access is not supported in this browser')
          setIsInitializing(false)
          return
        }

        // Check microphone permission early
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach(track => track.stop())
        } catch (permissionError) {
          console.error('Microphone permission denied:', permissionError)
          setError('Microphone access denied. Please allow microphone access to use voice input.')
          setIsInitializing(false)
          return
        }

        // Pre-fetch API key during initialization to eliminate delay on first start()
        // Reference: https://soniox.com/docs/stt/SDKs/web-sdk
        // "Audio data is buffered in memory until the API key function resolves"
        try {
          const response = await fetch('/api/stt/temp-key')
          if (!response.ok) {
            throw new Error('Failed to fetch temporary API key')
          }
          const { api_key, expires_at } = await response.json()
          apiKeyCache.current = api_key
          // Store expiration time from Soniox response
          // Reference: https://soniox.com/docs/stt/api-reference/auth/create_temporary_api_key
          apiKeyExpiresAt.current = expires_at ? new Date(expires_at) : null
          console.log('API key pre-fetched successfully, expires at:', expires_at)
        } catch (apiKeyError) {
          console.error('Failed to pre-fetch API key:', apiKeyError)
          setError('Failed to initialize voice service. Please refresh the page.')
          setIsInitializing(false)
          return
        }

        // Initialize Soniox client once with callbacks
        // This client will be reused for all recordings (per Soniox best practices)
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

            // Key is expired or missing, fetch a new one
            console.log('API key expired or missing, fetching new key...')
            const response = await fetch('/api/stt/temp-key')
            if (!response.ok) {
              throw new Error('Failed to get API key')
            }
            const { api_key, expires_at } = await response.json()
            apiKeyCache.current = api_key
            apiKeyExpiresAt.current = expires_at ? new Date(expires_at) : null
            console.log('API key refreshed, expires at:', expires_at)
            return api_key
          },

          // Called after WebSocket connection is established
          onStarted: () => {
            console.log('Transcription started')
            setIsListening(true)
            onStateChange?.('listening')
          },

          // Called when transcription session ends
          onFinished: () => {
            console.log('Transcription finished')
            setIsListening(false)
            onStateChange?.('idle')

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
          onError: (status, message) => {
            console.error('Soniox error:', status, message)
            setError(`Error: ${message}`)
            setIsListening(false)
          }
        })

        setIsInitializing(false)
      } catch (err) {
        console.error('Error initializing Soniox client:', err)
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
      finalTranscriptRef.current = ''

      if (!sonioxClient.current) {
        setError('Voice input not ready. Please refresh the page.')
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
      setIsListening(false)
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
        disabled={disabled || isInitializing}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? 'bg-error animate-pulse'
            : 'bg-primary hover:bg-primary/90'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        <Mic className="text-white" size={32} />
      </button>

      {/* Initializing Message */}
      {isInitializing && !error && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-gray-600 text-sm font-medium">Preparing voice input...</p>
        </div>
      )}

      {/* Instruction Message - Show when listening */}
      {isListening && (
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
