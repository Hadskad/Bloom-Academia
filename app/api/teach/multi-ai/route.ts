/**
 * POST /api/teach/multi-ai - Multi-AI Teaching Endpoint
 *
 * Day 15-18 Implementation: Multi-Agent AI Teaching System
 * - Routes requests through Coordinator to appropriate specialists
 * - Math, Science, English, History, Art specialists
 * - Assessor and Motivator support agents
 *
 * This endpoint uses the AIAgentManager to:
 * 1. Analyze student message with Coordinator
 * 2. Route to appropriate specialist
 * 3. Get personalized response with agent context
 * 4. Track which agent handled the interaction
 *
 * Request body:
 * {
 *   userId: string,
 *   sessionId: string,
 *   lessonId: string,
 *   userMessage: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   teacherResponse: {
 *     audioText: string,
 *     displayText: string,
 *     svg: string | null,
 *     audioBase64: string,
 *     agentName: string,        // Which agent responded
 *     handoffMessage?: string   // Transition message (if routed)
 *   },
 *   lessonComplete: boolean,
 *   routing: {
 *     agentName: string,
 *     reason: string
 *   }
 * }
 *
 * Reference: Implementation_Roadmap_2.md - Section 3 (Days 15-18)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIAgentManager } from '@/lib/ai/agent-manager';
import { generateSpeech } from '@/lib/tts/google-tts';
import { getUserProfile } from '@/lib/memory/profile-manager';
import { getSessionHistory, saveInteraction } from '@/lib/memory/session-manager';
import { supabase } from '@/lib/db/supabase';
import type { AgentContext } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const { userId, sessionId, lessonId, userMessage } = await request.json();

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json(
        { error: 'lessonId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'userMessage is required and must be a string' },
        { status: 400 }
      );
    }

    // Build context from all memory layers (in parallel for performance)
    // Reference: https://supabase.com/docs/reference/javascript/select
    const [profile, recentHistory, lessonResult] = await Promise.all([
      getUserProfile(userId),
      getSessionHistory(sessionId, 5),
      supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()
    ]);

    if (lessonResult.error) {
      return NextResponse.json(
        { error: `Failed to fetch lesson: ${lessonResult.error.message}` },
        { status: 404 }
      );
    }

    const lesson = lessonResult.data;

    // Build agent context
    const context: AgentContext = {
      userId,
      sessionId,
      lessonId,
      userProfile: {
        name: profile.name,
        age: profile.age,
        grade_level: profile.grade_level,
        learning_style: profile.learning_style,
        strengths: profile.strengths,
        struggles: profile.struggles
      },
      conversationHistory: recentHistory.map(h => ({
        user_message: h.user_message,
        ai_response: h.ai_response,
        timestamp: h.timestamp
      })),
      lessonContext: {
        title: lesson.title,
        subject: lesson.subject,
        learning_objective: lesson.learning_objective
      }
    };

    // Initialize Multi-AI Manager
    const agentManager = new AIAgentManager();

    // Get response through Multi-AI system (routes automatically)
    const aiResponse = await agentManager.teach(userMessage, context);

    // Build audio text (include handoff message if present)
    let audioText = aiResponse.audioText;
    if (aiResponse.handoffMessage) {
      audioText = `${aiResponse.handoffMessage} ${audioText}`;
    }

    // Generate speech from audio text
    const audioBuffer = await generateSpeech(audioText);
    const audioBase64 = audioBuffer.toString('base64');

    // Get agent ID for interaction tracking
    const agent = await agentManager.getAgent(aiResponse.agentName);

    // Save agent interaction to database (agent_interactions table)
    await agentManager.saveInteraction({
      session_id: sessionId,
      agent_id: agent.id,
      user_message: userMessage,
      agent_response: aiResponse.displayText,
      routing_reason: aiResponse.routingReason,
      response_time_ms: Date.now() - startTime
    });

    // DUAL-WRITE: Also save to interactions table for backward compatibility
    // This ensures the 3-layer memory system receives conversation context
    // Reference: Option 1 implementation - Dual-Write System for context preservation
    try {
      await saveInteraction(sessionId, {
        userMessage: userMessage,
        aiResponse: aiResponse.displayText
      });
    } catch (interactionError) {
      // Log but don't fail the request - agent_interactions already saved
      console.error('Failed to save to interactions table (non-critical):', interactionError);
    }

    // Return response matching existing API structure (with new fields)
    return NextResponse.json({
      success: true,
      teacherResponse: {
        audioText: aiResponse.audioText,
        displayText: aiResponse.displayText,
        svg: aiResponse.svg,
        audioBase64,
        agentName: aiResponse.agentName,
        handoffMessage: aiResponse.handoffMessage
      },
      lessonComplete: aiResponse.lessonComplete || false,
      routing: {
        agentName: aiResponse.agentName,
        reason: aiResponse.routingReason
      }
    });

  } catch (error) {
    console.error('Error in /api/teach/multi-ai:', error);

    return NextResponse.json(
      {
        error: 'Failed to process teaching request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
