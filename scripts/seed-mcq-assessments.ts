/**
 * Seed MCQ Assessments Script
 *
 * Updates existing assessments with MCQ options
 * Run: npx tsx scripts/seed-mcq-assessments.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔧 Seeding MCQ Assessments...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'lib/db/seed_assessments_grade3_math_mcq.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent })

    if (error) {
      // If rpc doesn't exist, run manual inserts
      console.log('⚠️  RPC not available, running manual inserts...\n')
      await manualSeed()
    } else {
      console.log('✅ MCQ assessments seeded successfully!')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    // Fallback to manual seed
    await manualSeed()
  }
}

async function manualSeed() {
  console.log('Running manual MCQ seed...\n')

  // Get lessons first
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('grade_level', 3)
    .eq('subject', 'math')

  if (!lessons || lessons.length === 0) {
    console.error('❌ No lessons found')
    return
  }

  // Assessment 1: Counting to 100
  const countingLesson = lessons.find((l) => l.title === 'Counting to 100')
  if (countingLesson) {
    await upsertAssessment(countingLesson.id, {
      title: 'Counting Mastery Check',
      description: 'Quick check to verify counting skills from 1 to 100',
      questions: [
        {
          id: 'q1',
          text: 'What number comes after 49?',
          type: 'multiple_choice',
          options: ['48', '50', '51', '40'],
          correct_answer: '50',
          points: 33.33,
          hint: 'Think about what follows 49 when counting',
        },
        {
          id: 'q2',
          text: 'If you count by tens starting from 10, what is the third number you say?',
          type: 'multiple_choice',
          options: ['20', '30', '40', '50'],
          correct_answer: '30',
          points: 33.33,
          hint: 'Start at 10 and add 10 each time: 10, 20, ...',
        },
        {
          id: 'q3',
          text: 'Which statement is true about the numbers 78 and 87?',
          type: 'multiple_choice',
          options: [
            '78 comes after 87',
            '78 and 87 are the same',
            '78 comes before 87',
            '78 is larger than 87',
          ],
          correct_answer: '78 comes before 87',
          points: 33.34,
          hint: 'Compare the tens place first',
        },
      ],
      passing_score: 80.0,
      max_attempts: 3,
    })
    console.log('✅ Counting to 100 assessment updated')
  }

  // Assessment 2: Place Value Basics
  const placeValueLesson = lessons.find((l) => l.title === 'Place Value Basics')
  if (placeValueLesson) {
    await upsertAssessment(placeValueLesson.id, {
      title: 'Place Value Understanding Check',
      description: 'Assess understanding of ones, tens, and hundreds places',
      questions: [
        {
          id: 'q1',
          text: 'In the number 345, what digit is in the tens place?',
          type: 'multiple_choice',
          options: ['3', '4', '5', '34'],
          correct_answer: '4',
          points: 33.33,
          hint: 'The tens place is in the middle of a 3-digit number',
        },
        {
          id: 'q2',
          text: 'What is the value of the 7 in the number 273?',
          type: 'multiple_choice',
          options: ['7', '70', '700', '27'],
          correct_answer: '70',
          points: 33.33,
          hint: 'Look at which place the 7 is in',
        },
        {
          id: 'q3',
          text: 'In the number 582, what does the 5 represent?',
          type: 'multiple_choice',
          options: ['5 ones', '5 tens', '5 hundreds', '5 thousands'],
          correct_answer: '5 hundreds',
          points: 33.34,
          hint: 'The first digit in a 3-digit number is the hundreds place',
        },
      ],
      passing_score: 80.0,
      max_attempts: 3,
    })
    console.log('✅ Place Value Basics assessment updated')
  }

  // Assessment 3: Addition Basics
  const additionLesson = lessons.find((l) => l.title === 'Addition Basics')
  if (additionLesson) {
    await upsertAssessment(additionLesson.id, {
      title: 'Addition Skills Check',
      description: 'Test basic addition without regrouping',
      questions: [
        {
          id: 'q1',
          text: 'What is 23 plus 45?',
          type: 'multiple_choice',
          options: ['58', '68', '78', '62'],
          correct_answer: '68',
          points: 33.33,
          hint: 'Add the ones place first, then the tens place',
        },
        {
          id: 'q2',
          text: 'If you have 12 apples and your friend gives you 15 more, how many apples do you have in total?',
          type: 'multiple_choice',
          options: ['25', '26', '27', '28'],
          correct_answer: '27',
          points: 33.33,
          hint: 'This is an addition word problem',
        },
        {
          id: 'q3',
          text: 'What is 30 plus 20?',
          type: 'multiple_choice',
          options: ['40', '50', '60', '10'],
          correct_answer: '50',
          points: 33.34,
          hint: 'Add the tens: 3 tens plus 2 tens',
        },
      ],
      passing_score: 80.0,
      max_attempts: 3,
    })
    console.log('✅ Addition Basics assessment updated')
  }

  console.log('\n✅ Manual MCQ seed complete!')
}

async function upsertAssessment(lessonId: string, data: any) {
  // First, check if assessment exists
  const { data: existing } = await supabase
    .from('assessments')
    .select('id')
    .eq('lesson_id', lessonId)
    .single()

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('assessments')
      .update({
        title: data.title,
        description: data.description,
        questions: data.questions,
        passing_score: data.passing_score,
        max_attempts: data.max_attempts,
      })
      .eq('lesson_id', lessonId)

    if (error) {
      console.error(`❌ Error updating assessment for lesson ${lessonId}:`, error)
    }
  } else {
    // Insert new
    const { error } = await supabase.from('assessments').insert({
      lesson_id: lessonId,
      title: data.title,
      description: data.description,
      questions: data.questions,
      passing_score: data.passing_score,
      max_attempts: data.max_attempts,
    })

    if (error) {
      console.error(`❌ Error inserting assessment for lesson ${lessonId}:`, error)
    }
  }
}

main()
