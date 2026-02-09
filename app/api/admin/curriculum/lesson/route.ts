/**
 * Lesson + Curriculum Creation API
 *
 * POST /api/admin/curriculum/lesson
 * - Creates a new lesson with detailed curriculum content
 * - Atomic transaction: Both lesson and curriculum created together
 *
 * This allows teachers to create custom lessons through the UI
 * without requiring SQL knowledge or database access.
 *
 * Reference: Topic-Level Curriculum Builder Implementation Plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

/**
 * Lesson metadata interface
 */
interface LessonMetadata {
  title: string
  subject: string
  gradeLevel: number
  learningObjective: string
  estimatedDuration: number
  difficulty: string
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
 * Request body interface
 */
interface CreateLessonRequest {
  lesson: LessonMetadata
  curriculum: CurriculumContent
}

/**
 * Validation constants
 */
const VALID_SUBJECTS = ['math', 'science', 'english', 'history', 'art', 'other']
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const MIN_TITLE_LENGTH = 5
const MAX_TITLE_LENGTH = 200
const MIN_OBJECTIVE_LENGTH = 10
const MAX_OBJECTIVE_LENGTH = 500
const MIN_CURRICULUM_SECTION_LENGTH = 50

/**
 * Validate lesson metadata
 */
function validateLesson(lesson: LessonMetadata): { valid: boolean; error?: string } {
  // Title validation
  if (!lesson.title || lesson.title.trim().length === 0) {
    return { valid: false, error: 'Title is required' }
  }
  if (lesson.title.length < MIN_TITLE_LENGTH) {
    return { valid: false, error: `Title must be at least ${MIN_TITLE_LENGTH} characters` }
  }
  if (lesson.title.length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `Title must not exceed ${MAX_TITLE_LENGTH} characters` }
  }

  // Subject validation
  if (!lesson.subject || !VALID_SUBJECTS.includes(lesson.subject.toLowerCase())) {
    return {
      valid: false,
      error: `Subject must be one of: ${VALID_SUBJECTS.join(', ')}`
    }
  }

  // Grade level validation
  if (!lesson.gradeLevel || lesson.gradeLevel < 1 || lesson.gradeLevel > 12) {
    return { valid: false, error: 'Grade level must be between 1 and 12' }
  }

  // Learning objective validation
  if (!lesson.learningObjective || lesson.learningObjective.trim().length === 0) {
    return { valid: false, error: 'Learning objective is required' }
  }
  if (lesson.learningObjective.length < MIN_OBJECTIVE_LENGTH) {
    return {
      valid: false,
      error: `Learning objective must be at least ${MIN_OBJECTIVE_LENGTH} characters`
    }
  }
  if (lesson.learningObjective.length > MAX_OBJECTIVE_LENGTH) {
    return {
      valid: false,
      error: `Learning objective must not exceed ${MAX_OBJECTIVE_LENGTH} characters`
    }
  }

  // Estimated duration validation
  if (!lesson.estimatedDuration || lesson.estimatedDuration <= 0) {
    return { valid: false, error: 'Estimated duration must be a positive number (minutes)' }
  }

  // Difficulty validation
  if (!lesson.difficulty || !VALID_DIFFICULTIES.includes(lesson.difficulty.toLowerCase())) {
    return {
      valid: false,
      error: `Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Validate curriculum content (6 sections)
 */
function validateCurriculum(curriculum: CurriculumContent): { valid: boolean; error?: string } {
  const sections: Array<{ name: string; content: string }> = [
    { name: 'Introduction', content: curriculum.introduction },
    { name: 'Core Content', content: curriculum.coreContent },
    { name: 'Visual Examples', content: curriculum.visualExamples },
    { name: 'Check Understanding', content: curriculum.checkUnderstanding },
    { name: 'Practice', content: curriculum.practice },
    { name: 'Summary', content: curriculum.summary }
  ]

  for (const section of sections) {
    if (!section.content || section.content.trim().length === 0) {
      return { valid: false, error: `${section.name} section is required` }
    }
    if (section.content.trim().length < MIN_CURRICULUM_SECTION_LENGTH) {
      return {
        valid: false,
        error: `${section.name} section must be at least ${MIN_CURRICULUM_SECTION_LENGTH} characters`
      }
    }
  }

  return { valid: true }
}

/**
 * Format curriculum content into structured text
 *
 * Matches the format used in seed_lesson_curriculum.sql
 * This ensures AI agents can parse and use the curriculum correctly
 */
function formatCurriculum(title: string, curriculum: CurriculumContent): string {
  return `═══════════════════════════════════════════════════════════
DETAILED LESSON CURRICULUM: ${title}
═══════════════════════════════════════════════════════════

1️⃣ INTRODUCTION (Engaging Hook)
────────────────────────────────────────
${curriculum.introduction.trim()}


2️⃣ CORE CONCEPT (Main Teaching Content)
────────────────────────────────────────
${curriculum.coreContent.trim()}


3️⃣ VISUAL EXAMPLES (Multiple Demonstrations)
────────────────────────────────────────
${curriculum.visualExamples.trim()}


4️⃣ CHECK UNDERSTANDING (Formative Assessment)
────────────────────────────────────────
${curriculum.checkUnderstanding.trim()}


5️⃣ PRACTICE (Guided Application)
────────────────────────────────────────
${curriculum.practice.trim()}


6️⃣ SUMMARY (Recap & Celebration)
────────────────────────────────────────
${curriculum.summary.trim()}
`
}

/**
 * POST handler - Create new lesson with curriculum
 *
 * Body:
 * {
 *   lesson: {
 *     title: string,
 *     subject: string,
 *     gradeLevel: number,
 *     learningObjective: string,
 *     estimatedDuration: number,
 *     difficulty: string
 *   },
 *   curriculum: {
 *     introduction: string,
 *     coreContent: string,
 *     visualExamples: string,
 *     checkUnderstanding: string,
 *     practice: string,
 *     summary: string
 *   }
 * }
 *
 * Returns:
 * - Success: { success: true, message: string, lessonId: UUID, lesson: {...} }
 * - Error: { error: string, details?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateLessonRequest = await request.json()

    // Validate request structure
    if (!body.lesson || !body.curriculum) {
      return NextResponse.json(
        { error: 'Missing required fields: lesson and curriculum' },
        { status: 400 }
      )
    }

    const { lesson, curriculum } = body

    // Validate lesson metadata
    const lessonValidation = validateLesson(lesson)
    if (!lessonValidation.valid) {
      return NextResponse.json(
        { error: 'Lesson validation failed', details: lessonValidation.error },
        { status: 400 }
      )
    }

    // Validate curriculum content
    const curriculumValidation = validateCurriculum(curriculum)
    if (!curriculumValidation.valid) {
      return NextResponse.json(
        { error: 'Curriculum validation failed', details: curriculumValidation.error },
        { status: 400 }
      )
    }

    // Format curriculum content into structured text
    const formattedCurriculum = formatCurriculum(lesson.title, curriculum)

    // Step 1: Insert lesson into database
    const { data: createdLesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        title: lesson.title.trim(),
        subject: lesson.subject.toLowerCase(),
        grade_level: lesson.gradeLevel,
        learning_objective: lesson.learningObjective.trim(),
        estimated_duration: lesson.estimatedDuration,
        difficulty: lesson.difficulty.toLowerCase()
      })
      .select()
      .single()

    if (lessonError) {
      console.error('Error creating lesson:', lessonError)
      throw new Error(`Failed to create lesson: ${lessonError.message}`)
    }

    // Step 2: Insert curriculum content for the lesson
    const { error: curriculumError } = await supabase
      .from('lesson_curriculum')
      .insert({
        lesson_id: createdLesson.id,
        curriculum_content: formattedCurriculum,
        version: 1
      })

    if (curriculumError) {
      console.error('Error creating curriculum:', curriculumError)

      // Rollback: Delete the lesson since curriculum creation failed
      await supabase.from('lessons').delete().eq('id', createdLesson.id)

      throw new Error(`Failed to create curriculum: ${curriculumError.message}`)
    }

    // Success: Return created lesson details
    return NextResponse.json(
      {
        success: true,
        message: 'Lesson created successfully',
        lessonId: createdLesson.id,
        lesson: {
          id: createdLesson.id,
          title: createdLesson.title,
          subject: createdLesson.subject,
          gradeLevel: createdLesson.grade_level,
          learningObjective: createdLesson.learning_objective,
          estimatedDuration: createdLesson.estimated_duration,
          difficulty: createdLesson.difficulty,
          createdAt: createdLesson.created_at
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/admin/curriculum/lesson:', error)
    return NextResponse.json(
      {
        error: 'Failed to create lesson',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
