'use client'

/**
 * Welcome Screen (User Onboarding)
 *
 * Collects basic user information (name, age, grade) and explains microphone usage.
 * Creates user profile in database and stores userId in localStorage.
 *
 * Flow:
 * 1. User fills out form (name, age, grade)
 * 2. User reads microphone explanation
 * 3. On submit, POST to /api/users/create
 * 4. Store userId in localStorage
 * 5. Redirect to /lessons
 *
 * Reference: Implementation_Roadmap.md - Day 8
 */

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function WelcomePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    grade: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user already exists and redirect
  useEffect(() => {
    const existingUserId = localStorage.getItem('userId')
    if (existingUserId) {
      // User already has an account, redirect to lessons
      router.push('/lessons')
    }
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate form data
      if (!formData.name.trim()) {
        setError('Please enter your name')
        setIsLoading(false)
        return
      }

      if (!formData.age) {
        setError('Please select your age')
        setIsLoading(false)
        return
      }

      if (!formData.grade) {
        setError('Please select your grade')
        setIsLoading(false)
        return
      }

      // Create user profile
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          age: parseInt(formData.age),
          grade: parseInt(formData.grade)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create profile')
        setIsLoading(false)
        return
      }

      // Store userId in localStorage
      localStorage.setItem('userId', data.userId)

      // Redirect to lessons page
      router.push('/lessons')
    } catch (err) {
      console.error('Error creating user:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome to Bloom Academia!
          </h1>
          <p className="text-gray-600">
            You're about to experience a new kind of education. Personalized, interactive, and built around you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-700">
              Let's get you started
            </h2>
            <p className="text-sm text-gray-600">
              We'll use this to personalize your lessons.
            </p>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">What's your name?</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full"
            />
          </div>

          {/* Age Field */}
          <div className="space-y-2">
            <Label htmlFor="age">How old are you?</Label>
            <select
              id="age"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select your age</option>
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((age) => (
                <option key={age} value={age}>
                  {age} years old
                </option>
              ))}
            </select>
          </div>

          {/* Grade Field */}
          <div className="space-y-2">
            <Label htmlFor="grade">What grade are you starting from?</Label>
            <select
              id="grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select your grade</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Info */}
          <div className="bg-blue-50 border border-primary rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              About Microphone Access
            </h3>
            <p className="text-sm text-gray-700">
              Bloom uses voice for teaching. Your browser will ask for microphone permission when you start your first lesson. This lets you have natural conversations with Bloom!
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error text-error rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-lg font-semibold"
          >
            {isLoading ? 'Creating your profile...' : 'Start Learning!'}
          </Button>
        </form>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Your progress will be saved on this device
        </p>
      </div>
    </div>
  )
}
