// Direct Hubtel API client - calls Hubtel API from frontend
const HUBTEL_API_KEY = 'hubtel_14fda6847ee44c8fa910f355675cce73'; // Public client identifier
const MERCHANT_ACCOUNT_NUMBER = '2039285';

export async function initiatePayment(payload) {
  try {
    console.log('[HubtelClient] Initiating payment:', payload.clientReference);
    
    const hubtelPayload = {
      totalAmount: Number(Number(payload.totalAmount).toFixed(2)),
      description: payload.description,
      callbackUrl: payload.callbackUrl,
      returnUrl: payload.returnUrl,
      merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
      cancellationUrl: payload.cancellationUrl,
      clientReference: String(payload.clientReference).substring(0, 32),
    };

    console.log('[HubtelClient] Payload to Hubtel:', hubtelPayload);

    // Use the raw API key for Basic Auth (in production, use environment variables)
    const apiKey = '14fda6847ee44c8fa910f355675cce73';
    const auth = btoa(`${apiKey}:`);

    const response = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(hubtelPayload),
    });

    const data = await response.json();
    console.log('[HubtelClient] Hubtel response status:', response.status);
    console.log('[HubtelClient] Hubtel response:', data);

    if (!response.ok) {
      console.error('[HubtelClient] Hubtel API error:', data);
      return {
        error: data.message || data.error || `HTTP ${response.status}`,
        details: data,
      };
    }

    return data;
  } catch (error) {
    console.error('[HubtelClient] Network error:', error);
    return {
      error: error.message || 'Network error - cannot reach Hubtel',
      details: error,
    };
  }
}

export async function checkPaymentStatus(clientReference) {
  try {
    console.log('[HubtelClient] Checking payment status:', clientReference);
    
    const apiKey = '14fda6847ee44c8fa910f355675cce73';
    const auth = btoa(`${apiKey}:`);

    const response = await fetch(
      `https://api-txnstatus.hubtel.com/transactions/${MERCHANT_ACCOUNT_NUMBER}/status?clientReference=${encodeURIComponent(clientReference)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    const data = await response.json();
    console.log('[HubtelClient] Status check response:', data);

    return data;
  } catch (error) {
    console.error('[HubtelClient] Status check error:', error);
    return {
      error: error.message || 'Failed to check payment status',
      details: error,
    };
  }
}
