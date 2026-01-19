/**
 * VoiceIndicator Component
 *
 * Visual feedback component showing the current state of voice interaction.
 * Provides clear visual and textual cues for students to understand what's happening.
 *
 * States:
 * - idle: Ready to receive input (gray, static)
 * - listening: Recording student speech (primary blue, pulsing)
 * - thinking: AI is processing (accent orange, spinning)
 * - speaking: AI is responding (success green, pulsing)
 *
 * Design:
 * - Large circular indicator (96x96px) for clear visibility
 * - Animated icons matching state
 * - Text label below for additional clarity
 * - Color-coded per design system
 *
 * Reference:
 * - Bloom_Academia_Frontend.md - Design System colors
 * - Implementation_Roadmap.md - Day 14
 */

'use client'

import { Mic, Volume2, Loader2 } from 'lucide-react'

interface VoiceIndicatorProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking'
}

export function VoiceIndicator({ state }: VoiceIndicatorProps) {
  // State-specific configurations
  const stateConfig = {
    idle: {
      bgColor: 'bg-gray-300',
      icon: <Mic className="text-gray-500" size={40} />,
      text: 'Click to speak',
      textColor: 'text-gray-600'
    },
    listening: {
      bgColor: 'bg-primary animate-pulse',
      icon: <Mic className="text-white" size={40} />,
      text: "I'm listening...",
      textColor: 'text-primary'
    },
    thinking: {
      bgColor: 'bg-accent',
      icon: <Loader2 className="text-white animate-spin" size={40} />,
      text: 'Let me think...',
      textColor: 'text-accent'
    },
    speaking: {
      bgColor: 'bg-success animate-pulse',
      icon: <Volume2 className="text-white" size={40} />,
      text: "Here's what I think...",
      textColor: 'text-success'
    }
  }

  const config = stateConfig[state]

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Visual Indicator Circle */}
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${config.bgColor}`}
        role="status"
        aria-live="polite"
        aria-label={`Voice assistant is ${state}`}
      >
        {config.icon}
      </div>

      {/* Status Text */}
      <p className={`text-lg font-medium ${config.textColor}`}>
        {config.text}
      </p>
    </div>
  )
}
