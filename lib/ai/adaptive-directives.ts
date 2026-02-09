/**
 * Adaptive Teaching Directives Generator
 *
 * Transforms student context (profile + performance) into explicit teaching directives
 * that modify AI agent behavior in real-time.
 *
 * This solves Criterion 2 (AI Adapts): Context data now actively changes teaching behavior
 * instead of being passively passed to agents.
 *
 * Key Adaptations:
 * 1. Learning Style → Visual/auditory/kinesthetic/reading-writing/logical/social/solitary
 * 2. Mastery Level → Difficulty adjustments (simplify vs challenge)
 * 3. Recent Struggles → Scaffolding intensity
 * 4. Known Strengths/Struggles → Leverage and anticipate
 *
 * Reference: ROADMAP_TO_100_PERCENT.md - Criterion 2 Implementation
 */

import type { UserProfile } from '@/lib/memory/profile-manager';

/**
 * Interaction record from session history
 */
export interface Interaction {
  user_message: string;
  ai_response: string;
  timestamp?: string;
}

/**
 * Adaptive directives structure
 * Contains all modifications to be applied to teaching behavior
 */
export interface AdaptiveDirectives {
  styleAdjustments: string[];      // Learning style modifications
  difficultyAdjustments: string[]; // Pacing and complexity
  scaffoldingNeeds: string[];      // Support level required
  phaseGuidance: string[];         // Phase-specific progression instructions
  encouragementLevel: 'minimal' | 'standard' | 'high'; // Tone adjustment
  currentMastery: number;          // For logging purposes
}

/**
 * Analyzes student context and generates teaching directives
 *
 * This is the core function that transforms passive context into active instructions.
 * Each directive is explicit and actionable, ensuring the AI knows exactly how to adapt.
 *
 * @param profile - Student profile (age, grade, learning style, strengths, struggles)
 * @param recentHistory - Recent conversation history (to detect struggles)
 * @param currentMastery - Current mastery level 0-100 (determines difficulty)
 * @returns Adaptive directives object with explicit instructions
 *
 * @example
 * ```typescript
 * const directives = generateAdaptiveDirectives(
 *   profile,        // learning_style: 'visual'
 *   recentHistory,  // 3 recent errors
 *   45              // Low mastery
 * )
 * // Result: "Generate SVG diagrams", "Use very simple language", "Maximum scaffolding"
 * ```
 */
export function generateAdaptiveDirectives(
  profile: UserProfile,
  recentHistory: Interaction[],
  currentMastery: number
): AdaptiveDirectives {
  const directives: AdaptiveDirectives = {
    styleAdjustments: [],
    difficultyAdjustments: [],
    scaffoldingNeeds: [],
    phaseGuidance: [],
    encouragementLevel: 'standard',
    currentMastery
  };

  // ═══════════════════════════════════════════════════════════
  // 1. LEARNING STYLE ADAPTATION
  // ═══════════════════════════════════════════════════════════

  const learningStyle = profile.learning_style?.toLowerCase();

  if (learningStyle === 'visual') {
    directives.styleAdjustments.push(
      '🎨 VISUAL LEARNER ADAPTATIONS:',
      '- CRITICAL: Generate an SVG diagram for EVERY major concept explained',
      '- Use visual metaphors and spatial descriptions (top/bottom, left/right, inside/outside)',
      '- Reference colors, shapes, sizes, and visual patterns frequently',
      '- Organize information spatially (lists, tables, visual hierarchies)',
      '- Use phrases like "picture this", "imagine", "visualize", "see how"'
    );
  } else if (learningStyle === 'auditory') {
    directives.styleAdjustments.push(
      '🎵 AUDITORY LEARNER ADAPTATIONS:',
      '- Use conversational, rhythmic language with natural flow',
      '- Include sound-based metaphors (rhythm, melody, echoes, harmony)',
      '- Repeat key concepts in different phrasings for reinforcement',
      '- Use verbal cues like "listen to this", "hear how", "sounds like"',
      '- Structure explanations like a spoken story with clear verbal signposts'
    );
  } else if (learningStyle === 'kinesthetic') {
    directives.styleAdjustments.push(
      '🤸 KINESTHETIC LEARNER ADAPTATIONS:',
      '- Describe physical actions and hands-on activities ("try this", "move", "build")',
      '- Use movement-based metaphors (walking, touching, building, manipulating)',
      '- Suggest concrete manipulatives or physical demonstrations',
      '- Encourage active engagement ("draw it out", "act it out", "use your fingers")',
      '- Connect concepts to body sensations and physical experiences'
    );
  } else if (learningStyle === 'reading/writing' || learningStyle === 'reading-writing') {
    directives.styleAdjustments.push(
      '📚 READING/WRITING LEARNER ADAPTATIONS:',
      '- Provide detailed written explanations with rich text descriptions',
      '- Use lists, bullet points, and well-organized text structures',
      '- Encourage note-taking and written summaries',
      '- Include vocabulary definitions and written examples',
      '- Suggest writing exercises or journaling about the concept'
    );
  } else if (learningStyle === 'logical' || learningStyle === 'mathematical') {
    directives.styleAdjustments.push(
      '🧮 LOGICAL/MATHEMATICAL LEARNER ADAPTATIONS:',
      '- Present information in logical sequences with clear cause-effect relationships',
      '- Use numbered steps, formulas, and systematic problem-solving approaches',
      '- Include patterns, classifications, and categorical organization',
      '- Emphasize reasoning chains: "if...then", "therefore", "because"',
      '- Connect concepts to logic puzzles, equations, or systematic thinking'
    );
  } else if (learningStyle === 'social' || learningStyle === 'interpersonal') {
    directives.styleAdjustments.push(
      '👥 SOCIAL/INTERPERSONAL LEARNER ADAPTATIONS:',
      '- Frame concepts through human interactions and group scenarios',
      '- Use dialogue, conversations, and collaborative examples',
      '- Reference how concepts apply to working with others',
      '- Encourage "teach it to someone else" or "explain it to a friend"',
      '- Connect learning to social contexts and interpersonal relationships'
    );
  } else if (learningStyle === 'solitary' || learningStyle === 'intrapersonal') {
    directives.styleAdjustments.push(
      '🧘 SOLITARY/INTRAPERSONAL LEARNER ADAPTATIONS:',
      '- Support independent reflection and self-paced discovery',
      '- Encourage personal connections: "How does this relate to your experience?"',
      '- Provide time for internal processing before asking for responses',
      '- Frame learning as personal growth and self-understanding',
      '- Use introspective prompts: "What do you think?", "In your own words"'
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 2. DIFFICULTY ADAPTATION (Based on Current Mastery)
  // ═══════════════════════════════════════════════════════════

  if (currentMastery < 50) {
    // Student struggling - SIMPLIFY AGGRESSIVELY
    directives.difficultyAdjustments.push(
      '📉 LOW MASTERY (<50%) - SIMPLIFICATION MODE:',
      '- SLOW DOWN: Break every concept into the smallest possible steps',
      '- Use ONLY simple vocabulary appropriate for grade level (avoid technical jargon)',
      '- Provide MORE examples (minimum 3 concrete examples per concept)',
      '- Check understanding after EVERY step before proceeding ("Got it?")',
      '- Use analogies from everyday life that the student can relate to',
      '- If they struggle with a step, break it down even further',
      '- PHASE GUIDANCE: Do NOT compress any phases. Use maximum turns per phase.',
      '- In Phase 2, provide at least 2 worked examples before moving to Phase 3',
      '- In Phase 3, guide every single step explicitly'
    );
  } else if (currentMastery >= 50 && currentMastery < 80) {
    // Student learning - STANDARD PACE
    directives.difficultyAdjustments.push(
      '📊 MEDIUM MASTERY (50-80%) - STANDARD TEACHING:',
      '- Balanced pace: Explain clearly with 1-2 examples per concept',
      '- Introduce concepts progressively with logical connections',
      '- Check understanding periodically (not after every step)',
      '- Use appropriate grade-level vocabulary with occasional challenges',
      '- Build on previous knowledge systematically'
    );
  } else {
    // Student excelling - CHALLENGE MODE
    directives.difficultyAdjustments.push(
      '📈 HIGH MASTERY (>80%) - ACCELERATION MODE:',
      '- ACCELERATE: Student is ready for more complexity and depth',
      '- Introduce advanced vocabulary and more sophisticated concepts',
      '- Ask deeper questions that require synthesis and critical thinking',
      '- Provide challenging extensions: "What if...", "How would you...", "Can you apply this to..."',
      '- Move faster through basics, spend more time on nuances and applications',
      '- Trust the student to connect dots independently',
      '- PHASE GUIDANCE: Compress Phases 1-3 per Mastery Acceleration in Teaching Progression Protocol.',
      '- In Phase 2, recap briefly and probe with a challenging question',
      '- In Phase 3, one guided problem maximum, then move to Phase 4 if correct',
      '- Phases 4 and 5 CANNOT be compressed'
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 3. SCAFFOLDING BASED ON RECENT STRUGGLES
  // ═══════════════════════════════════════════════════════════

  // Detect struggle indicators in recent AI responses
  const struggleIndicators = [
    'not quite',
    'incorrect',
    'try again',
    'let me explain again',
    'let\'s break this down',
    'having trouble',
    'struggling'
  ];

  const recentErrors = recentHistory.filter(interaction =>
    struggleIndicators.some(indicator =>
      interaction.ai_response.toLowerCase().includes(indicator)
    )
  ).length;

  const struggleRatio = recentHistory.length > 0
    ? recentErrors / recentHistory.length
    : 0;

  if (struggleRatio > 0.4) {
    // High struggle - MAXIMUM SUPPORT
    directives.scaffoldingNeeds.push(
      '🆘 HIGH STRUGGLE DETECTED - MAXIMUM SCAFFOLDING:',
      '- Follow Teaching Progression Protocol strictly - NO phase compression allowed',
      '- Phase 2 (I DO): Show COMPLETE worked examples, minimum 2 before moving on',
      '- Phase 3 (WE DO): Guide EVERY step explicitly, provide sentence starters and templates',
      '- Phase 4 (YOU DO): Start with an easier problem than expected, build confidence first',
      '- CORRECTION LOOP: On 2nd failure, drop back one phase immediately',
      '- Celebrate small wins at EVERY phase transition',
      '- If stuck in any phase for 5+ turns, suggest a break (handoff to motivator)',
      '- Be extremely patient and encouraging - confidence is more important than speed'
    );
    directives.encouragementLevel = 'high';
  } else if (struggleRatio > 0.2) {
    // Moderate struggle - STANDARD SUPPORT
    directives.scaffoldingNeeds.push(
      '🤝 MODERATE STRUGGLE - STANDARD SCAFFOLDING:',
      '- Provide hints when student gets stuck (not full solutions)',
      '- Ask guiding questions to prompt thinking: "What do you know?", "What\'s the first step?"',
      '- Offer partial examples or analogies',
      '- Check in regularly but don\'t over-help',
      '- Balance independence with support'
    );
    directives.encouragementLevel = 'standard';
  } else {
    // Low struggle - MINIMAL SUPPORT (Let them fly!)
    directives.scaffoldingNeeds.push(
      '🚀 LOW STRUGGLE - MINIMAL SCAFFOLDING:',
      '- Student is confident and capable - reduce scaffolding',
      '- Let student work independently and discover solutions',
      '- Only intervene if they explicitly ask for help',
      '- Pose open-ended questions that encourage exploration',
      '- Trust their process and problem-solving abilities'
    );
    directives.encouragementLevel = 'minimal';
  }

  // ═══════════════════════════════════════════════════════════
  // 4. KNOWN STRENGTHS & STRUGGLES
  // ═══════════════════════════════════════════════════════════

  if (profile.strengths && profile.strengths.length > 0) {
    directives.scaffoldingNeeds.push(
      `💪 LEVERAGE STRENGTHS: Student excels at ${profile.strengths.join(', ')}.`,
      `- Connect new concepts to these strengths as bridges to understanding`,
      `- Use their strong areas as foundation for building new knowledge`,
      `- Reference their expertise: "You're good at ${profile.strengths[0]}, this is similar..."`
    );
  }

  if (profile.struggles && profile.struggles.length > 0) {
    directives.scaffoldingNeeds.push(
      `⚠️ KNOWN STRUGGLES: Student has difficulty with ${profile.struggles.join(', ')}.`,
      `- Anticipate confusion in these areas and pre-explain connections`,
      `- Provide extra support when these topics appear`,
      `- Avoid assuming prior knowledge in struggle areas - review basics first`,
      `- Be patient and encouraging when these topics come up`
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 5. PHASE PROGRESSION GUIDANCE
  // ═══════════════════════════════════════════════════════════
  // Provides explicit phase-level instructions based on the combination
  // of mastery level and struggle data to guide Teaching Progression Protocol

  if (currentMastery >= 80 && struggleRatio < 0.2) {
    directives.phaseGuidance.push(
      '⚡ PHASE ACCELERATION ENABLED:',
      '- Student qualifies for Mastery Acceleration mode',
      '- Compress Phases 1-3 per the Teaching Progression Protocol',
      '- Move quickly to Phase 4 and Phase 5',
      '- Focus time on challenging transfer questions in Phase 5'
    );
  } else if (currentMastery < 30) {
    directives.phaseGuidance.push(
      '🐢 EXTENDED PHASE MODE:',
      '- Student needs maximum time in each phase',
      '- Phase 2: Use 3+ worked examples before moving on',
      '- Phase 3: Guide through 2-3 problems before Phase 4',
      '- Phase 4: Start with the simplest possible problem',
      '- Do NOT rush any phase transition',
      '- Watch for frustration signals - hand off to Motivator if needed'
    );
  } else if (struggleRatio > 0.4 && currentMastery >= 50) {
    directives.phaseGuidance.push(
      '🔄 CORRECTION-HEAVY MODE:',
      '- Student knows some material but makes frequent errors',
      '- Extra emphasis on CORRECTION LOOP verification (Step 3)',
      '- In Phase 3, verify each step before proceeding to next',
      '- In Phase 4, after each error, return to guided practice briefly',
      '- Phase 5: Dedicate extra time to circle-back on struggle points'
    );
  }

  return directives;
}

/**
 * Formats directives as prompt injection text
 *
 * Converts the structured directives object into a formatted text block
 * that can be injected into the agent's system prompt.
 *
 * @param directives - Adaptive directives generated by generateAdaptiveDirectives()
 * @returns Formatted text ready for prompt injection
 *
 * @example
 * ```typescript
 * const directives = generateAdaptiveDirectives(profile, history, mastery);
 * const promptText = formatDirectivesForPrompt(directives);
 * // Inject into agent prompt:
 * const fullPrompt = `${systemPrompt}\n\n${promptText}\n\n${userMessage}`;
 * ```
 */
export function formatDirectivesForPrompt(directives: AdaptiveDirectives): string {
  const sections: string[] = [];

  sections.push('═══════════════════════════════════════════════════════════');
  sections.push('         🎯 ADAPTIVE TEACHING DIRECTIVES 🎯');
  sections.push('  CRITICAL: Follow these instructions to personalize teaching');
  sections.push('═══════════════════════════════════════════════════════════');

  if (directives.styleAdjustments.length > 0) {
    sections.push('');
    sections.push(...directives.styleAdjustments);
  }

  if (directives.difficultyAdjustments.length > 0) {
    sections.push('');
    sections.push(...directives.difficultyAdjustments);
  }

  if (directives.scaffoldingNeeds.length > 0) {
    sections.push('');
    sections.push(...directives.scaffoldingNeeds);
  }

  if (directives.phaseGuidance && directives.phaseGuidance.length > 0) {
    sections.push('');
    sections.push(...directives.phaseGuidance);
  }

  sections.push('');
  sections.push(`🎭 ENCOURAGEMENT LEVEL: ${directives.encouragementLevel.toUpperCase()}`);
  sections.push(`- Adjust your tone and enthusiasm accordingly`);
  if (directives.encouragementLevel === 'high') {
    sections.push(`- Be VERY encouraging, celebrate every small success`);
  } else if (directives.encouragementLevel === 'minimal') {
    sections.push(`- Be supportive but not overbearing - student is doing well`);
  }

  sections.push('');
  sections.push('═══════════════════════════════════════════════════════════');
  sections.push(`📊 Current Mastery: ${directives.currentMastery}% | Directives applied successfully`);
  sections.push('═══════════════════════════════════════════════════════════');

  return sections.join('\n');
}
