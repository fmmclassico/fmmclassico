/**
 * HUBTEL TRANSACTION STATUS CHECKER
 * ==================================
 * 
 * This utility checks the status of a payment with Hubtel.
 * 
 * WHY YOU NEED THIS:
 * Hubtel says: "If you don't get payment confirmation after 5 minutes,
 * you MUST check the transaction status yourself"
 * 
 * This utility does that check for you.
 */

/**
 * Client-side wrapper that calls the server-side status endpoint.
 * The actual Hubtel status check runs on the server to avoid exposing API credentials.
 */
export async function checkTransactionStatus(clientReference) {
  if (!clientReference) throw new Error('clientReference is required');
  const url = `/api/hubtel/status?clientReference=${encodeURIComponent(clientReference)}`;
  const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(data?.error || 'Status check failed');
  // Hubtel returns { message, responseCode, data: { status, ... } }
  return data;
}

export default checkTransactionStatus;
