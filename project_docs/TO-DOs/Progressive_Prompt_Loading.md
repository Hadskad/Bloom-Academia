# Progressive Prompt Loading (Curriculum Sectioning)

## Overview

Instead of sending the entire curriculum (~250 lines) with every AI request, break the curriculum into sections and load only the relevant section based on the student's current progress in the lesson.

## Problem Statement

Currently, every request to the AI sends the full curriculum content regardless of where the student is in the lesson. This causes:
- Wasted tokens (billing cost)
- Larger context window usage
- Potentially slower inference
- AI processing irrelevant instructions

## Proposed Solution

Break curriculum into 6 sections matching the existing lesson flow:
1. Introduction
2. Core Concept
3. Visual Examples
4. Check Understanding
5. Practice
6. Summary

Load only the current section's instructions based on student progress.

## Database Schema Changes

### New Table: `lesson_sections`

```sql
CREATE TABLE IF NOT EXISTS lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  curriculum_id UUID REFERENCES lesson_curriculum(id) ON DELETE CASCADE,

  -- Section identification
  section_order INTEGER NOT NULL,           -- 1, 2, 3, 4, 5, 6
  section_key TEXT NOT NULL,                -- 'introduction', 'core_concept', etc.
  title TEXT NOT NULL,                      -- 'Introduction (Engaging Hook)'

  -- Section content
  instructions TEXT NOT NULL,               -- The actual prompt content for this section
  completion_criteria TEXT,                 -- What triggers moving to next section

  -- Metadata
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lesson_id, section_order),
  UNIQUE(lesson_id, section_key)
);
```

### Update: `sessions` or `learning_sessions` table

Add column to track current section:
```sql
ALTER TABLE sessions ADD COLUMN current_section_key TEXT DEFAULT 'introduction';
ALTER TABLE sessions ADD COLUMN current_section_order INTEGER DEFAULT 1;
```

## AI Response Schema Changes

Add new fields to the teaching response:

```typescript
const teachingResponseSchema = z.object({
  audioText: z.string(),
  displayText: z.string(),
  svg: z.string().nullable(),
  lessonComplete: z.boolean(),

  // NEW: Section progress tracking
  sectionComplete: z.boolean().describe('Set to true when student has mastered this section'),
  currentSection: z.string().describe('Current section key for tracking'),
});
```

## Implementation Steps

### Phase 1: Database Setup
1. Create `lesson_sections` table migration
2. Create seed script to split existing curriculum into sections
3. Add section tracking columns to sessions table

### Phase 2: Backend Changes
1. Update `context-builder.ts`:
   - Add `getCurrentSection()` function
   - Modify `getLessonCurriculum()` to load only current section
   - Add section transition logic

2. Update `agent-manager.ts`:
   - Handle `sectionComplete` response field
   - Trigger section advancement
   - Update session with new section

### Phase 3: Section Content Migration
1. Parse existing curriculum content into 6 sections
2. Create seed data for each lesson's sections
3. Define completion criteria for each section

## Example Flow

```
Request 1: Student starts lesson
  Session: { current_section_key: 'introduction', current_section_order: 1 }
  → Load: Section 1 instructions only (~40 lines vs ~250)
  → AI Response: { sectionComplete: false, currentSection: 'introduction' }

Request 2: Student responds well to intro
  → AI Response: { sectionComplete: true, currentSection: 'introduction' }
  → Backend: Update session to section 2

Request 3: Student continues
  Session: { current_section_key: 'core_concept', current_section_order: 2 }
  → Load: Section 2 instructions only
  ... and so on
```

## Benefits

1. **Token Reduction**: ~80% fewer tokens per request (40 lines vs 250)
2. **Faster Responses**: Smaller context = faster inference
3. **Better AI Focus**: AI concentrates on one teaching goal at a time
4. **Granular Progress**: Track exactly where student is in lesson
5. **Easier Updates**: Edit individual sections without touching others

## Considerations

### Backward Navigation
- If student struggles in later section, allow revisiting earlier sections
- Implement `goToSection(sectionKey)` function
- Track which sections were completed vs just visited

### Section Transition Logic
Options for deciding when to advance:
1. AI decides (via `sectionComplete` field)
2. Explicit assessment questions between sections
3. Interaction count threshold
4. Hybrid approach

### Fallback Behavior
- If section not found, fall back to full curriculum
- Log missing sections for content team to address

## Priority

Medium - This is an optimization that improves efficiency but the current system works.

## Dependencies

- Requires `lesson_curriculum` table (Migration 002) - DONE
- Curriculum content must be seeded first

## Estimated Effort

- Database changes: 2-3 hours
- Backend implementation: 4-6 hours
- Content migration: 2-3 hours per subject
- Testing: 2-3 hours

Total: ~2-3 days of focused work
