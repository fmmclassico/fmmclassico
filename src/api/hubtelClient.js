// Frontend Hubtel client — forwards requests to server-side endpoints to avoid exposing secrets in the browser

export async function initiatePayment(payload) {
  try {
    // Forward to server-side function which holds the real Hubtel credentials
    const response = await fetch('/api/hubtel/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.message || data.error || `HTTP ${response.status}`, details: data };
    }
    return data;
  } catch (err) {
    console.error('[HubtelClient] Network error:', err);
    return { error: err.message || 'Network error - cannot reach server', details: String(err) };
  }
}

export async function checkPaymentStatus(clientReference) {
  try {
    const response = await fetch(`/api/hubtel/status?clientReference=${encodeURIComponent(clientReference)}`);
    const data = await response.json();
    if (!response.ok) return { error: data.message || data.error || `HTTP ${response.status}`, details: data };
    return data;
  } catch (err) {
    console.error('[HubtelClient] Status check error:', err);
    return { error: err.message || 'Failed to check payment status', details: String(err) };
  }
}
