'use client'

/**
 * Learning Interface Page
 *
 * Main learning interface where students interact with the AI teacher via voice.
 * Features voice interaction, SVG whiteboard, and personalized teaching.
 *
 * Day 14 Enhancement: Added VoiceIndicator and Whiteboard components for better UX.
 *
 * Voice State Flow:
 * 1. idle → listening (when mic button clicked)
 * 2. listening → thinking (when transcript received)
 * 3. thinking → speaking (when AI responds with audio)
 * 4. speaking → idle (when audio finishes)
 *
 * Reference: Implementation_Roadmap.md - Day 14
 */

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { MediaUpload } from '@/components/MediaUpload'
import { Toast, Banner } from '@/components/Toast'
import { TeacherAvatar, getAgentInfo } from '@/components/TeacherAvatar'
import { AssessmentMode } from '@/components/AssessmentMode'
import { ArrowLeft, Loader2, Volume2 } from 'lucide-react'
import { fetchWithRetry, getErrorMessage } from '@/lib/utils/retry'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { useWalkthroughStore } from '@/lib/walkthrough/walkthrough-store'
import { PerformanceLogger } from '@/lib/utils/performance-logger'

// ─── SSE Event Types ──────────────────────────────────────────────────────────

interface SSETextEvent {
  displayText: string
  audioText: string
  svg: string | null
  agentName: string
  handoffMessage?: string
}

interface SSEAudioEvent {
  index: number
  audioBase64: string | null
  sentenceText: string
}

interface SSEDoneEvent {
  lessonComplete: boolean
  routing: { agentName: string; reason: string }
}

interface SSEEvent {
  type: string
  data: any
}

// ─── SSE Parser ───────────────────────────────────────────────────────────────

/**
 * Parse SSE events from a text buffer.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
function parseSSEBuffer(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = []
  const blocks = buffer.split('\n\n')

  // Last block may be incomplete — keep it as remaining
  const remaining = blocks.pop() || ''

  for (const block of blocks) {
    if (!block.trim()) continue

    let type = ''
    let data = ''

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        type = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        data = line.slice(6)
      }
    }

    if (type && data) {
      try {
        events.push({ type, data: JSON.parse(data) })
      } catch {
        // Malformed JSON — skip this event
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SSE Parser] Failed to parse:', data.substring(0, 100))
        }
      }
    }
  }

  return { events, remaining }
}

// ─── Web Audio API Gapless Playback ───────────────────────────────────────────

/**
 * Manages gapless sequential playback of MP3 audio chunks using the Web Audio API.
 * Each chunk is a complete MP3 file (from Google Cloud TTS) decoded into a raw
 * AudioBuffer and scheduled back-to-back with sample-accurate timing.
 *
 * References:
 *   - MDN decodeAudioData: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
 *   - MDN AudioBufferSourceNode: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
 *   - MDN Web Audio API best practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
 */
class AudioChunkPlayer {
  private audioContext: AudioContext | null = null
  private scheduledEndTime = 0
  private activeSources: AudioBufferSourceNode[] = []
  private onAllPlayedCallback: (() => void) | null = null
  private pendingChunks = 0
  private totalScheduled = 0
  // Serialization queue ensures chunks are decoded and scheduled in the order
  // they arrive. Without this, concurrent decodeAudioData() calls can resolve
  // out of order (shorter chunks decode faster), causing sentences to play in
  // the wrong sequence.
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
  private scheduleQueue: Promise<void> = Promise.resolve()

  // Safety timeout to handle unreliable onended events
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event
  private completionTimeoutId: NodeJS.Timeout | null = null
  private callbackFired = false
  private static readonly COMPLETION_BUFFER_MS = 1000

  /**
   * Create or resume the AudioContext. Call once after a user gesture (click/tap)
   * to satisfy browser autoplay policies. Subsequent calls are no-ops if the
   * context is already running.
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
   */
  ensureContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext()
    }
    // Resume if suspended (Safari requires user gesture)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  /**
   * Reset playback state for a new SSE request. Reuses the existing
   * AudioContext created by ensureContext() instead of recreating it.
   * Must be called before scheduling new chunks.
   */
  init() {
    this.ensureContext()
    this.scheduledEndTime = this.audioContext!.currentTime
    this.activeSources = []
    this.pendingChunks = 0
    this.totalScheduled = 0
    this.scheduleQueue = Promise.resolve()
    this.callbackFired = false
    if (this.completionTimeoutId) {
      clearTimeout(this.completionTimeoutId)
      this.completionTimeoutId = null
    }
  }

  /**
   * Schedule a base64-encoded MP3 chunk for gapless playback.
   * Chunks are queued so each one waits for the previous chunk to finish
   * decoding before scheduling — prevents out-of-order playback.
   */
  scheduleChunk(base64Audio: string, perf?: PerformanceLogger): Promise<void> {
    if (!this.audioContext) return Promise.resolve()

    this.pendingChunks++
    const chunkIndex = this.totalScheduled

    // Chain onto the queue: this chunk's decode+schedule waits for all
    // prior chunks to complete, preserving arrival order.
    const chunkPromise = this.scheduleQueue.then(() =>
      this.decodeAndSchedule(base64Audio, chunkIndex, perf)
    )
    this.scheduleQueue = chunkPromise
    return chunkPromise
  }

  /**
   * Decode a single MP3 chunk and schedule it on the Web Audio timeline.
   * Called sequentially from the queue — never runs concurrently with itself.
   * @private
   */
  private async decodeAndSchedule(base64Audio: string, chunkIndex: number, perf?: PerformanceLogger): Promise<void> {
    if (!this.audioContext) return

    try {
      if (perf && chunkIndex === 0) perf.mark('audio_decode_start')

      // Convert base64 → ArrayBuffer
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Decode MP3 → AudioBuffer
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer.slice(0))

      if (perf && chunkIndex === 0) perf.mark('audio_decode_complete')

      // Create source node and schedule for gapless playback
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)

      // Schedule at the end of the previous chunk (gapless)
      const startTime = Math.max(this.scheduledEndTime, this.audioContext.currentTime)
      source.start(startTime)

      if (perf && chunkIndex === 0) {
        perf.mark('first_audio_scheduled', { startTime, duration: audioBuffer.duration })
      }

      // Update end time for next chunk
      this.scheduledEndTime = startTime + audioBuffer.duration

      this.activeSources.push(source)
      this.totalScheduled++

      // Track when this source finishes
      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source)
        this.checkAllPlayed()
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AudioChunkPlayer] Failed to decode/schedule chunk:', err)
      }
      // Skip failed chunk — better than stopping all audio
    } finally {
      this.pendingChunks--
      this.checkAllPlayed()
    }
  }

  /** Register callback for when all scheduled audio finishes playing */
  onAllPlayed(callback: () => void) {
    this.onAllPlayedCallback = callback
  }

  /** Signal that no more chunks will be added */
  finalize() {
    this.checkAllPlayed()

    // Set timeout as safety net in case onended events don't fire reliably
    // This is a standard fallback pattern for Web Audio API timing issues
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event
    if (this.audioContext && this.totalScheduled > 0) {
      const timeUntilDone = (this.scheduledEndTime - this.audioContext.currentTime) +
                           (AudioChunkPlayer.COMPLETION_BUFFER_MS / 1000)

      if (timeUntilDone > 0) {
        this.completionTimeoutId = setTimeout(() => {
          if (!this.callbackFired && this.activeSources.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                `[AudioChunkPlayer] Timeout fired: ${this.activeSources.length} sources never fired onended - forcing completion`
              )
            }
            this.activeSources = []
            this.checkAllPlayed()
          }
        }, timeUntilDone * 1000)
      }
    }
  }

  private checkAllPlayed() {
    if (this.pendingChunks === 0 && this.activeSources.length === 0 && this.totalScheduled > 0) {
      if (!this.callbackFired) {
        this.callbackFired = true
        // Clear timeout since onended events fired successfully
        if (this.completionTimeoutId) {
          clearTimeout(this.completionTimeoutId)
          this.completionTimeoutId = null
        }
        this.onAllPlayedCallback?.()
      }
    }
  }

  /** Stop all playback and release resources */
  stop() {
    for (const source of this.activeSources) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.activeSources = []
    this.pendingChunks = 0
    this.totalScheduled = 0
    this.onAllPlayedCallback = null
    this.callbackFired = false
    if (this.completionTimeoutId) {
      clearTimeout(this.completionTimeoutId)
      this.completionTimeoutId = null
    }
  }

  /** Close the AudioContext (component unmount) */
  close() {
    this.stop()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    this.audioContext = null
  }
}

interface Lesson {
  id: string
  title: string
  subject: string
  grade_level: number
  learning_objective: string
  estimated_duration: number
  difficulty: string
}

interface LearnPageProps {
  params: Promise<{
    lessonId: string
  }>
}

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'

export default function LearnPage({ params }: LearnPageProps) {
  const router = useRouter()

  // Unwrap params using React.use() - the recommended pattern for Next.js 15 client components
  // Reference: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
  const { lessonId } = use(params)

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherResponses, setTeacherResponses] = useState<{
    audioText: string
    displayText: string
    svg: string | null
    audioBase64: string
    agentName: string
    handoffMessage?: string
  }[]>([])

  // Track current agent for voice indicator
  const [currentAgent, setCurrentAgent] = useState<string>('coordinator')

  // Voice state management
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Error handling & network status
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Web Audio API gapless playback
  const audioPlayerRef = useRef<AudioChunkPlayer>(new AudioChunkPlayer())

  // Assessment mode state
  const [showAssessment, setShowAssessment] = useState(false)

  // Walkthrough integration
  const { triggerAction, clearTriggerAction } = useWalkthroughStore()

  // Listen for walkthrough triggers
  useEffect(() => {
    if (!triggerAction) return

    // Handle walkthrough action triggers
    if (triggerAction === 'trigger-assessment') {
      setShowAssessment(true)
      clearTriggerAction()
    }
  }, [triggerAction, clearTriggerAction])

  // Track if session has been started to prevent duplicate calls
  const sessionStartedRef = useRef(false)

  // Load lesson and start session - runs once when lessonId is available
  useEffect(() => {
    if (lessonId && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      loadLessonAndStartSession()
    }
  }, [lessonId])

  async function loadLessonAndStartSession() {
    try {
      setIsLoading(true)

      // Get userId from localStorage
      const userId = localStorage.getItem('userId')
      if (!userId) {
        router.push('/welcome')
        return
      }

      // Fetch lesson details
      const lessonsResponse = await fetch('/api/lessons')
      if (!lessonsResponse.ok) {
        throw new Error('Failed to fetch lessons')
      }

      const { lessons } = await lessonsResponse.json()
      const currentLesson = lessons.find((l: Lesson) => l.id === lessonId)

      if (!currentLesson) {
        throw new Error('Lesson not found')
      }

      setLesson(currentLesson)

      // Start session
      const sessionResponse = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          lessonId
        })
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to start session')
      }

      const { sessionId: newSessionId } = await sessionResponse.json()
      setSessionId(newSessionId)

      // ═══════════════════════════════════════════════════════════════════════════
      // ✨ PREFETCH OPTIMIZATION: Warm server-side caches before initial greeting
      // ═══════════════════════════════════════════════════════════════════════════
      // This populates in-memory caches (profile, lesson, mastery) on the server,
      // eliminating ~100-200ms from the first student interaction.
      //
      // Cache invalidation happens automatically:
      // - Mastery: refreshMasteryCache() after recordMasteryEvidence()
      // - Profile: invalidateCache() after enrichProfileIfNeeded()
      // - Lesson: Static curriculum, 30-min TTL (no invalidation needed)
      //
      // Reference: app/api/teach/prefetch/route.ts
      // Reference: MEMORY.md - Caching (context loading optimization)
      await prefetchTeachingContext(userId, newSessionId, lessonId).catch((err) => {
        // Prefetch failure is non-critical — caches will populate on first message
        console.warn('[Prefetch] Failed to warm context (will populate on first message):', err)
      })

      // ✅ AUTO-START LESSON: Trigger coordinator to greet student and introduce lesson
      // Initial greeting now uses warm cache → faster response
      await sendInitialGreeting(userId, newSessionId, lessonId, currentLesson)
    } catch (err) {
      console.error('Error loading lesson:', err)
      setError('Failed to load lesson. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Core SSE Teaching Request ─────────────────────────────────────────────
  //
  // Shared function used by greeting, audio recording, and media upload.
  // Streams events from /api/teach/stream:
  //   text  → show displayText/SVG immediately
  //   audio → schedule each chunk via Web Audio API (gapless)
  //   done  → handle lesson completion
  //   error → show toast
  //
  // Fallback: if stream drops after text but before audio, fetches /api/tts.

  async function sendTeachingRequestSSE(
    requestBody: Record<string, any>,
    options?: { isGreeting?: boolean }
  ): Promise<void> {
    // Performance tracking - create logger for this request
    const perf = new PerformanceLogger(requestBody.sessionId || 'unknown')
    perf.mark('frontend_request_start', { hasAudio: !!requestBody.audioBase64, hasMedia: !!requestBody.mediaBase64 })

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Stop any currently playing audio
    audioPlayerRef.current.stop()

    setVoiceState('thinking')
    setError(null)
    setToastMessage(null)

    let gotTextEvent = false
    let gotAnyAudio = false
    let audioText = '' // Saved for TTS fallback
    let agentName = 'coordinator'

    try {
      perf.mark('fetch_start')
      const response = await fetch('/api/teach/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      })
      perf.mark('fetch_response_received')

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.status}`)
      }

      // Initialize Web Audio API (safe — user already tapped mic/start)
      audioPlayerRef.current.init()

      // Track when all audio finishes playing
      let lessonCompleteFlagSet = false
      audioPlayerRef.current.onAllPlayed(() => {
        setVoiceState('idle')
        audioRef.current = null

        if (lessonCompleteFlagSet) {
          setShowAssessment(true)
        }
      })

      // Read SSE stream via fetch + ReadableStream
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })

        const { events, remaining } = parseSSEBuffer(sseBuffer)
        sseBuffer = remaining

        for (const event of events) {
          switch (event.type) {
            case 'text': {
              const textData = event.data as SSETextEvent
              gotTextEvent = true
              audioText = textData.audioText
              agentName = textData.agentName

              perf.mark('text_event_received', { agentName: textData.agentName, textLength: textData.displayText.length })

              // Show text/SVG immediately — student sees response ~1-1.5s in
              const teacherResponse = {
                audioText: textData.audioText,
                displayText: textData.displayText,
                svg: textData.svg,
                audioBase64: '', // Audio streams separately
                agentName: textData.agentName,
                handoffMessage: textData.handoffMessage
              }

              if (options?.isGreeting) {
                setTeacherResponses([teacherResponse])
              } else {
                setTeacherResponses(prev => [...prev, teacherResponse])
              }

              setCurrentAgent(textData.agentName)
              setVoiceState('speaking')
              perf.mark('text_displayed')
              break
            }

            case 'audio': {
              const audioData = event.data as SSEAudioEvent
              if (audioData.audioBase64) {
                if (!gotAnyAudio) {
                  perf.mark('first_audio_chunk_received', { index: audioData.index })
                }
                gotAnyAudio = true
                // Schedule for gapless playback via Web Audio API
                audioPlayerRef.current.scheduleChunk(audioData.audioBase64, perf)
              }
              // If audioBase64 is null, this chunk failed on backend — skip it
              break
            }

            case 'done': {
              const doneData = event.data as SSEDoneEvent
              if (doneData.lessonComplete) {
                lessonCompleteFlagSet = true
              }
              perf.mark('sse_done_event_received')
              // Signal no more chunks coming
              audioPlayerRef.current.finalize()
              perf.mark('audio_finalized')
              perf.summary()
              break
            }

            case 'error': {
              console.error('[SSE] Server error event:', event.data.message)
              setToastMessage(event.data.message || 'Something went wrong')
              setVoiceState('idle')
              break
            }
          }
        }
      }

      // Stream finished — if we got text but zero audio, fallback to /api/tts
      if (gotTextEvent && !gotAnyAudio && audioText) {
        console.warn('[SSE] No audio received — falling back to /api/tts')
        try {
          const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: audioText, agentName })
          })
          const ttsData = await ttsResponse.json()
          if (ttsData.audioBase64) {
            audioPlayerRef.current.init()
            audioPlayerRef.current.onAllPlayed(() => {
              setVoiceState('idle')
              if (lessonCompleteFlagSet) setShowAssessment(true)
            })
            await audioPlayerRef.current.scheduleChunk(ttsData.audioBase64)
            audioPlayerRef.current.finalize()
          } else {
            setVoiceState('idle')
            setToastMessage('Audio unavailable, but you can read the response above.')
          }
        } catch {
          setVoiceState('idle')
          setToastMessage('Audio unavailable, but you can read the response above.')
        }
      }

      // If we never got text or audio, something went wrong
      if (!gotTextEvent) {
        setVoiceState('idle')
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SSE] Request aborted')
        }
        return
      }

      console.error('[SSE] Error:', err)
      setToastMessage(getErrorMessage(err))
      setVoiceState('idle')
    }
  }

  // ─── Prefetch Teaching Context ────────────────────────────────────────────────
  //
  // Warms server-side in-memory caches (profile, lesson, mastery) before the
  // initial greeting. This eliminates ~100-200ms from the first student interaction.
  //
  // Cache invalidation happens automatically on the server:
  // - Mastery: refreshMasteryCache() after recordMasteryEvidence()
  // - Profile: invalidateCache() after enrichProfileIfNeeded()
  // - Lesson: Static curriculum, 30-min TTL (no invalidation needed)
  //
  // Reference: /api/teach/prefetch endpoint
  async function prefetchTeachingContext(
    userId: string,
    sessionId: string,
    lessonId: string
  ): Promise<void> {
    const startTime = Date.now()
    console.log('[Prefetch] Warming teaching context caches...')

    try {
      const response = await fetch('/api/teach/prefetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId, lessonId })
      })

      const result = await response.json()
      const duration = Date.now() - startTime

      if (result.ok) {
        console.log(`[Prefetch] ✅ Context warmed in ${duration}ms:`, result.cacheStatus)
      } else {
        console.warn(`[Prefetch] ⚠️ Failed (${duration}ms):`, result.error)
      }
    } catch (err) {
      const duration = Date.now() - startTime
      console.warn(`[Prefetch] ❌ Error (${duration}ms):`, err)
      throw err // Re-throw so caller can handle
    }
  }

  // Auto-start lesson with Coordinator greeting
  async function sendInitialGreeting(userId: string, sessionId: string, lessonId: string, lesson: Lesson) {
    const greetingMessage = `[AUTO_START] Begin the lesson by greeting the student warmly and introducing today's lesson: "${lesson.title}". Mention the learning objective briefly: "${lesson.learning_objective}". Keep it brief (2-3 sentences) and engaging, end by asking if ready to proceed.`

    await sendTeachingRequestSSE(
      { userId, sessionId, lessonId, userMessage: greetingMessage },
      { isGreeting: true }
    )
  }

  async function handleAudioRecording(audioBase64: string, mimeType: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Learn] Received audio recording:', { size: audioBase64.length, mimeType })
    }

    const userId = localStorage.getItem('userId')
    if (!userId || !sessionId || !lessonId) {
      setToastMessage('Missing required information. Please refresh the page.')
      setVoiceState('idle')
      return
    }

    if (!isOnline) {
      setToastMessage('You are offline. Please check your internet connection.')
      setVoiceState('idle')
      return
    }

    await sendTeachingRequestSSE({
      userId, sessionId, lessonId,
      audioBase64,
      audioMimeType: mimeType
    })
  }

  /**
   * Handle media (image/video) upload from MediaUpload component
   * Sends media to the SSE teaching endpoint with vision analysis support
   *
   * Note: No userMessage is sent (like audio). This ensures media uploads route
   * directly to the lesson's specialist (e.g., math_specialist for math lessons)
   * instead of going through coordinator routing, preserving the specialist's voice.
   */
  async function handleMediaUpload(mediaBase64: string, mimeType: string, mediaType: 'image' | 'video') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Learn] Received media upload:', { size: mediaBase64.length, mimeType, mediaType })
    }

    const userId = localStorage.getItem('userId')
    if (!userId || !sessionId || !lessonId) {
      setToastMessage('Missing required information. Please refresh the page.')
      setVoiceState('idle')
      return
    }

    if (!isOnline) {
      setToastMessage('You are offline. Please check your internet connection.')
      setVoiceState('idle')
      return
    }

    await sendTeachingRequestSSE({
      userId, sessionId, lessonId,
      // No userMessage — routes directly to specialist based on lesson subject
      mediaBase64,
      mediaMimeType: mimeType,
      mediaType
    })
  }

  // Handle voice recorder state changes from VoiceRecorder component
  function handleVoiceStateChange(state: 'idle' | 'recording' | 'processing') {
    console.log('[Learn] handleVoiceStateChange called with:', state, 'current voiceState:', voiceState)

    // Pre-init AudioContext on first user gesture (recording start) so it's
    // ready when audio chunks arrive — saves ~5-20ms per SSE request.
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
    if (state === 'recording') {
      audioPlayerRef.current.ensureContext()
    }

    // Map recorder states to voice states
    const mappedState: VoiceState = state === 'recording' ? 'listening' :
                                     state === 'processing' ? 'thinking' :
                                     'idle'

    // Only update if we're in idle, listening states
    // Don't interrupt thinking or speaking states
    if (voiceState === 'idle' || voiceState === 'listening') {
      console.log('[Learn] Updating voiceState to:', mappedState)
      setVoiceState(mappedState)
    } else {
      console.log('[Learn] Ignoring state change because current state is:', voiceState)
    }
  }

  // Resume audio playback when tab becomes visible again
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // AudioContext may have been suspended by the browser in background
        audioPlayerRef.current?.init()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Cleanup: Cancel pending requests and release audio resources on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      audioPlayerRef.current.close()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-48 bg-gray-200 rounded mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error && !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="bg-error/10 border border-error text-error rounded-lg p-6 mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Show assessment mode if triggered
  if (showAssessment && lessonId && sessionId) {
    const userId = localStorage.getItem('userId')
    if (userId) {
      return (
        <AssessmentMode
          lessonId={lessonId}
          userId={userId}
          sessionId={sessionId}
          onComplete={() => router.push(`/lessons/${lessonId}/complete`)}
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Offline Banner */}
      {!isOnline && (
        <Banner
          message="You're offline. Please check your internet connection."
          type="warning"
          icon="offline"
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="error"
          onClose={() => setToastMessage(null)}
          icon="error"
        />
      )}

      {/* Top Navigation & Metadata - Fixed positioning */}
      <div className="fixed top-0 left-0 right-0 z-10 p-4 bg-white/95 backdrop-blur-sm shadow-sm flex justify-between items-start">
        {/* Left: Back button and lesson info */}
        <div>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>

          {lesson && (
            <div className="text-xs">
              <div className="font-semibold text-primary mb-1">
                {lesson.subject.toUpperCase()}: {lesson.title}
              </div>
              <div className="text-gray-500">
                Grade {lesson.grade_level} | {lesson.estimated_duration} min | <span className="capitalize">{lesson.difficulty}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: End Class button */}
        <button
          onClick={() => setShowAssessment(true)}
          className="px-4 py-2 bg-success hover:bg-success/90 text-white font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
        >
          End Class
        </button>
      </div>

      {/* Scrollable Whiteboard Area - Full screen canvas */}
      <div className="min-h-screen pt-24 pb-32 px-8 overflow-y-auto">
        {/* Conversation History - Text then SVG pattern */}
        <div className="w-full space-y-8">
          {teacherResponses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                Your teacher is preparing the lesson...
              </p>
            </div>
          ) : (
            teacherResponses.map((response, index) => (
              <div key={index} className="space-y-6">
                {/* Handoff Message (if agent switched) */}
                {response.handoffMessage && (
                  <div className="text-center text-sm text-gray-500 italic">
                    {response.handoffMessage}
                  </div>
                )}

                {/* Teacher Text Response with Agent Avatar */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <TeacherAvatar
                      agentName={response.agentName || 'coordinator'}
                      size="sm"
                    />
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {response.displayText}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* SVG Diagram (if exists) */}
                {response.svg && (
                  <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                    <div
                      className="w-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: response.svg }}
                    />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Error Display */}
          {error && lesson && (
            <div className="p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mid-Right Controls - Fixed positioning */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
        {/* Voice Indicator - Shows agent name when thinking/speaking */}
        {voiceState !== 'idle' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-lg border border-gray-200">
            {voiceState === 'connecting' && (
              <>
                <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />
                <span className="text-xs font-medium text-gray-600">Please wait...</span>
              </>
            )}
            {voiceState === 'listening' && (
              <>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-medium text-primary">Listening...</span>
              </>
            )}
            {voiceState === 'thinking' && (
              <>
                <Loader2 className="w-3 h-3 text-accent animate-spin" />
                <span className="text-xs font-medium text-accent">
                  {getAgentInfo(currentAgent).name} is thinking...
                </span>
              </>
            )}
            {voiceState === 'speaking' && (
              <>
                <span className="text-base" role="img" aria-label="Speaking">
                  {getAgentInfo(currentAgent).emoji}
                </span>
                <Volume2 className="w-3 h-3 text-success animate-pulse" />
                <span className="text-xs font-medium text-success">
                  {getAgentInfo(currentAgent).name} is speaking...
                </span>
              </>
            )}
          </div>
        )}

        {/* Microphone Button */}
        <VoiceRecorder
          onRecordingComplete={handleAudioRecording}
          onStateChange={handleVoiceStateChange}
          disabled={!sessionId || voiceState === 'thinking' || voiceState === 'speaking'}
        />

        {/* Media Upload Button */}
        <MediaUpload
          onMediaUpload={handleMediaUpload}
          disabled={!sessionId || voiceState === 'thinking' || voiceState === 'speaking'}
        />
      </div>

      {/* Session Info (for debugging) */}
      {sessionId && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded shadow">
          Session: {sessionId.slice(0, 8)}
        </div>
      )}
    </div>
  )
}
