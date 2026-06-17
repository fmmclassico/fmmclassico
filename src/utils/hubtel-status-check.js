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

import { HUBTEL_CONFIG } from '@/config/hubtel.config';

/**
 * Check the status of a transaction with Hubtel
 * 
 * @param {string} clientReference - The unique ID you gave to the transaction
 *                                   (e.g., "FMM-ABC123")
 * @returns {Promise} - Payment status: "Paid", "Unpaid", "Refunded"
 * 
 * EXAMPLE:
 * const status = await checkHubtelStatus('FMM-ABC123');
 * console.log(status); // { status: 'Paid', amount: 100, ... }
 */
export async function checkTransactionStatus(clientReference) {
  if (!clientReference || clientReference.trim().length === 0) {
    throw new Error('clientReference is required');
  }

  try {
    // Create authentication header
    const basicAuth = btoa(`${HUBTEL_CONFIG.apiId}:${HUBTEL_CONFIG.apiKey}`);

    // Build the request URL
    const url = new URL(
      `${HUBTEL_CONFIG.transactionStatus}/${HUBTEL_CONFIG.merchantAccountNumber}/status`
    );
    url.searchParams.append('clientReference', clientReference);

    console.log('🔍 Checking Hubtel status for:', clientReference);

    // Make the request
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    const data = await response.json();

    console.log('📊 Hubtel Status Response:', data);

    // Handle response
    if (!response.ok) {
      console.error('❌ Hubtel returned error:', response.status);
      throw new Error(`Hubtel returned ${response.status}: ${data?.message || 'Unknown error'}`);
    }

    // Parse response
    if (data?.responseCode !== '0000') {
      console.error('❌ Hubtel error code:', data?.responseCode);
      throw new Error(`Hubtel error: ${data?.message || 'Check failed'}`);
    }

    // Return the payment status
    const paymentData = data?.data || {};
    
    console.log('✅ Transaction status:', {
      status: paymentData.status,           // "Paid", "Unpaid", "Refunded"
      amount: paymentData.amount,
      date: paymentData.date,
      paymentMethod: paymentData.paymentMethod,
      charges: paymentData.charges,
      amountAfterCharges: paymentData.amountAfterCharges,
    });

    return {
      success: true,
      status: paymentData.status,           // This is what you need!
      amount: paymentData.amount,
      charges: paymentData.charges,
      amountAfterCharges: paymentData.amountAfterCharges,
      date: paymentData.date,
      paymentMethod: paymentData.paymentMethod,
      transactionId: paymentData.transactionId,
      externalTransactionId: paymentData.externalTransactionId,
      isFulfilled: paymentData.isFulfilled,
      rawResponse: data,
    };

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    throw error;
  }
}

/**
 * SAMPLE RESPONSE FROM HUBTEL:
 * ============================
 * 
 * If payment was SUCCESSFUL:
 * {
 *   status: 'Paid',
 *   amount: 100,
 *   transactionId: '7fd01221faeb41469daec7b3561bddc5',
 *   externalTransactionId: '0000006824852622',
 *   paymentMethod: 'mobilemoney',
 *   charges: 2,
 *   amountAfterCharges: 98
 * }
 * 
 * If payment was NOT RECEIVED:
 * {
 *   status: 'Unpaid',
 *   amount: 100,
 *   ...
 * }
 * 
 * If payment was REFUNDED:
 * {
 *   status: 'Refunded',
 *   amount: 100,
 *   ...
 * }
 */

/**
 * HOW TO USE THIS IN YOUR CODE:
 * =============================
 * 
 * import { checkTransactionStatus } from '@/utils/hubtel-status-check';
 * 
 * // After 5 minutes of not getting webhook callback:
 * try {
 *   const result = await checkTransactionStatus('FMM-ABC123');
 *   
 *   if (result.status === 'Paid') {
 *     console.log('✅ Payment confirmed! Create the order now');
 *   } else if (result.status === 'Unpaid') {
 *     console.log('❌ Payment not received yet');
 *   }
 * } catch (error) {
 *   console.error('Failed to check status:', error);
 * }
 */

export default checkTransactionStatus;
