import { createClient } from 'npm:@supabase/supabase-js@2';

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

function readEnv(...names) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return '';
}

function createSupabaseAdminClient() {
  const url = readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBaseOrderReference(reference = '') {
  return String(reference || '').replace(/-(INIT|DEL|FULL|BAL)$/i, '');
}

function getPaymentStage(reference = '') {
  const normalized = String(reference || '').toUpperCase();
  return normalized.endsWith('-BAL') ? 'balance' : 'initial';
}

function getLatestTracking(order) {
  const updates = Array.isArray(order?.tracking_updates) ? order.tracking_updates : [];
  return updates.length ? updates[updates.length - 1] : null;
}

function isPaid(order, paymentStage) {
  if (paymentStage === 'balance') {
    return order?.balance_payment_status === 'paid' || order?.payment_stage === 'fully_paid';
  }
  return order?.initial_payment_status === 'paid' || order?.payment_stage === 'initial_payment_paid' || order?.payment_stage === 'fully_paid';
}

function isFailed(order, paymentStage) {
  if (paymentStage === 'balance') {
    return ['failed', 'cancelled'].includes(String(order?.balance_payment_status || '').toLowerCase());
  }
  return ['failed', 'cancelled'].includes(String(order?.initial_payment_status || '').toLowerCase());
}

async function callHubtelStatus(clientReference) {
  const clientId = readEnv('HUBTEL_CLIENT_ID');
  const clientSecret = readEnv('HUBTEL_CLIENT_SECRET');
  const merchantAccountNumber = readEnv('HUBTEL_MERCHANT_ACCOUNT_NUMBER');

  if (!clientId || !clientSecret || !merchantAccountNumber) {
    return { ok: false, status: 500, body: { error: 'Hubtel gateway is not configured.' } };
  }

  const endpoint =
    `https://rmsc.hubtel.com/v1/merchantaccount/merchants/${merchantAccountNumber}` +
    `/transactions/status?clientReference=${encodeURIComponent(clientReference)}`;

  const authHeader = 'Basic ' + btoa(`${clientId}:${clientSecret}`);

  console.log('[hubtel-reconcile-return] Calling Hubtel fallback status for:', clientReference);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
    });

    const raw = await response.text();
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = { error: 'Invalid response from Hubtel', raw };
    }

    return { ok: response.ok, status: response.status, body: parsed };
  } catch (error) {
    console.error('[hubtel-reconcile-return] Hubtel fallback status error:', error);
    return {
      ok: false,
      status: 502,
      body: {
        error: 'Failed to reach Hubtel status endpoint.',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function normalizeStatusResult(body = {}) {
  const data = body?.data || body?.Data || body || {};
  const responseCode = String(body?.responseCode || body?.ResponseCode || '').trim();
  const status = String(data?.status || data?.Status || body?.status || body?.Status || '').toLowerCase().trim();
  const amount = Number(data?.amount ?? data?.Amount ?? 0) || 0;
  const transactionId = data?.transactionId || data?.TransactionId || null;
  const externalTransactionId = data?.externalTransactionId || data?.ExternalTransactionId || data?.networkTransactionId || data?.NetworkTransactionId || null;
  const paymentMethod = data?.paymentMethod || data?.PaymentMethod || null;

  return {
    responseCode,
    status,
    amount,
    transactionId,
    externalTransactionId,
    paymentMethod,
    clientReference: data?.clientReference || data?.ClientReference || '',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: createCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return jsonResponse(req, { error: 'Server configuration is incomplete.' }, 500);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonResponse(req, { error: 'Invalid JSON body.' }, 400);
    }

    const clientReference = String(body.clientReference || '').trim();
    if (!clientReference) {
      return jsonResponse(req, { error: 'Missing clientReference' }, 400);
    }

    const baseReference = getBaseOrderReference(clientReference);
    const paymentStage = getPaymentStage(clientReference);

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', baseReference)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      console.warn('[hubtel-reconcile-return] Order not found for:', baseReference);
      return jsonResponse(req, { state: 'not_found' }, 404);
    }

    const latestTracking = getLatestTracking(order);

    if (isPaid(order, paymentStage)) {
      console.log('[hubtel-reconcile-return] Payment already confirmed from callback/order state:', clientReference);
      return jsonResponse(req, {
        state: 'paid',
        source: 'callback_or_order_state',
        paymentStage,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status || null,
        initialPaymentStatus: order.initial_payment_status || null,
        balancePaymentStatus: order.balance_payment_status || null,
        paymentStageState: order.payment_stage || null,
        hubtelStatus: order.hubtel_status || null,
        latestTracking,
      }, 200);
    }

    if (isFailed(order, paymentStage)) {
      console.log('[hubtel-reconcile-return] Payment already marked failed/cancelled:', clientReference);
      return jsonResponse(req, {
        state: 'failed',
        source: 'callback_or_order_state',
        paymentStage,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status || null,
        initialPaymentStatus: order.initial_payment_status || null,
        balancePaymentStatus: order.balance_payment_status || null,
        paymentStageState: order.payment_stage || null,
        hubtelStatus: order.hubtel_status || null,
        latestTracking,
      }, 200);
    }

    const orderCreatedAt = order.created_date || order.created_at || null;
    const ageMs = orderCreatedAt ? (Date.now() - new Date(orderCreatedAt).getTime()) : 0;

    // Fast path: for the first 5 minutes, trust callback/order state first.
    // Do not force Hubtel status-check yet.
    if (ageMs < 5 * 60 * 1000) {
      console.log('[hubtel-reconcile-return] Waiting for callback/order update:', {
        clientReference,
        ageMs,
        paymentStage,
      });

      return jsonResponse(req, {
        state: 'pending_callback',
        source: 'order_state_wait',
        paymentStage,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: order.payment_status || null,
        initialPaymentStatus: order.initial_payment_status || null,
        balancePaymentStatus: order.balance_payment_status || null,
        paymentStageState: order.payment_stage || null,
        hubtelStatus: order.hubtel_status || null,
        latestTracking,
      }, 200);
    }

    // Fallback after 5 minutes only
    const statusResult = await callHubtelStatus(clientReference);
    const normalized = normalizeStatusResult(statusResult.body || {});

    console.log('[hubtel-reconcile-return] Hubtel fallback status response:', normalized);

    return jsonResponse(req, {
      state: normalized.responseCode === '0000' && normalized.status === 'paid' ? 'paid_from_status_fallback' : 'pending_or_unknown',
      source: 'hubtel_status_fallback',
      paymentStage,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status || null,
      initialPaymentStatus: order.initial_payment_status || null,
      balancePaymentStatus: order.balance_payment_status || null,
      paymentStageState: order.payment_stage || null,
      hubtelStatus: order.hubtel_status || null,
      latestTracking,
      hubtelStatusResult: normalized,
      rawHubtelStatusBody: statusResult.body || null,
    }, 200);
  } catch (error) {
    console.error('[hubtel-reconcile-return] fatal error:', error);
    return jsonResponse(req, {
      error: error instanceof Error ? error.message : 'Server error',
    }, 500);
  }
});
