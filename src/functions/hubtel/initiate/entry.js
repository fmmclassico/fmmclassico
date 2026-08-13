import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function readEnv(name: string) {
  return String(Deno.env.get(name) || '').trim();
}

function sanitizeDescription(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function sanitizeClientReference(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim()
    .slice(0, 32);
}

function toAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Number(amount.toFixed(2));
}

function basicAuth(clientId: string, clientSecret: string) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const HUBTEL_CLIENT_ID = readEnv('HUBTEL_CLIENT_ID');
  const HUBTEL_CLIENT_SECRET = readEnv('HUBTEL_CLIENT_SECRET');
  const MERCHANT_ACCOUNT_NUMBER = readEnv('HUBTEL_MERCHANT_ACCOUNT_NUMBER');

  if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET || !MERCHANT_ACCOUNT_NUMBER) {
    return jsonResponse({ error: 'Hubtel gateway is not configured.' }, 500);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const totalAmount = toAmount(body.totalAmount);
  const description = sanitizeDescription(body.description || 'FMM CLASSICO checkout');
  const callbackUrl = String(body.callbackUrl || '').trim();
  const returnUrl = String(body.returnUrl || '').trim();
  const cancellationUrl = String(body.cancellationUrl || '').trim();
  const clientReference = sanitizeClientReference(body.clientReference || '');

  const missingFields = [
    totalAmount == null ? 'totalAmount' : null,
    !description ? 'description' : null,
    !callbackUrl ? 'callbackUrl' : null,
    !returnUrl ? 'returnUrl' : null,
    !cancellationUrl ? 'cancellationUrl' : null,
    !clientReference ? 'clientReference' : null,
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return jsonResponse({ error: 'Missing required fields.', missingFields }, 400);
  }

  const payload = {
    totalAmount,
    description,
    callbackUrl,
    returnUrl,
    merchantAccountNumber: MERCHANT_ACCOUNT_NUMBER,
    cancellationUrl,
    clientReference,
    ...(body.payeeName ? { payeeName: String(body.payeeName).trim().slice(0, 120) } : {}),
    ...(body.payeeMobileNumber ? { payeeMobileNumber: String(body.payeeMobileNumber).trim().slice(0, 20) } : {}),
    ...(body.payeeEmail ? { payeeEmail: String(body.payeeEmail).trim().slice(0, 120) } : {}),
  };

  const response = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuth(HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET),
    },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.error('[hubtel-initiate] network error', error);
    return null;
  });

  if (!response) {
    return jsonResponse({ error: 'Failed to reach Hubtel initiate API.' }, 502);
  }

  const raw = await response.text();
  let parsed: any = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = { error: 'Invalid JSON response from Hubtel', raw }; }

  return jsonResponse(parsed, response.status);
});
