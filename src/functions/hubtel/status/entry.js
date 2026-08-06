const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || '';
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || '';
const MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';

const UAT_STATUS_SAMPLES = [];
const MAX_SAMPLES = 50;

function isConfigured() {
  return Boolean(HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && MERCHANT_ACCOUNT_NUMBER);
}

function createAuthHeader() {
  const auth = Buffer.from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`).toString('base64');
  return `Basic ${auth}`;
}

async function parseHubtelResponse(response) {
  const text = await response.text();

  try {
    return {
      httpStatus: response.status,
      ok: response.ok,
      body: JSON.parse(text),
    };
  } catch (_) {
    return {
      httpStatus: response.status,
      ok: response.ok,
      body: {
        error: 'Invalid JSON response from Hubtel status API',
        raw: text,
      },
    };
  }
}

function buildStatusEndpoint(query) {
  const params = new URLSearchParams();
  if (query.clientReference) params.set('clientReference', String(query.clientReference).trim());
  if (query.hubtelTransactionId) params.set('hubtelTransactionId', String(query.hubtelTransactionId).trim());
  if (query.networkTransactionId) params.set('networkTransactionId', String(query.networkTransactionId).trim());
  return `https://api-txnstatus.hubtel.com/transactions/${MERCHANT_ACCOUNT_NUMBER}/status?${params.toString()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isConfigured()) {
    console.error('[Hubtel Status] Missing HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, or HUBTEL_MERCHANT_ACCOUNT_NUMBER');
    res.status(500).json({ error: 'Hubtel gateway is not configured.' });
    return;
  }

  const url = new URL(req.url || '', 'http://localhost');
  const query = {
    clientReference: url.searchParams.get('clientReference') || req.query?.clientReference || '',
    hubtelTransactionId: url.searchParams.get('hubtelTransactionId') || req.query?.hubtelTransactionId || '',
    networkTransactionId: url.searchParams.get('networkTransactionId') || req.query?.networkTransactionId || '',
  };

  if (!query.clientReference && !query.hubtelTransactionId && !query.networkTransactionId) {
    res.status(400).json({ error: 'Missing clientReference, hubtelTransactionId, or networkTransactionId.' });
    return;
  }

  const endpoint = buildStatusEndpoint(query);

  console.log('[Hubtel Status] Checking transaction status:', {
    clientReference: query.clientReference || null,
    hubtelTransactionId: query.hubtelTransactionId || null,
    networkTransactionId: query.networkTransactionId || null,
    merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
  });

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: createAuthHeader(),
      },
    });

    const parsed = await parseHubtelResponse(response);

    console.log('[Hubtel Status] Hubtel response summary:', {
      httpStatus: parsed.httpStatus,
      ok: parsed.ok,
      responseCode: parsed.body?.responseCode || null,
      message: parsed.body?.message || null,
      status: parsed.body?.data?.status || null,
      transactionId: parsed.body?.data?.transactionId || null,
      externalTransactionId: parsed.body?.data?.externalTransactionId || null,
      clientReference: parsed.body?.data?.clientReference || query.clientReference || null,
    });

    UAT_STATUS_SAMPLES.push({
      timestamp: new Date().toISOString(),
      request: query,
      response: parsed.body,
    });
    if (UAT_STATUS_SAMPLES.length > MAX_SAMPLES) {
      UAT_STATUS_SAMPLES.shift();
    }

    res.status(parsed.httpStatus).json(parsed.body);
  } catch (error) {
    console.error('[Hubtel Status] Network or fetch error:', error);
    res.status(502).json({
      error: 'Failed to reach Hubtel status API.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export function getStatusSamples() {
  return UAT_STATUS_SAMPLES;
}
