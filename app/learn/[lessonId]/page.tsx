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
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { VoiceInput } from '@/components/VoiceInput'
import { Toast, Banner } from '@/components/Toast'
import { TeacherAvatar, getAgentInfo } from '@/components/TeacherAvatar'
import { AssessmentMode } from '@/components/AssessmentMode'
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

  // Assessment mode state
  const [showAssessment, setShowAssessment] = useState(false)

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

      // ✅ AUTO-START LESSON: Trigger coordinator to greet student and introduce lesson
      await sendInitialGreeting(userId, newSessionId, lessonId, currentLesson)
    } catch (err) {
      console.error('Error loading lesson:', err)
      setError('Failed to load lesson. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-start lesson with Coordinator greeting
  async function sendInitialGreeting(userId: string, sessionId: string, lessonId: string, lesson: Lesson) {
    try {
      setVoiceState('thinking')

      // Send greeting prompt to coordinator
      const greetingMessage = `[AUTO_START] Begin the lesson by greeting the student warmly and introducing today's lesson: "${lesson.title}". Mention the learning objective briefly: "${lesson.learning_objective}". Keep it brief (2-3 sentences) and engaging, end by asking if ready to proceed.`

      const response = await fetchWithRetry(
        '/api/teach/multi-ai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            sessionId,
            lessonId,
            userMessage: greetingMessage
          })
        },
        {
          maxRetries: 2,
          onRetry: (attempt, error) => {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Learn] Retry greeting attempt ${attempt}/2`, error)
            }
          }
        }
      )

      const data = await response.json()

      // Add greeting response to history
      setTeacherResponses([data.teacherResponse])

      // Track agent
      if (data.teacherResponse.agentName) {
        setCurrentAgent(data.teacherResponse.agentName)
      }

      // Play greeting audio
      setVoiceState('speaking')

      try {
        const audio = new Audio(`data:audio/mp3;base64,${data.teacherResponse.audioBase64}`)
        audioRef.current = audio

        audio.addEventListener('ended', () => {
          setVoiceState('idle')
          audioRef.current = null
        })

        audio.addEventListener('error', (e) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Learn] Greeting audio error:', e)
          }
          setVoiceState('idle')
          audioRef.current = null
        })

        await audio.play()
      } catch (audioError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Learn] Greeting audio play failed:', audioError)
        }
        setVoiceState('idle')
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Learn] Failed to send initial greeting:', err)
      }
      // Don't show error to user, they can still start manually
      setVoiceState('idle')
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

      // Send to Multi-AI teacher endpoint with retry logic
      // Day 16: Updated from /api/teach to /api/teach/multi-ai for specialist routing
      const response = await fetchWithRetry(
        '/api/teach/multi-ai',
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

      // Add new response to history (includes agentName from multi-ai endpoint)
      setTeacherResponses(prev => [...prev, data.teacherResponse])

      // Track which agent responded for voice indicator
      if (data.teacherResponse.agentName) {
        setCurrentAgent(data.teacherResponse.agentName)
      }

      // Check if AI determined lesson is complete
      if (data.lessonComplete === true) {
        // Trigger assessment after audio finishes
        // Store completion flag to trigger assessment after audio
        localStorage.setItem('aiTriggeredCompletion', 'true')
      }

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

          // Check if AI triggered completion - start assessment after audio finishes
          const aiCompleted = localStorage.getItem('aiTriggeredCompletion')
          if (aiCompleted === 'true') {
            localStorage.removeItem('aiTriggeredCompletion')
            setShowAssessment(true)
          }
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

      {/* Bottom-Center Controls - Fixed positioning */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white via-white to-transparent py-6">
        <div className="flex flex-col items-center gap-3">
          {/* Voice Indicator - Shows agent name when thinking/speaking */}
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
