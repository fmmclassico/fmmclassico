const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kptlejtauwqvaapsrjfx.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function initiatePayment({ totalAmount, description, callbackUrl, returnUrl, cancellationUrl, clientReference }) {
  // Check if anon key is configured
  if (!SUPABASE_ANON_KEY) {
    console.error('[HubtelClient] VITE_SUPABASE_ANON_KEY is not set! Create a .env file.');
    return { error: 'Payment system not configured. Contact admin.' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
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

    // Handle non-OK responses
    if (!response.ok) {
      const text = await response.text();
      console.error(`[HubtelClient] Server error ${response.status}:`, text);
      return { error: `Payment server error (${response.status}). Please try again.` };
    }

    // Handle empty responses
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error('[HubtelClient] Empty response from server');
      return { error: 'Payment server returned empty response. Please try again.' };
    }

    // Parse JSON safely
    try {
      const result = JSON.parse(text);
      return result;
    } catch (parseErr) {
      console.error('[HubtelClient] Invalid JSON response:', text);
      return { error: 'Invalid response from payment server. Please try again.' };
    }
  } catch (error) {
    console.error('[HubtelClient] Network error:', error);
    return { error: 'Unable to reach payment server. Check your internet connection.' };
  }
}

export async function checkPaymentStatus(clientReference) {
  if (!SUPABASE_ANON_KEY) {
    console.error('[HubtelClient] VITE_SUPABASE_ANON_KEY is not set!');
    return { error: 'Payment system not configured.' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout?clientReference=${clientReference}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[HubtelClient] Status check error ${response.status}:`, text);
      return { error: `Status check failed (${response.status})` };
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return { error: 'Empty response from payment server.' };
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('[HubtelClient] Invalid JSON:', text);
      return { error: 'Invalid response from server.' };
    }
  } catch (error) {
    console.error('[HubtelClient] Status check network error:', error);
    return { error: error.message };
  }
}