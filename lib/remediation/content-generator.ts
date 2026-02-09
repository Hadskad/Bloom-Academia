/**
 * Remediation Content Generator
 *
 * Purpose: Generates targeted mini-lessons for specific concept gaps using AI
 *          Adapts content to student's learning style and grade level
 *
 * Key Features:
 * - AI-powered explanations using Gemini 3 Flash
 * - Structured JSON output for consistent format
 * - Learning style adaptation (visual → SVG diagrams)
 * - Grade-appropriate vocabulary
 * - Practice problems for reinforcement
 *
 * Flow:
 * 1. Receive failed concept + student profile
 * 2. Build adaptive prompt with learning style directives
 * 3. Generate mini-lesson via Gemini with structured output
 * 4. Return formatted remediation content
 *
 * Criterion 5: Failure → Remediation (Step 3 - Content Generation)
 * Reference: ROADMAP_TO_100_PERCENT.md - Remediation Content Generator
 * SDK Reference: https://ai.google.dev/gemini-api/docs/structured-output
 */

import { GoogleGenAI } from '@google/genai';
import type { UserProfile } from '@/lib/memory/profile-manager';

/**
 * Practice problem structure for remediation
 */
export interface PracticeProblem {
  question: string    // The practice question text
  answer: string      // Correct answer with explanation
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Generated remediation lesson for a single concept
 */
export interface RemediationLesson {
  title: string                  // Short, encouraging title
  explanation: string            // 2-3 paragraph simple explanation
  examples: string[]             // 3-4 concrete examples
  practiceProblems: PracticeProblem[]  // 3 practice problems (easy → medium → hard)
  svg?: string                   // Optional SVG diagram (for visual learners)
  estimatedTimeMinutes: number   // Estimated time to complete
}

/**
 * Schema for Gemini structured output
 * Reference: https://ai.google.dev/gemini-api/docs/structured-output
 */
const remediationLessonSchema = {
  type: 'object' as const,
  properties: {
    title: {
      type: 'string' as const,
      description: 'Short, encouraging title for the mini-lesson (max 60 characters)'
    },
    explanation: {
      type: 'string' as const,
      description: '2-3 paragraph explanation using grade-appropriate vocabulary'
    },
    examples: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Array of 3-4 concrete examples demonstrating the concept'
    },
    practiceProblems: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          question: { type: 'string' as const },
          answer: { type: 'string' as const },
          difficulty: {
            type: 'string' as const,
            enum: ['easy', 'medium', 'hard']
          }
        },
        required: ['question', 'answer', 'difficulty']
      },
      description: '3 practice problems progressing from easy to hard'
    },
    svg: {
      type: 'string' as const,
      description: 'Optional SVG diagram code (only for visual learners, null otherwise)'
    },
    estimatedTimeMinutes: {
      type: 'number' as const,
      description: 'Estimated time to complete this mini-lesson (5-15 minutes)'
    }
  },
  required: ['title', 'explanation', 'examples', 'practiceProblems', 'estimatedTimeMinutes']
};

/**
 * Generates a targeted remediation mini-lesson for a specific concept gap
 *
 * Uses Gemini 3 Flash with structured JSON output to ensure consistent formatting
 * Adapts content based on student's learning style, grade level, and preferences
 *
 * @param concept - Internal concept identifier (e.g., "numerator_denominator")
 * @param displayName - Human-readable concept name (e.g., "Numerator & Denominator")
 * @param subject - Subject area (e.g., "Math", "Science")
 * @param gradeLevel - Student's grade level (1-12)
 * @param studentProfile - Student's learning profile for adaptation
 * @returns Promise resolving to remediation lesson content
 *
 * @throws Error if GEMINI_API_KEY not set or API call fails
 *
 * @example
 * ```typescript
 * const lesson = await generateRemediationLesson(
 *   "numerator_denominator",
 *   "Numerator & Denominator",
 *   "Math",
 *   5,
 *   userProfile
 * );
 *
 * console.log(lesson.title);
 * // "Let's Master Numerators and Denominators!"
 * console.log(lesson.examples.length); // 4
 * console.log(lesson.practiceProblems.length); // 3
 * ```
 */
export async function generateRemediationLesson(
  concept: string,
  displayName: string,
  subject: string,
  gradeLevel: number,
  studentProfile: UserProfile
): Promise<RemediationLesson> {
  // Verify API key exists
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Initialize Gemini AI client
  // Reference: https://ai.google.dev/gemini-api/docs/quickstart?lang=node
  const ai = new GoogleGenAI({ apiKey });

  // Get generative model with structured output configuration
  // Using Gemini 3 Flash for fast content generation
  // Reference: https://ai.google.dev/gemini-api/docs/structured-output
  const model = ai.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    config: {
      responseMimeType: 'application/json',
      responseSchema: remediationLessonSchema
    }
  });

  // Build adaptive prompt based on student profile
  const prompt = buildRemediationPrompt(
    concept,
    displayName,
    subject,
    gradeLevel,
    studentProfile
  );

  try {
    console.log('[content-generator] Generating remediation for:', {
      concept,
      subject,
      gradeLevel,
      learningStyle: studentProfile.learning_style
    });

    // Generate content
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    // The SDK with responseSchema guarantees valid JSON output
    const lesson = JSON.parse(responseText) as RemediationLesson;

    console.log('[content-generator] Successfully generated:', {
      title: lesson.title,
      exampleCount: lesson.examples.length,
      practiceCount: lesson.practiceProblems.length,
      hasSvg: !!lesson.svg
    });

    return lesson;
  } catch (error) {
    console.error('[content-generator] Generation failed:', error);
    throw new Error(`Failed to generate remediation content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Builds adaptive prompt for remediation content generation
 *
 * Incorporates:
 * - Learning style directives (visual/auditory/kinesthetic)
 * - Grade-appropriate vocabulary
 * - Student strengths and struggles
 * - Subject-specific context
 *
 * @param concept - Internal concept identifier
 * @param displayName - Human-readable concept name
 * @param subject - Subject area
 * @param gradeLevel - Student's grade level
 * @param profile - Student's learning profile
 * @returns Formatted prompt string for Gemini
 */
function buildRemediationPrompt(
  concept: string,
  displayName: string,
  subject: string,
  gradeLevel: number,
  profile: UserProfile
): string {
  // Determine learning style directives
  const learningStyleDirectives = getLearningStyleDirectives(profile.learning_style);

  // Build adaptive sections
  const sections: string[] = [];

  // Header
  sections.push(`You are creating a REMEDIATION MINI-LESSON to help a struggling student.`);
  sections.push('');

  // Context
  sections.push('═══ LESSON CONTEXT ═══');
  sections.push(`CONCEPT: ${displayName} (${concept})`);
  sections.push(`SUBJECT: ${subject}`);
  sections.push(`GRADE LEVEL: ${gradeLevel}`);
  sections.push(`STUDENT AGE: ${profile.age || gradeLevel + 5}`);
  sections.push('');

  // Learning Style Adaptation
  sections.push('═══ LEARNING STYLE ADAPTATION ═══');
  sections.push(`LEARNING STYLE: ${profile.learning_style || 'visual'}`);
  sections.push(...learningStyleDirectives);
  sections.push('');

  // Student Context
  if (profile.strengths.length > 0 || profile.struggles.length > 0) {
    sections.push('═══ STUDENT CONTEXT ═══');
    if (profile.strengths.length > 0) {
      sections.push(`STRENGTHS: ${profile.strengths.join(', ')}`);
    }
    if (profile.struggles.length > 0) {
      sections.push(`KNOWN STRUGGLES: ${profile.struggles.join(', ')}`);
    }
    sections.push('');
  }

  // Requirements
  sections.push('═══ REQUIREMENTS ═══');
  sections.push(`1. SIMPLE EXPLANATION:`);
  sections.push(`   - Use Grade ${gradeLevel} vocabulary ONLY`);
  sections.push(`   - Break down into smallest possible steps`);
  sections.push(`   - 2-3 short paragraphs maximum`);
  sections.push(`   - Focus on WHY and HOW, not just WHAT`);
  sections.push('');
  sections.push(`2. CONCRETE EXAMPLES (4 examples):`);
  sections.push(`   - Use real-world scenarios relatable to ${profile.age || gradeLevel + 5}-year-olds`);
  sections.push(`   - Show step-by-step reasoning`);
  sections.push(`   - Progress from very simple to slightly harder`);
  sections.push('');
  sections.push(`3. PRACTICE PROBLEMS (exactly 3):`);
  sections.push(`   - Problem 1: EASY (build confidence)`);
  sections.push(`   - Problem 2: MEDIUM (apply concept)`);
  sections.push(`   - Problem 3: MEDIUM-HARD (challenge slightly)`);
  sections.push(`   - Include detailed answer explanations`);
  sections.push('');

  // Visual learner SVG requirement
  if (profile.learning_style === 'visual') {
    sections.push(`4. VISUAL DIAGRAM (REQUIRED for visual learners):`);
    sections.push(`   - Generate an SVG diagram illustrating the concept`);
    sections.push(`   - Use bright colors and clear labels`);
    sections.push(`   - Maximum 400x300 pixels`);
    sections.push(`   - Include visual metaphors that connect to examples`);
    sections.push('');
  } else {
    sections.push(`4. VISUAL DIAGRAM: Not required (student is not a visual learner)`);
    sections.push('');
  }

  // Tone guidance
  sections.push('═══ TONE & STYLE ═══');
  sections.push('- ENCOURAGING: "You can do this!" mindset');
  sections.push('- PATIENT: No rush, take your time');
  sections.push('- POSITIVE: Focus on progress, not failure');
  sections.push('- CONVERSATIONAL: Friendly tutor, not textbook');
  sections.push('');

  // Output format reminder
  sections.push('═══ OUTPUT FORMAT ═══');
  sections.push('Return valid JSON matching the schema with:');
  sections.push('- title: Short, encouraging title (max 60 chars)');
  sections.push('- explanation: 2-3 paragraph simple explanation');
  sections.push('- examples: Array of 4 example strings');
  sections.push('- practiceProblems: Array of 3 {question, answer, difficulty} objects');
  sections.push(`- svg: ${profile.learning_style === 'visual' ? 'SVG code string' : 'null (not needed)'}`);
  sections.push('- estimatedTimeMinutes: Number between 5-15');
  sections.push('');
  sections.push('Focus on rebuilding confidence and understanding, not speed.');

  return sections.join('\n');
}

/**
 * Gets learning style-specific directives for content adaptation
 *
 * @param learningStyle - Student's preferred learning style
 * @returns Array of directive strings to inject into prompt
 */
function getLearningStyleDirectives(learningStyle: string | null): string[] {
  const directives: string[] = [];

  switch (learningStyle) {
    case 'visual':
      directives.push('🎨 VISUAL LEARNER DIRECTIVES:');
      directives.push('- MUST generate an SVG diagram showing the concept visually');
      directives.push('- Use spatial metaphors (shapes, colors, positions)');
      directives.push('- Describe what things "look like"');
      directives.push('- Reference the diagram throughout explanation');
      break;

    case 'auditory':
      directives.push('🔊 AUDITORY LEARNER DIRECTIVES:');
      directives.push('- Use conversational, rhythmic language');
      directives.push('- Include verbal mnemonics or rhymes');
      directives.push('- Repeat key concepts in different phrasings');
      directives.push('- Use sound-based metaphors (music, rhythm, echoes)');
      break;

    case 'kinesthetic':
      directives.push('✋ KINESTHETIC LEARNER DIRECTIVES:');
      directives.push('- Describe physical actions and movements');
      directives.push('- Suggest hands-on activities or manipulatives');
      directives.push('- Use action verbs and movement metaphors');
      directives.push('- Frame concepts as "things you can touch or do"');
      break;

    default:
      // Default to visual (most common)
      directives.push('🎨 LEARNING STYLE: Visual (default)');
      directives.push('- Include an SVG diagram if it helps explain the concept');
      directives.push('- Use clear, structured explanations');
      directives.push('- Provide visual examples when possible');
  }

  return directives;
}

/**
 * Validates that generated remediation lesson meets quality standards
 *
 * @param lesson - Generated remediation lesson
 * @returns Validation result with issues array
 */
export function validateRemediationLesson(lesson: RemediationLesson): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check required fields
  if (!lesson.title || lesson.title.length === 0) {
    issues.push('Missing title');
  }
  if (lesson.title && lesson.title.length > 60) {
    issues.push('Title too long (max 60 characters)');
  }

  if (!lesson.explanation || lesson.explanation.length < 100) {
    issues.push('Explanation too short (minimum 100 characters)');
  }

  if (!lesson.examples || lesson.examples.length < 3) {
    issues.push('Not enough examples (minimum 3 required)');
  }

  if (!lesson.practiceProblems || lesson.practiceProblems.length !== 3) {
    issues.push('Must have exactly 3 practice problems');
  }

  if (!lesson.estimatedTimeMinutes || lesson.estimatedTimeMinutes < 5 || lesson.estimatedTimeMinutes > 15) {
    issues.push('Estimated time must be between 5-15 minutes');
  }

  // Check practice problem structure
  if (lesson.practiceProblems) {
    for (const [index, problem] of lesson.practiceProblems.entries()) {
      if (!problem.question || problem.question.length === 0) {
        issues.push(`Practice problem ${index + 1} missing question`);
      }
      if (!problem.answer || problem.answer.length === 0) {
        issues.push(`Practice problem ${index + 1} missing answer`);
      }
      if (!['easy', 'medium', 'hard'].includes(problem.difficulty)) {
        issues.push(`Practice problem ${index + 1} has invalid difficulty`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
