/**
 * VoiceRecorder Component
 *
 * Records audio from microphone and returns base64-encoded audio data.
 * Audio is sent directly to Gemini API for native audio processing (no separate STT service).
 *
 * Features:
 * - Browser MediaRecorder API for audio capture
 * - Converts audio blob to base64 for API transmission
 * - Visual feedback (animated while recording)
 * - Voice Activity Detection (VAD) for auto-stop after 2s silence
 * - Manual stop control (user clicks when done)
 * - Error handling for permissions and recording
 *
 * Usage:
 * <VoiceRecorder onRecordingComplete={(base64Audio, mimeType) => ...} />
 *
 * References:
 * - MediaRecorder API: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
 * - Gemini Audio Docs: https://ai.google.dev/gemini-api/docs/audio
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string, mimeType: string) => void
  disabled?: boolean
  onStateChange?: (state: 'idle' | 'recording' | 'processing') => void
}

export function VoiceRecorder({
  onRecordingComplete,
  disabled = false,
  onStateChange
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [supportedMimeType, setSupportedMimeType] = useState<string>('audio/webm')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // VAD (Voice Activity Detection) refs
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const silenceStartRef = useRef<number | null>(null)

  // VAD thresholds — 2 seconds of silence triggers auto-stop
  const SILENCE_THRESHOLD = 10 // Average byte frequency (0-255), values below this = silence
  const SILENCE_DURATION_MS = 2000 // 2 seconds of continuous silence

  // Use ref to always have latest callback (avoids stale closure)
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange

  // Initialize and check permissions on mount
  useEffect(() => {
    async function initialize() {
      const initStartTime = Date.now()
      console.log('🚀 Initializing VoiceRecorder component...', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        online: navigator.onLine,
        language: navigator.language
      })

      try {
        // Check MediaRecorder support
        console.log('🎤 Checking MediaRecorder API support...')
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('❌ MediaRecorder API not available:', {
            hasMediaDevices: !!navigator.mediaDevices,
            hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia
          })
          setError('Audio recording is not supported in this browser')
          setIsInitializing(false)
          return
        }
        console.log('✅ MediaRecorder API available')

        // Determine best supported MIME type
        // Priority: audio/webm (best browser support) > audio/mp4 > audio/ogg
        // Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
        const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
        let selectedMimeType = 'audio/webm' // default fallback

        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType
            console.log(`✅ Using MIME type: ${mimeType}`)
            break
          }
        }

        setSupportedMimeType(selectedMimeType)

        // Request microphone permission early
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
          // Stop the test stream immediately
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

        const initDuration = Date.now() - initStartTime
        console.log(`✅ VoiceRecorder initialization complete (${initDuration}ms)`)
        setIsInitializing(false)
      } catch (err) {
        const initDuration = Date.now() - initStartTime
        console.error(`❌ Error initializing VoiceRecorder (${initDuration}ms):`, {
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined,
          errorType: err?.constructor?.name
        })
        setError('Failed to initialize voice recording')
        setIsInitializing(false)
      }
    }

    initialize()

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      // Clean up VAD resources
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  async function startRecording() {
    try {
      setError(null)
      audioChunksRef.current = []

      console.log('🎤 Starting audio recording...')

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      streamRef.current = stream

      // Create MediaRecorder with supported MIME type
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType
      })
      mediaRecorderRef.current = mediaRecorder

      // Collect audio chunks as they're recorded
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log(`📦 Audio chunk received: ${event.data.size} bytes`)
        }
      })

      // Handle recording completion
      mediaRecorder.addEventListener('stop', async () => {
        console.log('⏹️ Recording stopped, processing audio...')
        setIsRecording(false)
        setIsProcessing(true)
        onStateChangeRef.current?.('processing')

        try {
          // Combine chunks into single blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: supportedMimeType
          })
          console.log(`✅ Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`)

          // Validate blob size (20MB limit for Gemini inline data)
          // Reference: https://ai.google.dev/gemini-api/docs/audio
          const MAX_SIZE = 20 * 1024 * 1024 // 20MB
          if (audioBlob.size > MAX_SIZE) {
            throw new Error(`Recording too large (${(audioBlob.size / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.`)
          }

          // Convert blob to base64
          // Reference: https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
          const base64Audio = await blobToBase64(audioBlob)
          console.log(`✅ Audio converted to base64: ${base64Audio.length} characters`)

          // Return audio data to parent
          onRecordingComplete(base64Audio, supportedMimeType)

          setIsProcessing(false)
          onStateChangeRef.current?.('idle')
        } catch (processError) {
          console.error('❌ Error processing audio:', processError)
          setError(
            processError instanceof Error
              ? processError.message
              : 'Failed to process audio recording'
          )
          setIsProcessing(false)
          onStateChangeRef.current?.('idle')
        }

        // Stop and release microphone stream + VAD resources
        cleanupVAD()
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      })

      // Handle recording errors
      mediaRecorder.addEventListener('error', (event) => {
        console.error('❌ MediaRecorder error:', event)
        setError('Recording error occurred. Please try again.')
        setIsRecording(false)
        onStateChangeRef.current?.('idle')
      })

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      onStateChangeRef.current?.('recording')
      console.log('✅ Recording started successfully')

      // --- VAD Setup: Detect 2s of silence to auto-stop ---
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
      try {
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256 // Small FFT for fast computation
        analyserRef.current = analyser

        source.connect(analyser)
        // Don't connect analyser to destination — we only need to read data, not play it

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        silenceStartRef.current = null

        function checkSilence() {
          if (!analyserRef.current) return

          analyserRef.current.getByteFrequencyData(dataArray)

          // Calculate average amplitude across all frequency bins
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const average = sum / bufferLength

          if (average < SILENCE_THRESHOLD) {
            // Below threshold — silence detected
            if (silenceStartRef.current === null) {
              silenceStartRef.current = Date.now()
            } else if (Date.now() - silenceStartRef.current >= SILENCE_DURATION_MS) {
              // 2 seconds of continuous silence — auto-stop
              console.log('🔇 VAD: 2s silence detected, auto-stopping recording')
              stopRecording()
              return // Stop the loop
            }
          } else {
            // Speech detected — reset silence timer
            silenceStartRef.current = null
          }

          animFrameRef.current = requestAnimationFrame(checkSilence)
        }

        // Start the detection loop
        animFrameRef.current = requestAnimationFrame(checkSilence)
      } catch (vadError) {
        // VAD is optional — if it fails, manual stop still works
        console.warn('⚠️ VAD setup failed (manual stop still works):', vadError)
      }
    } catch (err) {
      console.error('❌ Error starting recording:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start recording. Please check microphone permissions.'
      )
      setIsRecording(false)
      onStateChangeRef.current?.('idle')
    }
  }

  /** Clean up VAD resources (AudioContext, AnalyserNode, animation frame) */
  function cleanupVAD() {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    silenceStartRef.current = null
    analyserRef.current = null
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
  }

  function stopRecording() {
    // Clean up VAD first
    cleanupVAD()

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⏹️ Stopping recording...')
      mediaRecorderRef.current.stop()
    }
  }

  /**
   * Convert Blob to base64 string
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
   */
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 data from data URL (remove "data:audio/webm;base64," prefix)
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        } else {
          reject(new Error('Failed to read audio data'))
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })
  }

  return (
    <div className="flex flex-col items-center">
      {/* Microphone Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isInitializing || isProcessing}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${
          isRecording
            ? 'bg-error animate-pulse'
            : 'bg-primary hover:bg-primary/90'
        }`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <Mic className="text-white" size={32} />
      </button>

      {/* Status Messages - Only show one at a time */}
      {isInitializing && !error && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-gray-600 text-sm font-medium">Preparing voice input...</p>
        </div>
      )}

      {!isInitializing && isRecording && !error && (
        <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-primary text-sm font-medium">Recording... Click again when done</p>
        </div>
      )}

      {!isInitializing && isProcessing && !error && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <p className="text-accent text-sm font-medium">Processing audio...</p>
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
