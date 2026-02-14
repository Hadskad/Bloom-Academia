'use client';

import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Home, Loader2 } from 'lucide-react';
import {
  useWalkthroughStore,
  WALKTHROUGH_STEPS,
  STEP_TITLES,
  STEP_ROUTES,
  type WalkthroughStep,
} from '@/lib/walkthrough/walkthrough-store';
import { useRouter, usePathname } from 'next/navigation';

const DIAGRAM_STEPS: WalkthroughStep[] = [
  'multi-agent',
  'memory-architecture',
  'curriculum',
  'voice-pipeline',
  'disability-support',
];

// Map steps to actions that should be triggered before showing overlay
const STEP_ACTIONS: Partial<Record<WalkthroughStep, string>> = {
  'assessment-mode': 'trigger-assessment',
  // Add more actions as needed for other steps
};

const SCREEN_DESCRIPTIONS: Partial<Record<WalkthroughStep, { title: string; description: string; highlights: string[] }>> = {
  'voice-learning': {
    title: 'Voice Learning Interface',
    description: 'This is where the magic happens. Students speak to their AI teacher and receive personalized instruction with real-time whiteboard visualizations.',
    highlights: [
      '🎤 Microphone button for voice input (Soniox STT)',
      '🧑‍🏫 Teacher avatar shows active AI agent',
      '📝 Conversation history with markdown support',
      '🎨 Dynamic SVG whiteboard for visual explanations',
      '🔊 Natural voice responses (Google TTS)',
    ],
  },
  'curriculum-builder': {
    title: 'Curriculum Builder',
    description: 'Non-technical users can design and manage curriculum without code. Build subjects, topics, and lessons with learning objectives and prerequisites.',
    highlights: [
      '📚 Create subjects with custom grade levels',
      '📖 Build topics and lessons visually',
      '🎯 Define learning objectives per lesson',
      '🔗 Set prerequisites for lesson sequencing',
      '✏️ No coding required - designed for educators',
    ],
  },
  'assessment-mode': {
    title: 'Assessment Mode',
    description: 'When the AI detects lesson mastery, it automatically triggers an assessment. MCQ questions verify understanding.',
    highlights: [
      '📋 Auto-triggered when lesson objectives are met',
      '❓ Multiple choice questions with hints',
      '📊 Progress bar shows completion',
      '🎯 Points tracked per question',
    ],
  },
  'assessment-results': {
    title: 'Assessment Results',
    description: 'Detailed feedback on each question with explanations. Students see exactly what they got right and where to improve.',
    highlights: [
      '✅ Per-question breakdown with correct answers',
      '💡 Detailed explanations for learning',
      '🏆 Overall score and pass/fail status',
      '🔄 Option to retry if below threshold',
    ],
  },
  'lesson-complete': {
    title: 'Lesson Completion',
    description: 'Celebration screen that rewards achievement and shows learning metrics.',
    highlights: [
      '🎉 Celebration animation for accomplishment',
      '⏱️ Time spent in lesson',
      '❓ Questions asked during session',
      '📈 Mastery percentage achieved',
      '➡️ Recommendation for next lesson',
    ],
  },
  'progress-dashboard': {
    title: 'Progress Dashboard',
    description: 'Students track their entire learning journey across all subjects and lessons.',
    highlights: [
      '📊 Overall learning statistics',
      '📚 Progress per lesson with mastery levels',
      '⏱️ Time spent learning',
      '🔢 Attempt counts per lesson',
      '📈 Visual progress bars',
    ],
  },
  'admin-dashboard': {
    title: 'Admin Dashboard',
    description: 'School administrators monitor all students, track KPIs, and receive alerts for students needing attention.',
    highlights: [
      '📈 School-wide KPIs (enrolled, active, mastery)',
      '⚠️ Student alerts (low mastery, inactive)',
      '👥 Student list with detailed views',
      '🏥 System health monitoring',
    ],
  },
  'agent-metrics': {
    title: 'AI Agent Performance Metrics',
    description: 'Track how each AI agent performs across all interactions. Essential for monitoring teaching quality at scale.',
    highlights: [
      '🤖 Per-agent interaction counts',
      '✅ Success rates per specialist',
      '⭐ Response quality scores',
      '🔄 Real-time updates (60s refresh)',
    ],
  },
};

export function ScreenOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isActive,
    currentStep,
    currentStepIndex,
    nextStep,
    previousStep,
    endWalkthrough,
    setTriggerAction,
    isNavigating,
    setNavigating,
  } = useWalkthroughStore();

  const isDiagramStep = currentStep && DIAGRAM_STEPS.includes(currentStep);
  const isScreenStep = currentStep && !isDiagramStep;
  const totalSteps = WALKTHROUGH_STEPS.length;
  const isLastStep = currentStepIndex === WALKTHROUGH_STEPS.length - 1;

  // Get current step info
  const stepInfo = currentStep ? SCREEN_DESCRIPTIONS[currentStep] : null;
  const expectedRoute = currentStep ? STEP_ROUTES[currentStep] : null;

  // Trigger navigation when the walkthrough step requires a different route
  useEffect(() => {
    if (isActive && isScreenStep && expectedRoute && pathname !== expectedRoute) {
      setNavigating(true);
      router.push(expectedRoute);
    }
  }, [isActive, isScreenStep, expectedRoute, pathname, router, setNavigating]);

  // Clear loading state once we've arrived at the expected route
  useEffect(() => {
    if (isNavigating && pathname === expectedRoute) {
      setNavigating(false);
    }
  }, [isNavigating, pathname, expectedRoute, setNavigating]);

  // Handle navigation
  const handleNext = useCallback(() => {
    if (isLastStep) {
      endWalkthrough();
      router.push('/');
    } else {
      const nextStepIndex = currentStepIndex + 1;
      const nextStepKey = WALKTHROUGH_STEPS[nextStepIndex];
      const nextRoute = STEP_ROUTES[nextStepKey];

      // Check if next step requires a trigger action
      const actionToTrigger = STEP_ACTIONS[nextStepKey];
      if (actionToTrigger) {
        // Set loading state immediately
        setNavigating(true);

        // Set the trigger action before advancing step
        // The page will respond to this trigger and update its state
        setTriggerAction(actionToTrigger);

        // Small delay to allow the action to be processed
        setTimeout(() => {
          nextStep();
        }, 100);
      } else {
        // No action needed, just advance step
        // The useEffect at line 140-145 will handle navigation automatically
        nextStep();
      }
    }
  }, [isLastStep, currentStepIndex, pathname, router, nextStep, endWalkthrough, setTriggerAction, setNavigating]);

  const handlePrevious = useCallback(() => {
    const prevStepIndex = currentStepIndex - 1;
    const prevStepKey = WALKTHROUGH_STEPS[prevStepIndex];
    const prevRoute = STEP_ROUTES[prevStepKey];

    // Set loading state
    setNavigating(true);

    // If going back to diagram steps, navigate to home
    if (DIAGRAM_STEPS.includes(prevStepKey)) {
      if (pathname !== '/') {
        router.push('/');
      }
    } else if (prevRoute && pathname !== prevRoute) {
      router.push(prevRoute);
    }
    previousStep();
  }, [currentStepIndex, pathname, router, previousStep, setNavigating]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || !isScreenStep) return;

      if (e.key === 'Escape') {
        endWalkthrough();
        router.push('/');
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isScreenStep, handleNext, handlePrevious, endWalkthrough, router]);

  if (!isActive || !isScreenStep || !stepInfo) {
    return null;
  }

  // Determine if this is a live class demo step (compact panel)
  const isLiveClassDemo = currentStep === 'voice-learning' || currentStep === 'assessment-mode' || currentStep === 'assessment-results';

  // Use compact layout for live class, expanded layout for other screens
  const isCompactLayout = isLiveClassDemo;

  return (
    <>
      {/* Loading Overlay - Shows during screen transitions */}
      {isNavigating && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Loading next screen...</p>
              <p className="text-sm text-gray-600">Please wait a moment</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Panel - Responsive sizing based on screen type */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-primary shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {isCompactLayout ? (
            /* Compact Single Row - For Live Class Demo */
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title + Description */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">{stepInfo.title}</h3>
                <p className="text-xs text-gray-600 truncate">{stepInfo.description}</p>
              </div>

              {/* Center: Highlights */}
              <div className="hidden md:flex gap-2 flex-shrink-0 max-w-md overflow-x-auto">
                {stepInfo.highlights.slice(0, 3).map((highlight, index) => (
                  <span
                    key={index}
                    className="flex-shrink-0 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {highlight}
                  </span>
                ))}
              </div>

              {/* Right: Next Button */}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm flex-shrink-0"
              >
                {isLastStep ? 'Finish' : 'Next'}
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            /* Expanded Layout - For Curriculum Builder & Other Screens */
            <div className="space-y-4">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{stepInfo.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{stepInfo.description}</p>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    {currentStepIndex + 1} / {WALKTHROUGH_STEPS.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {isLastStep ? 'Finish' : 'Next'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {stepInfo.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-gray-700 text-sm rounded-lg border border-blue-100"
                  >
                    <span className="flex-shrink-0">{highlight.split(' ')[0]}</span>
                    <span className="text-xs">{highlight.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="fixed bottom-[200px] right-4 z-50 px-2 py-1 bg-gray-900/80 text-white text-xs rounded-lg">
        Use ← → • ESC to exit
      </div>
    </>
  );
}
