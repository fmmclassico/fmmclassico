const SUPABASE_URL = "https://kptlejtauwqvaapsrjfx.supabase.co";

export async function initiatePayment({ totalAmount, description, callbackUrl, returnUrl, cancellationUrl, clientReference }) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${SUPABASE_URL}/functions/v1/hubtel-checkout?clientReference=${clientReference}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[HubtelClient] Status check error:', error);
    return { error: error.message };
  }
}
