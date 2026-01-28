/**
 * TeacherAvatar Component
 *
 * Displays the current AI agent with visual styling.
 * Part of the Multi-AI Teaching System (Day 16).
 *
 * Shows which specialist agent is responding:
 * - Coordinator (general routing)
 * - Math Specialist
 * - Science Specialist
 * - English Specialist
 * - History Specialist
 * - Art Specialist
 * - Assessor (for quizzes)
 * - Motivator (for encouragement)
 *
 * Reference: Implementation_Roadmap_2.md - Day 16
 */

interface AgentInfo {
  name: string
  emoji: string
  color: string
  bgColor: string
}

const agentInfo: Record<string, AgentInfo> = {
  coordinator: {
    name: 'Teacher',
    emoji: '👨‍🏫',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  math_specialist: {
    name: 'Math Teacher',
    emoji: '🔢',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  science_specialist: {
    name: 'Science Teacher',
    emoji: '🔬',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  english_specialist: {
    name: 'English Teacher',
    emoji: '📚',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200'
  },
  history_specialist: {
    name: 'History Teacher',
    emoji: '🏛️',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200'
  },
  art_specialist: {
    name: 'Art Teacher',
    emoji: '🎨',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 border-pink-200'
  },
  assessor: {
    name: 'Quiz Master',
    emoji: '📝',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200'
  },
  motivator: {
    name: 'Cheerleader',
    emoji: '🌟',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200'
  }
}

// Default fallback for unknown agents
const defaultAgent: AgentInfo = {
  name: 'Teacher',
  emoji: '👨‍🏫',
  color: 'text-gray-600',
  bgColor: 'bg-gray-50 border-gray-200'
}

interface TeacherAvatarProps {
  agentName: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

export function TeacherAvatar({
  agentName,
  size = 'md',
  showName = true
}: TeacherAvatarProps) {
  const agent = agentInfo[agentName] || defaultAgent

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-2',
    lg: 'text-lg gap-3'
  }

  const emojiSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  }

  return (
    <div
      className={`inline-flex items-center ${sizeClasses[size]} px-3 py-1.5 rounded-full border ${agent.bgColor}`}
    >
      <span className={emojiSizes[size]} role="img" aria-label={agent.name}>
        {agent.emoji}
      </span>
      {showName && (
        <span className={`font-medium ${agent.color}`}>{agent.name}</span>
      )}
    </div>
  )
}

/**
 * Hook to get agent display info
 * Useful when you need the color/emoji outside the component
 */
export function useAgentInfo(agentName: string): AgentInfo {
  return agentInfo[agentName] || defaultAgent
}

/**
 * Get agent info directly (for non-React contexts)
 */
export function getAgentInfo(agentName: string): AgentInfo {
  return agentInfo[agentName] || defaultAgent
}
