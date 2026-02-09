# How We Built Bloom Academia

## Overview

Bloom Academia is an AI-powered voice-based tutoring platform that delivers personalized, adaptive education through natural conversation. Built with Next.js 15 and Google's Gemini 3 Flash, the system uses a multi-agent architecture where specialized AI teachers collaborate to provide subject-specific instruction while continuously adapting to each student's learning style, pace, and comprehension.

## Core Architecture

The platform employs a three-layer memory system that powers true personalization. Layer 1 stores permanent student traits—learning style preferences, persistent strengths, and recurring struggles—updated in real-time as patterns emerge during lessons. Layer 2 maintains session-specific conversation history, allowing the AI to reference previous exchanges and maintain contextual continuity. Layer 3 generates adaptive teaching directives on-the-fly, translating student data into actionable instructions that modify AI behavior moment-to-moment.

Seven specialized AI agents handle distinct roles. The Coordinator routes student questions to appropriate specialists and manages session flow. Five subject specialists—Math, Science, English, History, and Art—each have unique teaching personalities, thinking levels, and voice characteristics. The Math specialist uses high-level reasoning for multi-step problem solving, while the Art specialist employs intuitive low-level thinking for creative encouragement. An Assessor evaluates mastery through structured quizzes, and a Motivator provides emotional support when students struggle. Each agent operates with agent-specific Google Search grounding (History and Science only), thinking level configuration, and distinct Neural2 TTS voices.

## Voice Pipeline & Progressive Streaming

Students interact entirely through voice. Audio captures as base64-encoded data and streams directly to Gemini 3 Flash without transcription, leveraging native audio understanding. The system implements progressive streaming with three-tier optimization: Gemini starts responding immediately, extracts the first complete sentence within 300-500ms, and generates TTS audio for it in parallel while continuing to stream the remaining response. This achieves 30-40% latency reduction compared to waiting for full response completion before starting TTS. If progressive streaming fails, the system falls back to regular streaming, then non-streaming if needed, ensuring responses always reach students.

The complete pipeline executes in under 2.5 seconds from microphone release to audio playback. Context building takes 50-150ms through parallel Promise.all fetching of profile, history, lesson data, and active specialist. Routing decisions complete in 200-400ms using LOW thinking level for the Coordinator. AI response generation takes 1,000-1,400ms with progressive streaming. TTS synthesis requires 300-600ms through chunked parallel processing. Audio buffers combine and encode as base64 MP3 for immediate playback.

## Adaptive Teaching System

The platform implements real-time behavioral adaptation through three mechanisms. First, adaptive directives generate before each interaction by analyzing current mastery level (0-100 scale), learning style preferences, and detected struggle patterns. These directives inject as specific teaching instructions: "Use more visual diagrams for this visual learner," "Slow down explanations—student struggling with prerequisites," or "Increase difficulty—student has 85% mastery." The AI receives these as part of its system context, actively modifying teaching behavior rather than passively receiving background information.

Second, profile enrichment updates student data mid-session. As the AI teaches, an evidence extraction system analyzes each conversation exchange, identifying five evidence types: correct answers, quality explanations, self-corrections, applications to new contexts, and conceptual connections. When patterns emerge—three or more struggles with a specific topic, or 80%+ high-quality evidence demonstrating mastery—the system updates the user's profile immediately and invalidates the cache. The very next interaction in the same session loads the updated profile, enabling same-session adaptation.

Third, mastery detection overrides subjective AI decisions with objective criteria. When a specialist sets lessonComplete to true, the system doesn't trust this blindly. Instead, it evaluates six objective rules: 70% answer accuracy, at least two quality explanations, presence of self-correction, application to new situations, minimum five minutes engagement time, and at least three pieces of positive evidence overall. If these criteria aren't satisfied, the system vetoes the AI's completion decision and continues the lesson, preventing premature advancement based on politeness or misread comprehension.

## Smart Routing & Session Management

The system optimizes routing through fast-path detection. When a specialist is already actively teaching a student (tracked via the last agent interaction), subsequent questions route directly to that specialist, saving 200-400ms by skipping Coordinator analysis. When no specialist is active, the routing logic branches: audio or media input without accompanying text routes directly to the subject specialist matching the lesson (math lesson to math_specialist, etc.), while text messages go through the Coordinator for intelligent routing based on content analysis.

Auto-start greetings trigger when lessons load. The Coordinator automatically introduces the lesson title and learning objective, asks if the student is ready, and plays the greeting audio without requiring the student to speak first. This creates a welcoming onboarding experience and establishes conversational flow immediately.

## Media Support & Vision Analysis

Beyond voice, students can upload images and videos for visual problem-solving. The system validates MIME types (JPEG, PNG, WebP for images; MP4, WebM for videos), encodes as base64, and passes to Gemini for vision analysis. Use cases include photographing handwritten math work for error detection, submitting science experiment diagrams for analysis, or uploading historical artifacts for discussion. The AI analyzes visual content contextually within the ongoing lesson and responds with both spoken explanations and visual SVG diagrams when appropriate.

## Response Generation & Display

The AI generates structured responses with three components: audioText optimized for natural speech synthesis, displayText formatted as Markdown with LaTeX math equations, and optional SVG diagrams for visual representation. Audio plays through distinct Neural2 voices—each agent has its own voice personality—while displayText renders with KaTeX math support (inline dollar signs and block double-dollar notation). SVG diagrams display in a whiteboard area, providing visual scaffolding for abstract concepts.

Handoff messages enable smooth specialist transitions. When the Coordinator routes to a new specialist, it can provide a visual-only transition message like "Let me connect you to our Math specialist" displayed on screen but not spoken, maintaining voice continuity as the new specialist immediately responds.

## Data Persistence & Analytics

The system employs dual-write persistence with fire-and-forget pattern. Every interaction writes to two tables simultaneously: agent_interactions for analytics (tracking which agent responded, routing decisions, response times) and interactions for memory (storing conversation history loaded into Layer 2 context). Both writes execute asynchronously with errors logged but not thrown, ensuring persistence never blocks student experience.

Adaptation logging creates an audit trail proving behavioral changes occurred. Each interaction logs which adaptive directives were generated, what learning style adjustments were made, whether difficulty was modified, and whether visual aids were used. This enables verification that the AI actually adapted rather than just receiving static context.

Mastery evidence accumulates in a dedicated table with AI-extracted quality scores, confidence levels, and evidence types. The trajectory analyzer processes this data across sessions, detecting trends (improving, declining, stable) with confidence scoring based on session count and volatility. Human-readable messages with emoji indicators (📈 📉 ➡️) surface in teacher dashboards for at-a-glance progress monitoring.

## Error Handling & Resilience

The architecture prioritizes never blocking students. Three-tier fallback ensures responses always deliver: try progressive streaming, fall back to regular streaming if that fails, fall back to non-streaming if needed, only then return error. All non-critical operations—adaptation logging, profile enrichment, mastery evidence extraction, analytics writes—execute as fire-and-forget background tasks that log errors but don't throw exceptions.

Network resilience includes offline detection warning users before attempting requests, retry logic with exponential backoff (maximum three attempts), abort controllers canceling pending requests when new interactions start, and graceful degradation where audio failures fall back to text-only mode with toast notifications.

## Performance Characteristics

The system achieves sub-2.5-second end-to-end latency through multiple optimizations. Parallel context building via Promise.all eliminates sequential round-trips. Fast-path routing skips unnecessary Coordinator analysis. Progressive streaming starts TTS generation 500-1,400ms earlier than waiting for complete responses. Chunked TTS synthesis parallelizes audio generation across sentences. Module-level agent caching with 5-minute TTL eliminates repeated database fetches.

The result: students experience near-instant AI responses that feel conversational rather than transactional, with teaching quality preserved through high thinking levels for complex subjects, Google Search grounding for factual accuracy in History and Science, and schema-validated JSON responses preventing malformed output.

## Technical Stack

Next.js 15 with App Router provides the serverless backend via API routes and React client components for the frontend. Google Gemini 3 Flash powers all AI agents with model-specific thinking levels and optional Search grounding. Google Cloud Text-to-Speech Neural2 voices generate distinct audio personalities. Supabase PostgreSQL stores all user data, conversations, evidence, and analytics with Supabase-js v2 client library. Zod provides runtime schema validation for AI responses. The voice pipeline uses browser MediaRecorder API for audio capture and HTML5 Audio API for playback. Markdown rendering via react-markdown with remark-math and rehype-katex enables LaTeX math display.

## Deployment Model

The platform deploys as a serverless application on Vercel with edge function support. All API routes execute as serverless functions with automatic scaling. Database connections pool through Supabase's built-in connection pooler. Environment variables secure API keys for Gemini, Google TTS credentials as JSON, and Supabase keys. The architecture supports concurrent users without shared state through module-level caching (5-minute TTL) and fire-and-forget background operations that don't block request threads.
