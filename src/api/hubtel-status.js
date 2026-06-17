const HUBTEL_API_ID = process.env.VITE_HUBTEL_API_ID;
const HUBTEL_API_KEY = process.env.VITE_HUBTEL_API_KEY;
const MERCHANT_ACCOUNT = process.env.VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER;

async function handleHubtelStatus(req, res) {
  try {
    const clientReference = req.query.clientReference || req.query.clientreference || req.body?.clientReference;
    if (!clientReference) return res.status(400).json({ error: 'clientReference is required' });
    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !MERCHANT_ACCOUNT) return res.status(500).json({ error: 'Hubtel not configured' });

    const auth = Buffer.from(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`).toString('base64');
    const url = `https://api-txnstatus.hubtel.com/transactions/${MERCHANT_ACCOUNT}/status?clientReference=${encodeURIComponent(clientReference)}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      timeout: 20000,
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) return res.status(resp.status).json({ error: 'Hubtel status error', detail: data });
    return res.status(200).json(data || {});
  } catch (err) {
    console.error('Hubtel status check failed:', err);
    return res.status(500).json({ error: 'Status check failed', detail: err.message });
  }
}

module.exports = {
  handler: handleHubtelStatus,
  route: '/api/hubtel/status',
  method: 'GET',
};
