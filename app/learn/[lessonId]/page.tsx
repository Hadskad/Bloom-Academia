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

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VoiceInput } from '@/components/VoiceInput'
import { Toast, Banner } from '@/components/Toast'
import { ArrowLeft, Loader2, Volume2 } from 'lucide-react'
import { fetchWithRetry, getErrorMessage } from '@/lib/utils/retry'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

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

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

export default function LearnPage({ params }: LearnPageProps) {
  const router = useRouter()
  const [lessonId, setLessonId] = useState<string>('')

  // Unwrap params in Next.js 15
  useEffect(() => {
    params.then((resolvedParams) => {
      setLessonId(resolvedParams.lessonId)
    })
  }, [params])

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherResponses, setTeacherResponses] = useState<{
    audioText: string
    displayText: string
    svg: string | null
    audioBase64: string
  }[]>([])

  // Voice state management
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Error handling & network status
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load lesson and start session
  useEffect(() => {
    if (lessonId) {
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
    } catch (err) {
      console.error('Error loading lesson:', err)
      setError('Failed to load lesson. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTranscript(text: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Learn] Received transcript:', text)
    }

    // Get userId from localStorage
    const userId = localStorage.getItem('userId')
    if (!userId || !sessionId || !lessonId) {
      setToastMessage('Missing required information. Please refresh the page.')
      setVoiceState('idle')
      return
    }

    // Check if online before making request
    if (!isOnline) {
      setToastMessage('You are offline. Please check your internet connection.')
      setVoiceState('idle')
      return
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Set state to thinking (AI processing)
      setVoiceState('thinking')
      setError(null)
      setToastMessage(null)

      // Send to AI teacher endpoint with retry logic
      const response = await fetchWithRetry(
        '/api/teach',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            sessionId,
            lessonId,
            userMessage: text
          }),
          signal: abortControllerRef.current.signal
        },
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Learn] Retry attempt ${attempt}/3`, error)
            }
          }
        }
      )

      const data = await response.json()

      // Add new response to history
      setTeacherResponses(prev => [...prev, data.teacherResponse])

      // Set state to speaking and play audio
      setVoiceState('speaking')

      // Try to play audio, fallback to text-only if fails
      try {
        const audio = new Audio(`data:audio/mp3;base64,${data.teacherResponse.audioBase64}`)
        audioRef.current = audio

        // Return to idle when audio finishes
        audio.addEventListener('ended', () => {
          setVoiceState('idle')
          audioRef.current = null
        })

        // Handle audio errors gracefully
        audio.addEventListener('error', (e) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Learn] Audio playback error:', e)
          }
          setVoiceState('idle')
          setToastMessage('Audio playback failed, but you can read the response above.')
          audioRef.current = null
        })

        await audio.play()
      } catch (audioError) {
        // Audio failed, but we still have the text response
        if (process.env.NODE_ENV === 'development') {
          console.error('[Learn] Audio play failed:', audioError)
        }
        setVoiceState('idle')
        setToastMessage('Audio unavailable, but you can read the response above.')
      }
    } catch (err: any) {
      // Don't show error if request was aborted (user started new request)
      if (err.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Learn] Request aborted')
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('[Learn] Error getting teacher response:', err)
      }

      // Parse error and show user-friendly message
      const errorMessage = getErrorMessage(err)
      setToastMessage(errorMessage)
      setVoiceState('idle')
    }
  }

  // Handle voice input state changes from VoiceInput component
  function handleVoiceStateChange(state: 'idle' | 'listening') {
    // Only update if we're in idle or listening states
    // Don't interrupt thinking or speaking states
    if (voiceState === 'idle' || voiceState === 'listening') {
      setVoiceState(state)
    }
  }

  // Cleanup: Cancel pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
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
            onClick={() => router.push('/lessons')}
            className="text-primary hover:underline"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    )
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

      {/* Top-Left Navigation & Metadata - Fixed positioning */}
      <div className="fixed top-0 left-0 z-10 p-4 bg-white/95 backdrop-blur-sm shadow-sm">
        <button
          onClick={() => router.push('/lessons')}
          className="flex items-center gap-2 text-gray-600 hover:text-primary mb-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Lessons</span>
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

      {/* Scrollable Whiteboard Area - Full screen canvas */}
      <div className="min-h-screen pt-24 pb-32 px-8 overflow-y-auto">
        {/* Conversation History - Text then SVG pattern */}
        <div className="w-full space-y-8">
          {teacherResponses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">
                Click the microphone below to start your lesson
              </p>
            </div>
          ) : (
            teacherResponses.map((response, index) => (
              <div key={index} className="space-y-6">
                {/* Teacher Text Response */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <h3 className="font-semibold text-primary text-sm mb-2">Teacher:</h3>
                  <p className="text-gray-800 leading-relaxed">{response.displayText}</p>
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

      {/* Bottom-Center Controls - Fixed positioning */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white via-white to-transparent py-6">
        <div className="flex flex-col items-center gap-3">
          {/* Voice Indicator - Small, near mic */}
          {voiceState !== 'idle' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border border-gray-200">
              {voiceState === 'listening' && (
                <>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-primary">Listening...</span>
                </>
              )}
              {voiceState === 'thinking' && (
                <>
                  <Loader2 className="w-3 h-3 text-accent animate-spin" />
                  <span className="text-xs font-medium text-accent">Thinking...</span>
                </>
              )}
              {voiceState === 'speaking' && (
                <>
                  <Volume2 className="w-3 h-3 text-success animate-pulse" />
                  <span className="text-xs font-medium text-success">Speaking...</span>
                </>
              )}
            </div>
          )}

          {/* Microphone Button */}
          <VoiceInput
            onTranscript={handleTranscript}
            onStateChange={handleVoiceStateChange}
            disabled={!sessionId || voiceState === 'thinking' || voiceState === 'speaking'}
          />
        </div>
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
