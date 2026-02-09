'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';

interface QuickNameModalProps {
  targetUrl?: string;
  onClose: () => void;
  onComplete?: () => void;
}

export function QuickNameModal({ targetUrl, onClose, onComplete }: QuickNameModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user already exists
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId && targetUrl) {
      // User already registered, go directly to target
      router.push(targetUrl);
    }
  }, [router, targetUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create a guest user with minimal info
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          age: 12, // Default demo age
          grade: 5, // Default demo grade (matches fractions lesson)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const { userId } = await response.json();

      // Store user info in localStorage (consistent with welcome page)
      localStorage.setItem('userId', userId);
      localStorage.setItem('userName', name.trim());
      localStorage.setItem('userGrade', '5'); // Grade 5 for fractions demo

      // If targetUrl provided, navigate to it
      if (targetUrl) {
        router.push(targetUrl);
      }

      // Call onComplete callback if provided (for walkthrough integration)
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to start demo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">Quick Demo Access</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-gray-600 mb-6">
            Before we start the walkthrough, what should Bloom call you?
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                disabled={isLoading}
                autoFocus
                maxLength={50}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Starting Demo...
                </span>
              ) : (
                'Start Walkthrough'
              )}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            This creates a temporary demo account. No email or password required.
          </p>
        </form>
      </div>
    </div>
  );
}
