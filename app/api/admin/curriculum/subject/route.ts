/**
 * Subject Configuration API
 *
 * GET /api/admin/curriculum/subject?grade=<number>&subject=<subject>
 * - Loads mastery rules configuration for a subject/grade
 *
 * PUT /api/admin/curriculum/subject
 * - Saves/updates mastery rules configuration
 *
 * Reference: Phase 1 - Curriculum Builder System
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

/**
 * GET handler - Load subject configuration
 *
 * Query Parameters:
 * - grade (required): Grade level (1-12)
 * - subject (required): Subject name ('math', 'science', 'english', 'history', 'art', 'other')
 *
 * Returns:
 * - Configuration object with default_mastery_rules
 * - System defaults if no configuration exists
 *
 * @example
 * GET /api/admin/curriculum/subject?grade=3&subject=math
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gradeStr = searchParams.get('grade')
    const subject = searchParams.get('subject')

    // Validate parameters
    if (!gradeStr || !subject) {
      return NextResponse.json(
        { error: 'Missing required parameters: grade and subject' },
        { status: 400 }
      )
    }

    const gradeLevel = parseInt(gradeStr, 10)
    if (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
      return NextResponse.json(
        { error: 'Invalid grade: must be a number between 1 and 12' },
        { status: 400 }
      )
    }

    const validSubjects = ['math', 'science', 'english', 'history', 'art', 'other']
    if (!validSubjects.includes(subject.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid subject: must be one of ${validSubjects.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch configuration from database
    const { data, error } = await supabase
      .from('subject_configurations')
      .select('*')
      .eq('subject', subject.toLowerCase())
      .eq('grade_level', gradeLevel)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok (we'll return defaults)
      console.error('Error fetching subject configuration:', error)
      throw error
    }

    // If no configuration exists, return system defaults
    if (!data) {
      return NextResponse.json({
        exists: false,
        subject: subject.toLowerCase(),
        gradeLevel,
        masteryRules: {
          minCorrectAnswers: 3,
          minExplanationQuality: 70,
          minApplicationAttempts: 2,
          minOverallQuality: 75,
          maxStruggleRatio: 0.3,
          minTimeSpentMinutes: 5
        }
      })
    }

    // Return existing configuration
    return NextResponse.json({
      exists: true,
      subject: data.subject,
      gradeLevel: data.grade_level,
      masteryRules: data.default_mastery_rules,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    })
  } catch (error) {
    console.error('Error in GET /api/admin/curriculum/subject:', error)
    return NextResponse.json(
      {
        error: 'Failed to load subject configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT handler - Save/update subject configuration
 *
 * Body:
 * {
 *   subject: string,
 *   gradeLevel: number,
 *   masteryRules: {
 *     minCorrectAnswers: number,
 *     minExplanationQuality: number,
 *     minApplicationAttempts: number,
 *     minOverallQuality: number,
 *     maxStruggleRatio: number,
 *     minTimeSpentMinutes: number
 *   }
 * }
 *
 * Returns:
 * - Updated configuration object
 *
 * @example
 * PUT /api/admin/curriculum/subject
 * Body: { subject: 'math', gradeLevel: 3, masteryRules: {...} }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, gradeLevel, masteryRules } = body

    // Validate required fields
    if (!subject || !gradeLevel || !masteryRules) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, gradeLevel, masteryRules' },
        { status: 400 }
      )
    }

    // Validate grade level
    if (gradeLevel < 1 || gradeLevel > 12) {
      return NextResponse.json(
        { error: 'Invalid gradeLevel: must be between 1 and 12' },
        { status: 400 }
      )
    }

    // Validate subject
    const validSubjects = ['math', 'science', 'english', 'history', 'art', 'other']
    if (!validSubjects.includes(subject.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid subject: must be one of ${validSubjects.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate mastery rules structure
    const requiredRules = [
      'minCorrectAnswers',
      'minExplanationQuality',
      'minApplicationAttempts',
      'minOverallQuality',
      'maxStruggleRatio',
      'minTimeSpentMinutes'
    ]

    for (const rule of requiredRules) {
      if (masteryRules[rule] === undefined || masteryRules[rule] === null) {
        return NextResponse.json(
          { error: `Missing mastery rule: ${rule}` },
          { status: 400 }
        )
      }
    }

    // Validate rule values
    if (masteryRules.minCorrectAnswers < 0) {
      return NextResponse.json(
        { error: 'minCorrectAnswers must be >= 0' },
        { status: 400 }
      )
    }

    if (masteryRules.minExplanationQuality < 0 || masteryRules.minExplanationQuality > 100) {
      return NextResponse.json(
        { error: 'minExplanationQuality must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (masteryRules.maxStruggleRatio < 0 || masteryRules.maxStruggleRatio > 1) {
      return NextResponse.json(
        { error: 'maxStruggleRatio must be between 0 and 1' },
        { status: 400 }
      )
    }

    // Upsert configuration (insert or update if exists)
    const { data, error } = await supabase
      .from('subject_configurations')
      .upsert(
        {
          subject: subject.toLowerCase(),
          grade_level: gradeLevel,
          default_mastery_rules: masteryRules
        },
        {
          onConflict: 'subject,grade_level'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving subject configuration:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      configuration: {
        subject: data.subject,
        gradeLevel: data.grade_level,
        masteryRules: data.default_mastery_rules,
        updatedAt: data.updated_at
      }
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/curriculum/subject:', error)
    return NextResponse.json(
      {
        error: 'Failed to save subject configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
