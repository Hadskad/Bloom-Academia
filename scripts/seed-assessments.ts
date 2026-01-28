/**
 * Assessment Data Seeding Script
 *
 * This script seeds the database with assessments for Grade 3 Math lessons.
 * Focuses on the first 5 lessons for MVP.
 *
 * Can be run multiple times safely (checks for existing assessments)
 *
 * Usage (from project root):
 * ```bash
 * npx ts-node scripts/seed-assessments.ts
 * ```
 *
 * Reference: Implementation_Roadmap_2.md - Day 23 (Assessment Database + Question Bank)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Assessment data for first 5 Grade 3 Math lessons
const assessments = [
  {
    lessonTitle: 'Counting to 100',
    title: 'Counting Mastery Check',
    description: 'Quick check to verify counting skills from 1 to 100',
    questions: [
      {
        id: 'q1',
        text: 'What number comes after 49?',
        type: 'number',
        correct_answer: '50',
        points: 33.33,
        hint: 'Think about what follows 49 when counting'
      },
      {
        id: 'q2',
        text: 'If you count by tens starting from 10, what are the first five numbers you say?',
        type: 'sequence',
        correct_answer: '10, 20, 30, 40, 50',
        points: 33.33,
        hint: 'Start at 10 and add 10 each time'
      },
      {
        id: 'q3',
        text: 'True or false: 78 comes before 87 when counting',
        type: 'true_false',
        correct_answer: 'true',
        points: 33.34,
        hint: 'Compare the tens place first'
      }
    ],
    passing_score: 80.0,
    max_attempts: 3
  },
  {
    lessonTitle: 'Place Value Basics',
    title: 'Place Value Understanding Check',
    description: 'Assess understanding of ones, tens, and hundreds places',
    questions: [
      {
        id: 'q1',
        text: 'In the number 345, what digit is in the tens place?',
        type: 'number',
        correct_answer: '4',
        points: 33.33,
        hint: 'The tens place is in the middle of a 3-digit number'
      },
      {
        id: 'q2',
        text: 'What is the value of the 7 in the number 273?',
        type: 'number',
        correct_answer: '70',
        points: 33.33,
        hint: 'Look at which place the 7 is in'
      },
      {
        id: 'q3',
        text: 'True or false: In the number 582, the 5 represents 5 hundreds',
        type: 'true_false',
        correct_answer: 'true',
        points: 33.34,
        hint: 'The first digit in a 3-digit number is the hundreds place'
      }
    ],
    passing_score: 80.0,
    max_attempts: 3
  },
  {
    lessonTitle: 'Addition Basics',
    title: 'Addition Skills Check',
    description: 'Test basic addition without regrouping',
    questions: [
      {
        id: 'q1',
        text: 'What is 23 plus 45?',
        type: 'number',
        correct_answer: '68',
        points: 33.33,
        hint: 'Add the ones place first, then the tens place'
      },
      {
        id: 'q2',
        text: 'If you have 12 apples and your friend gives you 15 more, how many apples do you have in total?',
        type: 'number',
        correct_answer: '27',
        points: 33.33,
        hint: 'This is an addition word problem'
      },
      {
        id: 'q3',
        text: 'What is 30 plus 20?',
        type: 'number',
        correct_answer: '50',
        points: 33.34,
        hint: 'Add the tens: 3 tens plus 2 tens'
      }
    ],
    passing_score: 80.0,
    max_attempts: 3
  },
  {
    lessonTitle: 'Subtraction Basics',
    title: 'Subtraction Skills Check',
    description: 'Test basic subtraction without borrowing',
    questions: [
      {
        id: 'q1',
        text: 'What is 58 minus 23?',
        type: 'number',
        correct_answer: '35',
        points: 33.33,
        hint: 'Subtract ones first, then tens'
      },
      {
        id: 'q2',
        text: 'You have 47 candies and you eat 15 of them. How many candies do you have left?',
        type: 'number',
        correct_answer: '32',
        points: 33.33,
        hint: 'This is a subtraction word problem'
      },
      {
        id: 'q3',
        text: 'What is 90 minus 40?',
        type: 'number',
        correct_answer: '50',
        points: 33.34,
        hint: 'Subtract the tens: 9 tens minus 4 tens'
      }
    ],
    passing_score: 80.0,
    max_attempts: 3
  },
  {
    lessonTitle: 'Addition with Regrouping',
    title: 'Regrouping Addition Check',
    description: 'Test addition with carrying/regrouping',
    questions: [
      {
        id: 'q1',
        text: 'What is 37 plus 28?',
        type: 'number',
        correct_answer: '65',
        points: 33.33,
        hint: 'Add ones: 7 + 8 = 15. Write 5, carry 1. Then add tens: 3 + 2 + 1'
      },
      {
        id: 'q2',
        text: 'What is 156 plus 87?',
        type: 'number',
        correct_answer: '243',
        points: 33.33,
        hint: 'Be careful to regroup when adding each place value'
      },
      {
        id: 'q3',
        text: 'True or false: When adding 49 plus 53, you need to regroup in the ones place',
        type: 'true_false',
        correct_answer: 'true',
        points: 33.34,
        hint: 'Look at the ones place: 9 + 3 = 12, which is more than 10'
      }
    ],
    passing_score: 80.0,
    max_attempts: 3
  }
]

async function seedAssessments() {
  console.log('\n📝 Seeding Assessments for Grade 3 Math Lessons...')

  for (const assessment of assessments) {
    // Get lesson ID by title
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('title', assessment.lessonTitle)
      .eq('grade_level', 3)
      .single()

    if (lessonError || !lessonData) {
      console.log(`  ⚠️  Lesson not found: ${assessment.lessonTitle}`)
      continue
    }

    // Check if assessment already exists
    const { data: existingAssessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('lesson_id', lessonData.id)
      .single()

    if (existingAssessment) {
      console.log(`  ⏭️  Assessment already exists: ${assessment.title}`)
      continue
    }

    // Insert assessment
    const { error } = await supabase.from('assessments').insert({
      lesson_id: lessonData.id,
      title: assessment.title,
      description: assessment.description,
      questions: assessment.questions,
      passing_score: assessment.passing_score,
      max_attempts: assessment.max_attempts
    })

    if (error) {
      console.error(`  ❌ Error inserting assessment for ${assessment.lessonTitle}:`, error.message)
    } else {
      console.log(`  ✅ Created assessment: ${assessment.title}`)
    }
  }
}

async function verifyAssessments() {
  console.log('\n🔍 Verifying Assessment Data...')

  const { data: assessmentsData, error } = await supabase
    .from('assessments')
    .select(`
      id,
      title,
      questions,
      lessons!inner(title, subject, grade_level)
    `)
    .eq('lessons.subject', 'math')
    .eq('lessons.grade_level', 3)

  if (error) {
    console.error('  ❌ Error fetching assessments:', error.message)
    return
  }

  console.log(`  ✅ Found ${assessmentsData?.length || 0} assessments for Grade 3 Math`)

  if (assessmentsData && assessmentsData.length > 0) {
    console.log('\n  📋 Assessment Details:')
    assessmentsData.forEach((assessment) => {
      const questionCount = Array.isArray(assessment.questions)
        ? assessment.questions.length
        : 0
      console.log(`     - ${assessment.title}: ${questionCount} questions`)
    })
  }
}

async function main() {
  console.log('🚀 Starting Assessment Seed Script...')
  console.log('📌 Target: First 5 Grade 3 Math Lessons')

  try {
    await seedAssessments()
    await verifyAssessments()

    console.log('\n✅ Assessment seeding complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Verify assessments in Supabase Dashboard')
    console.log('   2. Test assessment loader: lib/assessment/assessment-loader.ts')
    console.log('   3. Proceed to Day 24: Assessment Conductor implementation')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()
