'use client';

import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MultiAgentDiagram,
  MemoryArchitectureDiagram,
  CurriculumDiagram,
  VoicePipelineDiagram,
  DisabilitySupportDiagram,
} from './diagrams';
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

const CODE_LINKS: Partial<Record<WalkthroughStep, { label: string; path: string }[]>> = {
  'multi-agent': [
    { label: 'agent-manager.ts', path: 'lib/ai/agent-manager.ts' },
    { label: 'context-builder.ts', path: 'lib/ai/context-builder.ts' },
  ],
  'memory-architecture': [
    { label: 'profile-manager.ts', path: 'lib/memory/profile-manager.ts' },
    { label: 'session-manager.ts', path: 'lib/memory/session-manager.ts' },
  ],
  'curriculum': [
    { label: 'next-lesson.ts', path: 'lib/curriculum/next-lesson.ts' },
    { label: 'prerequisite-checker.ts', path: 'lib/curriculum/prerequisite-checker.ts' },
  ],
  'voice-pipeline': [
    { label: 'VoiceInput.tsx', path: 'components/VoiceInput.tsx' },
    { label: 'google-tts.ts', path: 'lib/tts/google-tts.ts' },
  ],
  'disability-support': [
    { label: 'welcome/page.tsx', path: 'app/welcome/page.tsx' },
    { label: 'context-builder.ts', path: 'lib/ai/context-builder.ts' },
  ],
};

function getDiagramComponent(step: WalkthroughStep) {
  switch (step) {
    case 'multi-agent':
      return <MultiAgentDiagram />;
    case 'memory-architecture':
      return <MemoryArchitectureDiagram />;
    case 'curriculum':
      return <CurriculumDiagram />;
    case 'voice-pipeline':
      return <VoicePipelineDiagram />;
    case 'disability-support':
      return <DisabilitySupportDiagram />;
    default:
      return null;
  }
}

export function DiagramModal() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isActive,
    currentStep,
    currentStepIndex,
    nextStep,
    previousStep,
    endWalkthrough,
  } = useWalkthroughStore();

  const isDiagramStep = currentStep && DIAGRAM_STEPS.includes(currentStep);
  const totalSteps = WALKTHROUGH_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastDiagramStep = currentStep === 'disability-support';

  // Handle navigation to next page when leaving diagram steps
  const handleNext = useCallback(() => {
    if (isLastDiagramStep) {
      // Navigate to the voice learning page first, then advance
      const nextRoute = STEP_ROUTES['voice-learning'];
      if (pathname !== nextRoute) {
        router.push(nextRoute);
      }
    }
    nextStep();
  }, [isLastDiagramStep, nextStep, pathname, router]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || !isDiagramStep) return;

      if (e.key === 'Escape') {
        endWalkthrough();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        previousStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isDiagramStep, isFirstStep, handleNext, previousStep, endWalkthrough]);

  if (!isActive || !isDiagramStep || !currentStep) {
    return null;
  }

  const codeLinks = CODE_LINKS[currentStep] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={endWalkthrough}
      />

      {/* Modal - Near Full-Screen */}
      <div className="relative w-[98vw] h-[96vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-primary text-white text-sm font-medium rounded-full">
              {currentStepIndex + 1} / {totalSteps}
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              {STEP_TITLES[currentStep]}
            </h2>
          </div>
          <button
            onClick={endWalkthrough}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close walkthrough"
          >
            <X size={24} />
          </button>
        </div>

        {/* Diagram Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            {getDiagramComponent(currentStep)}
          </div>

          {/* Code Links */}
          {codeLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 font-medium">Source files:</span>
              {codeLinks.map((link) => (
                <span
                  key={link.path}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-mono"
                >
                  📄 {link.path}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <button
            onClick={previousStep}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isFirstStep
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {DIAGRAM_STEPS.map((step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStepIndex
                    ? 'bg-primary w-6'
                    : index < currentStepIndex
                    ? 'bg-primary'
                    : 'bg-gray-300'
                }`}
              />
            ))}
            <div className="w-px h-4 bg-gray-300 mx-2" />
            <span className="text-xs text-gray-500">
              {WALKTHROUGH_STEPS.length - DIAGRAM_STEPS.length} more screens
            </span>
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            {isLastDiagramStep ? 'See Live Demo' : 'Next'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
