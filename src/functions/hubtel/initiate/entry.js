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
const HUBTEL_INITIATE_URL = readEnv('HUBTEL_INITIATE_URL')
  || 'https://payproxyapi.hubtel.com/items/initiate';

function createCorsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

async function parseJsonBody(req) {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function sanitizeDescription(value = '') {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return cleaned || 'FMM CLASSICO checkout';
}

function sanitizePhone(value = '') {
  return String(value || '').replace(/[^0-9+]/g, '').slice(0, 20);
}

function sanitizeEmail(value = '') {
  return String(value || '').trim().slice(0, 120);
}

function sanitizeName(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function sanitizeClientReference(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim()
    .slice(0, 32);
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
}

function validatePayload(body = {}) {
  const totalAmount = normalizeAmount(body.totalAmount);
  const callbackUrl = String(body.callbackUrl || '').trim();
  const returnUrl = String(body.returnUrl || '').trim();
  const cancellationUrl = String(body.cancellationUrl || '').trim();
  const clientReference = sanitizeClientReference(body.clientReference || '');
  const description = sanitizeDescription(body.description || `Payment for ${clientReference || 'order'}`);

  const missingFields = [
    totalAmount == null || totalAmount <= 0 ? 'totalAmount' : null,
    !callbackUrl ? 'callbackUrl' : null,
    !returnUrl ? 'returnUrl' : null,
    !cancellationUrl ? 'cancellationUrl' : null,
    !clientReference ? 'clientReference' : null,
  ].filter(Boolean);

  return {
    missingFields,
    payload: {
      totalAmount,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      clientReference,
      description,
      payeeName: sanitizeName(body.payeeName || ''),
      payeeMobileNumber: sanitizePhone(body.payeeMobileNumber || ''),
      payeeEmail: sanitizeEmail(body.payeeEmail || ''),
    },
  };
}

function buildHubtelPayload(payload) {
  return {
    totalAmount: payload.totalAmount,
    description: payload.description,
    callbackUrl: payload.callbackUrl,
    returnUrl: payload.returnUrl,
    merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
    cancellationUrl: payload.cancellationUrl,
    clientReference: payload.clientReference,
    ...(payload.payeeName ? { payeeName: payload.payeeName } : {}),
    ...(payload.payeeMobileNumber ? { payeeMobileNumber: payload.payeeMobileNumber } : {}),
    ...(payload.payeeEmail ? { payeeEmail: payload.payeeEmail } : {}),
  };
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
        error: 'Invalid JSON response from Hubtel initiate API',
        raw: text,
      },
    };
  }
}

function extractCheckoutData(body = {}) {
  const data = body?.data || body?.Data || body;
  return {
    responseCode: body?.responseCode || body?.ResponseCode || '',
    status: body?.status || body?.Status || data?.status || data?.Status || '',
    checkoutUrl: data?.checkoutUrl || data?.CheckoutUrl || null,
    checkoutDirectUrl: data?.checkoutDirectUrl || data?.CheckoutDirectUrl || null,
    checkoutId: data?.checkoutId || data?.CheckoutId || null,
    clientReference: data?.clientReference || data?.ClientReference || body?.clientReference || null,
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

function createClientPayload(body = {}, checkout = {}, fallbackReference = '', authMetadata = {}) {
  return {
    ...body,
    responseCode: checkout.responseCode || body?.responseCode || body?.ResponseCode || '',
    status: checkout.status || body?.status || body?.Status || '',
    checkoutUrl: checkout.checkoutUrl,
    checkoutDirectUrl: checkout.checkoutDirectUrl,
    checkoutId: checkout.checkoutId,
    clientReference: checkout.clientReference || fallbackReference || body?.clientReference || body?.ClientReference || null,
    message: extractHubtelMessage(body),
    authModeUsed: authMetadata.authModeUsed || null,
    authAttempts: authMetadata.authAttempts || [],
  };
}

async function callHubtelInitiate(hubtelPayload) {
  const authCandidates = getAuthCandidates();
  const authAttempts = [];
  let lastParsed = null;
  let authModeUsed = null;

  for (const candidate of authCandidates) {
    console.log('[Hubtel Initiate] Trying auth mode:', candidate.label);

    const response = await fetch(HUBTEL_INITIATE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: candidate.header,
      },
      body: JSON.stringify(hubtelPayload),
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

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  if (!isConfigured()) {
    const missingConfiguration = getMissingConfiguration();
    console.error('[Hubtel Initiate] Missing required Hubtel configuration:', missingConfiguration);
    return jsonResponse(req, {
      error: 'Hubtel gateway is not configured.',
      missingConfiguration,
    }, 500);
  }

  try {
    const body = await parseJsonBody(req);
    if (!body || typeof body !== 'object') {
      return jsonResponse(req, { error: 'Invalid JSON' }, 400);
    }

    const { missingFields, payload } = validatePayload(body);
    if (missingFields.length > 0) {
      return jsonResponse(req, {
        error: 'Missing required fields.',
        missingFields,
      }, 400);
    }

    const hubtelPayload = buildHubtelPayload(payload);

    console.log('[Hubtel Initiate] Starting checkout request:', {
      clientReference: payload.clientReference,
      totalAmount: payload.totalAmount,
      merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
      hasCallbackUrl: Boolean(payload.callbackUrl),
      hasReturnUrl: Boolean(payload.returnUrl),
      hasCancellationUrl: Boolean(payload.cancellationUrl),
      authCandidates: getAuthCandidates().map((candidate) => candidate.label),
    });

    const { parsed, authModeUsed, authAttempts } = await callHubtelInitiate(hubtelPayload);
    const checkout = extractCheckoutData(parsed?.body || {});

    console.log('[Hubtel Initiate] Hubtel response summary:', {
      httpStatus: parsed?.httpStatus || null,
      ok: parsed?.ok || false,
      responseCode: checkout.responseCode || null,
      status: checkout.status || null,
      checkoutId: checkout.checkoutId,
      hasCheckoutUrl: Boolean(checkout.checkoutUrl || checkout.checkoutDirectUrl),
      clientReference: checkout.clientReference || payload.clientReference,
      authModeUsed,
      authAttempts,
    });

    const clientPayload = createClientPayload(parsed?.body || {}, checkout, payload.clientReference, {
      authModeUsed,
      authAttempts,
    });

    if (!parsed?.ok) {
      return jsonResponse(req, {
        ...clientPayload,
        error: clientPayload.message || 'Hubtel initiate request failed.',
      }, parsed?.httpStatus || 502);
    }

    return jsonResponse(req, clientPayload, parsed.httpStatus);
  } catch (error) {
    console.error('[Hubtel Initiate] Network or fetch error:', error);
    return jsonResponse(req, {
      error: 'Failed to reach Hubtel initiate API.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
