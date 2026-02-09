import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WalkthroughStep =
  | 'multi-agent'
  | 'memory-architecture'
  | 'curriculum'
  | 'voice-pipeline'
  | 'disability-support'
  | 'voice-learning'
  | 'assessment-mode'
  | 'assessment-results'
  | 'lesson-complete'
  | 'progress-dashboard'
  | 'admin-dashboard'
  | 'agent-metrics';

interface WalkthroughState {
  isActive: boolean;
  currentStep: WalkthroughStep | null;
  currentStepIndex: number;
  hasCompletedWalkthrough: boolean;
  triggerAction: string | null; // Signal for pages to trigger specific actions
  isNavigating: boolean; // Loading state during screen transitions

  // Actions
  startWalkthrough: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: WalkthroughStep) => void;
  endWalkthrough: () => void;
  resetWalkthrough: () => void;
  setTriggerAction: (action: string | null) => void;
  clearTriggerAction: () => void;
  setNavigating: (isNavigating: boolean) => void;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  'multi-agent',
  'memory-architecture',
  'curriculum',
  'voice-pipeline',
  'disability-support',
  'voice-learning',
  'assessment-mode',
  'assessment-results',
  'lesson-complete',
  'progress-dashboard',
  'admin-dashboard',
  'agent-metrics',
];

export const STEP_ROUTES: Record<WalkthroughStep, string> = {
  'multi-agent': '/',
  'memory-architecture': '/',
  'curriculum': '/',
  'voice-pipeline': '/',
  'disability-support': '/',
  'voice-learning': '/learn/0d27645e-54b0-418f-b62f-e848087d7db9',
  'assessment-mode': '/learn/0d27645e-54b0-418f-b62f-e848087d7db9',
  'assessment-results': '/learn/0d27645e-54b0-418f-b62f-e848087d7db9',
  'lesson-complete': '/lessons/0d27645e-54b0-418f-b62f-e848087d7db9/complete',
  'progress-dashboard': '/progress',
  'admin-dashboard': '/admin',
  'agent-metrics': '/admin',
};

export const STEP_TITLES: Record<WalkthroughStep, string> = {
  'multi-agent': 'Multi-AI Agent System',
  'memory-architecture': '3-Layer Memory Architecture',
  'curriculum': 'Curriculum Sequencing System',
  'voice-pipeline': 'Voice Pipeline Architecture',
  'disability-support': 'Disability Support Plan',
  'voice-learning': 'Voice Learning Interface',
  'assessment-mode': 'Assessment Mode',
  'assessment-results': 'Assessment Results',
  'lesson-complete': 'Lesson Completion',
  'progress-dashboard': 'Progress Dashboard',
  'admin-dashboard': 'Admin Dashboard',
  'agent-metrics': 'AI Agent Metrics',
};

export const useWalkthroughStore = create<WalkthroughState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: null,
      currentStepIndex: -1,
      hasCompletedWalkthrough: false,
      triggerAction: null,
      isNavigating: false,

      startWalkthrough: () => {
        set({
          isActive: true,
          currentStep: WALKTHROUGH_STEPS[0],
          currentStepIndex: 0,
          triggerAction: null,
          isNavigating: false,
        });
      },

      nextStep: () => {
        const { currentStepIndex } = get();
        const nextIndex = currentStepIndex + 1;

        if (nextIndex < WALKTHROUGH_STEPS.length) {
          set({
            currentStep: WALKTHROUGH_STEPS[nextIndex],
            currentStepIndex: nextIndex,
          });
        } else {
          // Walkthrough complete
          set({
            isActive: false,
            currentStep: null,
            currentStepIndex: -1,
            hasCompletedWalkthrough: true,
          });
        }
      },

      previousStep: () => {
        const { currentStepIndex } = get();
        const prevIndex = currentStepIndex - 1;

        if (prevIndex >= 0) {
          set({
            currentStep: WALKTHROUGH_STEPS[prevIndex],
            currentStepIndex: prevIndex,
          });
        }
      },

      goToStep: (step: WalkthroughStep) => {
        const index = WALKTHROUGH_STEPS.indexOf(step);
        if (index !== -1) {
          set({
            currentStep: step,
            currentStepIndex: index,
          });
        }
      },

      endWalkthrough: () => {
        set({
          isActive: false,
          currentStep: null,
          currentStepIndex: -1,
        });
      },

      resetWalkthrough: () => {
        set({
          isActive: false,
          currentStep: null,
          currentStepIndex: -1,
          hasCompletedWalkthrough: false,
          triggerAction: null,
        });
      },

      setTriggerAction: (action: string | null) => {
        set({ triggerAction: action });
      },

      clearTriggerAction: () => {
        set({ triggerAction: null });
      },

      setNavigating: (isNavigating: boolean) => {
        set({ isNavigating });
      },
    }),
    {
      name: 'bloom-walkthrough',
      partialize: (state) => ({
        hasCompletedWalkthrough: state.hasCompletedWalkthrough,
      }),
    }
  )
);
