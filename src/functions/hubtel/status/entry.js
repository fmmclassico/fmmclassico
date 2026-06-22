// Server function: check Hubtel transaction status
// Usage: GET /api/hubtel/status?clientReference=inv0012
// Logs status responses for UAT documentation.

const HUBTEL_API_KEY = process.env.HUBTEL_API_KEY || '';
const MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';
if (!MERCHANT_ACCOUNT_NUMBER) console.warn('HUBTEL merchant account number not configured (HUBTEL_MERCHANT_ACCOUNT_NUMBER)');

// In-memory sample storage for UAT
const UAT_STATUS_SAMPLES = [];
const MAX_SAMPLES = 50;

async function toJsonSafe(res) {
  try { return await res.json(); } catch (e) { return { ok: false, status: res.status, text: await res.text() }; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url || '', `http://localhost`);
  const clientReference = url.searchParams.get('clientReference') || (req.query && req.query.clientReference);

  if (!clientReference) return res.status(400).json({ error: 'Missing clientReference' });

  const auth = Buffer.from(HUBTEL_API_KEY || '').toString('base64');

  try {
    const endpoint = `https://api-txnstatus.hubtel.com/transactions/${MERCHANT_ACCOUNT_NUMBER}/status?clientReference=${encodeURIComponent(clientReference)}`;
    const r = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    });

    const data = await toJsonSafe(r);

    // Store sample for UAT (with timestamp)
    const sample = {
      timestamp: new Date().toISOString(),
      clientReference,
      httpStatus: r.status,
      response: data,
    };
    UAT_STATUS_SAMPLES.push(sample);
    if (UAT_STATUS_SAMPLES.length > MAX_SAMPLES) {
      UAT_STATUS_SAMPLES.shift();
    }

    console.log(`[Hubtel Status] Checked ${clientReference}: status=${data.data?.status || 'unknown'}, http=${r.status}`);

    return res.status(r.status).json(data);
  } catch (err) {
    console.error('Hubtel status check error:', err);
    return res.status(502).json({ error: 'Failed to reach Hubtel status API', details: String(err) });
  }
}

// Export samples for retrieval
export function getStatusSamples() {
  return UAT_STATUS_SAMPLES;
}
