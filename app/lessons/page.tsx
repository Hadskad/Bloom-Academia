'use client'

/**
 * Lesson Selection Screen
 *
 * Displays available lessons from the database as cards.
 * Users can browse and select a lesson to start learning.
 *
 * Flow:
 * 1. Check if user exists (userId in localStorage)
 * 2. Fetch lessons from /api/lessons
 * 3. Display as grid of cards
 * 4. Click "Start Lesson" → redirect to /learn/[lessonId]
 *
 * Reference: Implementation_Roadmap.md - Day 9
 * Design: Bloom_Academia_Frontend.md - Card components, responsive grid
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Lesson {
  id: string
  title: string
  subject: string
  grade_level: number
  learning_objective: string
  estimated_duration: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export default function LessonsPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user exists and fetch lessons
  useEffect(() => {
    // Verify user is logged in
    const userId = localStorage.getItem('userId')
    if (!userId) {
      // Redirect to welcome if no user
      router.push('/welcome')
      return
    }

    // Fetch lessons from API
    fetchLessons()
  }, [router])

  const fetchLessons = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/lessons')

      if (!response.ok) {
        throw new Error('Failed to fetch lessons')
      }

      const data = await response.json()
      setLessons(data.lessons)
    } catch (err) {
      console.error('Error fetching lessons:', err)
      setError('Failed to load lessons. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const startLesson = (lessonId: string) => {
    router.push(`/learn/${lessonId}`)
  }

  // Get difficulty badge styling
  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-success/20 text-success'
      case 'medium':
        return 'bg-accent/20 text-accent'
      case 'hard':
        return 'bg-error/20 text-error'
      default:
        return 'bg-gray-200 text-gray-600'
    }
  }

  // Get subject badge color
  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'math':
        return 'text-primary'
      case 'science':
        return 'text-success'
      case 'english':
        return 'text-accent'
      case 'history':
        return 'text-error'
      default:
        return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-48 bg-gray-200 rounded mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading lessons...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="bg-error/10 border border-error text-error rounded-lg p-6 mb-4">
            {error}
          </div>
          <Button onClick={fetchLessons}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            Choose Your Lesson
          </h1>
          <p className="text-lg text-gray-600">
            Select a lesson to start learning with your AI teacher
          </p>
        </div>

        {/* Lessons Grid */}
        {lessons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No lessons available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  {/* Subject Badge */}
                  <div
                    className={`text-sm font-semibold mb-2 ${getSubjectColor(
                      lesson.subject
                    )}`}
                  >
                    {lesson.subject.toUpperCase()}
                  </div>

                  {/* Lesson Title */}
                  <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Learning Objective */}
                  <p className="text-gray-600 text-sm">
                    {lesson.learning_objective}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{lesson.estimated_duration} min</span>
                    <span
                      className={`px-2 py-1 rounded-md font-medium ${getDifficultyStyles(
                        lesson.difficulty
                      )}`}
                    >
                      {lesson.difficulty}
                    </span>
                  </div>

                  {/* Grade Level */}
                  <div className="text-xs text-gray-500">
                    Grade {lesson.grade_level}
                  </div>

                  {/* Start Button */}
                  <Button
                    onClick={() => startLesson(lesson.id)}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                  >
                    Start Lesson
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
