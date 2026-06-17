const HUBTEL_COLLECTION_ACCOUNT = process.env.VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER;
const HUBTEL_API_ID = process.env.VITE_HUBTEL_API_ID;
const HUBTEL_API_KEY = process.env.VITE_HUBTEL_API_KEY;

async function handleHubtelInitiate(req, res) {
  try {
    const origin = req.headers.origin || (`https://${req.headers.host}`) || '';
    const { totalAmount, description, clientReference, payeeName, payeeMobileNumber, payeeEmail } = req.body || {};

    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_COLLECTION_ACCOUNT) {
      return res.status(500).json({ error: 'Hubtel not configured on server' });
    }

    if (!totalAmount || !clientReference) {
      return res.status(400).json({ error: 'totalAmount and clientReference are required' });
    }

    const callbackUrl = `${origin.replace(/\/$/, '')}/api/hubtel/callback`;
    const returnUrl = `${origin.replace(/\/$/, '')}/PaymentConfirmed`;
    const cancellationUrl = `${origin.replace(/\/$/, '')}/PaymentConfirmed?status=cancelled`;

    const requestBody = {
      totalAmount: Number(Number(totalAmount).toFixed(2)),
      description: description || `FMM CLASSICO Order ${clientReference}`,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      merchantAccountNumber: HUBTEL_COLLECTION_ACCOUNT,
      clientReference,
      payeeName: payeeName || '',
      payeeMobileNumber: payeeMobileNumber || '',
      payeeEmail: payeeEmail || '',
    };

    const basicAuth = Buffer.from(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`).toString('base64');

    const resp = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: JSON.stringify(requestBody),
      timeout: 20000,
    });

    const data = await resp.json().catch(() => null);

    // Forward Hubtel response body directly to the client (same shape as Hubtel docs)
    return res.status(resp.status).json(data || {});
  } catch (error) {
    console.error('Hubtel initiate error:', error);
    return res.status(500).json({ error: 'Failed to initiate Hubtel checkout', detail: error.message });
  }
}

module.exports = {
  handler: handleHubtelInitiate,
  route: '/api/hubtel/initiate',
  method: 'POST',
};
