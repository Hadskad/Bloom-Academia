'use client'

/**
 * Topic-Level Curriculum Builder
 *
 * Allows teachers to create new lessons with detailed curriculum content.
 *
 * Features:
 * - Create lesson metadata (title, subject, grade, objective, duration, difficulty)
 * - Define 6-part curriculum structure:
 *   1. Introduction (engaging hook)
 *   2. Core Concept (main teaching content)
 *   3. Visual Examples (demonstrations)
 *   4. Check Understanding (formative questions)
 *   5. Practice (application problems)
 *   6. Summary (recap and celebration)
 * - Structured form with guidance for each section
 * - Validation and error handling
 * - Atomic save (lesson + curriculum together)
 *
 * Reference: Topic-Level Curriculum Builder Implementation Plan
 */

import { useState } from 'react'
import { ArrowLeft, Save, RotateCcw, Loader2, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Lesson metadata interface
 */
interface LessonMetadata {
  title: string
  subject: string
  gradeLevel: number
  learningObjective: string
  estimatedDuration: number
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Curriculum content interface (6-part structure)
 */
interface CurriculumContent {
  introduction: string
  coreContent: string
  visualExamples: string
  checkUnderstanding: string
  practice: string
  summary: string
}

/**
 * Initial state for lesson metadata
 */
const INITIAL_LESSON: LessonMetadata = {
  title: '',
  subject: 'math',
  gradeLevel: 3,
  learningObjective: '',
  estimatedDuration: 30,
  difficulty: 'medium'
}

/**
 * Initial state for curriculum content
 */
const INITIAL_CURRICULUM: CurriculumContent = {
  introduction: '',
  coreContent: '',
  visualExamples: '',
  checkUnderstanding: '',
  practice: '',
  summary: ''
}

/**
 * Curriculum section metadata for rendering
 */
const CURRICULUM_SECTIONS = [
  {
    key: 'introduction' as keyof CurriculumContent,
    title: '1️⃣ Introduction',
    placeholder: 'Start with a relatable, real-world scenario...',
    guidance:
      'Create excitement and relevance. Connect to prior experiences. Use enthusiastic, warm tone.'
  },
  {
    key: 'coreContent' as keyof CurriculumContent,
    title: '2️⃣ Core Concept',
    placeholder: 'Teach the fundamental concept systematically...',
    guidance:
      'Define key terms. Break into clear sub-points. Explain the "why" behind the concept. Use simple language.'
  },
  {
    key: 'visualExamples' as keyof CurriculumContent,
    title: '3️⃣ Visual Examples',
    placeholder: 'Provide 3-4 different visual examples...',
    guidance:
      'Use different shapes and objects. Provide SVG generation guidance. Use familiar objects (pizza, chocolate, fruit). Always emphasize EQUAL PARTS.'
  },
  {
    key: 'checkUnderstanding' as keyof CurriculumContent,
    title: '4️⃣ Check Understanding',
    placeholder: 'Ask questions to gauge comprehension...',
    guidance:
      'Include formative assessment questions. Listen carefully to responses. Provide follow-up guidance for different understanding levels.'
  },
  {
    key: 'practice' as keyof CurriculumContent,
    title: '5️⃣ Practice',
    placeholder: 'Present practice problems that build in complexity...',
    guidance:
      'Start easy, build to challenge. Provide immediate feedback. Include real-world application problems.'
  },
  {
    key: 'summary' as keyof CurriculumContent,
    title: '6️⃣ Summary',
    placeholder: 'Recap key learnings and celebrate success...',
    guidance:
      'Review main concepts. Celebrate what they learned. Connect to next steps. End with encouragement.'
  }
]

export default function TopicBuilderPage() {
  // State
  const [lesson, setLesson] = useState<LessonMetadata>(INITIAL_LESSON)
  const [curriculum, setCurriculum] = useState<CurriculumContent>(INITIAL_CURRICULUM)
  const [currentSection, setCurrentSection] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Update lesson metadata field
   */
  function updateLesson<K extends keyof LessonMetadata>(key: K, value: LessonMetadata[K]) {
    setLesson((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  /**
   * Update curriculum content field
   */
  function updateCurriculum<K extends keyof CurriculumContent>(key: K, value: string) {
    setCurriculum((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  /**
   * Client-side validation
   */
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    // Lesson validation
    if (!lesson.title || lesson.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }
    if (!lesson.learningObjective || lesson.learningObjective.trim().length < 10) {
      newErrors.learningObjective = 'Learning objective must be at least 10 characters'
    }
    if (lesson.estimatedDuration <= 0) {
      newErrors.estimatedDuration = 'Duration must be a positive number'
    }

    // Curriculum validation
    CURRICULUM_SECTIONS.forEach((section) => {
      const content = curriculum[section.key]
      if (!content || content.trim().length < 50) {
        newErrors[section.key] = `${section.title} must be at least 50 characters`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Save lesson and curriculum
   */
  async function saveLesson() {
    // Validate form
    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Please fix the validation errors before saving'
      })
      return
    }

    try {
      setIsSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/curriculum/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson,
          curriculum
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create lesson')
      }

      // Success
      setMessage({
        type: 'success',
        text: `Lesson "${data.lesson.title}" created successfully!`
      })

      // Clear form after success
      setTimeout(() => {
        setLesson(INITIAL_LESSON)
        setCurriculum(INITIAL_CURRICULUM)
        setCurrentSection(0)
        setMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Error saving lesson:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create lesson'
      })
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Reset form to initial state
   */
  function resetForm() {
    setLesson(INITIAL_LESSON)
    setCurriculum(INITIAL_CURRICULUM)
    setCurrentSection(0)
    setErrors({})
    setMessage({
      type: 'success',
      text: 'Form reset to defaults'
    })
    setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/curriculum-builder">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Curriculum Builder
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Create New Lesson</h1>
              <p className="text-gray-600 mt-1">
                Define lesson details and detailed teaching curriculum
              </p>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Panel: Lesson Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={lesson.title}
                  onChange={(e) => updateLesson('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Introduction to Fractions"
                  disabled={isSaving}
                />
                {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <select
                  value={lesson.subject}
                  onChange={(e) => updateLesson('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSaving}
                >
                  <option value="math">Mathematics</option>
                  <option value="science">Science</option>
                  <option value="english">English</option>
                  <option value="history">History</option>
                  <option value="art">Art</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Grade Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Level *
                </label>
                <select
                  value={lesson.gradeLevel}
                  onChange={(e) => updateLesson('gradeLevel', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSaving}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Learning Objective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Objective *
                </label>
                <textarea
                  value={lesson.learningObjective}
                  onChange={(e) => updateLesson('learningObjective', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="What should students be able to do after this lesson?"
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {lesson.learningObjective.length} characters
                </p>
                {errors.learningObjective && (
                  <p className="text-xs text-red-600 mt-1">{errors.learningObjective}</p>
                )}
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={lesson.estimatedDuration}
                  onChange={(e) =>
                    updateLesson('estimatedDuration', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSaving}
                />
                {errors.estimatedDuration && (
                  <p className="text-xs text-red-600 mt-1">{errors.estimatedDuration}</p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty *
                </label>
                <select
                  value={lesson.difficulty}
                  onChange={(e) =>
                    updateLesson('difficulty', e.target.value as 'easy' | 'medium' | 'hard')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSaving}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel: Curriculum Content */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                Curriculum Content - 6-Part Teaching Structure
              </CardTitle>
              <p className="text-sm text-gray-600">
                Define detailed teaching instructions for each section
              </p>
            </CardHeader>
            <CardContent>
              {/* Section Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                {CURRICULUM_SECTIONS.map((section, index) => (
                  <button
                    key={section.key}
                    onClick={() => setCurrentSection(index)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentSection === index
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isSaving}
                  >
                    {section.title}
                  </button>
                ))}
              </div>

              {/* Current Section Content */}
              {CURRICULUM_SECTIONS.map((section, index) => (
                <div
                  key={section.key}
                  className={currentSection === index ? 'block' : 'hidden'}
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                      <strong>Guidance:</strong> {section.guidance}
                    </p>
                  </div>

                  <textarea
                    value={curriculum[section.key]}
                    onChange={(e) => updateCurriculum(section.key, e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder={section.placeholder}
                    disabled={isSaving}
                  />

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {curriculum[section.key].length} characters (minimum 50)
                    </p>
                    {errors[section.key] && (
                      <p className="text-xs text-red-600">{errors[section.key]}</p>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                      variant="outline"
                      disabled={currentSection === 0 || isSaving}
                    >
                      Previous Section
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentSection(
                          Math.min(CURRICULUM_SECTIONS.length - 1, currentSection + 1)
                        )
                      }
                      variant="outline"
                      disabled={currentSection === CURRICULUM_SECTIONS.length - 1 || isSaving}
                    >
                      Next Section
                    </Button>
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-6 border-t mt-6">
                <Button onClick={saveLesson} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Lesson...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Lesson
                    </>
                  )}
                </Button>
                <Button onClick={resetForm} variant="outline" disabled={isSaving}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
