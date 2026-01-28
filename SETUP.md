# Bloom Academia - Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm or pnpm package manager
- Git

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment Variables

Copy the example environment file:
```bash
cp .env.local.example .env.local
```

Then fill in your API keys in `.env.local`:

### Gemini API Key
1. Go to [Google AI Studio](https://ai.google.dev)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key
5. Copy and paste into `GEMINI_API_KEY`

### Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (if you haven't already)
3. Go to Settings > API
4. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Soniox API Key
1. Go to [Soniox](https://soniox.com)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into `SONIOX_API_KEY`

### Google Cloud Text-to-Speech
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable the Cloud Text-to-Speech API
4. Go to IAM & Admin > Service Accounts
5. Create a service account with "Cloud Text-to-Speech User" role
6. Create a JSON key for the service account
7. Download the JSON file and save it as `google-cloud-credentials.json` in the project root
8. The path is already set in `.env.local.example`

**IMPORTANT**: Never commit the `google-cloud-credentials.json` file to Git!

## 3. Set Up Supabase Database

1. In your Supabase project dashboard, go to the SQL Editor
2. Open `lib/db/schema.sql` in this project
3. Copy the entire SQL content
4. Paste it into the Supabase SQL Editor
5. Run the query to create all tables

## 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 5. Verify Setup

The app should load without errors. Check the browser console for any missing environment variables.

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Environment variable issues
- Make sure `.env.local` exists (not `.env.local.example`)
- Restart the dev server after changing environment variables
- Check that all variables are filled in

### Supabase connection errors
- Verify the project URL is correct (should start with `https://`)
- Ensure you're using the correct API keys (anon for frontend, service_role for backend)
- Check that the database schema has been created

### Google Cloud TTS errors
- Verify the service account JSON file exists at the path specified
- Ensure the Cloud Text-to-Speech API is enabled in your Google Cloud project
- Check that the service account has the correct permissions

## Next Steps

Once setup is complete, you can start developing:
1. Create API routes in `app/api/`
2. Build components in `components/`
3. Implement AI logic in `lib/ai/`
4. Set up database queries in `lib/db/`

Refer to the project documentation in `project_docs/` for detailed implementation guidelines.




