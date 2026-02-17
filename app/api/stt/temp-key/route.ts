/**
 * GET /api/stt/temp-key
 *
 * @deprecated This endpoint is no longer used. Audio is now sent directly to Gemini API
 * for native audio processing instead of using a separate STT service.
 *
 * LEGACY IMPLEMENTATION (Soniox-based):
 * Previously generated temporary Soniox API keys for client-side speech-to-text.
 * Temporary keys expired after 1 hour (3600 seconds, max allowed by Soniox).
 * Keys were scoped for WebSocket transcription only.
 *
 * MIGRATION NOTE:
 * - Old flow: Browser → Soniox STT → Gemini API → Google TTS
 * - New flow: Browser MediaRecorder → Gemini API (native audio) → Google TTS
 * - Audio is now captured as base64-encoded blobs and sent directly to Gemini
 *
 * This file is kept for reference only and can be removed in a future cleanup.
 *
 * Reference: https://soniox.com/docs/stt/api-reference/auth/create_temporary_api_key
 * Reference: https://soniox.com/docs/stt/SDKs/web-sdk
 */

import { NextResponse } from 'next/server'

export async function GET() {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  console.log(`[${requestId}] 🎯 Starting temp key request`)

  try {
    // Validate environment variable is configured
    // Reference: https://soniox.com/docs/stt/guides/best-practices
    const apiKey = process.env.SONIOX_API_KEY
    if (!apiKey) {
      console.error(`[${requestId}] ❌ ENV_VAR_MISSING: SONIOX_API_KEY is not configured`)
      console.error(`[${requestId}] 📊 Available env vars:`, {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasSonioxKey: !!process.env.SONIOX_API_KEY
      })
      return NextResponse.json(
        {
          error: 'Voice service not configured',
          message: 'SONIOX_API_KEY is missing. Please configure it in your environment variables.',
          requestId,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    console.log(`[${requestId}] ✅ SONIOX_API_KEY found (length: ${apiKey.length})`)
    console.log(`[${requestId}] 📡 Calling Soniox API...`)

    // Call Soniox API to generate temporary key
    // Max TTL is 3600 seconds (1 hour) per Soniox documentation
    // Reference: https://soniox.com/docs/stt/api-reference/auth/create_temporary_api_key
    const fetchStartTime = Date.now()
    const response = await fetch(
      'https://api.soniox.com/v1/auth/temporary-api-key',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usage_type: 'transcribe_websocket',
          expires_in_seconds: 3600 // 1 hour (maximum allowed)
        })
      }
    )
    const fetchDuration = Date.now() - fetchStartTime

    console.log(`[${requestId}] 📥 Soniox API response received (${fetchDuration}ms)`, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    })

    if (!response.ok) {
      // Parse error response from Soniox API
      // Reference: https://soniox.com/docs/stt/api-reference/auth/create_temporary_api-key
      let errorData
      let rawResponse = ''
      try {
        rawResponse = await response.text()
        errorData = JSON.parse(rawResponse)
      } catch (parseError) {
        console.error(`[${requestId}] ⚠️ Failed to parse error response:`, {
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          rawResponse: rawResponse.substring(0, 500) // First 500 chars
        })
        errorData = { error: 'Unknown error' }
      }

      console.error(`[${requestId}] ❌ SONIOX_API_ERROR:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        requestDuration: `${Date.now() - startTime}ms`
      })

      // Map Soniox error codes to user-friendly messages
      // Reference: https://soniox.com/docs/stt/api-reference
      let userMessage = 'Voice service temporarily unavailable'
      let shouldRetry = false

      switch (response.status) {
        case 400: // Bad Request - invalid_request
          userMessage = 'Invalid voice service configuration. Please contact support.'
          console.error(`[${requestId}] 🔍 Likely cause: Invalid request payload or API key format`)
          break
        case 401: // Unauthorized - incorrect API key
          userMessage = 'Voice service authentication failed. Please check configuration.'
          console.error(`[${requestId}] 🔍 Likely cause: Invalid or expired SONIOX_API_KEY`)
          break
        case 402: // Payment Required - billing issue
          userMessage = 'Voice service quota exceeded. Please contact support.'
          console.error(`[${requestId}] 🔍 Likely cause: Billing issue or quota exceeded`)
          break
        case 429: // Too Many Requests - rate limit exceeded
          userMessage = 'Voice service is busy. Please try again in a moment.'
          shouldRetry = true
          console.warn(`[${requestId}] ⏱️ Rate limited - retry recommended`)
          break
        case 500: // Internal Server Error
          userMessage = 'Voice service encountered an error. Please try again.'
          shouldRetry = true
          console.error(`[${requestId}] 🔍 Likely cause: Soniox service internal error`)
          break
        default:
          userMessage = `Voice service error (${response.status}). Please try again.`
          console.error(`[${requestId}] 🔍 Unexpected status code: ${response.status}`)
          break
      }

      return NextResponse.json(
        {
          error: userMessage,
          message: errorData.error || `Soniox API returned ${response.status}`,
          shouldRetry,
          requestId,
          timestamp: new Date().toISOString(),
          debugInfo: {
            statusCode: response.status,
            duration: `${Date.now() - startTime}ms`
          }
        },
        { status: response.status }
      )
    }

    console.log(`[${requestId}] ✅ Parsing successful response...`)
    const data = await response.json()

    // Validate response structure
    if (!data.api_key || !data.expires_at) {
      console.error(`[${requestId}] ❌ INVALID_RESPONSE_STRUCTURE:`, {
        hasApiKey: !!data.api_key,
        hasExpiresAt: !!data.expires_at,
        receivedKeys: Object.keys(data)
      })
      throw new Error('Invalid response structure from Soniox API')
    }

    const totalDuration = Date.now() - startTime
    console.log(`[${requestId}] ✅ SUCCESS: Temp key generated (${totalDuration}ms)`, {
      expiresAt: data.expires_at,
      keyLength: data.api_key?.length
    })

    return NextResponse.json(data)
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`[${requestId}] ❌ EXCEPTION_CAUGHT (${totalDuration}ms):`, {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      isNetworkError: error instanceof TypeError && error.message.includes('fetch'),
      timestamp: new Date().toISOString()
    })

    // Determine error category
    let errorCategory = 'UNKNOWN'
    let userMessage = 'Failed to connect to voice service'
    const isNetworkError = error instanceof TypeError && error.message.includes('fetch')

    if (isNetworkError) {
      errorCategory = 'NETWORK_ERROR'
      userMessage = 'Cannot reach voice service. Please check your internet connection.'
      console.error(`[${requestId}] 🌐 Network error detected - possible causes:`)
      console.error(`  - No internet connection`)
      console.error(`  - Firewall blocking api.soniox.com`)
      console.error(`  - DNS resolution failure`)
      console.error(`  - Soniox service is down`)
    } else if (error instanceof SyntaxError) {
      errorCategory = 'JSON_PARSE_ERROR'
      console.error(`[${requestId}] 📄 Failed to parse response as JSON`)
    } else {
      console.error(`[${requestId}] 🔍 Uncategorized error - check stack trace above`)
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: userMessage,
        message: errorMessage,
        shouldRetry: true, // Network errors should be retried
        requestId,
        timestamp: new Date().toISOString(),
        debugInfo: {
          errorCategory,
          duration: `${totalDuration}ms`,
          errorType: error?.constructor?.name
        }
      },
      { status: 500 }
    )
  }
}
