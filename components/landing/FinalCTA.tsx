'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Gavel, Play, ArrowRight, Loader2 } from 'lucide-react';
import { useWalkthroughStore } from '@/lib/walkthrough/walkthrough-store';
import { QuickNameModal } from '@/components/QuickNameModal';

export function FinalCTA() {
  const [enrollUrl, setEnrollUrl] = useState('/welcome');
  const [showQuickNameModal, setShowQuickNameModal] = useState(false);
  const [pendingWalkthrough, setPendingWalkthrough] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { startWalkthrough } = useWalkthroughStore();

  useEffect(() => {
    setIsHydrated(true);
    const userId = localStorage.getItem('userId');
    setEnrollUrl(userId ? '/dashboard' : '/welcome');
  }, []);

  const handleStartWalkthrough = () => {
    // Check if user exists before starting walkthrough
    const userId = localStorage.getItem('userId');

    if (!userId) {
      // No user exists - show QuickNameModal first
      setPendingWalkthrough(true);
      setShowQuickNameModal(true);
    } else {
      // User exists - start walkthrough immediately
      startWalkthrough();
    }
  };

  const handleModalClose = () => {
    setShowQuickNameModal(false);
    setPendingWalkthrough(false);
  };

  const handleModalComplete = () => {
    setShowQuickNameModal(false);
    // After user is created, start the walkthrough
    if (pendingWalkthrough) {
      setPendingWalkthrough(false);
      startWalkthrough();
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-primary/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Main CTA */}
          <div className="text-center lg:text-left">
            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Experience the Future of Education
            </h2>

            {/* Supporting Text */}
            <p className="text-xl md:text-2xl text-gray-700 mb-10">
              Let&apos;s build a world where the least everyone has is quality education
            </p>

            {/* Large CTA Button */}
            <Link
              href={enrollUrl}
              className="inline-block bg-primary hover:bg-blue-600 text-white font-bold px-12 py-6 rounded-xl text-2xl transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
            >
              Enroll Now
            </Link>

            {/* Small Text Below */}
            <p className="text-sm text-gray-600 mt-6">
              No sign-up required (as per hackathon requirement). See how it all works.
            </p>

            {/* Decorative Element */}
            <div className="mt-10 flex justify-center lg:justify-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-success rounded-full animate-pulse delay-200"></div>
            </div>
          </div>

          {/* Right Side - Judge Section */}
          <div className="relative">
            {/* Judge Card */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
              {/* Header Badge */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Gavel className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">For Hackathon Judges</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Bloom Academia is more than a demo, it&apos;s the foundation of a complete AI-powered school.
                </p>

                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  This guided walkthrough takes you directly into the system: how we use{' '}
                  <span className="font-semibold text-primary">Gemini 3</span>, how personalization works,
                  how the school scales globally, and what has already been built.
                </p>

                <p className="text-gray-600 text-sm mb-6">
                  You&apos;ll see the architecture, the learning experience, and a live classroom session —
                  <span className="font-semibold"> exactly what matters.</span>
                </p>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  {/* Primary CTA */}
                  <button
                    onClick={handleStartWalkthrough}
                    disabled={!isHydrated}
                    className={`w-full flex items-center justify-center gap-3 text-white font-bold px-6 py-4 rounded-xl text-lg transition-all shadow-lg ${
                      isHydrated
                        ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isHydrated ? (
                      <>
                        <Play className="w-5 h-5" />
                        Explore Bloom — Judge Walkthrough
                        <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading... Please refresh page if loading takes too long
                      </>
                    )}
                  </button>

                  {/* Secondary CTA */}
                  <Link
                    href="/learn/0d27645e-54b0-418f-b62f-e848087d7db9"
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-6 py-3 rounded-xl transition-all"
                  >
                    View Live Class Demo
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Footer Accent */}
              <div className="h-1 bg-gradient-to-r from-primary via-accent to-success"></div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Quick Name Modal for Walkthrough */}
      {showQuickNameModal && (
        <QuickNameModal
          onClose={handleModalClose}
          onComplete={handleModalComplete}
        />
      )}
    </section>
  );
}
