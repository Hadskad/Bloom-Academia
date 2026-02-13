/**
 * Pending Corrections — Deferred Self-Correction System
 *
 * When the validator rejects a specialist response, the correction is stored
 * in the `pending_corrections` table. On the student's next interaction,
 * the specialist reads the pending correction and naturally self-corrects.
 *
 * Functions:
 * - savePendingCorrection(): Store a rejected response for later correction
 * - getPendingCorrection(): Load the oldest pending correction for a session
 * - markCorrectionDelivered(): Mark a correction as delivered after self-correction
 *
 * References:
 * - Supabase Insert: https://supabase.com/docs/reference/javascript/insert
 * - Supabase Select: https://supabase.com/docs/reference/javascript/select
 * - Supabase Update: https://supabase.com/docs/reference/javascript/update
 */

import { supabase } from '@/lib/db/supabase';
import type { ValidationResult } from '@/lib/ai/types';

/**
 * A pending correction record from the database
 */
export interface PendingCorrection {
  id: string;
  session_id: string;
  specialist_name: string;
  original_response: {
    audioText: string;
    displayText: string;
    svg: string | null;
  };
  validation_issues: string[];
  required_fixes: string[];
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  created_at: string;
}

/**
 * Save a pending correction when the validator rejects a specialist response.
 *
 * Called from the SSE route's validator callback when `result.approved === false`.
 * Also logs to `validation_failures` for teacher dashboard visibility.
 *
 * @param sessionId - Current session ID
 * @param specialistName - Name of the specialist that produced the incorrect response
 * @param originalResponse - The response that failed validation
 * @param validationResult - The validator's rejection details
 */
export async function savePendingCorrection(
  sessionId: string,
  specialistName: string,
  originalResponse: { audioText: string; displayText: string; svg: string | null },
  validationResult: ValidationResult
): Promise<void> {
  const { error } = await supabase
    .from('pending_corrections')
    .insert({
      session_id: sessionId,
      specialist_name: specialistName,
      original_response: originalResponse,
      validation_issues: validationResult.issues,
      required_fixes: validationResult.requiredFixes ?? []
    });

  if (error) {
    console.error('[pending-corrections] Failed to save pending correction:', error);
    // Don't throw — this is fire-and-forget from the validator callback
  } else {
    console.log(`[pending-corrections] Stored correction for ${specialistName} in session ${sessionId.substring(0, 8)}`);
  }
}

/**
 * Get the oldest pending correction for a session.
 *
 * Called from `loadTeachingContext()` in parallel with other context queries.
 * Returns the oldest undelivered correction so corrections are drained FIFO.
 *
 * @param sessionId - Current session ID
 * @returns The oldest pending correction, or null if none exist
 */
export async function getPendingCorrection(
  sessionId: string
): Promise<PendingCorrection | null> {
  const { data, error } = await supabase
    .from('pending_corrections')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[pending-corrections] Failed to fetch pending correction:', error);
    return null; // Fail-safe: no correction is better than crashing
  }

  return data as PendingCorrection | null;
}

/**
 * Mark a pending correction as delivered after the specialist self-corrects.
 *
 * Called from the SSE route after the specialist's response is generated
 * (the correction was injected into their context, so they self-corrected).
 *
 * @param correctionId - ID of the pending correction to mark as delivered
 */
export async function markCorrectionDelivered(
  correctionId: string
): Promise<void> {
  const { error } = await supabase
    .from('pending_corrections')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString()
    })
    .eq('id', correctionId);

  if (error) {
    console.error('[pending-corrections] Failed to mark correction as delivered:', error);
    // Don't throw — non-critical background operation
  } else {
    console.log(`[pending-corrections] Marked correction ${correctionId.substring(0, 8)} as delivered`);
  }
}
