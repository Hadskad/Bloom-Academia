/**
 * Supabase Client Configuration
 *
 * Creates and exports a configured Supabase client for database operations.
 * Uses environment variables for URL and service role key.
 *
 * Reference: https://supabase.com/docs/reference/javascript/initializing
 */

import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Supabase client instance
 * Uses service role key for server-side operations that bypass RLS
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
