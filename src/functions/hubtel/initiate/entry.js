// Server function: initiate Hubtel checkout
// Expects POST JSON body with: totalAmount, description, callbackUrl, returnUrl, cancellationUrl, clientReference
// Logs initiation requests for UAT documentation.

const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || '';
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || '';
const MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';
if (!MERCHANT_ACCOUNT_NUMBER) console.warn('HUBTEL merchant account number not configured (HUBTEL_MERCHANT_ACCOUNT_NUMBER)');

// In-memory sample storage for UAT
const UAT_INIT_SAMPLES = [];
const MAX_SAMPLES = 50;

async function toJsonSafe(res) {
  try { return await res.json(); } catch (e) { return { ok: false, status: res.status, text: await res.text() }; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = (typeof req.json === 'function') ? await req.json() : req.body;
  } catch (e) {
    try { body = req.body || JSON.parse(await getRawBody(req)); } catch (e2) { body = null; }
  }

  if (!body) return res.status(400).json({ error: 'Missing request body' });

  const {
    totalAmount,
    description,
    callbackUrl,
    returnUrl,
    cancellationUrl,
    clientReference,
  } = body;

  if (!totalAmount || !description || !callbackUrl || !returnUrl || !cancellationUrl || !clientReference) {
    return res.status(400).json({ error: 'Missing required parameter' });
  }

  const payload = {
    totalAmount: Number(Number(totalAmount).toFixed(2)),
    description,
    callbackUrl,
    returnUrl,
    merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
    cancellationUrl,
    clientReference: String(clientReference).substring(0,32),
  };

const auth = Buffer
  .from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`)
  .toString('base64');

  console.log(`[Hubtel Init] Initiating payment for ${clientReference}: amount=${payload.totalAmount}`);

  try {
    const r = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await toJsonSafe(r);

    // Store sample for UAT (only successful responses)
    if (r.ok && data.data?.checkoutUrl) {
      const sample = {
        timestamp: new Date().toISOString(),
        clientReference,
        amount: payload.totalAmount,
        request: payload,
        response: data,
      };
      UAT_INIT_SAMPLES.push(sample);
      if (UAT_INIT_SAMPLES.length > MAX_SAMPLES) {
        UAT_INIT_SAMPLES.shift();
      }
      console.log(`[Hubtel Init] Success: ${clientReference} → ${data.data.checkoutId}`);
    } else {
      console.warn(`[Hubtel Init] Failed for ${clientReference}: ${r.status}`, data);
    }

    return res.status(r.status).json(data);
  } catch (err) {
    console.error('Hubtel initiate error:', err);
    return res.status(502).json({ error: 'Failed to reach Hubtel', details: String(err) });
  }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
