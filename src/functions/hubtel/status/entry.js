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

function createBasicAuth(clientId, clientSecret) {
  return 'Basic ' + btoa(`${clientId}:${clientSecret}`);
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

  if (!clientReference) {
    return jsonResponse(req, { error: 'Missing clientReference parameter' }, 400);
  }

  const endpoint =
    `https://rmsc.hubtel.com/v1/merchantaccount/merchants/${MERCHANT_ACCOUNT_NUMBER}` +
    `/transactions/status?clientReference=${encodeURIComponent(clientReference)}`;

  const authHeader = createBasicAuth(HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET);

  console.log('[hubtel-status] Checking status for:', clientReference);
  console.log('[hubtel-status] Endpoint:', endpoint);

  try {
    const statusRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
    });

    const parsed = await parseHubtelResponse(statusRes);
    console.log('[hubtel-status] Status HTTP code:', parsed.status);
    console.log('[hubtel-status] Status response:', JSON.stringify(parsed.body));

    return jsonResponse(req, parsed.body, parsed.status);
  } catch (error) {
    console.error('[hubtel-status] Unexpected error:', error);
    return jsonResponse(req, {
      error: 'Failed to reach Hubtel status endpoint.',
      details: error instanceof Error ? error.message : String(error),
    }, 502);
  }
});
