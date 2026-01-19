/**
 * POST /api/users/create
 *
 * Creates a new user profile in the database.
 * This is used during the welcome/onboarding flow.
 *
 * Request Body:
 * - name: string (required)
 * - age: number (required, 1-150)
 * - grade: number (required, 1-12)
 *
 * Response:
 * - userId: UUID of created user
 * - name: user's name
 * - age: user's age
 * - gradeLevel: user's grade level
 *
 * Error Handling:
 * - 400: Missing or invalid fields
 * - 500: Database error
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

interface CreateUserRequest {
  name: string
  age: number
  grade: number
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateUserRequest = await request.json()
    const { name, age, grade } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!age || typeof age !== 'number' || age < 1 || age > 150) {
      return NextResponse.json(
        { error: 'Age is required and must be between 1 and 150' },
        { status: 400 }
      )
    }

    if (!grade || typeof grade !== 'number' || grade < 1 || grade > 12) {
      return NextResponse.json(
        { error: 'Grade is required and must be between 1 and 12' },
        { status: 400 }
      )
    }

    // Insert user into database
    // Reference: https://supabase.com/docs/reference/javascript/insert
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        age: age,
        grade_level: grade
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Return success response
    return NextResponse.json({
      userId: data.id,
      name: data.name,
      age: data.age,
      gradeLevel: data.grade_level
    })
  } catch (error) {
    console.error('Error in /api/users/create:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
