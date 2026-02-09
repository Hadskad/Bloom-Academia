# Bloom Academia - Codebase Cleanup Report
**Date**: 2026-02-08
**Purpose**: Identify and remove legacy, duplicate, and unused files

---

## 🗑️ LEGACY COMPONENTS - SAFE TO DELETE

### Unused React Components
These components are NOT imported anywhere in the codebase:

1. **[components/ErrorBoundary.tsx](components/ErrorBoundary.tsx)**
   - ❌ Not imported by any file
   - Recommendation: DELETE

2. **[components/VoiceIndicator.tsx](components/VoiceIndicator.tsx)**
   - ❌ Not imported by any file
   - Recommendation: DELETE

3. **[components/VoiceInput.tsx](components/VoiceInput.tsx)**
   - ❌ Not imported by any file
   - Was replaced by `VoiceRecorder.tsx` (actively used in [app/learn/[lessonId]/page.tsx](app/learn/[lessonId]/page.tsx))
   - Recommendation: DELETE

4. **[components/Whiteboard.tsx](components/Whiteboard.tsx)**
   - ❌ Not imported by any file
   - SVG rendering likely integrated directly into main teaching component
   - Recommendation: DELETE

---

## ✅ FILES ALREADY DELETED (Verified Good)

These files show as deleted in git status and are truly removed:

1. ✅ `app/api/teach/multi-ai/route.ts` - Replaced by `multi-ai-stream/route.ts`
2. ✅ `app/api/teach/route.ts` - Old single-AI endpoint
3. ✅ `app/api/teach/stream/route.ts` - Deprecated streaming endpoint
4. ✅ `app/learn/page.tsx` - Old learn page structure
5. ✅ `lib/ai/context-builder.ts` - No longer referenced anywhere
6. ✅ `lib/db/seed_ai_agents.sql` - Replaced by `seed_ai_agents_v2.sql`

**Action**: Commit these deletions

---

## 📄 DOCUMENTATION FILES - CONSOLIDATION NEEDED

### Current Count: 27 markdown files in root
Many docs overlap or are incremental updates. Recommendations below:

### Category 1: Criterion Implementation Docs (8 files)
```
CRITERION_2_IMPLEMENTATION_COMPLETE.md (422 lines)
CRITERION_2_TESTING_GUIDE.md (311 lines)
CRITERION_3_IMPLEMENTATION_COMPLETE.md (597 lines)
CRITERION_3_STEP2_COMPLETE.md (258 lines) ⚠️ OVERLAPS WITH CRITERION_3
CRITERION_4_COMPLETE.md (258 lines)
CRITERION_4_IMPLEMENTATION.md (570 lines) ⚠️ OVERLAPS WITH CRITERION_4_COMPLETE
CRITERION_5_DEPLOYMENT_GUIDE.md (372 lines)
CRITERION_5_IMPLEMENTATION_COMPLETE.md (681 lines)
```

**Recommendation**:
- **MERGE** `CRITERION_3_STEP2_COMPLETE.md` → `CRITERION_3_IMPLEMENTATION_COMPLETE.md`
- **MERGE** `CRITERION_4_IMPLEMENTATION.md` → `CRITERION_4_COMPLETE.md`
- Move all Criterion docs to `project_docs/CRITERIONS/` folder
- Keep only `ROADMAP_TO_100_PERCENT.md` in root as the master criterion tracker

### Category 2: Architecture & Implementation (6 files)
```
BLOOM_ACADEMIA_ARCHITECTURE.md (1,597 lines) ⭐ KEEP
IMPLEMENTATION_SUMMARY.md (457 lines) ⚠️ OVERLAPS WITH STREAMING_IMPLEMENTATION
STREAMING_IMPLEMENTATION.md (374 lines) ⭐ KEEP
TEACHING_SESSION_FLOW.md (?) ⭐ KEEP
HOW_WE_BUILT_IT.md (?) ⭐ KEEP (for submission/presentation)
BLOOM_ACADEMIA_ARCHITECTURE.pdf (generated from .md)
```

**Recommendation**:
- **DELETE** `IMPLEMENTATION_SUMMARY.md` (info covered in STREAMING_IMPLEMENTATION.md)
- **DELETE** `BLOOM_ACADEMIA_ARCHITECTURE.pdf` (can regenerate from .md when needed)
- Keep the rest - they serve distinct purposes

### Category 3: Feature Implementation Guides (6 files)
```
AUDIO_DIRECT_IMPLEMENTATION.md (360 lines)
CONTEXT_CACHING_COMPLETE.md (392 lines)
MEDIA_UPLOAD_IMPLEMENTATION.md (315 lines)
TIER3_PROGRESSIVE_TTS_IMPLEMENTATION.md (?)
VALIDATOR_IMPLEMENTATION.md (400 lines)
POLISHING_ROADMAP.md (727 lines)
```

**Recommendation**:
- Move all to `project_docs/IMPLEMENTATIONS/` folder
- These are valuable technical references, keep all

### Category 4: Testing & Deployment (3 files)
```
TESTING_GUIDE.md (536 lines) ⭐ KEEP IN ROOT
TEST_RESULTS.md (297 lines)
CRITERION_2_TESTING_GUIDE.md (311 lines) ⚠️ SPECIFIC TO CRITERION 2
```

**Recommendation**:
- Keep `TESTING_GUIDE.md` in root (master testing guide)
- Move `CRITERION_2_TESTING_GUIDE.md` to `project_docs/CRITERIONS/`
- Move `TEST_RESULTS.md` to `project_docs/TESTING/`

### Category 5: Planning & Roadmaps (4 files)
```
ACTION_PLAN_WEEK_1.md (1,106 lines) ⚠️ LIKELY OUTDATED
ROADMAP_TO_100_PERCENT.md (1,782 lines) ⭐ KEEP
POLISHING_ROADMAP.md (727 lines)
PROJECT_STATUS.md (?)
```

**Recommendation**:
- **REVIEW** `ACTION_PLAN_WEEK_1.md` - Check if auth plan was implemented
  - If NOT implemented: Move to `project_docs/FUTURE_IMPLEMENTATIONS/`
  - If implemented: DELETE (covered elsewhere)
- Keep `ROADMAP_TO_100_PERCENT.md` in root (master roadmap)
- Move `POLISHING_ROADMAP.md` to `project_docs/ROADMAPS/`

---

## ⚠️ DATABASE MIGRATIONS - CLARIFICATION NEEDED

### Duplicate Migration Number 007:
```
lib/db/migration_007_concept_tags.sql (150 lines)
lib/db/migration_007_remediation_system.sql (173 lines)
```

**Analysis**:
- `migration_007_remediation_system.sql` creates the schema (tables, indexes, policies)
- `migration_007_concept_tags.sql` seeds data (tags specific assessment questions)
- They reference each other: remediation_system.sql says "Next: Run migration_007_concept_tags.sql"

**Recommendation**:
- **RENAME** `migration_007_concept_tags.sql` → `migration_007b_concept_tags_seed.sql`
- OR move to seed files: `seed_concept_tags_fractions.sql`
- This clarifies it's data seeding, not schema migration

---

## 📁 PROPOSED NEW STRUCTURE

### Root Directory (Keep Minimal)
```
CLAUDE.md                          ⭐ Project instructions
BLOOM_ACADEMIA_ARCHITECTURE.md     ⭐ Main architecture doc
HOW_WE_BUILT_IT.md                 ⭐ For presentation/submission
ROADMAP_TO_100_PERCENT.md          ⭐ Master criterion tracker
TEACHING_SESSION_FLOW.md           ⭐ Technical flow reference
TESTING_GUIDE.md                   ⭐ Master testing guide
CLEANUP_REPORT.md                  📋 This file
README.md                          📋 User-facing readme
SETUP.md                           📋 Setup instructions
QUICKSTART_CURRICULUM.md           📋 Quick start guide
```

### New Folder: project_docs/
```
project_docs/
├── CRITERIONS/
│   ├── CRITERION_2_IMPLEMENTATION_COMPLETE.md
│   ├── CRITERION_2_TESTING_GUIDE.md
│   ├── CRITERION_3_IMPLEMENTATION_COMPLETE.md
│   ├── CRITERION_4_COMPLETE.md
│   ├── CRITERION_5_IMPLEMENTATION_COMPLETE.md
│   └── CRITERION_5_DEPLOYMENT_GUIDE.md
│
├── IMPLEMENTATIONS/
│   ├── AUDIO_DIRECT_IMPLEMENTATION.md
│   ├── CONTEXT_CACHING_COMPLETE.md
│   ├── MEDIA_UPLOAD_IMPLEMENTATION.md
│   ├── STREAMING_IMPLEMENTATION.md
│   ├── TIER3_PROGRESSIVE_TTS_IMPLEMENTATION.md
│   └── VALIDATOR_IMPLEMENTATION.md
│
├── TESTING/
│   └── TEST_RESULTS.md
│
├── ROADMAPS/
│   └── POLISHING_ROADMAP.md
│
└── FUTURE_IMPLEMENTATIONS/
    └── ACTION_PLAN_WEEK_1.md (if auth not implemented)
```

---

## 🎯 ACTION PLAN

### Phase 1: Delete Unused Components (SAFE)
```bash
rm components/ErrorBoundary.tsx
rm components/VoiceIndicator.tsx
rm components/VoiceInput.tsx
rm components/Whiteboard.tsx
```

### Phase 2: Commit Deleted Files
```bash
git add -u
git commit -m "Remove legacy API endpoints and deprecated files"
```

### Phase 3: Consolidate Documentation
```bash
# Create new structure
mkdir -p project_docs/{CRITERIONS,IMPLEMENTATIONS,TESTING,ROADMAPS,FUTURE_IMPLEMENTATIONS}

# Move Criterion docs
mv CRITERION_*.md project_docs/CRITERIONS/

# Move implementation guides
mv AUDIO_DIRECT_IMPLEMENTATION.md project_docs/IMPLEMENTATIONS/
mv CONTEXT_CACHING_COMPLETE.md project_docs/IMPLEMENTATIONS/
mv MEDIA_UPLOAD_IMPLEMENTATION.md project_docs/IMPLEMENTATIONS/
mv STREAMING_IMPLEMENTATION.md project_docs/IMPLEMENTATIONS/
mv TIER3_PROGRESSIVE_TTS_IMPLEMENTATION.md project_docs/IMPLEMENTATIONS/
mv VALIDATOR_IMPLEMENTATION.md project_docs/IMPLEMENTATIONS/

# Move testing docs
mv TEST_RESULTS.md project_docs/TESTING/

# Move roadmaps
mv POLISHING_ROADMAP.md project_docs/ROADMAPS/

# Delete duplicates/overlaps
rm IMPLEMENTATION_SUMMARY.md
rm BLOOM_ACADEMIA_ARCHITECTURE.pdf  # Can regenerate if needed
rm CRITERION_3_STEP2_COMPLETE.md  # Info in CRITERION_3_IMPLEMENTATION_COMPLETE.md
rm CRITERION_4_IMPLEMENTATION.md   # Info in CRITERION_4_COMPLETE.md
```

### Phase 4: Fix Migration Naming
```bash
mv lib/db/migration_007_concept_tags.sql lib/db/seed_concept_tags_fractions.sql
```

### Phase 5: Update References
- Update any docs that reference moved files
- Update README.md with new structure

---

## 📊 SUMMARY

### Files to Delete: 8
- 4 unused components
- 4 duplicate/overlapping docs

### Files to Move: 15
- 6 Criterion docs → `project_docs/CRITERIONS/`
- 6 Implementation guides → `project_docs/IMPLEMENTATIONS/`
- 1 Test results → `project_docs/TESTING/`
- 1 Roadmap → `project_docs/ROADMAPS/`
- 1 Planning doc → `project_docs/FUTURE_IMPLEMENTATIONS/`

### Files to Rename: 1
- Migration 007 concept tags → seed file

### Files to Keep in Root: 10
- Core project docs (CLAUDE.md, ARCHITECTURE, etc.)
- Setup/quickstart guides
- Master testing guide

---

## ✅ BENEFITS AFTER CLEANUP

1. **Clearer Root Directory**: Only essential docs visible
2. **Better Organization**: Related docs grouped together
3. **Easier Navigation**: Know where to find what
4. **Reduced Duplication**: One source of truth per topic
5. **Cleaner Git Status**: No orphaned deleted files
6. **Faster Onboarding**: New developers see clean structure

---

## 🚨 VERIFICATION BEFORE CLEANUP

Run these commands to verify no breaking changes:

```bash
# Check for any remaining imports of deleted components
grep -r "ErrorBoundary" app/ lib/ components/ 2>/dev/null
grep -r "VoiceIndicator" app/ lib/ components/ 2>/dev/null
grep -r "VoiceInput" app/ lib/ components/ 2>/dev/null
grep -r "Whiteboard" app/ lib/ components/ 2>/dev/null

# Verify no references to context-builder
grep -r "context-builder" app/ lib/ 2>/dev/null

# All should return empty or only comments
```

---

**Status**: Ready for cleanup approval
**Estimated Time**: 15 minutes
**Risk Level**: LOW (all changes are file removals/moves, no code changes)
