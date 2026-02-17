# Integration Test Setup Guide

## Quick Start (5 minutes)

### Step 1: Ensure you have a test lesson in the database

The integration test expects a lesson with ID: `00000000-0000-0000-0000-000000000001`

**Option A: Use existing lesson** (if you already have lessons)
```sql
-- Find an existing lesson ID
SELECT id, title, subject FROM lessons LIMIT 1;
```

Then update the test file (`golden-path.test.ts` line 23):
```typescript
const TEST_LESSON_ID = 'your-actual-lesson-id'
```

**Option B: Create a test lesson**
```sql
INSERT INTO lessons (
  id,
  title,
  subject,
  grade_level,
  learning_objective,
  difficulty_level
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Introduction to Fractions',
  'Math',
  4,
  'Understand fractions as parts of a whole',
  'beginner'
) ON CONFLICT (id) DO NOTHING;
```

### Step 2: Ensure AI agents are seeded

```bash
# Check if agents exist
SELECT name, role FROM ai_agents WHERE status = 'active';
```

If no agents, run:
```bash
# From project root
psql $DATABASE_URL < lib/db/seed_ai_agents_v2.sql
```

Or use Supabase dashboard → SQL Editor → Run the seed file

### Step 3: Start the dev server

```bash
npm run dev
```

**IMPORTANT:** Server must be running on `http://localhost:3000` before running tests!

### Step 4: Run the integration test

```bash
npm run test:integration
```

## Expected Runtime

- **First run:** ~15-20 seconds
  - Creates test user
  - 2 complete sessions
  - 4-6 Gemini API calls
  - 10-15 TTS audio generations
  - Profile enrichment
  - Cleanup

- **Subsequent runs:** ~15-20 seconds (similar)

## Troubleshooting

### Error: "Failed to start session"

**Cause:** Dev server not running or wrong port

**Fix:**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run test
npm run test:integration
```

### Error: "No active AI agents found in database"

**Cause:** Database not seeded

**Fix:**
```bash
# Seed agents
psql $DATABASE_URL < lib/db/seed_ai_agents_v2.sql

# Or via Supabase dashboard
```

### Error: "GEMINI_API_KEY environment variable is not set"

**Cause:** Missing environment variable

**Fix:**
Add to `.env.local`:
```bash
GEMINI_API_KEY=your-actual-gemini-api-key
```

### Error: "Lesson not found" or "lessonId is required"

**Cause:** Test lesson doesn't exist

**Fix:** See Step 1 above - create the test lesson or update TEST_LESSON_ID

### Test times out after 60 seconds

**Possible causes:**
1. Gemini API slow response
2. Database connection issues
3. TTS service delays

**Fix:**
- Check internet connection
- Verify Gemini API quota
- Check Supabase dashboard for performance
- Increase timeout in test (line 358): `}, 120000) // 2 minutes`

### Audio chunks return null

**Cause:** Google Cloud TTS credentials missing or invalid

**Fix:**
1. Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set in `.env.local`
2. Verify service account has TTS permissions
3. Check Google Cloud TTS API is enabled

```bash
# Test TTS manually
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @- "https://texttospeech.googleapis.com/v1/text:synthesize" <<EOF
{
  "input": {"text": "Hello world"},
  "voice": {"languageCode": "en-US", "name": "en-US-Neural2-F"},
  "audioConfig": {"audioEncoding": "MP3"}
}
EOF
```

## What the Test Does NOT Require

❌ Real student data (creates test user)
❌ Multiple lessons (only needs 1)
❌ Pre-existing sessions
❌ Real email/authentication
❌ External services beyond Gemini & TTS

## Cost Per Test Run

- Gemini API calls: 4-6 requests × $0.002 = **~$0.01**
- TTS audio: 10-15 chunks × $0.003 = **~$0.05**
- Supabase: Free tier (negligible)

**Total: ~$0.06 per test run**

Safe to run during development!

## Continuous Integration (CI)

To run in CI (GitHub Actions, etc.):

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run integration tests
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GCP_CREDENTIALS_PATH }}
        run: npm run test:integration
```

## Next Steps

Once the integration test passes:

1. ✅ You've proven Gemini 3 integration works
2. ✅ You've proven end-to-end functionality
3. ✅ You've verified all 4 criteria
4. ✅ You can confidently demo the system

**Recommendation:** Record a screen video of the test output to demonstrate system functionality!
