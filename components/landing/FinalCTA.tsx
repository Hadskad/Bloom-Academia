'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export function FinalCTA() {
  const [enrollUrl, setEnrollUrl] = useState('/welcome');

  useEffect(() => {
    // Check if user already exists in localStorage
    const userId = localStorage.getItem('userId');
    setEnrollUrl(userId ? '/dashboard' : '/welcome');
  }, []);

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-primary/20">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main Headline */}
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Experience the Future of Education
        </h2>

        {/* Supporting Text */}
        <p className="text-xl md:text-2xl text-gray-700 mb-12">
          Let's build a world where the least everyone has is quality education
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
        <div className="mt-12 flex justify-center gap-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-100"></div>
          <div className="w-2 h-2 bg-success rounded-full animate-pulse delay-200"></div>
        </div>
      </div>
    </section>
  );
}
