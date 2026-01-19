'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export function Hero() {
  const [enrollUrl, setEnrollUrl] = useState('/welcome');

  useEffect(() => {
    // Check if user already exists in localStorage
    const userId = localStorage.getItem('userId');
    setEnrollUrl(userId ? '/lessons' : '/welcome');
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-16">
      <div className="max-w-6xl w-full">
        <div className="text-center">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            The Future of Education Is Here
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto">
            Every child deserves a world-class teacher. Now they have one.
          </p>

          {/* Demo Video Placeholder */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="aspect-video bg-gradient-to-br from-primary to-blue-600 rounded-2xl shadow-2xl flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">▶️</div>
                <p className="text-xl font-semibold">Demo Video Placeholder</p>
                <p className="text-sm mt-2 opacity-90">Student learning fractions with voice + whiteboard</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={enrollUrl}
              className="bg-primary hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Enroll Now
            </Link>
            <button
              onClick={() => {
                document.getElementById('problem-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
