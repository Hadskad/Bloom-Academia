'use client';

import { useState } from 'react';
import { Loader2, Send, Volume2 } from 'lucide-react';

/**
 * Learning Interface - Day 6-7 Implementation
 *
 * Complete text-to-AI-to-speech pipeline:
 * 1. User types question
 * 2. Sends to /api/teach
 * 3. Receives AI text + audio response
 * 4. Displays text and plays audio
 */

interface TeacherResponse {
  text: string;
  svg: string | null;
  audioBase64: string | null;
}

export default function LearnPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<TeacherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate input
    if (!message.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call teaching API
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userMessage: message
        })
      });

      if (!res.ok) {
        throw new Error('Failed to get response from teacher');
      }

      const data = await res.json();

      if (!data.success || !data.teacherResponse) {
        throw new Error('Invalid response from server');
      }

      setResponse(data.teacherResponse);

      // Play audio if available
      if (data.teacherResponse.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.teacherResponse.audioBase64}`);
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          // Don't throw - audio playback failure shouldn't break the UI
        });
      }

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Learning Interface
          </h1>
          <p className="text-lg text-gray-700">
            Ask me anything! I'm here to help you learn.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question... (e.g., What is 2+2?)"
              disabled={isLoading}
              className="flex-1 px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Question input"
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="bg-primary hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary flex items-center justify-center gap-2"
              aria-label="Ask teacher"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Ask Teacher
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-error/10 border border-error rounded-lg">
              <p className="text-error font-medium">{error}</p>
            </div>
          )}
        </form>

        {/* Response Display */}
        {response && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
            {/* Audio indicator */}
            {response.audioBase64 && (
              <div className="flex items-center gap-2 mb-4 text-primary">
                <Volume2 className="w-5 h-5" />
                <span className="text-sm font-medium">Playing audio response...</span>
              </div>
            )}

            {/* Text Response */}
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                {response.text}
              </div>
            </div>

            {/* SVG Display (for future days) */}
            {response.svg && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div dangerouslySetInnerHTML={{ __html: response.svg }} />
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!response && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Ready to learn? Ask me a question above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
