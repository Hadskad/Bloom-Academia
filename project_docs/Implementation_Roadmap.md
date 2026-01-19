# Bloom Academia - Implementation Roadmap
## 30-Day MVP: Vertical Slice Approach

**Philosophy:** Build thin vertical slices (Frontend → Backend → API → Database) that work end-to-end. Every slice is testable, demoable, and production-ready.

---

## Week 1: Foundation + First Complete Flow (Days 1-7)
**Goal:** Get ONE complete interaction working end-to-end + Landing page

---
                  Done
//### **Day 1-2: Foundation Setup + Landing Page**

//#### ✅ VERTICAL SLICE 1: Landing Page → Environment
//```typescript
//Frontend:
//✅ Create app/page.tsx (landing page)
//✅ Hero section with tagline: "Every Child Deserves a World-Class Teacher"
//✅ Problem section (244M out-of-school children)
//✅ Solution section (AI + voice + whiteboard)
//✅ CTA button: "Try Free Lesson" → routes to /welcome

//Design:
//✅ Apply design system colors (Primary Blue #4A90E2)
//✅ Use Inter font for headings
//✅ Responsive layout (mobile-first)

//Backend:
//✅ Environment variables configured (.env.local)
//✅ Supabase connection test
//✅ All API credentials verified

//Deliverable: Landing page loads, CTA button exists, npm run dev works
//```

//---

          //Done

### **Day 3: Simplest Backend Route**

#### ✅ VERTICAL SLICE 2: Test API → Hardcoded Response
```typescript
Backend:
// app/api/teach/route.ts
export async function POST(request: NextRequest) {
  const { userMessage } = await request.json()

  return NextResponse.json({
    success: true,
    teacherResponse: {
      text: `You said: ${userMessage}. Great question!`,
      svg: null,
      audioBase64: null
    }
  })
}

Test:
✅ Test with Postman/curl
✅ Verify JSON response structure

Deliverable: /api/teach returns mock data
```

---

### **Day 4: Add Gemini 3 Flash**

#### ✅ VERTICAL SLICE 3: Real AI Response
```typescript
Backend:
// lib/ai/gemini-client.ts
import { GoogleGenAI } from '@google/genai'

export class GeminiClient {
  private ai: GoogleGenAI

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  }

  async teach(userMessage: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a friendly teacher for a 10-year-old. Answer: ${userMessage}`
    })

    return { text: response.text, svg: null }
  }
}

// Update /api/teach to use GeminiClient

Deliverable: /api/teach returns real AI text responses
```

---      Done

### **Day 5: Add Google TTS**

#### ✅ VERTICAL SLICE 4: Audio Generation
```typescript
Backend:
// lib/tts/google-tts.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

const client = new TextToSpeechClient()

export async function generateSpeech(text: string): Promise<Buffer> {
  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
    audioConfig: { audioEncoding: 'MP3' }
  })

  return Buffer.from(response.audioContent as Uint8Array)
}

// Update /api/teach to generate audio and return as base64

Deliverable: /api/teach returns text + audio
```

---             Done! Alhamdulillah

### **Day 6-7: Basic Learning Interface**

#### ✅ VERTICAL SLICE 5: Frontend → Backend → Audio Playback
```typescript
Frontend:
// app/learn/page.tsx
export default function LearnPage() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    setIsLoading(true)
    const res = await fetch('/api/teach', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        lessonId: 'test-lesson',
        sessionId: 'test-session',
        userMessage: message
      })
    })

    const data = await res.json()
    setResponse(data.teacherResponse)

    // Play audio
    if (data.teacherResponse.audioBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${data.teacherResponse.audioBase64}`)
      audio.play()
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-8">Learning Interface</h1>

        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask a question..."
          className="w-full p-4 border rounded-lg mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-primary text-white px-6 py-3 rounded-lg"
        >
          {isLoading ? 'Thinking...' : 'Ask Teacher'}
        </button>

        {response && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <p className="text-lg">{response.text}</p>
          </div>
        )}
      </div>
    </div>
  )
}

Navigation:
✅ Update landing page CTA to route to /learn

Deliverable: Type question → AI speaks answer (text-to-speech pipeline working!)
```

**🎉 WEEK 1 MILESTONE:** Working text-to-AI-to-speech pipeline + Landing page

---               
                    Done! Alhamdulillah
## Week 2: Voice + User Onboarding + Database (Days 8-14)
**Goal:** Add voice input, welcome flow, and persistent storage

---
             Done! Alhamdulillah
### **Day 8: Welcome Screen (User Onboarding)**

#### ✅ VERTICAL SLICE 6: Welcome → Database → Profile Creation
```typescript
Frontend:
// app/welcome/page.tsx
export default function WelcomePage() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    grade: ''
  })
  const router = useRouter()

  async function handleSubmit() {
    // Create user profile
    const res = await fetch('/api/users/create', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

    const { userId } = await res.json()
    // Store userId in localStorage for now (auth comes later)
    localStorage.setItem('userId', userId)

    router.push('/lessons')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2">Welcome to Bloom Academia!</h1>
        <p className="text-gray-600 mb-8">Tell us a bit about yourself</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="Your name"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full p-4 border rounded-lg"
            required
          />

          <input
            type="number"
            placeholder="Your age"
            value={formData.age}
            onChange={e => setFormData({...formData, age: e.target.value})}
            className="w-full p-4 border rounded-lg"
            required
          />

          <select
            value={formData.grade}
            onChange={e => setFormData({...formData, grade: e.target.value})}
            className="w-full p-4 border rounded-lg"
            required
          >
            <option value="">Select your grade</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>

          <button type="submit" className="w-full bg-primary text-white py-4 rounded-lg">
            Start Learning!
          </button>
        </form>
      </div>
    </div>
  )
}

Backend:
// app/api/users/create/route.ts
import { supabase } from '@/lib/db/supabase'

export async function POST(request: NextRequest) {
  const { name, age, grade } = await request.json()

  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      age: parseInt(age),
      grade_level: parseInt(grade)
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ userId: data.id })
}

Database:
// lib/db/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

Deliverable: Welcome screen → creates user in DB → redirects to lessons
```

---            Done! Alhamdulillah

### **Day 9: Lesson Selection Screen**

#### ✅ VERTICAL SLICE 7: Lessons List → Database Query
```typescript
Frontend:
// app/lessons/page.tsx
export default function LessonsPage() {
  const [lessons, setLessons] = useState([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/lessons')
      .then(res => res.json())
      .then(data => setLessons(data.lessons))
  }, [])

  function startLesson(lessonId: string) {
    router.push(`/learn/${lessonId}`)
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Choose Your Lesson</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map(lesson => (
          <div key={lesson.id} className="border rounded-lg p-6 hover:shadow-lg transition">
            <div className="text-sm text-primary mb-2">{lesson.subject.toUpperCase()}</div>
            <h3 className="text-xl font-semibold mb-2">{lesson.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{lesson.learning_objective}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>{lesson.estimated_duration} min</span>
              <span className={`px-2 py-1 rounded ${
                lesson.difficulty === 'easy' ? 'bg-success/20 text-success' :
                lesson.difficulty === 'medium' ? 'bg-accent/20 text-accent' :
                'bg-error/20 text-error'
              }`}>
                {lesson.difficulty}
              </span>
            </div>

            <button
              onClick={() => startLesson(lesson.id)}
              className="w-full bg-primary text-white py-3 rounded-lg"
            >
              Start Lesson
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

Backend:
// app/api/lessons/route.ts
import { supabase } from '@/lib/db/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('grade_level', { ascending: true })

  if (error) throw error

  return NextResponse.json({ lessons: data })
}

Deliverable: Lesson cards display from DB, click starts lesson
```

---

                   Done! Alhamdulillah
### **Day 10-11: Voice Input (Soniox) + Session Management**

#### ✅ VERTICAL SLICE 8: Voice → Transcription → Backend
```typescript
Frontend:
// components/VoiceInput.tsx
import { SonioxClient } from '@soniox/speech-to-text-web'

export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const sonioxClient = useRef<SonioxClient | null>(null)

  async function startListening() {
    sonioxClient.current = new SonioxClient({
      apiKey: async () => {
        const res = await fetch('/api/stt/temp-key')
        const { temporary_api_key } = await res.json()
        return temporary_api_key
      },
      onStarted: () => setIsListening(true),
      onFinished: () => {
        setIsListening(false)
        if (transcript) onTranscript(transcript)
      },
      onPartialResult: (result) => {
        const text = result.tokens.map(t => t.text).join('')
        setTranscript(text)
      },
      onError: (status, message) => {
        console.error('Soniox error:', status, message)
        setIsListening(false)
      }
    })

    sonioxClient.current.start({
      model: 'stt-rt-preview',
      languageHints: ['en'],
      enableEndpointDetection: true
    })
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={isListening ? () => sonioxClient.current?.stop() : startListening}
        className={`w-20 h-20 rounded-full flex items-center justify-center ${
          isListening ? 'bg-error animate-pulse' : 'bg-primary'
        }`}
      >
        <Mic className="text-white" size={32} />
      </button>

      {transcript && (
        <p className="mt-4 text-gray-600">{transcript}</p>
      )}
    </div>
  )
}

// Update app/learn/[lessonId]/page.tsx to use VoiceInput
// Replace text input with voice button

Backend:
// app/api/stt/temp-key/route.ts
export async function GET() {
  const response = await fetch(
    'https://api.soniox.com/v1/auth/temporary-api-key',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SONIOX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 60
      })
    }
  )

  const data = await response.json()
  return NextResponse.json(data)
}

// app/api/sessions/start/route.ts
export async function POST(request: NextRequest) {
  const { userId, lessonId } = await request.json()

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, lesson_id: lessonId })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ sessionId: data.id })
}

Deliverable: Click mic → speak → transcription appears → sends to AI
```

---

### **Day 12-13: Database Memory + Context Building**

#### ✅ VERTICAL SLICE 9: Profile → Context → Personalized AI
```typescript
Backend:
// lib/memory/profile-manager.ts
import { supabase } from '@/lib/db/supabase'

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// lib/ai/context-builder.ts
export async function buildAIContext(userId: string, lessonId: string) {
  const profile = await getUserProfile(userId)

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()

  return `You are an expert teacher for ${profile.name}, age ${profile.age}, grade ${profile.grade_level}.

LESSON: ${lesson.title}
OBJECTIVE: ${lesson.learning_objective}

TEACHING STYLE:
- Use simple language appropriate for a ${profile.age}-year-old
- Be encouraging and patient
- Break down concepts into small steps
- Ask questions to check understanding

Generate simple SVG diagrams to backup your explanations.`
}

// Update /api/teach to use context
export async function POST(request: NextRequest) {
  const { userId, lessonId, sessionId, userMessage } = await request.json()

  // Build context
  const context = await buildAIContext(userId, lessonId)

  // Get AI response
  const gemini = new GeminiClient()
  const aiResponse = await gemini.teach(context, userMessage)

  // Generate audio
  const audioBuffer = await generateSpeech(aiResponse.text)

  // Save interaction
  await supabase.from('interactions').insert({
    session_id: sessionId,
    user_message: userMessage,
    ai_response: aiResponse.text
  })

  return NextResponse.json({
    success: true,
    teacherResponse: {
      text: aiResponse.text,
      svg: aiResponse.svg,
      audioBase64: audioBuffer.toString('base64')
    }
  })
}

Deliverable: AI responses are personalized based on student profile
```

---
                 Done! Alhamdulillah

### **Day 14: SVG Whiteboard + Voice Indicator**

#### ✅ VERTICAL SLICE 10: Whiteboard → SVG Rendering → Visual Feedback
```typescript
Frontend:
// components/Whiteboard.tsx
export function Whiteboard({ svgCode }: { svgCode: string | null }) {
  if (!svgCode) {
    return (
      <div className="w-full h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">Visual aids will appear here</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-96 bg-white rounded-lg p-8 flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: svgCode }}
    />
  )
}

// components/VoiceIndicator.tsx
export function VoiceIndicator({ state }: { state: 'idle' | 'listening' | 'thinking' | 'speaking' }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
        state === 'listening' ? 'bg-primary animate-pulse' :
        state === 'thinking' ? 'bg-accent' :
        state === 'speaking' ? 'bg-success animate-pulse' :
        'bg-gray-300'
      }`}>
        {state === 'listening' && <Mic className="text-white" size={40} />}
        {state === 'thinking' && <Loader2 className="text-white animate-spin" size={40} />}
        {state === 'speaking' && <Volume2 className="text-white" size={40} />}
        {state === 'idle' && <Mic className="text-gray-500" size={40} />}
      </div>

      <p className="mt-4 text-lg font-medium">
        {state === 'listening' && "I'm listening..."}
        {state === 'thinking' && "Let me think..."}
        {state === 'speaking' && "Here's what I think..."}
        {state === 'idle' && "Click to speak"}
      </p>
    </div>
  )
}

// Update learn page to use both components
// Update Gemini prompt to generate SVGs

Backend:
// Update lib/ai/gemini-client.ts
async teach(systemContext: string, userMessage: string) {
  const response = await this.ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${systemContext}

IMPORTANT: Anytime When visual diagrams help understanding, generate simple SVG code inline.

Student: ${userMessage}`
  })

  const fullText = response.text
  const svgMatch = fullText.match(/<svg[\s\S]*?<\/svg>/i)

  return {
    text: fullText,
    svg: svgMatch ? svgMatch[0] : null
  }
}

Deliverable: Voice states visible, SVGs render on whiteboard
```

**🎉 WEEK 2 MILESTONE:** Full voice pipeline + personalization + visual whiteboard!

---

## Week 3: Multi-turn Conversations + Lesson Flow (Days 15-21)
**Goal:** Session memory, lesson structure, and completion flow

---
                    Done, Alhamdulillah!
### **Day 15-16: Session Memory + Multi-turn Conversations**

#### ✅ VERTICAL SLICE 11: Conversation History → Context
```typescript
Backend:
// lib/memory/session-manager.ts
export async function getSessionHistory(sessionId: string, limit = 10) {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data.reverse() // Chronological order
}

// Update context-builder.ts
export async function buildAIContext(userId: string, lessonId: string, sessionId: string) {
  const profile = await getUserProfile(userId)
  const lesson = await getLesson(lessonId)
  const history = await getSessionHistory(sessionId, 5)

  const conversationContext = history.map(i =>
    `Student: ${i.user_message}\nTeacher: ${i.ai_response}`
  ).join('\n\n')

  return `You are teaching ${profile.name}, age ${profile.age}, grade ${profile.grade_level}.

LESSON: ${lesson.title}
OBJECTIVE: ${lesson.learning_objective}

RECENT CONVERSATION:
${conversationContext}

Continue the conversation naturally. Reference previous topics discussed.`
}

Deliverable: AI remembers previous conversation in the session
```

---

### **Day 17: Lesson Intro Screen**

#### ✅ VERTICAL SLICE 12: Lesson Intro → Start Session
```typescript
Frontend:
// app/lessons/[id]/intro/page.tsx
export default function LessonIntroPage({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/lessons/${params.id}`)
      .then(res => res.json())
      .then(data => setLesson(data))
  }, [params.id])

  async function startLesson() {
    const userId = localStorage.getItem('userId')

    // Create session
    const res = await fetch('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ userId, lessonId: params.id })
    })

    const { sessionId } = await res.json()
    localStorage.setItem('currentSession', sessionId)

    router.push(`/learn/${params.id}`)
  }

  if (!lesson) return <div>Loading...</div>

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-sm text-primary mb-2">{lesson.subject.toUpperCase()}</div>
        <h1 className="text-4xl font-bold mb-4">{lesson.title}</h1>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-2">What You'll Learn:</h2>
          <p className="text-gray-700">{lesson.learning_objective}</p>
        </div>

        <div className="flex items-center justify-between mb-6 text-sm text-gray-600">
          <span>⏱️ {lesson.estimated_duration} minutes</span>
          <span>📊 {lesson.difficulty}</span>
        </div>

        <div className="bg-blue-50 border border-primary rounded-lg p-6 mb-8">
          <h3 className="font-semibold mb-2">How This Works:</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Click the microphone to speak</li>
            <li>✅ Ask questions anytime</li>
            <li>✅ I'll draw diagrams to help you understand</li>
            <li>✅ Take your time - there's no rush!</li>
          </ul>
        </div>

        <button
          onClick={startLesson}
          className="w-full bg-primary text-white py-4 rounded-lg text-lg font-semibold"
        >
          Start Class! 🎓
        </button>
      </div>
    </div>
  )
}

Backend:
// app/api/lessons/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) throw error
  return NextResponse.json(data)
}

Deliverable: Lesson intro → Start button → Creates session → Opens learn interface
```

---

### **Day 18-19: Lesson Completion Screen + Progress Tracking**

#### ✅ VERTICAL SLICE 13: End Session → Save Progress → Completion Screen
```typescript
Frontend:
// app/lessons/[id]/complete/page.tsx
export default function LessonCompletePage({ params }: { params: { id: string } }) {
  const [summary, setSummary] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const sessionId = localStorage.getItem('currentSession')

    // End session and get summary
    fetch('/api/sessions/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
      .then(res => res.json())
      .then(data => setSummary(data.summary))
  }, [])

  if (!summary) return <div>Calculating your progress...</div>

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Celebration animation */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold mb-2">Lesson Complete!</h1>
          <p className="text-xl text-gray-600">Great work, {summary.studentName}!</p>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Your Progress</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{summary.timeSpent}</div>
              <div className="text-sm text-gray-600">Minutes</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-success">{summary.questionsAsked}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{summary.masteryLevel}%</div>
              <div className="text-sm text-gray-600">Mastery</div>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-primary/10 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-2">What's Next?</h3>
          <p className="text-gray-700 mb-4">{summary.nextLesson.title}</p>
          <button
            onClick={() => router.push(`/lessons/${summary.nextLesson.id}/intro`)}
            className="bg-primary text-white px-6 py-2 rounded-lg"
          >
            Start Next Lesson →
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push('/lessons')}
            className="flex-1 border border-gray-300 py-3 rounded-lg"
          >
            Back to Lessons
          </button>

          <button
            onClick={() => router.push(`/lessons/${params.id}/intro`)}
            className="flex-1 border border-primary text-primary py-3 rounded-lg"
          >
            Review This Lesson
          </button>
        </div>
      </div>
    </div>
  )
}

Backend:
// app/api/sessions/end/route.ts
export async function POST(request: NextRequest) {
  const { sessionId } = await request.json()

  // Get session data
  const { data: session } = await supabase
    .from('sessions')
    .select('*, users(*), lessons(*)')
    .eq('id', sessionId)
    .single()

  // Count interactions
  const { count } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  // Calculate time spent
  const timeSpent = Math.round(
    (new Date().getTime() - new Date(session.started_at).getTime()) / 60000
  )

  // Simple mastery calculation (can be enhanced with AI later)
  const masteryLevel = Math.min(100, count * 10)

  // Update session
  await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      interaction_count: count,
      effectiveness_score: masteryLevel
    })
    .eq('id', sessionId)

  // Update progress
  await supabase
    .from('progress')
    .upsert({
      user_id: session.user_id,
      lesson_id: session.lesson_id,
      mastery_level: masteryLevel,
      time_spent: timeSpent,
      attempts: 1,
      completed: masteryLevel >= 70
    })
    .select()

  // Get next lesson
  const { data: nextLesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('subject', session.lessons.subject)
    .gt('grade_level', session.lessons.grade_level)
    .order('grade_level', { ascending: true })
    .limit(1)
    .single()

  return NextResponse.json({
    summary: {
      studentName: session.users.name,
      timeSpent,
      questionsAsked: count,
      masteryLevel,
      nextLesson: nextLesson || session.lessons
    }
  })
}

Deliverable: Finish lesson → Celebration screen → Progress saved → Next lesson suggestion
```

---

### **Day 20: Long-term Learning Analysis**

#### ✅ VERTICAL SLICE 14: Gemini Analysis → Profile Update
```typescript
Backend:
// lib/memory/learning-analyzer.ts
import { GoogleGenAI } from '@google/genai'

export async function analyzeSessionLearning(userId: string, sessionId: string) {
  const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const profile = await getUserProfile(userId)
  const interactions = await getSessionHistory(sessionId, 50)

  const response = await gemini.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this learning session and identify patterns:

Current Profile:
- Learning style: ${profile.learning_style || 'unknown'}
- Strengths: ${profile.strengths?.join(', ') || 'none yet'}
- Struggles: ${profile.struggles?.join(', ') || 'none yet'}

Session interactions:
${JSON.stringify(interactions, null, 2)}

Identify:
1. Does this student learn better with visual explanations, step-by-step logic, real-world analogies, or practice problems?
2. What pace do they prefer? (fast/medium/slow)
3. What topics did they master?
4. What topics need more work?

Return ONLY valid JSON:
{
  "learningStyle": "visual" | "auditory" | "kinesthetic",
  "newStrengths": ["topic1", "topic2"],
  "newStruggles": ["topic3"],
  "preferredPace": "fast" | "medium" | "slow"
}`
  })

  const analysisText = response.text
  const cleanJson = analysisText.replace(/```json|```/g, '').trim()
  const analysis = JSON.parse(cleanJson)

  // Update user profile
  await supabase
    .from('users')
    .update({
      learning_style: analysis.learningStyle,
      strengths: [...new Set([...(profile.strengths || []), ...analysis.newStrengths])],
      struggles: [...new Set([...(profile.struggles || []), ...analysis.newStruggles])],
      preferences: {
        ...profile.preferences,
        pace: analysis.preferredPace
      }
    })
    .eq('id', userId)
    .select()

  return analysis
}

// Update /api/sessions/end to call this
// Run analysis AFTER returning response (background task)

Deliverable: After each lesson, AI analyzes learning patterns and updates profile
```

---

### **Day 21: Testing, Error Handling & Polish**

#### ✅ VERTICAL SLICE 15: Edge Cases + UX Polish
```typescript
Error Handling:
// lib/utils/error-handler.ts
export class AppError extends Error {
  constructor(public message: string, public code: string) {
    super(message)
  }
}

// Add to all API routes
try {
  // ... logic
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: error.message || 'Something went wrong' },
    { status: 500 }
  )
}

// Add error boundaries to frontend
// components/ErrorBoundary.tsx
export function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-6 py-3 rounded-lg"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return children
}

Edge Cases:
✅ Microphone permission denied → Show error message
✅ No internet connection → Show retry button
✅ API rate limits → Queue requests
✅ Invalid user data → Validation messages
✅ Audio playback fails → Fallback to text only

Loading States:
✅ Add skeleton loaders for lesson cards
✅ Add spinner during AI thinking
✅ Add progress bar during audio generation

Deliverable: All major edge cases handled, smooth UX
```

**🎉 WEEK 3 MILESTONE:** Complete user journey with session memory!

---

## Week 4: Polish, Deploy & Demo (Days 22-30)
**Goal:** Design system, remaining features, deployment

---

### **Day 22-23: Design System Implementation + Accessibility**

#### ✅ VERTICAL SLICE 16: Design Polish
```typescript
Design System:
// Apply to ALL pages
✅ Primary Blue (#4A90E2) for CTAs and accents
✅ Success Green (#7ED321) for completion states
✅ Accent Orange (#F5A623) for highlights
✅ Error Red (#E74C3C) for errors

✅ Inter font for headings (already setup)
✅ 8-point grid spacing (p-2, p-4, p-6, p-8)
✅ Consistent border radius (rounded-lg everywhere)
✅ Shadows for depth (shadow-md on cards)

Accessibility:
✅ WCAG AA contrast ratio (test all text)
✅ Focus states on all buttons (focus:ring-2 focus:ring-primary)
✅ ARIA labels on icons
✅ Keyboard navigation (Tab, Enter, Escape)
✅ Screen reader text for voice states

// Example: Update all buttons
<button className="bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition">

Deliverable: Consistent, accessible design across all pages
```

---

### **Day 24-25: Progress Dashboard + Remaining API Routes**

#### ✅ VERTICAL SLICE 17: Progress Summary Screen
```typescript
Frontend:
// app/progress/page.tsx
export default function ProgressPage() {
  const [progress, setProgress] = useState([])

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    fetch(`/api/progress/${userId}`)
      .then(res => res.json())
      .then(data => setProgress(data.progress))
  }, [])

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Your Learning Journey</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-primary/10 rounded-lg p-6">
          <div className="text-3xl font-bold text-primary">
            {progress.filter(p => p.completed).length}
          </div>
          <div className="text-gray-600">Lessons Completed</div>
        </div>

        <div className="bg-success/10 rounded-lg p-6">
          <div className="text-3xl font-bold text-success">
            {Math.round(progress.reduce((acc, p) => acc + p.mastery_level, 0) / progress.length)}%
          </div>
          <div className="text-gray-600">Average Mastery</div>
        </div>

        <div className="bg-accent/10 rounded-lg p-6">
          <div className="text-3xl font-bold text-accent">
            {progress.reduce((acc, p) => acc + p.time_spent, 0)}
          </div>
          <div className="text-gray-600">Minutes Learning</div>
        </div>
      </div>

      <div className="space-y-4">
        {progress.map(p => (
          <div key={p.lesson_id} className="border rounded-lg p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{p.lessons.title}</h3>
              <div className="text-sm text-gray-600">
                {p.attempts} attempts • {p.time_spent} minutes
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-bold">{p.mastery_level}%</div>
                <div className="text-sm text-gray-600">Mastery</div>
              </div>

              {p.completed ? (
                <div className="bg-success text-white px-4 py-2 rounded-lg">
                  ✓ Complete
                </div>
              ) : (
                <button className="bg-primary text-white px-4 py-2 rounded-lg">
                  Continue
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

Backend:
// app/api/progress/[userId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { data, error } = await supabase
    .from('progress')
    .select('*, lessons(*)')
    .eq('user_id', params.userId)
    .order('last_accessed', { ascending: false })

  if (error) throw error
  return NextResponse.json({ progress: data })
}

Deliverable: Progress dashboard shows learning journey
```

---

### **Day 26: Authentication (Supabase Auth)**

#### ✅ VERTICAL SLICE 18: Real Auth System
```typescript
// lib/auth/supabase-auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

// Create auth pages: /auth/signup, /auth/login
// Protect routes with middleware
// Replace localStorage userId with auth.user.id

Deliverable: Real authentication system
```

---

### **Day 27: Lesson Curriculum Content**

#### ✅ VERTICAL SLICE 19: Write Actual Fractions Lesson
```typescript
Lesson Content:
// Create detailed lesson plan in database
INSERT INTO lessons VALUES (
  id: '...',
  title: 'Introduction to Fractions',
  subject: 'math',
  grade_level: 5,
  learning_objective: 'Understand what fractions represent and how to visualize them',
  ...
)

// Add to Gemini system prompt
LESSON STRUCTURE:
1. Introduction: "Today we're learning about fractions! Have you ever shared a pizza?"
2. Core Concept: "A fraction has two parts - the top number (numerator) and bottom (denominator)"
3. Visual Examples: [Generate pizza SVG divided into slices]
4. Check Understanding: "Can you tell me what 1/2 means?"
5. Practice: "If I have 3/4 of a pizza, how many slices do I have out of 4?"
6. Summary: "Great job! You learned that fractions represent parts of a whole"

Deliverable: One complete, well-structured lesson
```

---

### **Day 28: End-to-End Testing**

```typescript
Testing Checklist:
✅ Complete user flow: Landing → Welcome → Lessons → Intro → Learn → Complete → Progress
✅ Voice input on different browsers (Chrome, Safari, Firefox)
✅ Mobile responsive design
✅ Error states (mic denied, connection lost)
✅ Performance: < 3 second latency
✅ Database queries optimized
✅ Audio playback smooth

Deliverable: Bug-free demo flow
```

---

### **Day 29: Deployment to Vercel**

```bash
✅ Push to GitHub
✅ Connect to Vercel
✅ Add environment variables in Vercel dashboard
✅ Deploy production build
✅ Test production URL
✅ Configure custom domain (optional)

Deliverable: Live production app
```

---

### **Day 30: Demo Preparation & Submission**

```typescript
Demo Script:
1. Show landing page (problem statement)
2. Create profile (welcome screen)
3. Select fractions lesson
4. Start learning (voice interaction)
5. Ask questions via voice
6. Show whiteboard SVG generation
7. Complete lesson (celebration screen)
8. Show progress dashboard

Recording:
✅ 3-5 minute screen recording
✅ Voice narration explaining features
✅ Show student perspective

Submission:
✅ Polish README.md
✅ Add demo video link
✅ Add live demo URL
✅ Submit to hackathon

Deliverable: Hackathon submission complete!
```

---

## SUMMARY: Vertical Slices Delivered

| Week | Vertical Slice | Frontend → Backend → Database |
|------|---------------|------------------------------|
| 1 | Landing page + Basic AI | Page → API → Gemini → Audio |
| 2 | Voice + Onboarding | Mic → STT → DB profile → Lessons |
| 3 | Session flow + Memory | Learn → Session → History → Analysis |
| 4 | Polish + Deploy | Design → Auth → Deploy |

**Every slice is fully functional and demoable at each stage!**
