/**
 * GET /api/health
 *
 * Simple health check endpoint for connectivity testing.
 * Returns 200 OK if the server is reachable.
 *
 * Used by network utility to check actual connectivity
 * (more reliable than navigator.onLine)
 *
 * Reference: Implementation_Roadmap.md - Day 21
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
