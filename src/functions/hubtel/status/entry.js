function readEnv(...names) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return '';
}

const HUBTEL_CLIENT_ID = readEnv('HUBTEL_CLIENT_ID');
const HUBTEL_CLIENT_SECRET = readEnv('HUBTEL_CLIENT_SECRET');
const MERCHANT_ACCOUNT_NUMBER = readEnv('HUBTEL_MERCHANT_ACCOUNT_NUMBER');

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

function isConfigured() {
  return Boolean(HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && MERCHANT_ACCOUNT_NUMBER);
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return value;
    }
  }
  return '';
}

function toNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeHubtelStatusValue(rawStatus = '', responseCode = '', responseMessage = '') {
  const status = String(rawStatus || '').toLowerCase().trim();
  const code = String(responseCode || '').trim();
  const message = String(responseMessage || '').toLowerCase().trim();

  if (['paid', 'success', 'successful', 'completed', 'complete', 'approved'].includes(status)) return 'paid';
  if (['failed', 'declined', 'reversed', 'unpaid'].includes(status)) return 'failed';
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
  if (['pending', 'processing', 'initiated', 'queued'].includes(status)) return 'pending_payment';

  if (!status && code === '0000' && (message.includes('success') || message.includes('complete') || message.includes('paid'))) {
    return 'paid';
  }

  return status || 'unknown';
}

async function parseHubtelResponse(response) {
  const rawText = await response.text();

  try {
    return {
      status: response.status,
      ok: response.ok,
      body: rawText ? JSON.parse(rawText) : {},
    };
  } catch {
    return {
      status: response.status,
      ok: response.ok,
      body: {
        error: 'Invalid response from Hubtel',
        raw: rawText,
      },
    };
  }
}

function normalizeStatusPayload(body = {}) {
  const data = body?.data || body?.Data || body || {};

  const responseCode = String(
    pickFirst(
      body?.responseCode,
      body?.ResponseCode,
      data?.responseCode,
      data?.ResponseCode,
    ) || '',
  ).trim();

  const responseMessage = String(
    pickFirst(
      body?.responseMessage,
      body?.ResponseMessage,
      body?.message,
      body?.Message,
      data?.responseMessage,
      data?.ResponseMessage,
      data?.message,
      data?.Message,
    ) || '',
  ).trim();

  const rawStatus = String(
    pickFirst(
      data?.status,
      data?.Status,
      data?.transactionStatus,
      data?.TransactionStatus,
      body?.status,
      body?.Status,
      body?.transactionStatus,
      body?.TransactionStatus,
    ) || '',
  ).trim();

  return {
    responseCode,
    responseMessage,
    rawStatus,
    normalizedStatus: normalizeHubtelStatusValue(rawStatus, responseCode, responseMessage),
    amount: toNumber(
      data?.amount,
      data?.Amount,
      data?.transactionAmount,
      data?.TransactionAmount,
      body?.amount,
      body?.Amount,
      body?.transactionAmount,
      body?.TransactionAmount,
    ),
    clientReference: String(
      pickFirst(
        data?.clientReference,
        data?.ClientReference,
        body?.clientReference,
        body?.ClientReference,
      ) || '',
    ).trim(),
    transactionId: pickFirst(
      data?.transactionId,
      data?.TransactionId,
      body?.transactionId,
      body?.TransactionId,
      data?.checkoutId,
      data?.CheckoutId,
    ) || null,
    externalTransactionId: pickFirst(
      data?.externalTransactionId,
      data?.ExternalTransactionId,
      data?.networkTransactionId,
      data?.NetworkTransactionId,
      body?.externalTransactionId,
      body?.ExternalTransactionId,
      body?.networkTransactionId,
      body?.NetworkTransactionId,
    ) || null,
    paymentMethod: pickFirst(
      data?.paymentMethod,
      data?.PaymentMethod,
      body?.paymentMethod,
      body?.PaymentMethod,
    ) || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: createCorsHeaders(req) });
  }

  if (req.method !== 'GET') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  if (!isConfigured()) {
    return jsonResponse(req, { error: 'Hubtel gateway is not configured.' }, 500);
  }

  const url = new URL(req.url);
  const clientReference = String(url.searchParams.get('clientReference') || '').trim();
  const hubtelTransactionId = String(url.searchParams.get('hubtelTransactionId') || '').trim();
  const networkTransactionId = String(url.searchParams.get('networkTransactionId') || '').trim();

  if (!clientReference && !hubtelTransactionId && !networkTransactionId) {
    return jsonResponse(req, {
      error: 'Missing clientReference, hubtelTransactionId, or networkTransactionId.',
    }, 400);
  }

  const endpoint = new URL(
    `https://api-txnstatus.hubtel.com/transactions/${encodeURIComponent(MERCHANT_ACCOUNT_NUMBER)}/status`,
  );

  if (clientReference) endpoint.searchParams.set('clientReference', clientReference);
  if (hubtelTransactionId) endpoint.searchParams.set('hubtelTransactionId', hubtelTransactionId);
  if (networkTransactionId) endpoint.searchParams.set('networkTransactionId', networkTransactionId);

  console.log('[hubtel-status] Query:', JSON.stringify({
    clientReference,
    hubtelTransactionId,
    networkTransactionId,
    endpoint: endpoint.toString(),
  }));

  try {
    const statusRes = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`)}`,
      },
    });

    const parsed = await parseHubtelResponse(statusRes);
    const normalized = normalizeStatusPayload(parsed.body);

    console.log('[hubtel-status] Response:', JSON.stringify({
      httpStatus: parsed.status,
      responseCode: normalized.responseCode,
      rawStatus: normalized.rawStatus,
      normalizedStatus: normalized.normalizedStatus,
      amount: normalized.amount,
      clientReference: normalized.clientReference,
    }));

    return jsonResponse(req, {
      ok: parsed.ok,
      httpStatus: parsed.status,
      query: {
        clientReference,
        hubtelTransactionId,
        networkTransactionId,
      },
      hubtel: normalized,
      raw: parsed.body,
    }, parsed.status);
  } catch (error) {
    console.error('[hubtel-status] Unexpected error:', error);
    return jsonResponse(req, {
      error: 'Failed to reach Hubtel status endpoint.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
