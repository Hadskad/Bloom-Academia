'use client'

/**
 * Curriculum Builder Page
 *
 * Phase 1: Subject-level mastery rules configuration
 *
 * Teachers can:
 * - Select grade (1-12) and subject (math, science, english, history, art)
 * - Configure default mastery rules for that subject/grade
 * - Save configuration to database
 * - Reset to system defaults
 *
 * Mastery Rules (6 configurable parameters):
 * 1. Min Correct Answers - Minimum correct answers required
 * 2. Min Explanation Quality - Min quality score 0-100
 * 3. Min Application Attempts - Min times student applied knowledge
 * 4. Min Overall Quality - Min average quality 0-100
 * 5. Max Struggle Ratio - Max ratio of struggles to total interactions
 * 6. Min Time Spent - Minimum time spent in lesson (minutes)
 *
 * Reference: Phase 1 - Curriculum Builder System
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, RotateCcw, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MasteryRules {
  minCorrectAnswers: number
  minExplanationQuality: number
  minApplicationAttempts: number
  minOverallQuality: number
  maxStruggleRatio: number
  minTimeSpentMinutes: number
}

const SYSTEM_DEFAULTS: MasteryRules = {
  minCorrectAnswers: 3,
  minExplanationQuality: 70,
  minApplicationAttempts: 2,
  minOverallQuality: 75,
  maxStruggleRatio: 0.3,
  minTimeSpentMinutes: 5
}

export default function CurriculumBuilderPage() {
  // Selection state
  const [gradeLevel, setGradeLevel] = useState<number>(3)
  const [subject, setSubject] = useState<string>('math')

  // Configuration state
  const [masteryRules, setMasteryRules] = useState<MasteryRules>(SYSTEM_DEFAULTS)
  const [configExists, setConfigExists] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load configuration when grade/subject changes
  useEffect(() => {
    loadConfiguration()
  }, [gradeLevel, subject])

  async function loadConfiguration() {
    try {
      setIsLoading(true)
      setMessage(null)

      const response = await fetch(
        `/api/admin/curriculum/subject?grade=${gradeLevel}&subject=${subject}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load configuration')
      }

      setConfigExists(data.exists)
      setMasteryRules(data.masteryRules)

      if (!data.exists) {
        setMessage({
          type: 'success',
          text: 'No configuration found - showing system defaults'
        })
      }
    } catch (err) {
      console.error('Error loading configuration:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load configuration'
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function saveConfiguration() {
    try {
      setIsSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/curriculum/subject', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          gradeLevel,
          masteryRules
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration')
      }

      setConfigExists(true)
      setMessage({
        type: 'success',
        text: 'Configuration saved successfully!'
      })

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Error saving configuration:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save configuration'
      })
    } finally {
      setIsSaving(false)
    }
  }

  function resetToDefaults() {
    setMasteryRules(SYSTEM_DEFAULTS)
    setMessage({
      type: 'success',
      text: 'Reset to system defaults'
    })
    setTimeout(() => setMessage(null), 2000)
  }

  function updateRule<K extends keyof MasteryRules>(key: K, value: number) {
    setMasteryRules(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Curriculum Builder
              </h1>
              <p className="text-gray-600 mt-1">
                Configure mastery rules for subjects and grades
              </p>
            </div>
          </div>
          <Link href="/admin/curriculum-builder/topic">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Lesson
            </Button>
          </Link>
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
          {/* Left Panel: Grade/Subject Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Grade & Subject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Grade Level Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading || isSaving}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading || isSaving}
                >
                  <option value="math">Mathematics</option>
                  <option value="science">Science</option>
                  <option value="english">English</option>
                  <option value="history">History</option>
                  <option value="art">Art</option>
                </select>
              </div>

              {/* Status Indicator */}
              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  {configExists ? (
                    <span className="text-green-600 font-medium">
                      ✓ Configuration exists
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      No configuration (using defaults)
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel: Mastery Rules Configuration */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                Mastery Rules for Grade {gradeLevel} {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Configure the criteria students must meet to master lessons in this subject
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-gray-600">Loading configuration...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Min Correct Answers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Correct Answers
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={masteryRules.minCorrectAnswers}
                      onChange={(e) => updateRule('minCorrectAnswers', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum number of correct answers required to master the lesson
                    </p>
                  </div>

                  {/* Min Explanation Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Explanation Quality (0-100)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={masteryRules.minExplanationQuality}
                        onChange={(e) => updateRule('minExplanationQuality', parseInt(e.target.value))}
                        className="flex-1"
                        disabled={isSaving}
                      />
                      <span className="w-12 text-center font-medium text-gray-700">
                        {masteryRules.minExplanationQuality}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum quality score for explanations (0 = low, 100 = excellent)
                    </p>
                  </div>

                  {/* Min Application Attempts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Application Attempts
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={masteryRules.minApplicationAttempts}
                      onChange={(e) => updateRule('minApplicationAttempts', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum times student must apply knowledge to solve problems
                    </p>
                  </div>

                  {/* Min Overall Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Overall Quality (0-100)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={masteryRules.minOverallQuality}
                        onChange={(e) => updateRule('minOverallQuality', parseInt(e.target.value))}
                        className="flex-1"
                        disabled={isSaving}
                      />
                      <span className="w-12 text-center font-medium text-gray-700">
                        {masteryRules.minOverallQuality}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum average quality across all responses
                    </p>
                  </div>

                  {/* Max Struggle Ratio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Struggle Ratio (0.0 - 1.0)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={masteryRules.maxStruggleRatio * 100}
                        onChange={(e) => updateRule('maxStruggleRatio', parseInt(e.target.value) / 100)}
                        className="flex-1"
                        disabled={isSaving}
                      />
                      <span className="w-12 text-center font-medium text-gray-700">
                        {masteryRules.maxStruggleRatio.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum ratio of struggles to total interactions (lower = less struggle allowed)
                    </p>
                  </div>

                  {/* Min Time Spent */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Time Spent (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={masteryRules.minTimeSpentMinutes}
                      onChange={(e) => updateRule('minTimeSpentMinutes', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum time student must spend in the lesson
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={saveConfiguration}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Configuration
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={resetToDefaults}
                      variant="outline"
                      disabled={isSaving}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
