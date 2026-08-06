const HUBTEL_CLIENT_ID = Deno.env.get('HUBTEL_CLIENT_ID')?.trim() || '';
const HUBTEL_CLIENT_SECRET = Deno.env.get('HUBTEL_CLIENT_SECRET')?.trim() || '';
const MERCHANT_ACCOUNT_NUMBER = Deno.env.get('HUBTEL_MERCHANT_ACCOUNT_NUMBER')?.trim() || '';

const UAT_STATUS_SAMPLES = [];
const MAX_SAMPLES = 50;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isConfigured() {
  return Boolean(HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && MERCHANT_ACCOUNT_NUMBER);
}

function createAuthHeader() {
  return `Basic ${btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`)}`;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isConfigured()) {
    console.error('[Hubtel Status] Missing HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, or HUBTEL_MERCHANT_ACCOUNT_NUMBER');
    return jsonResponse({ error: 'Hubtel gateway is not configured.' }, 500);
  }

  const url = new URL(req.url);
  const query = {
    clientReference: url.searchParams.get('clientReference') || '',
    hubtelTransactionId: url.searchParams.get('hubtelTransactionId') || '',
    networkTransactionId: url.searchParams.get('networkTransactionId') || '',
  };

  if (!query.clientReference && !query.hubtelTransactionId && !query.networkTransactionId) {
    return jsonResponse({ error: 'Missing clientReference, hubtelTransactionId, or networkTransactionId.' }, 400);
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

    return jsonResponse(parsed.body, parsed.httpStatus);
  } catch (error) {
    console.error('[Hubtel Status] Network or fetch error:', error);
    return jsonResponse({
      error: 'Failed to reach Hubtel status API.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
