# WEEK 1 ACTION PLAN - Critical Fixes
**Priority**: 🔴 CRITICAL
**Timeline**: 5 working days
**Goal**: Production-ready security and user experience

---

## DAY 1-2: AUTHENTICATION & SECURITY (8-10 hours)

### Task 1.1: Implement NextAuth.js (4 hours)

**Decision Required**: Which auth provider?
- **Option A**: Email/Password (simple, self-contained)
- **Option B**: Google OAuth (better UX, faster signup)
- **Option C**: Both (recommended for flexibility)

**Implementation Steps**:

1. **Install Dependencies**
   ```bash
   npm install next-auth@latest
   ```

2. **Create Auth Configuration**
   File: `app/api/auth/[...nextauth]/route.ts`

   ```typescript
   import NextAuth from 'next-auth'
   import GoogleProvider from 'next-auth/providers/google'
   import CredentialsProvider from 'next-auth/providers/credentials'
   import { createClient } from '@supabase/supabase-js'

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   )

   export const authOptions = {
     providers: [
       GoogleProvider({
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       }),
       CredentialsProvider({
         name: 'Credentials',
         credentials: {
           email: { label: 'Email', type: 'email' },
           password: { label: 'Password', type: 'password' }
         },
         async authorize(credentials) {
           // Verify against Supabase users table
           const { data, error } = await supabase
             .from('users')
             .select('*')
             .eq('email', credentials?.email)
             .single()

           if (error || !data) return null

           // In production: use bcrypt to verify password
           // For now: direct comparison (MUST CHANGE!)
           if (data.password_hash === credentials?.password) {
             return {
               id: data.user_id,
               email: data.email,
               name: data.name,
             }
           }

           return null
         }
       })
     ],
     callbacks: {
       async jwt({ token, user }) {
         if (user) {
           token.userId = user.id
         }
         return token
       },
       async session({ session, token }) {
         if (session.user) {
           (session.user as any).userId = token.userId
         }
         return session
       }
     },
     pages: {
       signIn: '/login',
       error: '/login',
     },
     secret: process.env.NEXTAUTH_SECRET,
   }

   const handler = NextAuth(authOptions)
   export { handler as GET, handler as POST }
   ```

3. **Update Environment Variables**
   ```env
   # .env.local
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
   GOOGLE_CLIENT_ID=<from-google-cloud-console>
   GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
   ```

4. **Create Session Provider Wrapper**
   File: `app/providers.tsx`

   ```typescript
   'use client'
   import { SessionProvider } from 'next-auth/react'

   export function Providers({ children }: { children: React.ReactNode }) {
     return <SessionProvider>{children}</SessionProvider>
   }
   ```

5. **Update Root Layout**
   File: `app/layout.tsx`

   ```typescript
   import { Providers } from './providers'

   export default function RootLayout({ children }) {
     return (
       <html lang="en">
         <body>
           <Providers>
             {children}
           </Providers>
         </body>
       </html>
     )
   }
   ```

---

### Task 1.2: Create Protected Route Middleware (2 hours)

File: `middleware.ts` (root level)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Public paths (no auth required)
  const publicPaths = [
    '/login',
    '/register',
    '/api/auth',
    '/api/health',
  ]

  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next()
  }

  // Check authentication
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  if (!token) {
    // Redirect to login for pages, 401 for API routes
    if (path.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add userId to request headers for API routes
  if (path.startsWith('/api/')) {
    const headers = new Headers(request.headers)
    headers.set('x-user-id', token.userId as string)
    return NextResponse.next({ request: { headers } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/learn/:path*',
    '/progress/:path*',
    '/admin/:path*',
  ]
}
```

---

### Task 1.3: Update API Routes to Use Verified User (2 hours)

**Pattern to Apply to All Protected Routes**:

```typescript
// Before (INSECURE)
export async function POST(req: Request) {
  const { userId, lessonId, message } = await req.json()
  // Uses userId from client - can be spoofed!
}

// After (SECURE)
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { lessonId, message } = await req.json()
  // Use verified userId from token
}
```

**Files to Update** (10 routes):
1. `/api/teach/multi-ai-stream/route.ts`
2. `/api/teach/multi-ai/route.ts`
3. `/api/assessment/questions/route.ts`
4. `/api/assessment/grade/route.ts`
5. `/api/sessions/start/route.ts`
6. `/api/sessions/end/route.ts`
7. `/api/curriculum/progress/route.ts`
8. `/api/curriculum/next-lesson/route.ts`
9. `/api/progress/[userId]/route.ts`
10. All admin routes (check admin role)

---

### Task 1.4: Create Login Page (1 hour)

File: `app/login/page.tsx`

```typescript
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      alert('Login failed: ' + result.error)
      setLoading(false)
    } else {
      router.push('/lessons')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Sign In to Bloom Academia</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-600">or</p>
          <button
            onClick={() => signIn('google', { callbackUrl: '/lessons' })}
            className="w-full mt-4 bg-white border border-gray-300 py-2 rounded hover:bg-gray-50"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 1.5: Update Frontend to Use Session (1 hour)

**Remove localStorage userId**, use NextAuth session:

File: `app/learn/[lessonId]/page.tsx`

```typescript
// Before
const userId = localStorage.getItem('userId')

// After
import { useSession } from 'next-auth/react'

const { data: session, status } = useSession()

if (status === 'loading') return <div>Loading...</div>
if (status === 'unauthenticated') redirect('/login')

const userId = session?.user?.userId
```

---

## DAY 3: SESSION VALIDATION & USER FEEDBACK (6 hours)

### Task 2.1: Backend Session Validator (2 hours)

File: `lib/auth/session-validator.ts` (create)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SessionValidation {
  valid: boolean
  sessionId?: string
  error?: string
}

/**
 * Validates that a session exists, is active, and belongs to the user
 *
 * @param sessionId - Session UUID to validate
 * @param userId - User UUID who should own the session
 * @returns Validation result
 */
export async function validateSession(
  sessionId: string,
  userId: string
): Promise<SessionValidation> {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('session_id, user_id, end_time')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Session validation query error:', error)
      return { valid: false, error: 'Session not found' }
    }

    // Check session belongs to user
    if (data.user_id !== userId) {
      return { valid: false, error: 'Session does not belong to user' }
    }

    // Check session is still active (not ended)
    if (data.end_time !== null) {
      return { valid: false, error: 'Session has ended' }
    }

    return { valid: true, sessionId: data.session_id }
  } catch (error) {
    console.error('Session validation error:', error)
    return { valid: false, error: 'Validation failed' }
  }
}

/**
 * Gets the active session for a user and lesson
 * Creates one if it doesn't exist
 */
export async function getOrCreateActiveSession(
  userId: string,
  lessonId: string
): Promise<string> {
  // Check for active session
  const { data: existing } = await supabase
    .from('sessions')
    .select('session_id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing.session_id

  // Create new session
  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      start_time: new Date().toISOString(),
    })
    .select('session_id')
    .single()

  if (error) throw new Error('Failed to create session')

  return newSession.session_id
}
```

---

### Task 2.2: Apply Session Validation to Teaching Routes (1 hour)

File: `app/api/teach/multi-ai-stream/route.ts`

```typescript
import { validateSession } from '@/lib/auth/session-validator'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, lessonId, message } = await req.json()

  // Validate session
  const validation = await validateSession(sessionId, userId)
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 403 }
    )
  }

  // Continue with teaching logic...
}
```

**Apply to**:
- `/api/teach/multi-ai-stream/route.ts`
- `/api/teach/multi-ai/route.ts`

---

### Task 2.3: Add Toast Notification System (2 hours)

1. **Install Sonner**
   ```bash
   npm install sonner
   ```

2. **Add Toaster to Root Layout**
   File: `app/layout.tsx`

   ```typescript
   import { Toaster } from 'sonner'

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           <Providers>
             {children}
             <Toaster position="top-center" />
           </Providers>
         </body>
       </html>
     )
   }
   ```

3. **Add Error Notifications to Learn Page**
   File: `app/learn/[lessonId]/page.tsx`

   ```typescript
   import { toast } from 'sonner'

   // Audio playback error
   audio.addEventListener('error', (e) => {
     console.error('Audio playback error:', e)
     toast.error('Audio playback failed', {
       description: 'Please check your audio settings or try again',
       action: {
         label: 'Retry',
         onClick: () => {
           setVoiceState('thinking')
           handleAudioPlayback(currentAudioData)
         }
       }
     })
     setVoiceState('idle')
   })

   // API call errors
   } catch (error) {
     console.error('Failed to get AI response:', error)
     toast.error('Failed to get response', {
       description: 'Please try again or refresh the page'
     })
     setVoiceState('idle')
   }

   // Voice recognition errors
   soniox.on('error', (error) => {
     console.error('Soniox error:', error)
     toast.error('Voice recognition error', {
       description: 'Please check your microphone and try again'
     })
   })
   ```

---

### Task 2.4: Enhance WebSocket Retry Logic (1 hour)

File: `components/VoiceInput.tsx`

```typescript
// Before
const maxWsRetries = 3

// After
const maxWsRetries = 5
const MAX_TOTAL_RETRY_TIME = 30000 // 30 seconds
let totalRetryTime = 0

const attemptReconnect = async (attempt: number) => {
  if (attempt >= maxWsRetries) {
    console.error(`Max WebSocket retries (${maxWsRetries}) exceeded`)
    toast.error('Unable to connect to voice service', {
      description: 'Please check your internet connection and refresh the page'
    })
    return
  }

  const delay = baseDelay * Math.pow(2, attempt)

  // Check if total retry time exceeded
  if (totalRetryTime + delay > MAX_TOTAL_RETRY_TIME) {
    console.error('Max total retry time exceeded')
    toast.error('Connection timeout', {
      description: 'Voice service is unavailable. Please try again later.'
    })
    return
  }

  console.log(`Retrying WebSocket connection (attempt ${attempt + 1}/${maxWsRetries}) after ${delay}ms`)

  totalRetryTime += delay
  await new Promise(resolve => setTimeout(resolve, delay))

  // Retry connection
  initializeSoniox(attempt + 1)
}
```

---

## DAY 4-5: CRITICAL UNIT TESTS (10 hours)

### Task 3.1: Setup Vitest (1 hour)

1. **Install Dependencies**
   ```bash
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   ```

2. **Create Vitest Config**
   File: `vitest.config.ts`

   ```typescript
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'
   import path from 'path'

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./vitest.setup.ts'],
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './'),
       },
     },
   })
   ```

3. **Create Setup File**
   File: `vitest.setup.ts`

   ```typescript
   import '@testing-library/jest-dom'
   import { beforeAll, afterEach, afterAll } from 'vitest'

   // Setup environment variables
   beforeAll(() => {
     process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
     process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
   })
   ```

4. **Update package.json**
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

---

### Task 3.2: Test Agent Routing Logic (3 hours)

File: `lib/ai/__tests__/agent-manager.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentManager } from '../agent-manager'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: { ai_agents: { name: 'Math Specialist' } },
            error: null
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => ({
            data: { interaction_id: 'test-id' },
            error: null
          })
        })
      })
    })
  })
}))

describe('AgentManager', () => {
  let agentManager: AgentManager

  beforeEach(() => {
    agentManager = new AgentManager()
  })

  describe('Agent Routing', () => {
    it('should route math question to Math Specialist', async () => {
      const result = await agentManager.processMessage({
        userId: 'user-123',
        lessonId: 'lesson-456',
        sessionId: 'session-789',
        userMessage: 'What is 2 + 2?',
        lessonTitle: 'Introduction to Addition'
      })

      expect(result.assignedAgentName).toBe('Math Specialist')
    })

    it('should use Coordinator for unclear requests', async () => {
      const result = await agentManager.processMessage({
        userId: 'user-123',
        lessonId: 'lesson-456',
        sessionId: 'session-789',
        userMessage: 'I don\'t understand',
        lessonTitle: 'Introduction to Addition'
      })

      // Coordinator should handle ambiguous queries
      expect(['Coordinator', 'Math Specialist']).toContain(
        result.assignedAgentName
      )
    })

    it('should route to Assessor when lesson complete', async () => {
      const result = await agentManager.processMessage({
        userId: 'user-123',
        lessonId: 'lesson-456',
        sessionId: 'session-789',
        userMessage: '[LESSON_COMPLETE]',
        lessonTitle: 'Introduction to Addition'
      })

      expect(result.assignedAgentName).toBe('Assessor')
    })
  })

  describe('Fast Path Optimization', () => {
    it('should bypass Coordinator if specialist already active', async () => {
      // First message routes to specialist
      await agentManager.processMessage({
        userId: 'user-123',
        lessonId: 'lesson-456',
        sessionId: 'session-789',
        userMessage: 'Explain fractions',
        lessonTitle: 'Introduction to Fractions'
      })

      // Second message should go directly to same specialist
      const result = await agentManager.processMessage({
        userId: 'user-123',
        lessonId: 'lesson-456',
        sessionId: 'session-789',
        userMessage: 'Can you give an example?',
        lessonTitle: 'Introduction to Fractions'
      })

      // Should not have routing decision (used fast path)
      expect(result.coordinatorUsed).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should fallback to non-streaming on stream error', async () => {
      // Mock streaming failure
      vi.spyOn(agentManager, 'getAgentResponseStreaming')
        .mockRejectedValueOnce(new Error('Stream failed'))

      const result = await agentManager.processMessage({
        userId: 'user-123',
        lessonId: 'lesson-456',
        sessionId: 'session-789',
        userMessage: 'Test message',
        lessonTitle: 'Test Lesson'
      })

      // Should still get response via fallback
      expect(result.displayText).toBeDefined()
      expect(result.audioText).toBeDefined()
    })
  })
})
```

---

### Task 3.3: Test Memory Context Building (2 hours)

File: `lib/memory/__tests__/context-builder.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { buildFullContext } from '../context-builder'

// Mock all dependencies
vi.mock('@/lib/memory/profile-manager', () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    strengths: ['Visual learning'],
    challenges: ['Abstract concepts'],
    preferredStyle: 'step-by-step'
  })
}))

vi.mock('@/lib/memory/session-manager', () => ({
  getRecentSessionHistory: vi.fn().mockResolvedValue([
    { role: 'student', content: 'What is a fraction?' },
    { role: 'teacher', content: 'A fraction represents...' }
  ])
}))

describe('Context Builder', () => {
  it('should fetch all 3 layers in parallel', async () => {
    const startTime = Date.now()

    const context = await buildFullContext({
      userId: 'user-123',
      lessonId: 'lesson-456',
      sessionId: 'session-789'
    })

    const duration = Date.now() - startTime

    expect(context.userProfile).toBeDefined()
    expect(context.recentHistory).toBeDefined()
    expect(context.lessonDetails).toBeDefined()

    // Should complete in <200ms (parallel fetching)
    // If sequential, would take 300-450ms
    expect(duration).toBeLessThan(200)
  })

  it('should include user strengths in context', async () => {
    const context = await buildFullContext({
      userId: 'user-123',
      lessonId: 'lesson-456',
      sessionId: 'session-789'
    })

    expect(context.userProfile.strengths).toContain('Visual learning')
  })

  it('should fallback gracefully if profile missing', async () => {
    const { getUserProfile } = await import('@/lib/memory/profile-manager')
    vi.mocked(getUserProfile).mockResolvedValueOnce(null)

    const context = await buildFullContext({
      userId: 'user-123',
      lessonId: 'lesson-456',
      sessionId: 'session-789'
    })

    // Should still return context with defaults
    expect(context.userProfile).toBeDefined()
  })
})
```

---

### Task 3.4: Test Assessment Grading (2 hours)

File: `lib/assessment/__tests__/grading-engine.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { gradeAssessment } from '../grading-engine'

describe('Assessment Grading', () => {
  const mockQuestions = [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: 'What is 2+2?',
      options: ['3', '4', '5'],
      correct_answer: '4',
      points: 10
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      text: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin'],
      correct_answer: 'Paris',
      points: 10
    }
  ]

  it('should grade all correct answers as 100%', () => {
    const result = gradeAssessment(mockQuestions, {
      q1: '4',
      q2: 'Paris'
    })

    expect(result.score).toBe(20)
    expect(result.maxScore).toBe(20)
    expect(result.percentage).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('should grade with case-insensitive matching', () => {
    const result = gradeAssessment(mockQuestions, {
      q1: '4',
      q2: 'paris'  // lowercase
    })

    expect(result.percentage).toBe(100)
  })

  it('should handle partial credit', () => {
    const result = gradeAssessment(mockQuestions, {
      q1: '4',
      q2: 'London'  // wrong
    })

    expect(result.score).toBe(10)
    expect(result.percentage).toBe(50)
  })

  it('should mark specific questions wrong', () => {
    const result = gradeAssessment(mockQuestions, {
      q1: '3',  // wrong
      q2: 'Paris'
    })

    expect(result.results[0].correct).toBe(false)
    expect(result.results[1].correct).toBe(true)
  })

  it('should apply passing threshold', () => {
    const result = gradeAssessment(
      mockQuestions,
      { q1: '4', q2: 'London' },
      70  // 70% passing threshold
    )

    expect(result.passed).toBe(false)  // 50% < 70%
  })
})
```

---

### Task 3.5: Setup CI with GitHub Actions (2 hours)

File: `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Type check
        run: npm run type-check

      - name: Lint check
        run: npm run lint
```

Add to `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

---

## TESTING CHECKLIST

After completing all tasks:

### Authentication
- [ ] Login with email/password works
- [ ] Login with Google OAuth works
- [ ] Unauthenticated users redirected to /login
- [ ] API routes return 401 without token
- [ ] Session persists across page refreshes
- [ ] Logout works and clears session

### Session Validation
- [ ] Active sessions validated correctly
- [ ] Ended sessions rejected with 403
- [ ] Sessions belonging to other users rejected
- [ ] New sessions created when needed

### Error Notifications
- [ ] Audio errors show toast notification
- [ ] API errors show toast notification
- [ ] Voice recognition errors show toast notification
- [ ] Retry button works for audio playback

### WebSocket Retry
- [ ] Retries up to 5 times (not 3)
- [ ] Exponential backoff working
- [ ] Total retry time limited to 30s
- [ ] Error message shown after max retries

### Unit Tests
- [ ] All tests pass: `npm test`
- [ ] Coverage >70% for critical files
- [ ] CI pipeline runs successfully
- [ ] No type errors: `npm run type-check`

---

## ROLLOUT PLAN

1. **Deploy to Staging** (Day 5 afternoon)
   - Full smoke test
   - Test all authentication flows
   - Test error scenarios

2. **User Acceptance Testing** (Weekend)
   - 5-10 beta testers
   - Collect feedback

3. **Deploy to Production** (Monday)
   - Monitor error rates
   - Watch for auth issues
   - Be ready to rollback

---

## MONITORING

Setup alerts for:
- Authentication failure rate >5%
- Session validation errors >1%
- Audio playback errors >10%
- API 401/403 errors spike

---

## ROLLBACK PLAN

If critical issues found:
1. Revert `middleware.ts` changes
2. Re-enable localStorage userId (temporarily)
3. Fix issues in staging
4. Re-deploy when stable

**Rollback trigger**: >5% of users unable to login or >10% API failures

---

## SUCCESS CRITERIA

Week 1 complete when:
- ✅ All authentication flows working
- ✅ No unauthorized access possible
- ✅ All error notifications visible to users
- ✅ Unit tests passing with >70% coverage
- ✅ Zero security vulnerabilities
- ✅ CI pipeline green

---

**Estimated Total Time**: 24-28 hours
**Parallelization**: Some tasks (tests) can be done while auth is in code review
**Risk Level**: MEDIUM (auth is critical, but well-documented)
