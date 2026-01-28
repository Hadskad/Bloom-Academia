/**
 * Curriculum Data Seeding Script
 *
 * This script seeds the database with:
 * 1. Grade 3 Math lessons (if not exist)
 * 2. Lesson prerequisites
 * 3. Curriculum paths
 *
 * Can be run multiple times safely (uses ON CONFLICT clauses)
 *
 * Usage (from project root):
 * ```bash
 * npx ts-node scripts/seed-curriculum.ts
 * ```
 *
 * Reference: Implementation_Roadmap_2.md - Days 19-22 (Day 22: Seed Curriculum Paths)
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

// Grade 3 Math Lessons
const grade3MathLessons = [
  // Level 1: Foundation
  {
    title: 'Counting to 100',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Master counting from 1 to 100 and recognize number patterns',
    estimated_duration: 25,
    difficulty: 'easy'
  },
  {
    title: 'Place Value Basics',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Understand ones, tens, and hundreds places',
    estimated_duration: 30,
    difficulty: 'easy'
  },
  // Level 2: Basic Operations
  {
    title: 'Addition Basics',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Learn single and double-digit addition without regrouping',
    estimated_duration: 35,
    difficulty: 'easy'
  },
  {
    title: 'Subtraction Basics',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Master subtraction without borrowing',
    estimated_duration: 35,
    difficulty: 'easy'
  },
  {
    title: 'Addition with Regrouping',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Add multi-digit numbers with carrying',
    estimated_duration: 40,
    difficulty: 'medium'
  },
  {
    title: 'Subtraction with Borrowing',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Subtract multi-digit numbers with borrowing',
    estimated_duration: 40,
    difficulty: 'medium'
  },
  // Level 3: Intermediate Operations
  {
    title: 'Introduction to Multiplication',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Understand multiplication as repeated addition',
    estimated_duration: 40,
    difficulty: 'medium'
  },
  {
    title: 'Multiplication Tables 1-5',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Memorize and apply times tables 1 through 5',
    estimated_duration: 45,
    difficulty: 'medium'
  },
  {
    title: 'Multiplication Tables 6-10',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Memorize and apply times tables 6 through 10',
    estimated_duration: 45,
    difficulty: 'medium'
  },
  // Level 4: Advanced Operations
  {
    title: 'Introduction to Division',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Understand division as splitting into equal groups',
    estimated_duration: 40,
    difficulty: 'medium'
  },
  {
    title: 'Division with Remainders',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Learn to divide with remainders and interpret results',
    estimated_duration: 45,
    difficulty: 'hard'
  },
  // Level 5: Fractions
  {
    title: 'Understanding Fractions',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Learn what fractions represent using visual models',
    estimated_duration: 35,
    difficulty: 'medium'
  },
  {
    title: 'Comparing Fractions',
    subject: 'math',
    grade_level: 3,
    learning_objective: 'Compare fractions with same denominators using models',
    estimated_duration: 40,
    difficulty: 'hard'
  }
]

// Lesson prerequisites (title pairs with mastery level)
const prerequisites = [
  { lesson: 'Addition with Regrouping', requires: 'Addition Basics', mastery: 80 },
  { lesson: 'Subtraction with Borrowing', requires: 'Subtraction Basics', mastery: 80 },
  {
    lesson: 'Introduction to Multiplication',
    requires: 'Addition with Regrouping',
    mastery: 75
  },
  {
    lesson: 'Multiplication Tables 1-5',
    requires: 'Introduction to Multiplication',
    mastery: 80
  },
  { lesson: 'Multiplication Tables 6-10', requires: 'Multiplication Tables 1-5', mastery: 85 },
  { lesson: 'Introduction to Division', requires: 'Multiplication Tables 1-5', mastery: 80 },
  { lesson: 'Division with Remainders', requires: 'Introduction to Division', mastery: 80 },
  { lesson: 'Understanding Fractions', requires: 'Division with Remainders', mastery: 75 },
  { lesson: 'Comparing Fractions', requires: 'Understanding Fractions', mastery: 80 }
]

async function seedLessons() {
  console.log('\n📚 Seeding Grade 3 Math Lessons...')

  for (const lesson of grade3MathLessons) {
    const { data, error } = await supabase
      .from('lessons')
      .insert(lesson)
      .select()
      .single()

    if (error) {
      // Ignore duplicate errors
      if (error.code === '23505') {
        console.log(`  ⏭️  Lesson already exists: ${lesson.title}`)
      } else {
        console.error(`  ❌ Error inserting ${lesson.title}:`, error.message)
      }
    } else {
      console.log(`  ✅ Created lesson: ${lesson.title}`)
    }
  }
}

async function seedPrerequisites() {
  console.log('\n🔗 Seeding Lesson Prerequisites...')

  for (const prereq of prerequisites) {
    // Get lesson IDs by title
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('id')
      .eq('title', prereq.lesson)
      .eq('grade_level', 3)
      .single()

    const { data: prereqData } = await supabase
      .from('lessons')
      .select('id')
      .eq('title', prereq.requires)
      .eq('grade_level', 3)
      .single()

    if (!lessonData || !prereqData) {
      console.log(
        `  ⚠️  Skipping prerequisite: ${prereq.lesson} requires ${prereq.requires} (lessons not found)`
      )
      continue
    }

    const { error } = await supabase.from('lesson_prerequisites').insert({
      lesson_id: lessonData.id,
      prerequisite_lesson_id: prereqData.id,
      required_mastery_level: prereq.mastery
    })

    if (error) {
      if (error.code === '23505') {
        console.log(`  ⏭️  Prerequisite already exists: ${prereq.lesson} requires ${prereq.requires}`)
      } else {
        console.error(`  ❌ Error creating prerequisite:`, error.message)
      }
    } else {
      console.log(`  ✅ Created prerequisite: ${prereq.lesson} requires ${prereq.requires}`)
    }
  }
}

async function seedCurriculumPath() {
  console.log('\n🗺️  Seeding Curriculum Path...')

  // Get all lesson IDs in order
  const lessonTitles = grade3MathLessons.map((l) => l.title)
  const lessonIds: string[] = []

  for (const title of lessonTitles) {
    const { data } = await supabase
      .from('lessons')
      .select('id')
      .eq('title', title)
      .eq('grade_level', 3)
      .single()

    if (data) {
      lessonIds.push(data.id)
    }
  }

  if (lessonIds.length === 0) {
    console.error('  ❌ No lessons found to create curriculum path')
    return
  }

  const { error } = await supabase
    .from('curriculum_paths')
    .upsert(
      {
        subject: 'math',
        grade_level: 3,
        lesson_sequence: lessonIds,
        total_lessons: lessonIds.length,
        estimated_duration_weeks: 8,
        description:
          'Complete Grade 3 Mathematics curriculum covering counting, addition, subtraction, multiplication, division, and basic fractions'
      },
      {
        onConflict: 'subject,grade_level'
      }
    )

  if (error) {
    console.error('  ❌ Error creating curriculum path:', error.message)
  } else {
    console.log(`  ✅ Created curriculum path: Math Grade 3 (${lessonIds.length} lessons)`)
  }
}

async function verifySeed() {
  console.log('\n🔍 Verifying Seed Data...')

  // Check lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('subject', 'math')
    .eq('grade_level', 3)

  console.log(`  ✅ Found ${lessons?.length || 0} Grade 3 Math lessons`)

  // Check prerequisites
  const { data: prereqs } = await supabase
    .from('lesson_prerequisites')
    .select('*')
    .in(
      'lesson_id',
      lessons?.map((l) => l.id) || []
    )

  console.log(`  ✅ Found ${prereqs?.length || 0} prerequisite relationships`)

  // Check curriculum path
  const { data: path } = await supabase
    .from('curriculum_paths')
    .select('*')
    .eq('subject', 'math')
    .eq('grade_level', 3)
    .single()

  if (path) {
    console.log(`  ✅ Curriculum path exists with ${path.total_lessons} lessons`)
  } else {
    console.log('  ❌ No curriculum path found')
  }
}

async function main() {
  console.log('🚀 Starting Curriculum Seed Script...')
  console.log('📌 Target: Grade 3 Mathematics')

  try {
    await seedLessons()
    await seedPrerequisites()
    await seedCurriculumPath()
    await verifySeed()

    console.log('\n✅ Curriculum seeding complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Verify data in Supabase Dashboard')
    console.log('   2. Test /api/curriculum/next-lesson endpoint')
    console.log('   3. Test prerequisite validation')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()
