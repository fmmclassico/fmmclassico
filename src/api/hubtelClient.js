// Client-side wrapper to call the app server functions for Hubtel
export async function initiatePayment(payload) {
  const res = await fetch('/api/hubtel/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function checkPaymentStatus(clientReference) {
  const res = await fetch(`/api/hubtel/status?clientReference=${encodeURIComponent(clientReference)}`);
  return res.json();
}
