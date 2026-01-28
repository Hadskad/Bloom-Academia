19-DAY IMPLEMENTATION ROADMAP
Fully Automated AI School
Days 15-33: MVP to Production-Ready School
Multi-AI • Automated Curriculum • Voice Assessment • Admin Dashboard
🎯 MISSION

Transform the current educational platform into the world's first fully automated AI school with:
•	Multi-agent AI system (Coordinator + Subject Specialists + Support Specialists)
•	Automated curriculum sequencing with prerequisite tracking
•	Voice-based assessment and mastery verification
•	Production-ready admin dashboard for monitoring at scale

Every feature is built as a vertical slice: Frontend → Backend → API → Database
Every slice is testable, demoable, and production-ready.
 
TABLE OF CONTENTS
1.	Overview & Architecture Decisions
2.	Database Schema Changes
3.	Days 15-18: Multi-AI Architecture
4.	Days 19-22: Curriculum Sequencing System
5.	Days 23-25: Automated Assessment System
6.	Days 26-28: Admin Dashboard
7.	Days 29-30: Polish & Demo Preparation
8.	Testing Strategy
9.	Deployment Checklist
10.	Demo Script for Hackathon
 
1. OVERVIEW & ARCHITECTURE DECISIONS
1.1 Confirmed Architecture Choices
Component	Decision	Rationale
Multi-AI Model	Hybrid: Coordinator + Subject + Support	Best specialization + demo value
Curriculum	Prerequisite-based sequencing	Flexible, auto-calculates paths
Assessment	Pre-written questions in DB	Reliable, fast to implement
Assessment UX	Immediate voice-based quiz	Fast feedback, best for demo
AI Handoff	Seamless with brief intro	Shows intelligence, not jarring
Admin Dashboard	5 core KPIs, read-only	Shows scale thinking
Database	Fresh schema, migrate essentials	Clean start, faster
Testing	Manual only for MVP	Speed over automation
Deployment	Daily to production	Fast feedback, early issues
 
1.2 Multi-AI Architecture (Hybrid Model)

                    ┌─────────────────────────┐
                    │    STUDENT (Voice)      │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   COORDINATOR AI        │
                    │   (Gemini 3 Flash)      │
                    │   - Routes requests     │
                    │   - Maintains context   │
                    │   - Orchestrates agents │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ SUBJECT AGENTS   │  │ SUBJECT AGENTS   │  │ SUPPORT AGENTS   │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│                  │  │                  │  │                  │
│ • Math AI        │  │ • History AI     │  │ • Assessor AI    │
│ • Science AI     │  │ • Art AI         │  │ • Motivator AI   │
│ • English AI     │  │                  │  │                  │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

All agents: Gemini 3 Flash with specialized system prompts

Agent Roles:
•	Coordinator: Routes to specialists, manages conversation flow
•	Math AI: Deep math teaching, problem-solving, visual aids
•	Science AI: Scientific method, experiments, phenomena
•	English AI: Reading, writing, grammar, literature
•	History AI: Events, context, critical thinking
•	Art AI: Creative expression, visual learning
•	Assessor AI: Quiz generation, grading, mastery verification
•	Motivator AI: Encouragement, growth mindset, persistence
 
2. DATABASE SCHEMA CHANGES
2.1 New Tables (Fresh Schema)
-- ========================================
-- MULTI-AI SYSTEM
-- ========================================
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- 'coordinator', 'math_specialist', etc.
  role TEXT NOT NULL,                  -- 'coordinator', 'subject', 'support'
  model TEXT NOT NULL,                 -- 'gemini-3-flash-preview'
  system_prompt TEXT NOT NULL,         -- Specialized prompt
  subjects TEXT[],                     -- For subject agents: ['mathematics']
  capabilities JSONB,                  -- What this agent can do
  performance_metrics JSONB,           -- Success rates, avg scores
  status TEXT DEFAULT 'active',        -- 'active', 'maintenance'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  agent_id UUID REFERENCES ai_agents(id),
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  routing_reason TEXT,                 -- Why this agent was chosen
  handoff_from UUID REFERENCES ai_agents(id), -- If handed off
  effectiveness_score FLOAT,           -- Did student understand?
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
 
-- ========================================
-- CURRICULUM SEQUENCING
-- ========================================
CREATE TABLE lesson_prerequisites (
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  prerequisite_lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  required_mastery_level FLOAT DEFAULT 80.0,  -- Must score 80%+
  PRIMARY KEY (lesson_id, prerequisite_lesson_id)
);

CREATE TABLE curriculum_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  lesson_sequence UUID[],              -- Ordered lesson IDs
  total_lessons INTEGER,
  estimated_duration_weeks INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, grade_level)
);

CREATE TABLE student_curriculum_progress (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  current_lesson_id UUID REFERENCES lessons(id),
  next_lesson_id UUID REFERENCES lessons(id),
  lessons_completed INTEGER DEFAULT 0,
  lessons_mastered INTEGER DEFAULT 0,  -- Scored 80%+
  total_lessons INTEGER,
  overall_mastery_score FLOAT DEFAULT 0.0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, subject, grade_level)
);
 
-- ========================================
-- ASSESSMENT SYSTEM
-- ========================================
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,            -- Array of question objects
  passing_score FLOAT DEFAULT 80.0,
  time_limit_minutes INTEGER,          -- Optional
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id),
  session_id UUID REFERENCES sessions(id),
  answers JSONB NOT NULL,              -- Student's answers
  score FLOAT NOT NULL,                -- 0-100
  passed BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  feedback JSONB,                      -- Per-question feedback
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing progress table
ALTER TABLE progress ADD COLUMN assessment_score FLOAT;
ALTER TABLE progress ADD COLUMN assessment_passed BOOLEAN;
 
-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_agent_interactions_session ON agent_interactions(session_id);
CREATE INDEX idx_agent_interactions_agent ON agent_interactions(agent_id);
CREATE INDEX idx_lesson_prereqs_lesson ON lesson_prerequisites(lesson_id);
CREATE INDEX idx_lesson_prereqs_prereq ON lesson_prerequisites(prerequisite_lesson_id);
CREATE INDEX idx_curriculum_progress_user ON student_curriculum_progress(user_id);
CREATE INDEX idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
 
2.2 Sample Data Structure
AI Agent Record:
{
  "name": "math_specialist",
  "role": "subject",
  "model": "gemini-3-flash-preview",
  "system_prompt": "You are an expert mathematics teacher...",
  "subjects": ["mathematics"],
  "capabilities": {
    "can_teach": true,
    "can_assess": false,
    "can_generate_svg": true,
    "specialties": ["algebra", "geometry", "fractions"]
  }
}

Assessment Record:
{
  "lesson_id": "lesson-fractions-intro",
  "title": "Fractions Understanding Check",
  "questions": [
    {
      "id": "q1",
      "text": "What does the bottom number in a fraction tell us?",
      "type": "open_ended",
      "correct_answer": "total number of equal parts",
      "points": 33.33
    },
    {
      "id": "q2",
      "text": "If you eat 2 slices of a pizza cut into 8 pieces, what fraction did you eat?",
      "type": "fraction_answer",
      "correct_answer": "2/8 or 1/4",
      "points": 33.33
    }
  ]
}
 
3. DAYS 15-18: MULTI-AI ARCHITECTURE

               Done! Alhamdulillah
Day 15: Database Setup + Coordinator AI
Vertical Slice 1: Coordinator AI Foundation
Database (1-2 hours):
-- migrations/001_multi_ai_system.sql
CREATE TABLE ai_agents (...);
CREATE TABLE agent_interactions (...);

-- Seed coordinator agent
INSERT INTO ai_agents (name, role, model, system_prompt) VALUES (
  'coordinator',
  'coordinator',
  'gemini-3-flash-preview',
  'You are the Coordinator AI...'  -- Full prompt in implementation
);

Backend - AI Agent Manager (2-3 hours):
// lib/ai/agent-manager.ts
export class AIAgentManager {
  private agents: Map<string, GeminiClient> = new Map()
  
  async loadAgents() {
    const { data } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('status', 'active')
    
    for (const agent of data) {
      this.agents.set(agent.name, new GeminiClient(agent))
    }
  }
  
  async routeRequest(userMessage: string, context: any) {
    // Coordinator decides which agent to use
    const coordinator = this.agents.get('coordinator')
    const routing = await coordinator.route(userMessage, context)
    
    return {
      agentName: routing.agent,
      reason: routing.reason
    }
  }
}

Backend - Update /api/teach (2 hours):
// app/api/teach/route.ts
import { AIAgentManager } from '@/lib/ai/agent-manager'

export async function POST(request: NextRequest) {
  const { userId, sessionId, userMessage } = await request.json()
  
  // 1. Load agent system
  const agentManager = new AIAgentManager()
  await agentManager.loadAgents()
  
  // 2. Route to appropriate agent
  const routing = await agentManager.routeRequest(userMessage, context)
  
  // 3. Get response from specialist
  const response = await agentManager.getResponse(
    routing.agentName,
    userMessage,
    context
  )
  
  // 4. Save interaction with agent info
  await saveAgentInteraction(sessionId, routing.agentName, response)
  
  return NextResponse.json({ ...response })
}

Testing Checklist:
•	✓ Coordinator agent loads from database
•	✓ Can receive user message and make routing decision
•	✓ Interaction saved with agent_id
•	✓ Deploy to production



                     Done! Alhamdulillah
Day 16: Subject Specialist Agents (Math, Science, English)
Database - Seed Agents (1 hour):
-- Seed subject specialists
INSERT INTO ai_agents (name, role, model, system_prompt, subjects) VALUES
  ('math_specialist', 'subject', 'gemini-3-flash-preview', 'Math prompt...', '{mathematics}'),
  ('science_specialist', 'subject', 'gemini-3-flash-preview', 'Science prompt...', '{science}'),
  ('english_specialist', 'subject', 'gemini-3-flash-preview', 'English prompt...', '{english}');

Backend - Implement Routing Logic (3-4 hours):
// lib/ai/coordinator-prompts.ts
export const COORDINATOR_SYSTEM_PROMPT = `
You are the Coordinator AI for an automated school.

Your job: Analyze student questions and route to the right specialist.

Available Specialists:
- math_specialist: Math, arithmetic, algebra, geometry, fractions
- science_specialist: Biology, physics, chemistry, experiments
- english_specialist: Reading, writing, grammar, literature
- history_specialist: Historical events, geography, social studies
- art_specialist: Drawing, creativity, visual learning

If question is general (greetings, motivation), handle yourself.
If subject-specific, route to specialist.

Respond in JSON:
{
  "agent": "math_specialist",
  "reason": "Question about fractions",
  "handoff_message": "Let me connect you with our Math specialist!"
}
`

Frontend - Display Agent Info (2 hours):
// components/TeacherAvatar.tsx
export function TeacherAvatar({ agentName }: { agentName: string }) {
  const agentInfo = {
    coordinator: { name: 'Teacher', emoji: '👨‍🏫', color: 'blue' },
    math_specialist: { name: 'Math Teacher', emoji: '🔢', color: 'green' },
    science_specialist: { name: 'Science Teacher', emoji: '🔬', color: 'purple' },
    // ...
  }
  
  return (
    <div className='agent-avatar'>
      <span>{agentInfo[agentName].emoji}</span>
      <span>{agentInfo[agentName].name}</span>
    </div>
  )
}

Testing Checklist:
•	✓ Ask math question → routes to math_specialist
•	✓ Ask science question → routes to science_specialist
•	✓ Ask English question → routes to english_specialist
•	✓ Greeting → coordinator handles directly
•	✓ Frontend shows which agent is responding
•	✓ Deploy to production
 


                             Done! Alhamdulillah
Day 17: Support Specialists (Assessor, Motivator)
Database - Seed Support Agents (1 hour):
INSERT INTO ai_agents (name, role, model, system_prompt) VALUES
  ('assessor', 'support', 'gemini-3-flash-preview', 'Assessor prompt...'),
  ('motivator', 'support', 'gemini-3-flash-preview', 'Motivator prompt...');

Backend - Assessor Integration (3-4 hours):
// lib/ai/assessor-agent.ts
export class AssessorAgent {
  async conductAssessment(
    userId: string,
    lessonId: string,
    assessmentId: string
  ) {
    const assessment = await getAssessment(assessmentId)
    const answers: any[] = []
    
    // Ask each question via voice
    for (const question of assessment.questions) {
      const answer = await this.askQuestion(question)
      answers.push({ questionId: question.id, answer })
    }
    
    // Grade automatically
    const score = await this.gradeAnswers(assessment, answers)
    
    // Save attempt
    await saveAssessmentAttempt({
      userId,
      assessmentId,
      answers,
      score,
      passed: score >= assessment.passing_score
    })
    
    return { score, passed: score >= assessment.passing_score }
  }
}

Backend - Motivator Integration (2 hours):
// lib/ai/motivator-agent.ts
export class MotivatorAgent {
  async encourageStudent(context: {
    recentScore: number,
    attemptsCount: number,
    strugglingAreas: string[]
  }) {
    const prompt = `Student just scored ${context.recentScore}% on their assessment.
    This is their ${context.attemptsCount} attempt.
    Provide encouraging, specific feedback that motivates them to keep learning.`
    
    return await this.generate(prompt)
  }
}

Testing Checklist:
•	✓ After lesson, assessor takes over for quiz
•	✓ If student scores <80%, motivator provides encouragement
•	✓ If student scores ≥80%, motivator celebrates success
•	✓ Agent transitions feel natural
•	✓ Deploy to production



                 Done! Alhamdulillah
Day 18: Agent Performance Tracking + Polish
Backend - Analytics (3-4 hours):
// lib/analytics/agent-performance.ts
export async function trackAgentPerformance(
  agentId: string,
  interactionId: string,
  studentFeedback?: 'helpful' | 'not_helpful'
) {
  // Update agent performance metrics
  const metrics = await calculateMetrics(agentId)
  
  await supabase
    .from('ai_agents')
    .update({
      performance_metrics: {
        total_interactions: metrics.count,
        avg_effectiveness: metrics.avgScore,
        success_rate: metrics.successRate,
        last_updated: new Date()
      }
    })
    .eq('id', agentId)
}

Frontend - Agent Stats Display (2-3 hours):
// components/AgentStats.tsx
export function AgentStats() {
  const agents = useAgents()
  
  return (
    <div>
      {agents.map(agent => (
        <div key={agent.id}>
          <h3>{agent.name}</h3>
          <p>Interactions: {agent.performance_metrics.total_interactions}</p>
          <p>Success Rate: {agent.performance_metrics.success_rate}%</p>
        </div>
      ))}
    </div>
  )
}

Testing Checklist:
•	✓ All 7 agents work correctly
•	✓ Routing is accurate (math → math_specialist)
•	✓ Handoffs are smooth and natural
•	✓ Performance metrics update correctly
•	✓ Full conversation flow works end-to-end
•	✓ Deploy to production

🎉 MILESTONE: Multi-AI system operational!
 



4. DAYS 19-22: CURRICULUM SEQUENCING SYSTEM
Day 19: Database Schema + Simple Prerequisites
Vertical Slice 2: Prerequisite System
Database (2 hours):
-- Create sequencing tables
CREATE TABLE lesson_prerequisites (...);
CREATE TABLE curriculum_paths (...);
CREATE TABLE student_curriculum_progress (...);

-- Seed sample prerequisites for existing lessons
-- Example: Division requires Multiplication
INSERT INTO lesson_prerequisites (lesson_id, prerequisite_lesson_id, required_mastery_level)
SELECT 
  (SELECT id FROM lessons WHERE title LIKE '%Division%'),
  (SELECT id FROM lessons WHERE title LIKE '%Multiplication%'),
  80.0;

Backend - Prerequisite Checker (3-4 hours):
// lib/curriculum/prerequisite-checker.ts
export async function hasCompletedPrerequisites(
  userId: string,
  lessonId: string
): Promise<boolean> {
  // 1. Get all prerequisites for this lesson
  const { data: prereqs } = await supabase
    .from('lesson_prerequisites')
    .select('prerequisite_lesson_id, required_mastery_level')
    .eq('lesson_id', lessonId)
  
  if (!prereqs || prereqs.length === 0) return true // No prerequisites
  
  // 2. Check if student has mastered each prerequisite
  for (const prereq of prereqs) {
    const progress = await getUserLessonProgress(userId, prereq.prerequisite_lesson_id)
    
    if (!progress || progress.mastery_level < prereq.required_mastery_level) {
      return false // Prerequisite not met
    }
  }
  
  return true // All prerequisites met
}

Testing Checklist:
•	✓ Can check prerequisites for any lesson
•	✓ Returns false if prerequisites not met
•	✓ Returns true if all prerequisites satisfied
•	✓ Handles lessons with no prerequisites
•	✓ Deploy to production
 
Day 20: Next Lesson Calculator
Backend - Next Lesson Logic (4-5 hours):
// lib/curriculum/next-lesson.ts
export async function getNextLesson(
  userId: string,
  subject: string,
  gradeLevel: number
) {
  // 1. Get curriculum path for this subject/grade
  const { data: path } = await supabase
    .from('curriculum_paths')
    .select('lesson_sequence')
    .eq('subject', subject)
    .eq('grade_level', gradeLevel)
    .single()
  
  // 2. Get student's progress
  const { data: progress } = await supabase
    .from('student_curriculum_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('subject', subject)
    .eq('grade_level', gradeLevel)
    .single()
  
  // 3. Find next incomplete lesson that has prerequisites met
  for (const lessonId of path.lesson_sequence) {
    const completed = await isLessonCompleted(userId, lessonId)
    if (completed) continue
    
    const prereqsMet = await hasCompletedPrerequisites(userId, lessonId)
    if (!prereqsMet) continue // Skip, not ready
    
    return await getLesson(lessonId) // This is the next lesson!
  }
  
  // 4. All lessons completed - level up!
  return null // Signal to advance grade
}

Backend - API Route (2 hours):
// app/api/curriculum/next-lesson/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const subject = searchParams.get('subject')
  const gradeLevel = parseInt(searchParams.get('gradeLevel'))
  
  const nextLesson = await getNextLesson(userId, subject, gradeLevel)
  
  if (!nextLesson) {
    return NextResponse.json({
      completed: true,
      message: 'Congratulations! You completed all lessons for this grade.'
    })
  }
  
  return NextResponse.json({ lesson: nextLesson })
}

Testing Checklist:
•	✓ Returns correct next lesson based on prerequisites
•	✓ Skips lessons with unmet prerequisites
•	✓ Returns null when all lessons complete
•	✓ Works for different subjects
•	✓ Deploy to production
 
Day 21: Frontend - Auto Lesson Assignment
Frontend - Update Home Page (4-5 hours):
// app/page.tsx
export default function HomePage() {
  const { user } = useUser()
  const [nextLesson, setNextLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadNextLesson() {
      const res = await fetch(
        `/api/curriculum/next-lesson?userId=${user.id}&subject=Mathematics&gradeLevel=3`
      )
      const data = await res.json()
      setNextLesson(data.lesson)
      setLoading(false)
    }
    loadNextLesson()
  }, [user])
  
  if (loading) return <LoadingSpinner />
  
  return (
    <div>
      <h1>Welcome back, {user.name}!</h1>
      
      {nextLesson ? (
        <div className='next-lesson-card'>
          <h2>Today's Lesson: {nextLesson.title}</h2>
          <p>{nextLesson.subject} • Grade {nextLesson.grade_level}</p>
          <p>Duration: ~{nextLesson.estimated_duration_minutes} minutes</p>
          <button onClick={() => startLesson(nextLesson.id)}>
            Continue Learning
          </button>
        </div>
      ) : (
        <CelebrationScreen />  // All lessons done!
      )}
      
      <ProgressOverview userId={user.id} />
    </div>
  )
}

Frontend - Progress Overview Component (2-3 hours):
// components/ProgressOverview.tsx
export function ProgressOverview({ userId }: { userId: string }) {
  const progress = useCurriculumProgress(userId)
  
  return (
    <div className='progress-overview'>
      <h3>Your Progress</h3>
      
      {progress.map(p => (
        <div key={`${p.subject}-${p.grade_level}`}>
          <h4>{p.subject} - Grade {p.grade_level}</h4>
          <ProgressBar 
            completed={p.lessons_completed} 
            total={p.total_lessons} 
          />
          <p>{p.lessons_completed} / {p.total_lessons} lessons</p>
          <p>Mastery: {p.overall_mastery_score.toFixed(1)}%</p>
        </div>
      ))}
    </div>
  )
}

Testing Checklist:
•	✓ Student sees 'Today's Lesson' automatically
•	✓ No browsing - system assigns next lesson
•	✓ Progress overview shows completion
•	✓ Can't access lessons with unmet prerequisites
•	✓ Celebration when all lessons done
•	✓ Deploy to production
 
Day 22: Seed Curriculum Paths + Polish
Database - Create Curriculum Paths (3-4 hours):
// scripts/seed-curriculum-paths.ts
const mathGrade3Path = [
  'lesson-counting-1-10',
  'lesson-addition-basics',
  'lesson-subtraction-basics',
  'lesson-multiplication-intro',
  'lesson-division-intro',
  'lesson-fractions-intro',
  'lesson-equivalent-fractions',
  // ... all math lessons in order
]

await supabase.from('curriculum_paths').insert({
  subject: 'Mathematics',
  grade_level: 3,
  lesson_sequence: mathGrade3Path,
  total_lessons: mathGrade3Path.length
})

// Repeat for Science, English, etc.

Backend - Progress Tracking Updates (2-3 hours):
// Update lesson completion to also update curriculum progress
async function markLessonComplete(userId: string, lessonId: string, score: number) {
  // 1. Update lesson_progress
  await updateLessonProgress(userId, lessonId, score)
  
  // 2. Update student_curriculum_progress
  const lesson = await getLesson(lessonId)
  const { data: progress } = await supabase
    .from('student_curriculum_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('subject', lesson.subject)
    .eq('grade_level', lesson.grade_level)
    .single()
  
  await supabase
    .from('student_curriculum_progress')
    .update({
      lessons_completed: progress.lessons_completed + 1,
      lessons_mastered: score >= 80 ? progress.lessons_mastered + 1 : progress.lessons_mastered,
      overall_mastery_score: calculateAverageMastery(userId, lesson.subject),
      last_activity: new Date()
    })
    .eq('user_id', userId)
    .eq('subject', lesson.subject)
    .eq('grade_level', lesson.grade_level)
}

Testing Checklist:
•	✓ Curriculum paths seeded for all subjects
•	✓ Prerequisites defined correctly
•	✓ Progress updates when lesson completed
•	✓ Next lesson calculation works reliably
•	✓ Full flow: complete lesson → assessment → unlock next
•	✓ Deploy to production

🎉 MILESTONE: Automated curriculum sequencing works!
 
5. DAYS 23-25: AUTOMATED ASSESSMENT SYSTEM

               Done! Alhamdulillah
Day 23: Assessment Database + Question Bank
Vertical Slice 3: Voice-Based Assessment
Database (2 hours):
-- Create assessment tables
CREATE TABLE assessments (...);
CREATE TABLE assessment_attempts (...);

-- Seed assessment questions for existing lessons
INSERT INTO assessments (lesson_id, title, questions, passing_score) VALUES (
  'lesson-fractions-intro',
  'Fractions Understanding Check',
  '[
    {
      "id": "q1",
      "text": "What does the bottom number in a fraction represent?",
      "type": "open_ended",
      "correct_answer": "total equal parts",
      "points": 33.33
    },
    {
      "id": "q2",
      "text": "If a pizza is cut into 8 slices and you eat 3, what fraction did you eat?",
      "type": "fraction",
      "correct_answer": "3/8",
      "points": 33.33
    },
    {
      "id": "q3",
      "text": "True or false: The numerator is the top number in a fraction.",
      "type": "true_false",
      "correct_answer": "true",
      "points": 33.34
    }
  ]',
  80.0  -- Passing score
);

Backend - Assessment Loader (2-3 hours):
// lib/assessment/assessment-loader.ts
export async function getAssessmentForLesson(lessonId: string) {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('lesson_id', lessonId)
    .single()
  
  if (error || !data) {
    throw new Error('No assessment found for this lesson')
  }
  
  return data
}

Testing Checklist:
•	✓ Assessments seeded for all lessons
•	✓ Can load assessment by lesson ID
•	✓ Questions formatted correctly in JSON
•	✓ Deploy to production
 
                  Done! Alhamdulillah
Day 24: Assessment Conductor (Assessor AI)
Backend - Assessment Flow (5-6 hours):
// lib/assessment/assessment-conductor.ts
import { AIAgentManager } from '@/lib/ai/agent-manager'

export class AssessmentConductor {
  private agentManager: AIAgentManager
  
  async conductAssessment(
    userId: string,
    sessionId: string,
    lessonId: string
  ) {
    // 1. Get assessment questions
    const assessment = await getAssessmentForLesson(lessonId)
    
    // 2. Introduction from Assessor AI
    const assessor = await this.agentManager.getAgent('assessor')
    const intro = await assessor.introduce(assessment.title)
    await sendAudioResponse(intro)
    
    // 3. Ask each question via voice
    const answers = []
    for (const question of assessment.questions) {
      const answer = await this.askQuestionVoice(question)
      answers.push({
        questionId: question.id,
        userAnswer: answer,
        correctAnswer: question.correct_answer
      })
    }
    
    // 4. Grade answers
    const score = await this.gradeAssessment(assessment, answers)
    
    // 5. Provide feedback
    const feedback = await assessor.provideFeedback(score, assessment.passing_score)
    await sendAudioResponse(feedback)
    
    // 6. Save attempt
    await saveAssessmentAttempt({
      userId,
      assessmentId: assessment.id,
      sessionId,
      answers,
      score,
      passed: score >= assessment.passing_score
    })
    
    // 7. Update lesson progress
    if (score >= assessment.passing_score) {
      await markLessonComplete(userId, lessonId, score)
    }
    
    return { score, passed: score >= assessment.passing_score }
  }
  
  async askQuestionVoice(question: any) {
    // Ask question via TTS
    await speak(question.text)
    
    // Listen for student's answer via STT
    const answer = await listenForAnswer()
    
    return answer
  }
  
  async gradeAssessment(assessment: any, answers: any[]) {
    let totalPoints = 0
    let earnedPoints = 0
    
    for (const answer of answers) {
      const question = assessment.questions.find(q => q.id === answer.questionId)
      totalPoints += question.points
      
      // Use Assessor AI to grade (handles variations in phrasing)
      const isCorrect = await this.assessor.gradeAnswer(
        question.text,
        question.correct_answer,
        answer.userAnswer
      )
      
      if (isCorrect) {
        earnedPoints += question.points
      }
    }
    
    return (earnedPoints / totalPoints) * 100
  }
}

Backend - API Route (2 hours):
// app/api/assessment/conduct/route.ts
export async function POST(request: NextRequest) {
  const { userId, sessionId, lessonId } = await request.json()
  
  const conductor = new AssessmentConductor()
  const result = await conductor.conductAssessment(userId, sessionId, lessonId)
  
  return NextResponse.json(result)
}

Testing Checklist:
•	✓ Assessor AI can ask questions via voice
•	✓ Student can answer via voice
•	✓ AI grades answers (handles variations)
•	✓ Score calculated correctly
•	✓ Feedback provided based on performance
•	✓ Deploy to production
 
Day 25: Frontend Integration + Polish
Frontend - Assessment UI (4-5 hours):
// components/AssessmentMode.tsx
export function AssessmentMode({ lessonId, onComplete }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState([])
  const [isListening, setIsListening] = useState(false)
  
  async function handleAnswer(answer: string) {
    // Save answer
    setAnswers([...answers, answer])
    
    // Move to next question
    if (currentQuestion < assessment.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Assessment complete - grade it
      await submitAssessment()
    }
  }
  
  return (
    <div className='assessment-mode'>
      <h2>Quick Check: {assessment.title}</h2>
      <p>Question {currentQuestion + 1} of {assessment.questions.length}</p>
      
      <div className='question-card'>
        <p>{assessment.questions[currentQuestion].text}</p>
        
        <VoiceInput 
          onAnswer={handleAnswer}
          isListening={isListening}
        />
      </div>
      
      <ProgressIndicator current={currentQuestion + 1} total={assessment.questions.length} />
    </div>
  )
}

Frontend - Results Screen (2-3 hours):
// components/AssessmentResults.tsx
export function AssessmentResults({ score, passed, feedback }: Props) {
  return (
    <div className='results-screen'>
      {passed ? (
        <div className='success'>
          <h2>🎉 Great Job!</h2>
          <p>You scored {score.toFixed(1)}%</p>
          <p>{feedback}</p>
          <button onClick={continueToNextLesson}>
            Continue to Next Lesson
          </button>
        </div>
      ) : (
        <div className='retry'>
          <h2>Keep Learning!</h2>
          <p>You scored {score.toFixed(1)}%</p>
          <p>{feedback}</p>
          <button onClick={retryLesson}>
            Review Lesson
          </button>
        </div>
      )}
    </div>
  )
}

Testing Checklist:
•	✓ Complete lesson → assessment starts automatically
•	✓ Voice-based questions work smoothly
•	✓ Answer submission and grading work
•	✓ Results screen shows score and feedback
•	✓ If passed: unlock next lesson
•	✓ If failed: offer review or retry
•	✓ Motivator AI provides appropriate encouragement
•	✓ Deploy to production

🎉 MILESTONE: Automated assessment system complete!
 
6. DAYS 26-28: ADMIN DASHBOARD
Day 26: Dashboard Setup + Core KPIs
Vertical Slice 4: Admin Monitoring
Database - Admin Queries (2 hours):
// lib/admin/stats-queries.ts
export async function getSchoolStats() {
  // Total students
  const { count: totalStudents } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  
  // Active students (logged in today)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  
  const { count: activeStudents } = await supabase
    .from('sessions')
    .select('user_id', { count: 'exact', head: true })
    .gte('started_at', todayStart.toISOString())
  
  // Average mastery score
  const { data: avgMastery } = await supabase
    .rpc('calculate_avg_mastery')
  
  // Lessons completed today
  const { count: lessonsToday } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)
    .gte('completed_at', todayStart.toISOString())
  
  return {
    totalStudents,
    activeStudents,
    avgMastery,
    lessonsToday
  }
}

Backend - API Routes (2-3 hours):
// app/api/admin/stats/route.ts
export async function GET(request: NextRequest) {
  // TODO: Add admin authentication check
  
  const stats = await getSchoolStats()
  return NextResponse.json(stats)
}

// app/api/admin/students/route.ts
export async function GET(request: NextRequest) {
  const students = await getStudentList()
  return NextResponse.json(students)
}

Frontend - Dashboard Layout (3-4 hours):
// app/admin/page.tsx
export default function AdminDashboard() {
  const stats = useAdminStats()
  
  return (
    <div className='admin-dashboard'>
      <h1>School Dashboard</h1>
      
      {/* Core KPIs */}
      <div className='kpi-grid'>
        <KPICard 
          title='Total Students' 
          value={stats.totalStudents} 
          icon='👥'
        />
        <KPICard 
          title='Active Today' 
          value={stats.activeStudents} 
          icon='✅'
        />
        <KPICard 
          title='Lessons Today' 
          value={stats.lessonsToday} 
          icon='📚'
        />
        <KPICard 
          title='Avg Mastery' 
          value={`${stats.avgMastery}%`} 
          icon='⭐'
        />
      </div>
    </div>
  )
}

Testing Checklist:
•	✓ Dashboard loads with accurate stats
•	✓ KPIs update in real-time
•	✓ Responsive design works on all screens
•	✓ Deploy to production
 
Day 27: Student List + Individual Progress View
Backend - Student Details (2-3 hours):
// lib/admin/student-details.ts
export async function getStudentDetails(userId: string) {
  // Basic info
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  // Progress across all subjects
  const { data: progress } = await supabase
    .from('student_curriculum_progress')
    .select('*')
    .eq('user_id', userId)
  
  // Recent activity
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(10)
  
  return {
    user,
    progress,
    sessions
  }
}

Frontend - Student List (3-4 hours):
// components/admin/StudentList.tsx
export function StudentList() {
  const students = useStudents()
  const [selectedStudent, setSelectedStudent] = useState(null)
  
  return (
    <div className='student-list'>
      <h2>Students</h2>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Grade</th>
            <th>Avg Mastery</th>
            <th>Last Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.name}</td>
              <td>{student.grade_level}</td>
              <td>{student.avgMastery}%</td>
              <td>{formatDate(student.lastActive)}</td>
              <td>
                <button onClick={() => viewDetails(student)}>
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

Frontend - Student Detail View (3-4 hours):
// components/admin/StudentDetail.tsx
export function StudentDetail({ studentId }: { studentId: string }) {
  const details = useStudentDetails(studentId)
  
  return (
    <div className='student-detail'>
      <h2>{details.user.name}</h2>
      
      {/* Progress by subject */}
      <section>
        <h3>Progress by Subject</h3>
        {details.progress.map(p => (
          <div key={`${p.subject}-${p.grade_level}`}>
            <h4>{p.subject} - Grade {p.grade_level}</h4>
            <ProgressBar 
              completed={p.lessons_completed} 
              total={p.total_lessons} 
            />
            <p>Mastery: {p.overall_mastery_score.toFixed(1)}%</p>
          </div>
        ))}
      </section>
      
      {/* Recent activity */}
      <section>
        <h3>Recent Activity</h3>
        {details.sessions.map(session => (
          <div key={session.id}>
            <p>{session.lesson_title}</p>
            <p>{formatDate(session.started_at)}</p>
            <p>{session.duration_minutes} min</p>
          </div>
        ))}
      </section>
    </div>
  )
}

Testing Checklist:
•	✓ Student list displays all students
•	✓ Can click to view individual student details
•	✓ Progress shown accurately per subject
•	✓ Recent activity timeline works
•	✓ Deploy to production
 
Day 28: Struggling Students Alert + System Health
Backend - Struggling Students Identifier (2-3 hours):
// lib/admin/struggling-students.ts
export async function getStrugglingStudents() {
  // Students with avg mastery < 70%
  const { data: lowMastery } = await supabase
    .from('student_curriculum_progress')
    .select(`
      *,
      users (name, age)
    `)
    .lt('overall_mastery_score', 70)
  
  // Students who haven't logged in for 7+ days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: inactive } = await supabase
    .from('users')
    .select('*')
    .lt('last_active', sevenDaysAgo.toISOString())
  
  return {
    lowMastery,
    inactive
  }
}

Frontend - Alerts Dashboard (3-4 hours):
// components/admin/AlertsDashboard.tsx
export function AlertsDashboard() {
  const alerts = useStrugglingStudents()
  
  return (
    <div className='alerts-dashboard'>
      <h2>Student Alerts</h2>
      
      {/* Low mastery students */}
      <section>
        <h3>⚠️ Low Mastery ({alerts.lowMastery.length})</h3>
        <p>Students scoring below 70% on average</p>
        
        {alerts.lowMastery.map(student => (
          <div key={student.user_id} className='alert-card'>
            <p><strong>{student.users.name}</strong></p>
            <p>{student.subject} - {student.overall_mastery_score.toFixed(1)}%</p>
            <button onClick={() => viewStudent(student.user_id)}>
              View Details
            </button>
          </div>
        ))}
      </section>
      
      {/* Inactive students */}
      <section>
        <h3>😴 Inactive ({alerts.inactive.length})</h3>
        <p>Students who haven't logged in for 7+ days</p>
        
        {alerts.inactive.map(student => (
          <div key={student.id} className='alert-card'>
            <p><strong>{student.name}</strong></p>
            <p>Last active: {formatDate(student.last_active)}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

Backend - System Health (2 hours):
// lib/admin/system-health.ts
export async function getSystemHealth() {
  // AI agent performance
  const { data: agents } = await supabase
    .from('ai_agents')
    .select('*')
  
  // API error rate (last 24 hours)
  // Gemini API usage
  // Database performance
  
  return {
    agents,
    apiStatus: 'healthy',
    dbStatus: 'healthy'
  }
}

Frontend - System Health Display (2-3 hours):
// components/admin/SystemHealth.tsx
export function SystemHealth() {
  const health = useSystemHealth()
  
  return (
    <div className='system-health'>
      <h2>System Health</h2>
      
      {/* AI Agents */}
      <section>
        <h3>AI Agents</h3>
        {health.agents.map(agent => (
          <div key={agent.id}>
            <p>{agent.name}</p>
            <p>Status: {agent.status}</p>
            <p>Interactions: {agent.performance_metrics.total_interactions}</p>
          </div>
        ))}
      </section>
      
      {/* API Status */}
      <section>
        <h3>API Status</h3>
        <p>Gemini API: {health.apiStatus}</p>
        <p>Database: {health.dbStatus}</p>
      </section>
    </div>
  )
}

Testing Checklist:
•	✓ Struggling students identified correctly
•	✓ Inactive students flagged appropriately
•	✓ System health metrics display
•	✓ All dashboard features work together
•	✓ Deploy to production

🎉 MILESTONE: Admin dashboard complete!
 
7. DAYS 29-30: POLISH & DEMO PREPARATION
Day 29: End-to-End Testing + Bug Fixes
Complete Flow Testing (Full Day):
11.	New student sign up
12.	Get assigned first lesson automatically
13.	Complete lesson with Math AI
14.	Take voice assessment with Assessor AI
15.	Pass assessment → next lesson unlocks
16.	Progress tracked in curriculum system
17.	Admin dashboard shows updated stats
18.	View student details in admin panel
19.	Struggling student alerts work

Bug Fix Priorities:
•	Critical: Breaks core flow (assessment, lesson unlock)
•	High: Affects demo quality (UI glitches, agent handoffs)
•	Medium: Minor issues (styling, edge cases)
•	Low: Nice-to-have (defer to post-hackathon)

Performance Optimization:
•	Check API response times (<2s for teaching)
•	Optimize database queries (add missing indexes)
•	Test with multiple concurrent users
•	Verify Gemini API rate limits
 
Day 30: Demo Video + Submission
Demo Video Script (Record 3-5 minute video):
20.	Introduction (30 sec):
Hi! I'm [Your Name] and I built the world's first fully automated AI school.
No human teachers needed - our multi-agent AI system teaches, assesses,
and personalizes education for every student.

21.	Problem Statement (30 sec):
244 million children are out of school globally. Why? Lack of qualified teachers.
Traditional schools require 1 teacher per 30 students.
Our AI school can serve millions at near-zero marginal cost.

22.	Demo - Student Experience (90 sec):
Watch as Aisha, a 9-year-old, learns fractions...
[Show: Voice interaction with Math AI specialist]
[Show: SVG visualization being generated]
[Show: Voice-based assessment]
[Show: Next lesson auto-assigned after passing]

23.	Demo - Multi-AI System (45 sec):
Behind the scenes, our Coordinator AI routes questions to specialists:
[Show: Question routing in action]
[Show: Seamless handoff between agents]
[Show: 7 specialized agents working together]

24.	Demo - Admin Dashboard (30 sec):
School administrators can monitor hundreds of students at scale:
[Show: KPIs, student list, struggling student alerts]
Everything automated, everything measurable.

25.	Impact & Future (30 sec):
We've proven AI can replace human teachers for basic education.
Next: Partner with NGOs, deploy to refugee camps, rural areas.
Our goal: Make quality education accessible to every child, anywhere.

Submission Checklist:
•	✓ Demo video uploaded
•	✓ README updated with architecture details
•	✓ Live demo URL working
•	✓ GitHub repo public and clean
•	✓ Environment variables documented
•	✓ Hackathon submission form completed
 
8. TESTING STRATEGY
Manual Testing Checklist (Per Vertical Slice)
For Each Feature:
26.	Happy Path: Expected flow works perfectly
27.	Edge Cases: Unusual inputs, empty states, errors
28.	Integration: Works with other features
29.	Performance: Responds within 3 seconds
30.	User Experience: Intuitive, no confusion

Critical Flows to Test Daily:
•	Complete lesson → assessment → next lesson unlock
•	Multi-AI routing (ask math, science, English questions)
•	Prerequisites prevent accessing advanced lessons
•	Admin dashboard shows accurate real-time data
•	Voice input and output work reliably
 
9. DEPLOYMENT CHECKLIST
Daily Deployment Steps:
31.	Run database migrations (if any)
32.	Commit code to Git
33.	Push to main branch
34.	Vercel auto-deploys
35.	Test production URL
36.	Verify no regressions

Environment Variables (Production):
GEMINI_API_KEY
SONIOX_API_KEY
GOOGLE_APPLICATION_CREDENTIALS
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
 
10. DEMO SCRIPT FOR HACKATHON
Live Demo Flow (5 minutes)
1. Student Login (30 sec):
•	Show student dashboard
•	'Today's Lesson' automatically assigned
•	Progress overview visible

2. Voice Learning (90 sec):
•	Start lesson
•	Student asks math question
•	Coordinator routes to Math AI
•	Math AI teaches with SVG visual
•	Natural conversation flow

3. Assessment (60 sec):
•	Lesson completes
•	Assessor AI takes over
•	Voice-based quiz (3 questions)
•	Instant grading
•	Feedback + next lesson unlocked

4. Admin View (60 sec):
•	Switch to admin dashboard
•	Show 250+ students (fake data ok)
•	View individual student progress
•	Struggling students alert
•	Multi-AI agent performance

5. Close (30 sec):
•	Explain scalability: millions of students, near-zero cost
•	Global impact: 244M children
•	Next steps: partnerships, deployment
 
CONCLUSION
This 19-day roadmap transforms your educational platform into the world's first fully automated AI school. By building in vertical slices, testing continuously, and deploying daily, you'll deliver a production-ready system that demonstrates:

•	✅ Technical Excellence: Multi-AI architecture with Gemini 3 Flash
•	✅ Educational Innovation: Automated curriculum with prerequisite tracking
•	✅ Real-World Impact: Voice-based learning accessible to anyone, anywhere
•	✅ Scalability: Admin dashboard shows readiness for millions of students


In Sha Allah, this system will win the hackathon and transform education for millions of children worldwide.


Document Version: 1.0 - Complete 19-Day Implementation Plan
Date: January 2026
Days Remaining: 19 days to submission
