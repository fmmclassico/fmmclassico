import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_STATUS_POLL_ATTEMPTS = 12;
const STATUS_POLL_INTERVAL_MS = 2500;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBaseOrderReference(reference = '') {
  return String(reference || '').replace(/-(INIT|DEL|FULL|BAL)$/i, '');
}

function getPaymentStage(reference = '') {
  return String(reference || '').toUpperCase().endsWith('-BAL')
    ? 'balance'
    : 'initial';
}

function getLatestTracking(order) {
  const updates = Array.isArray(order?.tracking_updates)
    ? order.tracking_updates
    : [];

  return updates.length ? updates[updates.length - 1] : null;
}

function getExpectedAmount(order, paymentStage) {
  const value = paymentStage === 'balance'
    ? Number(order?.balance_due ?? order?.balance_payment_amount ?? 0)
    : Number(order?.initial_payment_amount ?? order?.amount_paid_now ?? 0);

  return Number.isFinite(value)
    ? Number(value.toFixed(2))
    : 0;
}

function toMinorUnits(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
}

function isAmountSatisfied(actualAmount, expectedAmount, tolerance = 0.01) {
  const actualMinor = toMinorUnits(actualAmount);
  const expectedMinor = toMinorUnits(expectedAmount);
  const toleranceMinor = Math.max(1, Math.round(Number(tolerance || 0) * 100));

  if (actualMinor === null || expectedMinor === null || expectedMinor <= 0) {
    return false;
  }

  return Math.abs(actualMinor - expectedMinor) <= toleranceMinor;
}

function isPaid(order, paymentStage) {
  if (paymentStage === 'balance') {
    return order?.balance_payment_status === 'paid' || order?.payment_stage === 'fully_paid';
  }

  return order?.initial_payment_status === 'paid'
    || order?.payment_stage === 'initial_payment_paid'
    || order?.payment_stage === 'fully_paid';
}

function isFailed(order, paymentStage) {
  if (paymentStage === 'balance') {
    return ['failed', 'cancelled'].includes(String(order?.balance_payment_status || '').toLowerCase());
  }

  return ['failed', 'cancelled'].includes(String(order?.initial_payment_status || '').toLowerCase());
}

function toNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return value;
    }
  }
  return '';
}

function normalizeHubtelStatusValue(rawStatus = '', responseCode = '', responseMessage = '') {
  const status = String(rawStatus || '').toLowerCase().trim();
  const code = String(responseCode || '').trim();
  const message = String(responseMessage || '').toLowerCase().trim();

  if (['paid', 'success', 'successful', 'completed', 'complete', 'approved'].includes(status)) {
    return 'paid';
  }

  if (['failed', 'declined', 'reversed', 'unpaid'].includes(status)) {
    return 'failed';
  }

  if (['cancelled', 'canceled'].includes(status)) {
    return 'cancelled';
  }

  if (['pending', 'processing', 'initiated', 'queued'].includes(status)) {
    return 'pending_payment';
  }

  if (!status && code === '0000' && (message.includes('success') || message.includes('complete') || message.includes('paid'))) {
    return 'paid';
  }

  if (message.includes('cancel')) {
    return 'cancelled';
  }

  if (message.includes('fail') || message.includes('declin') || message.includes('unpaid')) {
    return 'failed';
  }

  return status || 'unknown';
}

function normalizeStatusResult(body = {}) {
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

  const normalizedStatus = normalizeHubtelStatusValue(rawStatus, responseCode, responseMessage);

  return {
    responseCode,
    responseMessage,
    rawStatus,
    normalizedStatus,
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
    clientReference: String(
      pickFirst(
        data?.clientReference,
        data?.ClientReference,
        body?.clientReference,
        body?.ClientReference,
      ) || '',
    ).trim(),
  };
}

async function callHubtelStatus(clientReference) {
  const clientId = readEnv('HUBTEL_CLIENT_ID');
  const clientSecret = readEnv('HUBTEL_CLIENT_SECRET');
  const merchantAccountNumber = readEnv('HUBTEL_MERCHANT_ACCOUNT_NUMBER');

  if (!clientId || !clientSecret || !merchantAccountNumber) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Payment gateway is not configured.' },
    };
  }

  const endpoint =
    `https://rmsc.hubtel.com/v1/merchantaccount/merchants/${merchantAccountNumber}` +
    `/transactions/status?clientReference=${encodeURIComponent(clientReference)}`;

  console.log('[hubtel-reconcile-return] Checking Hubtel status for:', clientReference);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
    });

    const raw = await response.text();
    let parsed = {};

    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = { error: 'Invalid response from Hubtel', raw };
    }

    return {
      ok: response.ok,
      status: response.status,
      body: parsed,
    };
  } catch (error) {
    console.error('[hubtel-reconcile-return] Hubtel status fetch failed:', error);

    return {
      ok: false,
      status: 502,
      body: {
        error: 'Failed to reach the payment status endpoint.',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function buildTrackingUpdate({ paymentStage, normalizedStatus, amountVerified, expectedAmount, receivedAmount, clientReference, paymentMethod }) {
  const stageLabel = paymentStage === 'balance' ? 'Balance Payment' : 'Initial Payment';
  const statusLabel = normalizedStatus === 'paid' && amountVerified
    ? 'Payment Confirmed'
    : normalizedStatus === 'paid'
      ? 'Payment Amount Mismatch'
      : normalizedStatus === 'failed'
        ? 'Payment Failed'
        : normalizedStatus === 'cancelled'
          ? 'Payment Cancelled'
          : 'Payment Still Pending';

  const message = normalizedStatus === 'paid' && amountVerified
    ? `${stageLabel} verified from the payment gateway. Expected GHS ${expectedAmount.toFixed(2)} and received GHS ${receivedAmount.toFixed(2)}.`
    : normalizedStatus === 'paid'
      ? `${stageLabel} reached the payment gateway, but the amount did not match. Expected GHS ${expectedAmount.toFixed(2)} and received GHS ${receivedAmount.toFixed(2)}.`
      : normalizedStatus === 'failed'
        ? `${stageLabel} was marked failed by the payment gateway.`
        : normalizedStatus === 'cancelled'
          ? `${stageLabel} was cancelled on the payment gateway.`
          : `${stageLabel} is still pending on the payment gateway.`;

  return {
    status: statusLabel,
    message,
    timestamp: new Date().toISOString(),
    clientReference,
    paymentMethod: paymentMethod || null,
  };
}

async function applyStatusToOrder(supabase, order, paymentStage, clientReference, normalized) {
  const now = new Date().toISOString();
  const expectedAmount = getExpectedAmount(order, paymentStage);
  const amountVerified = normalized.normalizedStatus === 'paid'
    ? isAmountSatisfied(normalized.amount, expectedAmount)
    : false;

  const trackingUpdates = Array.isArray(order?.tracking_updates)
    ? order.tracking_updates
    : [];

  const trackingUpdate = buildTrackingUpdate({
    paymentStage,
    normalizedStatus: normalized.normalizedStatus,
    amountVerified,
    expectedAmount,
    receivedAmount: normalized.amount,
    clientReference,
    paymentMethod: normalized.paymentMethod,
  });

  const updates = {
    tracking_updates: [...trackingUpdates, trackingUpdate],
    payment_reference: clientReference,
    hubtel_transaction_id: normalized.transactionId || order.hubtel_transaction_id || null,
    hubtel_status: amountVerified
      ? 'successful'
      : normalized.normalizedStatus === 'cancelled'
        ? 'cancelled'
        : normalized.normalizedStatus === 'failed'
          ? 'failed'
          : normalized.normalizedStatus === 'paid'
            ? 'failed'
            : 'pending',
  };

  if (paymentStage === 'balance') {
    updates.balance_payment_reference = clientReference;

    if (amountVerified) {
      updates.balance_payment_status = 'paid';
      updates.remaining_balance_paid = true;
      updates.remaining_balance_paid_at = now;
      updates.balance_payment_verified_amount = normalized.amount;
      updates.balance_paid_at = now;
      updates.is_fully_paid = true;
      updates.payment_stage = 'fully_paid';
      updates.payment_status = 'paid';
      updates.status = order.status === 'cancelled' ? order.status : 'confirmed';
    } else if (normalized.normalizedStatus === 'paid') {
      updates.balance_payment_status = 'failed';
      updates.payment_stage = 'balance_payment_failed';
    } else if (normalized.normalizedStatus === 'failed') {
      updates.balance_payment_status = 'failed';
      updates.payment_stage = 'balance_payment_failed';
    } else if (normalized.normalizedStatus === 'cancelled') {
      updates.balance_payment_status = 'cancelled';
      updates.payment_stage = 'balance_payment_failed';
    }
  } else {
    updates.initial_payment_reference = clientReference;

    if (amountVerified) {
      const balanceDue = Number(order.balance_due || 0);
      updates.payment_status = 'paid';
      updates.initial_payment_status = 'paid';
      updates.initial_payment_verified_amount = normalized.amount;
      updates.initial_paid_at = now;
      updates.payment_stage = balanceDue > 0 ? 'initial_payment_paid' : 'fully_paid';
      updates.balance_payment_status = balanceDue > 0 ? order.balance_payment_status || 'pending' : 'not_required';
      updates.is_fully_paid = balanceDue <= 0;
      updates.status = order.status === 'cancelled' ? order.status : 'confirmed';

      if (balanceDue <= 0) {
        updates.remaining_balance_paid = true;
        updates.remaining_balance_paid_at = now;
      }
    } else if (normalized.normalizedStatus === 'paid') {
      updates.payment_status = 'failed';
      updates.initial_payment_status = 'failed';
      updates.payment_stage = 'awaiting_initial_payment';
    } else if (normalized.normalizedStatus === 'failed') {
      updates.payment_status = 'failed';
      updates.initial_payment_status = 'failed';
      updates.payment_stage = 'awaiting_initial_payment';
    } else if (normalized.normalizedStatus === 'cancelled') {
      updates.payment_status = 'cancelled';
      updates.initial_payment_status = 'cancelled';
      updates.payment_stage = 'awaiting_initial_payment';
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', order.id);

  if (updateError) throw updateError;

  return {
    updatedState: amountVerified
      ? 'paid_from_status_fallback'
      : ['failed', 'cancelled'].includes(normalized.normalizedStatus) || normalized.normalizedStatus === 'paid'
        ? 'failed'
        : 'pending_or_unknown',
    latestTracking: trackingUpdate,
    expectedAmount,
    amountVerified,
    updates,
  };
}

async function getOrderByReference(supabase, baseReference) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', baseReference)
    .maybeSingle();

  if (error) throw error;

  return order;
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

    for (let attempt = 1; attempt <= MAX_STATUS_POLL_ATTEMPTS; attempt += 1) {
      const order = await getOrderByReference(supabase, baseReference);

      if (!order) {
        console.warn('[hubtel-reconcile-return] Order not found for:', baseReference);
        return jsonResponse(req, { state: 'not_found' }, 404);
      }

      if (isPaid(order, paymentStage)) {
        return jsonResponse(req, {
          state: 'paid',
          source: 'callback_or_order_state',
          paymentStage,
          attempt,
          orderId: order.id,
          orderNumber: order.order_number,
          paymentStatus: order.payment_status || null,
          initialPaymentStatus: order.initial_payment_status || null,
          balancePaymentStatus: order.balance_payment_status || null,
          paymentStageState: order.payment_stage || null,
          hubtelStatus: order.hubtel_status || null,
          latestTracking: getLatestTracking(order),
        }, 200);
      }

      if (isFailed(order, paymentStage)) {
        return jsonResponse(req, {
          state: 'failed',
          source: 'callback_or_order_state',
          paymentStage,
          attempt,
          orderId: order.id,
          orderNumber: order.order_number,
          paymentStatus: order.payment_status || null,
          initialPaymentStatus: order.initial_payment_status || null,
          balancePaymentStatus: order.balance_payment_status || null,
          paymentStageState: order.payment_stage || null,
          hubtelStatus: order.hubtel_status || null,
          latestTracking: getLatestTracking(order),
        }, 200);
      }

      const statusResult = await callHubtelStatus(clientReference);
      const normalized = normalizeStatusResult(statusResult.body || {});

      console.log('[hubtel-reconcile-return] Poll attempt:', attempt, JSON.stringify({
        clientReference,
        paymentStage,
        statusHttpCode: statusResult.status,
        responseCode: normalized.responseCode,
        rawStatus: normalized.rawStatus,
        normalizedStatus: normalized.normalizedStatus,
        amount: normalized.amount,
      }));

      if (['paid', 'failed', 'cancelled'].includes(normalized.normalizedStatus)) {
        const applied = await applyStatusToOrder(
          supabase,
          order,
          paymentStage,
          clientReference,
          normalized,
        );

        return jsonResponse(req, {
          state: applied.updatedState,
          source: 'hubtel_status_fallback',
          paymentStage,
          attempt,
          orderId: order.id,
          orderNumber: order.order_number,
          paymentStatus: applied.updates.payment_status ?? order.payment_status ?? null,
          initialPaymentStatus: applied.updates.initial_payment_status ?? order.initial_payment_status ?? null,
          balancePaymentStatus: applied.updates.balance_payment_status ?? order.balance_payment_status ?? null,
          paymentStageState: applied.updates.payment_stage ?? order.payment_stage ?? null,
          hubtelStatus: applied.updates.hubtel_status ?? order.hubtel_status ?? null,
          latestTracking: applied.latestTracking,
          expectedAmount: applied.expectedAmount,
          amountVerified: applied.amountVerified,
          hubtelStatusResult: normalized,
          rawHubtelStatusBody: statusResult.body || null,
        }, 200);
      }

      if (attempt < MAX_STATUS_POLL_ATTEMPTS) {
        await sleep(STATUS_POLL_INTERVAL_MS);
      }
    }

    const finalOrder = await getOrderByReference(supabase, baseReference);

    return jsonResponse(req, {
      state: 'pending_or_unknown',
      source: 'hubtel_status_fallback',
      paymentStage,
      attempt: MAX_STATUS_POLL_ATTEMPTS,
      orderId: finalOrder?.id || null,
      orderNumber: finalOrder?.order_number || baseReference,
      paymentStatus: finalOrder?.payment_status || null,
      initialPaymentStatus: finalOrder?.initial_payment_status || null,
      balancePaymentStatus: finalOrder?.balance_payment_status || null,
      paymentStageState: finalOrder?.payment_stage || null,
      hubtelStatus: finalOrder?.hubtel_status || null,
      latestTracking: getLatestTracking(finalOrder),
    }, 200);
  } catch (error) {
    console.error('[hubtel-reconcile-return] fatal error:', error);
    return jsonResponse(req, {
      error: error instanceof Error ? error.message : 'Server error',
    }, 500);
  }
});
