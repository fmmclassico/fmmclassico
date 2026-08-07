const HUBTEL_CLIENT_ID = Deno.env.get('HUBTEL_CLIENT_ID')?.trim()
  || Deno.env.get('HUBTEL_API_ID')?.trim()
  || Deno.env.get('HUBTEL_AP_ID')?.trim()
  || '';
const HUBTEL_CLIENT_SECRET = Deno.env.get('HUBTEL_CLIENT_SECRET')?.trim()
  || Deno.env.get('HUBTEL_API_KEY')?.trim()
  || '';
const HUBTEL_INITIATE_URL = Deno.env.get('HUBTEL_INITIATE_URL')?.trim()
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

function isConfigured() {
  return Boolean(HUBTEL_CLIENT_SECRET || (HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET));
}

function createAuthHeader() {
  if (!HUBTEL_CLIENT_SECRET) {
    return '';
  }

  const username = HUBTEL_CLIENT_ID || HUBTEL_CLIENT_SECRET;
  const password = HUBTEL_CLIENT_ID ? HUBTEL_CLIENT_SECRET : '';
  return `Basic ${btoa(`${username}:${password}`)}`;
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
  return String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
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
  const clientReference = String(body.clientReference || '').trim();
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
    checkoutUrl: data?.checkoutUrl || data?.CheckoutUrl || null,
    checkoutDirectUrl: data?.checkoutDirectUrl || data?.CheckoutDirectUrl || null,
    checkoutId: data?.checkoutId || data?.CheckoutId || null,
    clientReference: data?.clientReference || data?.ClientReference || body?.clientReference || null,
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
    console.error('[Hubtel Initiate] Missing HUBTEL_CLIENT_SECRET/HUBTEL_API_KEY or HUBTEL_CLIENT_ID');
    return jsonResponse(req, {
      error: 'Hubtel gateway is not configured.',
      missingConfiguration: [
        !HUBTEL_CLIENT_SECRET ? 'HUBTEL_CLIENT_SECRET or HUBTEL_API_KEY' : null,
      ].filter(Boolean),
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
      hasCallbackUrl: Boolean(payload.callbackUrl),
      hasReturnUrl: Boolean(payload.returnUrl),
      hasCancellationUrl: Boolean(payload.cancellationUrl),
    });

    const response = await fetch(HUBTEL_INITIATE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: createAuthHeader(),
      },
      body: JSON.stringify(hubtelPayload),
    });

    const parsed = await parseHubtelResponse(response);
    const checkout = extractCheckoutData(parsed.body);

    console.log('[Hubtel Initiate] Hubtel response summary:', {
      httpStatus: parsed.httpStatus,
      ok: parsed.ok,
      responseCode: parsed.body?.responseCode || parsed.body?.ResponseCode || null,
      status: parsed.body?.status || parsed.body?.Status || null,
      checkoutId: checkout.checkoutId,
      hasCheckoutUrl: Boolean(checkout.checkoutUrl),
      clientReference: checkout.clientReference || payload.clientReference,
    });

    return jsonResponse(req, parsed.body, parsed.httpStatus);
  } catch (error) {
    console.error('[Hubtel Initiate] Network or fetch error:', error);
    return jsonResponse(req, {
      error: 'Failed to reach Hubtel initiate API.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
