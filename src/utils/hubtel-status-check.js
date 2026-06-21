/**
 * HUBTEL TRANSACTION STATUS CHECKER
 * ==================================
 *
 * Calls the Base44 backend function `hubtelStatus` to verify payment status.
 *
 * FIX: The original version called `/api/hubtel/status` via a plain fetch(),
 * which is a URL that does NOT exist in a Base44 project. This always failed
 * silently, meaning payment verification was never completed from the frontend.
 *
 * The correct approach is to use base44.functions.invoke() to call the
 * `hubtelStatus` server function, the same way hubtelInitiate is called.
 */

import { base44 } from '@/api/base44Client';

/**
 * Check the payment status for a given clientReference.
 * Returns the normalised response from the hubtelStatus server function.
 *
 * @param {string} clientReference - The exact clientReference sent to Hubtel during initiation.
 * @returns {Promise<{ok: boolean, success: boolean, status: string, transactionId: string|null, amount: number|null, paymentMethod: string|null, raw: object}>}
 */
export async function checkTransactionStatus(clientReference) {
  if (!clientReference) throw new Error('clientReference is required');

  // Try Base44 function invoke variants (same pattern as Payment.jsx uses for hubtelInitiate)
  const invokeCandidates = ['hubtelStatus', 'hubtel-status', 'hubtel_status'];

  let lastError = null;

  for (const functionName of invokeCandidates) {
    try {
      const result = await base44.functions.invoke(functionName, { clientReference });
      if (result != null) return result;
    } catch (error) {
      lastError = error;
      // Only skip 404s — any other error (auth, server error) should bubble up
      const status = error?.response?.status || error?.status;
      if (status !== 404) throw error;
    }
  }

  throw lastError || new Error('Could not reach hubtelStatus function');
}

export default checkTransactionStatus;