/**
 * GET /api/stt/temp-key
 *
 * Generates a temporary Soniox API key for client-side speech-to-text usage.
 * Temporary keys expire after 60 seconds and are scoped for WebSocket transcription only.
 *
 * This prevents exposing the main Soniox API key to the client.
 *
 * Response:
 * - temporary_api_key: Short-lived key for WebSocket connection
 *
 * Error Handling:
 * - 500: Failed to generate key
 *
 * Reference: https://soniox.com/docs/speech-to-text/api-reference/auth/create_temporary_api_key
 * Reference: https://soniox.com/docs/stt/SDKs/web-sdk
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Call Soniox API to generate temporary key
    const response = await fetch(
      'https://api.soniox.com/v1/auth/temporary-api-key',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SONIOX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usage_type: 'transcribe_websocket',
          expires_in_seconds: 60
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Soniox API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating Soniox temp key:', error)
    return NextResponse.json(
      { error: 'Failed to generate temporary API key' },
      { status: 500 }
    )
  }
}
