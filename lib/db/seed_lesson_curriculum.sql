-- =====================================================
-- SEED DATA: Lesson Curriculum Content
-- =====================================================
-- This script seeds curriculum content for lessons
-- Run AFTER migration_002_lesson_curriculum.sql
--
-- Reference: Migrated from lib/ai/context-builder.ts
-- =====================================================

-- =====================================================
-- INTRODUCTION TO FRACTIONS (Grade 5)
-- =====================================================

INSERT INTO lesson_curriculum (lesson_id, curriculum_content, author)
SELECT
  id,
  '
═══════════════════════════════════════════════════════════
DETAILED LESSON CURRICULUM: INTRODUCTION TO FRACTIONS
═══════════════════════════════════════════════════════════

📚 LESSON STRUCTURE - Follow this exact 6-part flow:

1️⃣ INTRODUCTION (Engaging Hook)
────────────────────────────────────────
Start with a relatable, real-world scenario that children experience:

"Today we''re learning about fractions! Have you ever shared a pizza with your friends or family? Or maybe you''ve cut an apple in half? That''s fractions in action! Fractions help us talk about parts of something whole."

Goals:
- Create excitement and relevance
- Connect to prior experiences (sharing, dividing food)
- Use enthusiastic, warm tone
- Keep it brief (2-3 sentences)

Visual: Consider showing a whole pizza or apple that you''ll divide later


2️⃣ CORE CONCEPT (Main Teaching Content)
────────────────────────────────────────
Teach the fundamental concept systematically:

Key Points to Cover:
a) Definition: "A fraction represents part of a whole. When we break something into equal pieces, fractions tell us how many pieces we have."

b) Two-Part Structure:
   - Top number (numerator): "How many pieces we have or are talking about"
   - Bottom number (denominator): "How many equal pieces the whole is divided into"
   - Visual: Show 1/4 with labels pointing to each number

c) The Importance of "Equal Parts":
   - "The key word is EQUAL. All pieces must be the same size."
   - Show correct example: Circle divided into 4 equal parts
   - Show incorrect example: Circle divided into 4 unequal parts (crossed out)

d) Reading Fractions:
   - "We read 1/4 as ''one fourth'' or ''one quarter''"
   - "We read 3/4 as ''three fourths'' or ''three quarters''"
   - Practice reading a few together: 1/2, 2/3, 3/5

Visual Strategy:
- Generate SVG showing a circle or rectangle divided into equal parts
- Use bright, cheerful colors (yellow pizza, red apple, blue rectangle)
- Clearly label numerator and denominator with arrows
- Show shaded portions to represent the fraction


3️⃣ VISUAL EXAMPLES (Multiple Demonstrations)
────────────────────────────────────────
Provide 3-4 different visual examples to reinforce the concept:

Example A - Pizza (1/4):
"Imagine we have a pizza cut into 4 equal slices. If you eat 1 slice, you''ve eaten 1/4 (one fourth) of the pizza!"
Visual: Circle divided into 4 equal parts, 1 part shaded in orange

Example B - Chocolate Bar (3/8):
"Look at this chocolate bar with 8 equal squares. If you eat 3 squares, you''ve eaten 3/8 (three eighths) of the chocolate!"
Visual: Rectangle divided into 8 equal parts, 3 parts shaded in brown

Example C - Apple (1/2):
"When you cut an apple down the middle into 2 equal halves, each half is 1/2 (one half) of the apple!"
Visual: Circle divided into 2 equal parts, 1 part shaded in red

Example D - Water in Glass (2/3):
"If a glass is divided into 3 equal levels and water fills 2 of those levels, the glass is 2/3 (two thirds) full!"
Visual: Rectangle (glass) divided into 3 horizontal sections, 2 filled with blue

Teaching Tips:
- Use different shapes (circles, rectangles) to show versatility
- Use familiar objects (pizza, chocolate, fruit)
- Vary the fractions shown (unit fractions, non-unit fractions)
- Always emphasize EQUAL PARTS


4️⃣ CHECK UNDERSTANDING (Formative Assessment)
────────────────────────────────────────
Ask questions to gauge comprehension. Listen carefully to student responses:

Question Set A - Identification:
"Can you tell me what 1/2 means in your own words?"
Expected: "One part out of two equal parts" or similar
Follow-up: "That''s exactly right! The bottom number tells us how many equal parts, and the top tells us how many we have."

Question Set B - Reading:
"How do we read this fraction: 3/4?"
Expected: "Three fourths" or "three quarters"
Follow-up: "Perfect! You''re reading fractions like a pro!"

Question Set C - Application:
"If I have a pizza cut into 6 equal slices and I eat 2 slices, what fraction of the pizza did I eat?"
Expected: "2/6" (can also teach simplification to 1/3 if student is ready)
Follow-up: Generate SVG showing 6-slice pizza with 2 slices shaded

Question Set D - Equal Parts Concept:
"Why is it important that all the pieces are equal in size?"
Expected: Something about fairness or accuracy
Follow-up: "Yes! If pieces aren''t equal, we can''t use fractions to describe them accurately."

Respond Based on Understanding:
- If student struggles: Revisit core concept with simpler example
- If student partially understands: Clarify specific misconception
- If student fully understands: Celebrate and move to practice


5️⃣ PRACTICE (Guided Application)
────────────────────────────────────────
Present practice problems that build in complexity:

Practice Problem 1 (Easy - Identification):
"Look at this circle divided into 4 equal parts with 3 parts shaded. What fraction is shaded?"
Visual: Circle, 4 equal parts, 3 shaded
Answer: 3/4
Feedback: "Excellent! The circle has 4 equal parts total (denominator = 4), and 3 are shaded (numerator = 3), so 3/4 is shaded!"

Practice Problem 2 (Medium - Real World):
"You have a sandwich cut into 8 equal pieces. You eat 5 pieces. What fraction of the sandwich did you eat? What fraction is left?"
Visual: Rectangle divided into 8 parts, 5 shaded differently than 3
Answer: Ate 5/8, Left 3/8
Feedback: "Amazing thinking! You ate 5 out of 8 pieces (5/8), and 3 out of 8 pieces remain (3/8)!"

Practice Problem 3 (Medium - Drawing):
"Can you describe what a diagram of 2/5 would look like?"
Expected: Something divided into 5 equal parts with 2 parts different
Feedback: Generate SVG based on their description and confirm: "Yes! Here''s 2/5 - five equal parts with two shaded!"

Practice Problem 4 (Challenge - Comparison):
"Which is bigger: 1/2 or 1/4? Can you explain why?"
Expected: 1/2 is bigger because fewer pieces means bigger pieces
Visual: Two circles side by side - one showing 1/2, one showing 1/4
Feedback: "You''re thinking like a mathematician! When we divide into fewer pieces (2 vs 4), each piece is bigger, so 1/2 is bigger than 1/4!"

Adaptive Teaching:
- If student struggles: Provide more scaffolding, simpler problems
- If student excels: Introduce challenge problems early
- Always provide immediate feedback with visual confirmation


6️⃣ SUMMARY (Recap & Celebration)
────────────────────────────────────────
Conclude with a comprehensive summary and celebration:

Recap Key Learning:
"Fantastic work today, [Student Name]! Let''s review what you''ve learned about fractions:

✅ A fraction represents part of a whole
✅ The top number (numerator) tells us how many parts we have
✅ The bottom number (denominator) tells us how many equal parts in total
✅ All parts must be EQUAL in size
✅ We can use fractions to describe real things like pizza, chocolate, and more!

You can now:
- Read fractions like 1/2, 3/4, 2/5
- Understand what fractions represent visually
- Identify fractions in everyday objects
- Explain why equal parts matter"

Celebration & Encouragement:
"You''ve mastered the basics of fractions! This is a big achievement because fractions are used everywhere - in cooking, sharing, telling time, and even in advanced math. You should be really proud of yourself!"

Connection to Next Learning:
"Next time, we can explore adding fractions or comparing different fractions. But for now, you''ve done an excellent job understanding what fractions are!"

Visual: Consider showing a "Great Job!" badge or star, or a final summary diagram showing all fraction examples

═══════════════════════════════════════════════════════════

📋 TEACHING REMINDERS:

Pacing:
- Move through sections naturally based on student engagement
- Don''t rush if student is confused
- Can skip ahead if student demonstrates mastery early


Engagement:
- Ask frequent questions to maintain interaction
- Praise effort, not just correct answers
- Use student''s name to personalize
- Relate examples to student''s interests when possible

Visuals (SVG Generation):
- Generate SVG for EVERY main teaching point
- Keep SVGs simple and colorful
- Always label important parts
- Use consistent colors within a lesson
- Pizza = yellow/orange, Chocolate = brown, Apple = red, etc.

Mastery Indicators (for lessonComplete flag):
Only set lessonComplete = true when student has:
✓ Correctly identified what numerator and denominator mean
✓ Explained that parts must be equal
✓ Successfully read multiple fractions aloud
✓ Solved practice problems correctly (at least 3/4)
✓ Explained concept in their own words
✓ Shown consistent understanding (not one lucky guess)

Be strict with completion, partial understanding is not mastery!

═══════════════════════════════════════════════════════════',
  'system'
FROM lessons
WHERE title = 'Introduction to Fractions' AND grade_level = 5
ON CONFLICT (lesson_id) DO UPDATE SET
  curriculum_content = EXCLUDED.curriculum_content,
  updated_at = NOW();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM lesson_curriculum;

  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Lesson Curriculum Seed Complete!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Total curriculum entries: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'To add more curriculum, insert into lesson_curriculum';
  RAISE NOTICE 'with the lesson_id from the lessons table.';
  RAISE NOTICE '=========================================';
END $$;
