IMPLEMENTATION PLAN - BACKED BY OFFICIAL DOCS
Current Package Status:
You're using @google/genai version 1.35.0 (✅ correct modern SDK)
Latest is 1.37.0 (recommend upgrading but not critical)
PHASE 1: CLIENT-SIDE CACHING ⭐⭐
Effort: 1-2 hours | Impact: 50-100ms reduction | Risk: Very Low

Implementation Details:
1.1 Profile Caching
Location: app/learn/[lessonId]/page.tsx


// Add at the top of the component
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (match server-side cache)

interface CachedProfile {
  profile: any;
  timestamp: number;
}

// Helper function
function getCachedProfile(userId: string): any | null {
  const cached = localStorage.getItem(`profile_cache_${userId}`);
  if (!cached) return null;
  
  const { profile, timestamp }: CachedProfile = JSON.parse(cached);
  
  // Check if expired
  if (Date.now() - timestamp > CACHE_TTL_MS) {
    localStorage.removeItem(`profile_cache_${userId}`);
    return null;
  }
  
  return profile;
}

function setCachedProfile(userId: string, profile: any) {
  const cacheData: CachedProfile = {
    profile,
    timestamp: Date.now()
  };
  localStorage.setItem(`profile_cache_${userId}`, JSON.stringify(cacheData));
}
1.2 Lesson Details Caching
Location: app/dashboard/page.tsx (pre-fetch when lesson is selected)


// When user clicks lesson, cache it immediately
async function handleLessonClick(lessonId: string) {
  const lessonCache = localStorage.getItem(`lesson_${lessonId}`);
  
  if (!lessonCache) {
    // Fetch and cache
    const response = await fetch(`/api/lessons/${lessonId}`);
    const lesson = await response.json();
    localStorage.setItem(`lesson_${lessonId}`, JSON.stringify({
      lesson,
      timestamp: Date.now()
    }));
  }
  
  router.push(`/learn/${lessonId}`);
}
1.3 Session History Caching
Location: app/learn/[lessonId]/page.tsx


// Use React state to maintain last 5 messages in memory
const [conversationHistory, setConversationHistory] = useState<any[]>([]);

// Update after each interaction
function updateHistory(userMessage: string, aiResponse: string) {
  setConversationHistory(prev => {
    const updated = [...prev, { userMessage, aiResponse, timestamp: Date.now() }];
    // Keep only last 5
    return updated.slice(-5);
  });
}
1.4 Send Cached Data to Backend
Modification: Backend should accept optional cached data to skip DB queries


// app/learn/[lessonId]/page.tsx - handleTranscript()
const userId = localStorage.getItem('userId')!;
const cachedProfile = getCachedProfile(userId);
const cachedLesson = JSON.parse(localStorage.getItem(`lesson_${lessonId}`) || 'null')?.lesson;

const response = await fetchWithRetry('/api/teach/multi-ai', {
  method: 'POST',
  body: JSON.stringify({
    userId,
    sessionId,
    lessonId,
    userMessage: text,
    // Send cached data
    cachedProfile,
    cachedLesson,
    conversationHistory: conversationHistory
  })
});
Backend modification (app/api/teach/multi-ai/route.ts):


const { userId, sessionId, lessonId, userMessage, cachedProfile, cachedLesson, conversationHistory } = await request.json();

// Use cached data if provided, otherwise fetch from DB
const [profile, recentHistory, lessonResult] = await Promise.all([
  cachedProfile ? Promise.resolve(cachedProfile) : getUserProfile(userId),
  conversationHistory && conversationHistory.length > 0 
    ? Promise.resolve(conversationHistory) 
    : getSessionHistory(sessionId, 5),
  cachedLesson 
    ? Promise.resolve({ data: cachedLesson, error: null }) 
    : supabase.from('lessons').select('*').eq('id', lessonId).single()
]);
Expected Impact:

First request: Normal latency (50-100ms for context)
Subsequent requests: ~0-10ms for context (cached)
Total savings: 40-90ms per request after first
PHASE 2: GEMINI STREAMING + PROGRESSIVE TTS ⭐⭐⭐
Effort: 4-6 hours | Impact: 1000-1500ms reduction | Risk: Medium

Official Documentation References:
Gemini Streaming API: googleapis/js-genai streaming example
Google AI Developers Guide: Generate Content API
NPM Package: @google/genai v1.37.0
2.1 Backend: Modify Multi-AI to Use Streaming
Location: lib/ai/agent-manager.ts

Current Implementation:


// lib/ai/agent-manager.ts - teach() method
async teach(userMessage: string, context: AgentContext): Promise<TeachingResponseWithAgent> {
  // ... coordinator routing logic ...
  
  // Currently uses non-streaming
  const response = await this.gemini.teach({
    userMessage: prompt,
    systemContext: systemPrompt
  });
  
  return response;
}
New Streaming Implementation (Official Pattern):


// lib/ai/agent-manager.ts - NEW METHOD
async *teachStreaming(
  userMessage: string, 
  context: AgentContext
): AsyncGenerator<{chunk: string, metadata?: any}, TeachingResponseWithAgent, unknown> {
  
  // ... coordinator routing logic (same as before) ...
  
  // ✅ OFFICIAL PATTERN: Use generateContentStream
  // Reference: https://github.com/googleapis/js-genai/blob/main/sdk-samples/generate_content_streaming.ts
  const stream = this.gemini.teachStreaming({
    userMessage: prompt,
    systemContext: systemPrompt
  });
  
  let fullText = '';
  
  // ✅ OFFICIAL PATTERN: Iterate with for await...of
  for await (const chunk of stream) {
    fullText += chunk;
    yield { chunk }; // Emit chunk immediately
  }
  
  // Get final parsed response
  const streamResult = await stream.next();
  return streamResult.value.response;
}
2.2 Backend: Server-Sent Events (SSE) Endpoint
Create new file: app/api/teach/stream-progressive/route.ts

Official SSE Pattern (verified against Next.js 15 docs):


import { NextRequest } from 'next/server';
import { AIAgentManager } from '@/lib/ai/agent-manager';
import { generateSpeech } from '@/lib/tts/google-tts';

export async function POST(request: NextRequest) {
  const { userId, sessionId, lessonId, userMessage, cachedProfile, cachedLesson, conversationHistory } = await request.json();
  
  // Validate inputs...
  
  // Build context (use cached data if provided)
  const [profile, recentHistory, lessonResult] = await Promise.all([
    cachedProfile ? Promise.resolve(cachedProfile) : getUserProfile(userId),
    conversationHistory?.length > 0 ? Promise.resolve(conversationHistory) : getSessionHistory(sessionId, 5),
    cachedLesson ? Promise.resolve({ data: cachedLesson, error: null }) : supabase.from('lessons').select('*').eq('id', lessonId).single()
  ]);
  
  const lesson = lessonResult.data;
  
  const context: AgentContext = {
    userId,
    sessionId,
    lessonId,
    userProfile: profile,
    conversationHistory: recentHistory,
    lessonContext: lesson
  };
  
  // ✅ Create SSE stream (Next.js 15 pattern)
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const agentManager = new AIAgentManager();
      
      try {
        // Get streaming response from agent manager
        const aiStream = agentManager.teachStreaming(userMessage, context);
        
        let sentenceBuffer = '';
        let fullText = '';
        
        // Robust sentence detection (from existing implementation)
        const sentenceEndRegex = /(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|St|vs|etc|e\.g|i\.e))[.!?](?=\s+[A-Z]|\s*$)/;
        
        // ✅ OFFICIAL PATTERN: Process stream chunks
        for await (const { chunk, metadata } of aiStream) {
          fullText += chunk;
          sentenceBuffer += chunk;
          
          // Emit text chunk for real-time display
          controller.enqueue(
            encoder.encode(`event: text\ndata: ${JSON.stringify({ chunk })}\n\n`)
          );
          
          // Check for complete sentence
          const sentenceMatch = sentenceBuffer.match(sentenceEndRegex);
          if (sentenceMatch) {
            const endIndex = sentenceMatch.index! + sentenceMatch[0].length;
            const completeSentence = sentenceBuffer.substring(0, endIndex).trim();
            sentenceBuffer = sentenceBuffer.substring(endIndex).trim();
            
            if (completeSentence.length > 5) {
              try {
                // Generate TTS immediately
                const audioChunk = await generateSpeech(completeSentence);
                
                // ✅ Stream audio chunk immediately
                controller.enqueue(
                  encoder.encode(`event: audio\ndata: ${JSON.stringify({
                    audioBase64: audioChunk.toString('base64'),
                    text: completeSentence
                  })}\n\n`)
                );
              } catch (ttsError) {
                console.error('TTS error:', ttsError);
                // Continue without audio for this sentence
              }
            }
          }
        }
        
        // Handle remaining buffer
        if (sentenceBuffer.trim().length > 5) {
          const audioChunk = await generateSpeech(sentenceBuffer.trim());
          controller.enqueue(
            encoder.encode(`event: audio\ndata: ${JSON.stringify({
              audioBase64: audioChunk.toString('base64'),
              text: sentenceBuffer
            })}\n\n`)
          );
        }
        
        // Get final metadata (SVG, lessonComplete, etc.)
        const streamResult = await aiStream.next();
        const finalResponse = streamResult.value;
        
        controller.enqueue(
          encoder.encode(`event: complete\ndata: ${JSON.stringify({
            svg: finalResponse.svg,
            lessonComplete: finalResponse.lessonComplete,
            agentName: finalResponse.agentName
          })}\n\n`)
        );
        
        controller.close();
        
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          })}\n\n`)
        );
        controller.close();
      }
    }
  });
  
  // ✅ Return SSE response (Next.js 15 headers)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
2.3 Frontend: EventSource Client
Location: app/learn/[lessonId]/page.tsx

Official EventSource Pattern:


async function handleTranscript(text: string) {
  setVoiceState('thinking');
  
  const userId = localStorage.getItem('userId')!;
  const cachedProfile = getCachedProfile(userId);
  const cachedLesson = JSON.parse(localStorage.getItem(`lesson_${lessonId}`) || 'null')?.lesson;
  
  // Create request body
  const requestBody = {
    userId,
    sessionId,
    lessonId,
    userMessage: text,
    cachedProfile,
    cachedLesson,
    conversationHistory
  };
  
  // ✅ Use fetch with streaming response
  const response = await fetch('/api/teach/stream-progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error('Streaming request failed');
  }
  
  // ✅ Read SSE stream
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  
  let displayText = '';
  const audioQueue: HTMLAudioElement[] = [];
  let isPlayingAudio = false;
  
  // Create initial response entry
  setTeacherResponses(prev => [...prev, {
    audioText: '',
    displayText: '',
    svg: null,
    audioBase64: '',
    agentName: 'coordinator'
  }]);
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('event:')) {
          const eventType = line.slice(6).trim();
          const nextLine = lines[lines.indexOf(line) + 1];
          if (!nextLine?.startsWith('data:')) continue;
          
          const data = JSON.parse(nextLine.slice(5).trim());
          
          if (eventType === 'text') {
            // Update display text in real-time
            displayText += data.chunk;
            setTeacherResponses(prev => {
              const updated = [...prev];
              updated[updated.length - 1].displayText = displayText;
              return updated;
            });
          }
          
          else if (eventType === 'audio') {
            // Queue audio chunk for playback
            const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
            audioQueue.push(audio);
            
            if (!isPlayingAudio) {
              playNextAudio();
            }
          }
          
          else if (eventType === 'complete') {
            // Update with final metadata
            setTeacherResponses(prev => {
              const updated = [...prev];
              updated[updated.length - 1].svg = data.svg;
              updated[updated.length - 1].agentName = data.agentName;
              return updated;
            });
            
            if (data.lessonComplete) {
              localStorage.setItem('aiTriggeredCompletion', 'true');
            }
          }
          
          else if (eventType === 'error') {
            throw new Error(data.error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    setToastMessage('Connection error. Please try again.');
    setVoiceState('idle');
  }
  
  // Audio playback queue function
  async function playNextAudio() {
    if (audioQueue.length === 0) {
      isPlayingAudio = false;
      setVoiceState('idle');
      
      // Check for lesson completion
      if (localStorage.getItem('aiTriggeredCompletion') === 'true') {
        localStorage.removeItem('aiTriggeredCompletion');
        setShowAssessment(true);
      }
      return;
    }
    
    isPlayingAudio = true;
    setVoiceState('speaking');
    
    const audio = audioQueue.shift()!;
    audio.addEventListener('ended', () => playNextAudio());
    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      playNextAudio(); // Skip to next
    });
    
    await audio.play().catch(() => playNextAudio());
  }
}
EXPECTED RESULTS:
Before Optimization:

Total latency: 1,600-3,200ms
Time to first audio: 1,600-3,200ms
After Phase 1 (Caching):

Total latency: 1,550-3,100ms
Context building: 50-100ms → 0-10ms
Savings: 40-90ms
After Phase 1 + 2 (Caching + Streaming):

Time to first audio: 300-600ms ✅ (60-80% faster)
Total completion: 1,200-2,000ms
User hears first sentence while AI still generating ✅
SOURCES:
Google GenAI SDK Streaming Example
Gemini API Generate Content Docs
@google/genai NPM Package
Firebase Streaming Guide