const HUBTEL_CLIENT_ID = process.env.HUBTEL_CLIENT_ID || '';
const HUBTEL_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET || '';
const MERCHANT_ACCOUNT_NUMBER = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';

const UAT_INIT_SAMPLES = [];
const MAX_SAMPLES = 50;

function isConfigured() {
  return Boolean(HUBTEL_CLIENT_ID && HUBTEL_CLIENT_SECRET && MERCHANT_ACCOUNT_NUMBER);
}

function createAuthHeader() {
  const auth = Buffer.from(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`).toString('base64');
  return `Basic ${auth}`;
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
    if (typeof req.json === 'function') {
      return await req.json();
    }
    if (req.body && typeof req.body === 'object') {
      return req.body;
    }
    const raw = await getRawBody(req);
    return raw ? JSON.parse(raw) : null;
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isConfigured()) {
    console.error('[Hubtel Init] Missing HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, or HUBTEL_MERCHANT_ACCOUNT_NUMBER');
    res.status(500).json({ error: 'Hubtel gateway is not configured.' });
    return;
  }

  const body = await parseJsonBody(req);
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Missing or invalid request body.' });
    return;
  }

  const { payload, missingFields } = buildPayload(body);
  if (missingFields.length > 0) {
    console.warn('[Hubtel Init] Validation failed:', { missingFields, receivedKeys: Object.keys(body || {}) });
    res.status(400).json({
      error: 'Missing or invalid required fields.',
      missingFields,
    });
    return;
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

    res.status(parsed.httpStatus).json(parsed.body);
  } catch (error) {
    console.error('[Hubtel Init] Network or fetch error:', error);
    res.status(502).json({
      error: 'Failed to reach Hubtel.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
