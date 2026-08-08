function readEnv(...names) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }

  return '';
}

const HUBTEL_CLIENT_ID = readEnv(
  'HUBTEL_CLIENT_ID',
  'HUBTEL_API_ID',
  'HUBTEL_AP_ID',
  'VITE_HUBTEL_API_ID'
);
const HUBTEL_CLIENT_SECRET = readEnv(
  'HUBTEL_CLIENT_SECRET',
  'HUBTEL_API_KEY',
  'VITE_HUBTEL_API_KEY'
);
const MERCHANT_ACCOUNT_NUMBER = readEnv(
  'HUBTEL_MERCHANT_ACCOUNT_NUMBER',
  'VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER'
);

const UAT_STATUS_SAMPLES = [];
const MAX_SAMPLES = 50;

function createCorsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin, Access-Control-Request-Headers',
  };
}

function jsonResponse(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...createCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

function getMissingConfiguration() {
  return [
    !HUBTEL_CLIENT_SECRET ? 'HUBTEL_CLIENT_SECRET / HUBTEL_API_KEY' : null,
    !MERCHANT_ACCOUNT_NUMBER ? 'HUBTEL_MERCHANT_ACCOUNT_NUMBER' : null,
  ].filter(Boolean);
}

function isConfigured() {
  return getMissingConfiguration().length === 0;
}

function createBasicAuthHeader(username = '', password = '') {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function getAuthCandidates() {
  const seen = new Set();
  const candidates = [];

  const push = (label, username = '', password = '') => {
    if (!username) return;

    const header = createBasicAuthHeader(username, password);
    if (seen.has(header)) return;

    seen.add(header);
    candidates.push({ label, header });
  };

  push('client_id_and_client_secret', HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET);
  push('client_secret_only', HUBTEL_CLIENT_SECRET, '');
  push('client_id_only', HUBTEL_CLIENT_ID, '');

  return candidates;
}

async function parseHubtelResponse(response) {
  const text = await response.text();

  if (!text) {
    return {
      httpStatus: response.status,
      ok: response.ok,
      body: {},
    };
  }

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

function extractStatusData(body = {}) {
  const data = body?.data || body?.Data || body;
  return {
    responseCode: body?.responseCode || body?.ResponseCode || '',
    status: data?.status || data?.Status || body?.status || body?.Status || '',
    amount: Number(
      data?.amount
        ?? data?.Amount
        ?? data?.transactionAmount
        ?? data?.TransactionAmount
        ?? body?.amount
        ?? 0
    ) || 0,
    clientReference: data?.clientReference || data?.ClientReference || body?.clientReference || '',
    checkoutId: data?.checkoutId || data?.CheckoutId || null,
    transactionId: data?.transactionId || data?.TransactionId || null,
    networkTransactionId: data?.networkTransactionId || data?.NetworkTransactionId || null,
  };
}

function extractHubtelMessage(body = {}) {
  return String(
    body?.message
      || body?.Message
      || body?.error
      || body?.Error
      || body?.ResponseMessage
      || body?.raw
      || ''
  ).trim();
}

function createClientPayload(body = {}, statusData = {}, fallbackReference = '', authMetadata = {}) {
  return {
    ...body,
    responseCode: statusData.responseCode || body?.responseCode || body?.ResponseCode || '',
    status: statusData.status,
    amount: statusData.amount,
    clientReference: statusData.clientReference || fallbackReference || null,
    checkoutId: statusData.checkoutId,
    transactionId: statusData.transactionId,
    networkTransactionId: statusData.networkTransactionId,
    message: extractHubtelMessage(body),
    authModeUsed: authMetadata.authModeUsed || null,
    authAttempts: authMetadata.authAttempts || [],
  };
}

async function callHubtelStatus(endpoint) {
  const authCandidates = getAuthCandidates();
  const authAttempts = [];
  let lastParsed = null;
  let authModeUsed = null;

  for (const candidate of authCandidates) {
    console.log('[Hubtel Status] Trying auth mode:', candidate.label);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: candidate.header,
      },
    });

    const parsed = await parseHubtelResponse(response);
    authAttempts.push({ authMode: candidate.label, httpStatus: parsed.httpStatus, ok: parsed.ok });
    lastParsed = parsed;

    if (parsed.httpStatus !== 401) {
      authModeUsed = candidate.label;
      break;
    }
  }

  return {
    parsed: lastParsed,
    authModeUsed,
    authAttempts,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req),
    });
  }

  if (req.method !== 'GET') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  if (!isConfigured()) {
    const missingConfiguration = getMissingConfiguration();
    console.error('[Hubtel Status] Missing required Hubtel configuration:', missingConfiguration);
    return jsonResponse(req, {
      error: 'Hubtel gateway is not configured.',
      missingConfiguration,
    }, 500);
  }

  const url = new URL(req.url);
  const query = {
    clientReference: url.searchParams.get('clientReference') || '',
    hubtelTransactionId: url.searchParams.get('hubtelTransactionId') || '',
    networkTransactionId: url.searchParams.get('networkTransactionId') || '',
  };

  if (!query.clientReference && !query.hubtelTransactionId && !query.networkTransactionId) {
    return jsonResponse(req, { error: 'Missing clientReference, hubtelTransactionId, or networkTransactionId.' }, 400);
  }

  const endpoint = buildStatusEndpoint(query);

  console.log('[Hubtel Status] Checking transaction status:', {
    clientReference: query.clientReference || null,
    hubtelTransactionId: query.hubtelTransactionId || null,
    networkTransactionId: query.networkTransactionId || null,
    merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
    authCandidates: getAuthCandidates().map((candidate) => candidate.label),
  });

  try {
    const { parsed, authModeUsed, authAttempts } = await callHubtelStatus(endpoint);
    const statusData = extractStatusData(parsed?.body || {});

    console.log('[Hubtel Status] Hubtel response summary:', {
      httpStatus: parsed?.httpStatus || null,
      ok: parsed?.ok || false,
      responseCode: statusData.responseCode || null,
      message: parsed?.body?.message || parsed?.body?.Message || null,
      status: statusData.status || null,
      transactionId: statusData.transactionId,
      networkTransactionId: statusData.networkTransactionId,
      clientReference: statusData.clientReference || query.clientReference || null,
      authModeUsed,
      authAttempts,
    });

    UAT_STATUS_SAMPLES.push({
      timestamp: new Date().toISOString(),
      request: query,
      response: parsed?.body || {},
    });
    if (UAT_STATUS_SAMPLES.length > MAX_SAMPLES) {
      UAT_STATUS_SAMPLES.shift();
    }

    const clientPayload = createClientPayload(parsed?.body || {}, statusData, query.clientReference, {
      authModeUsed,
      authAttempts,
    });

    if (!parsed?.ok) {
      return jsonResponse(req, {
        ...clientPayload,
        error: clientPayload.message || 'Hubtel status request failed.',
      }, parsed?.httpStatus || 502);
    }

    return jsonResponse(req, clientPayload, parsed.httpStatus);
  } catch (error) {
    console.error('[Hubtel Status] Network or fetch error:', error);
    return jsonResponse(req, {
      error: 'Failed to reach Hubtel status API.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
