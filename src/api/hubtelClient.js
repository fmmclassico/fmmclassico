const SUPABASE_URL = "https://kptlejtauwqvaapsrjfx.supabase.co";

export async function initiatePayment({ totalAmount, description, callbackUrl, returnUrl, cancellationUrl, clientReference }) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'}`,
      },
      body: JSON.stringify({
        totalAmount,
        description,
        callbackUrl,
        returnUrl,
        cancellationUrl,
        clientReference,
      }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[HubtelClient] Error:', error);
    return { error: error.message };
  }
}

export async function checkPaymentStatus(clientReference) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout?clientReference=${encodeURIComponent(clientReference)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'}`,
      },
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[HubtelClient] Status check error:', error);
    return { error: error.message };
  }
}

// Poll payment status with retries for fast verification after redirect
export async function verifyPaymentWithRetries(clientReference, maxRetries = 4, delayMs = 800) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await checkPaymentStatus(clientReference);
      const status = result?.data?.status || result?.data?.Status || '';

      if (status.toLowerCase() === 'paid' || status.toLowerCase() === 'success') {
        return { verified: true, status: 'paid', data: result };
      }
      if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'unpaid') {
        return { verified: true, status: 'failed', data: result };
      }
      if (status.toLowerCase() === 'cancelled') {
        return { verified: true, status: 'cancelled', data: result };
      }
    } catch (err) {
      console.warn('[HubtelClient] Retry attempt', attempt + 1, err);
    }
    // Wait before next attempt
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return { verified: false, status: 'unknown', data: null };
}
