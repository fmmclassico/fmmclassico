const HUBTEL_CLIENT_ID = Deno.env.get('HUBTEL_CLIENT_ID')?.trim() || '';
const HUBTEL_CLIENT_SECRET = Deno.env.get('HUBTEL_CLIENT_SECRET')?.trim() || '';
const MERCHANT_ACCOUNT_NUMBER = Deno.env.get('HUBTEL_MERCHANT_ACCOUNT_NUMBER')?.trim() || '';

const UAT_INIT_SAMPLES = [];
const MAX_SAMPLES = 50;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function sanitizeDescription(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function safeString(value = '') {
  return String(value || '').trim();
}

function toAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Number(numeric.toFixed(2));
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

async function parseHubtelResponse(response) {
  const text = await response.text();

  try {
    return {
      httpStatus: response.status,
      ok: response.ok,
      body: JSON.parse(text),
      raw: text,
    };
  } catch (_) {
    return {
      httpStatus: response.status,
      ok: response.ok,
      body: {
        error: 'Invalid JSON response from Hubtel',
        raw: text,
      },
      raw: text,
    };
  }
}

function buildPayload(body = {}) {
  const totalAmount = toAmount(body.totalAmount);
  const description = sanitizeDescription(body.description);
  const callbackUrl = safeString(body.callbackUrl);
  const returnUrl = safeString(body.returnUrl);
  const cancellationUrl = safeString(body.cancellationUrl);
  const clientReference = safeString(body.clientReference).slice(0, 32);
  const payeeName = safeString(body.payeeName);
  const payeeMobileNumber = safeString(body.payeeMobileNumber);
  const payeeEmail = safeString(body.payeeEmail);

  const missingFields = [];
  if (totalAmount === null) missingFields.push('totalAmount');
  if (!description) missingFields.push('description');
  if (!callbackUrl) missingFields.push('callbackUrl');
  if (!returnUrl) missingFields.push('returnUrl');
  if (!cancellationUrl) missingFields.push('cancellationUrl');
  if (!clientReference) missingFields.push('clientReference');

  return {
    missingFields,
    payload: {
      totalAmount,
      description,
      callbackUrl,
      returnUrl,
      merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
      cancellationUrl,
      clientReference,
      ...(payeeName ? { payeeName } : {}),
      ...(payeeMobileNumber ? { payeeMobileNumber } : {}),
      ...(payeeEmail ? { payeeEmail } : {}),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!isConfigured()) {
    console.error('[Hubtel Init] Missing HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, or HUBTEL_MERCHANT_ACCOUNT_NUMBER');
    return jsonResponse({ error: 'Hubtel gateway is not configured.' }, 500);
  }

  const body = await parseJsonBody(req);
  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'Missing or invalid request body.' }, 400);
  }

  const { payload, missingFields } = buildPayload(body);
  if (missingFields.length > 0) {
    console.warn('[Hubtel Init] Validation failed:', { missingFields, receivedKeys: Object.keys(body || {}) });
    return jsonResponse({
      error: 'Missing or invalid required fields.',
      missingFields,
    }, 400);
  }

  console.log('[Hubtel Init] Starting checkout:', {
    clientReference: payload.clientReference,
    totalAmount: payload.totalAmount,
    merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
    hasPayeeName: Boolean(payload.payeeName),
    hasPayeeMobileNumber: Boolean(payload.payeeMobileNumber),
    hasPayeeEmail: Boolean(payload.payeeEmail),
    callbackUrl: payload.callbackUrl,
    returnUrl: payload.returnUrl,
    cancellationUrl: payload.cancellationUrl,
  });

  try {
    const response = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: createAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    const parsed = await parseHubtelResponse(response);

    console.log('[Hubtel Init] Hubtel response summary:', {
      clientReference: payload.clientReference,
      httpStatus: parsed.httpStatus,
      ok: parsed.ok,
      responseCode: parsed.body?.responseCode || null,
      status: parsed.body?.status || null,
      checkoutId: parsed.body?.data?.checkoutId || null,
      hasCheckoutUrl: Boolean(parsed.body?.data?.checkoutUrl),
      hasCheckoutDirectUrl: Boolean(parsed.body?.data?.checkoutDirectUrl),
    });

    const accepted = parsed.body?.responseCode === '0000' && parsed.body?.data?.checkoutUrl;
    if (accepted) {
      UAT_INIT_SAMPLES.push({
        timestamp: new Date().toISOString(),
        request: payload,
        response: parsed.body,
      });
      if (UAT_INIT_SAMPLES.length > MAX_SAMPLES) {
        UAT_INIT_SAMPLES.shift();
      }
    } else {
      console.warn('[Hubtel Init] Hubtel did not accept the checkout request:', parsed.body);
    }

    return jsonResponse(parsed.body, parsed.httpStatus);
  } catch (error) {
    console.error('[Hubtel Init] Network or fetch error:', error);
    return jsonResponse({
      error: 'Failed to reach Hubtel.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
