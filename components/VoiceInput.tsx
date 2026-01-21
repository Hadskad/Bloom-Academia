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

import { useState, useRef } from 'react'
import { Mic } from 'lucide-react'
import { SonioxClient } from '@soniox/speech-to-text-web'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  onStateChange?: (state: 'idle' | 'listening') => void
}

export function VoiceInput({ onTranscript, disabled = false, onStateChange }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sonioxClient = useRef<SonioxClient | null>(null)
  const finalTranscriptRef = useRef<string>('')

  async function startListening() {
    try {
      setError(null)
      setTranscript('')
      finalTranscriptRef.current = ''

      // Check microphone permission first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access is not supported in this browser')
        return
      }

      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop the stream immediately - we just needed to check permission
        stream.getTracks().forEach(track => track.stop())
      } catch (permissionError) {
        console.error('Microphone permission denied:', permissionError)
        setError('Microphone access denied. Please allow microphone access and try again.')
        return
      }

      // Initialize Soniox client with callbacks
      sonioxClient.current = new SonioxClient({
        // Fetch temporary API key from backend
        apiKey: async () => {
          const response = await fetch('/api/stt/temp-key')
          if (!response.ok) {
            throw new Error('Failed to get API key')
          }
          const { api_key } = await response.json()
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
            setTranscript('')
            finalTranscriptRef.current = ''
          }
        },

        // Called with partial transcription results
        onPartialResult: (result) => {
          // Build transcript from tokens (tokens include spacing)
          const text = result.tokens.map(t => t.text).join('')
          setTranscript(text)

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

      // Start transcription with configuration
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
        disabled={disabled}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
            ? 'bg-error animate-pulse'
            : 'bg-primary hover:bg-primary/90'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        <Mic className="text-white" size={32} />
      </button>

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
