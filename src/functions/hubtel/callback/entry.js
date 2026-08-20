import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim() || Deno.env.get('VITE_SUPABASE_URL')?.trim() || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')?.trim() || Deno.env.get('VITE_SUPABASE_ANON_KEY')?.trim() || '';
const ADMIN_EMAILS = [...new Set(
  (Deno.env.get('ADMIN_EMAILS')?.trim() || Deno.env.get('VITE_ADMIN_EMAILS')?.trim() || Deno.env.get('VITE_ALLOWED_ADMIN_EMAILS')?.trim() || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
)];

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

function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
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

function normalizeHubtelStatus({ responseCode = '', callbackStatus = '', transactionStatus = '' } = {}) {
  const normalizedResponseCode = String(responseCode || '').trim();
  const normalizedCallbackStatus = String(callbackStatus || '').toLowerCase().trim();
  const normalizedTransactionStatus = String(transactionStatus || '').toLowerCase().trim();
  const statusValue = normalizedTransactionStatus || normalizedCallbackStatus;

  if (['paid', 'success', 'successful', 'completed', 'complete', 'approved'].includes(statusValue)) return 'paid';
  if (!statusValue && normalizedResponseCode === '0000') return 'paid';
  if (['failed', 'unpaid', 'declined', 'reversed'].includes(statusValue)) return 'failed';
  if (['cancelled', 'canceled'].includes(statusValue)) return 'cancelled';
  return 'pending_payment';
}

function getHubtelEnvelope(body = {}) {
  const data = body?.Data || body?.data || {};
  return {
    responseCode: body?.ResponseCode ?? body?.responseCode ?? '',
    callbackStatus: body?.Status ?? body?.status ?? '',
    transactionStatus: data?.Status ?? data?.status ?? '',
    clientReference: data?.ClientReference ?? data?.clientReference ?? body?.clientReference ?? '',
    amount: Number(data?.Amount ?? data?.amount ?? body?.amount ?? 0) || 0,
    checkoutId: data?.CheckoutId ?? data?.checkoutId ?? body?.checkoutId ?? null,
    salesInvoiceId: data?.SalesInvoiceId ?? data?.salesInvoiceId ?? null,
    customerPhoneNumber: data?.CustomerPhoneNumber ?? data?.customerPhoneNumber ?? null,
    paymentDetails: data?.PaymentDetails ?? data?.paymentDetails ?? {},
  };
}

function getExpectedAmount(order, paymentStage) {
  const value = paymentStage === 'balance'
    ? Number(order?.balance_due ?? order?.balance_payment_amount ?? 0)
    : Number(order?.initial_payment_amount ?? order?.amount_paid_now ?? 0);

  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function toMinorUnits(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
}

function isAmountSatisfied(actualAmount, expectedAmount, tolerance = 0.01) {
  const actualMinor = toMinorUnits(actualAmount);
  const expectedMinor = toMinorUnits(expectedAmount);
  const toleranceMinor = Math.max(1, Math.round(Number(tolerance || 0) * 100));
  if (actualMinor === null || expectedMinor === null || expectedMinor <= 0) return false;
  return Math.abs(actualMinor - expectedMinor) <= toleranceMinor;
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

async function sendEmail(to, subject, body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !to) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ to, from_name: 'FMM CLASSICO', subject, body }),
    });
  } catch (error) {
    console.error('[Hubtel Callback] send-email failed:', error);
  }
}

async function createNotification(supabase, payload) {
  const { error } = await supabase.from('notifications').insert({
    ...payload,
    is_read: false,
    created_date: new Date().toISOString(),
  });

  if (error) {
    console.error('[Hubtel Callback] notification insert error:', error);
  }
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
    console.error('[Hubtel Callback] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse(req, { error: 'Server configuration is incomplete.' }, 500);
  }

  try {
    const body = await parseJsonBody(req);
    if (!body || typeof body !== 'object') {
      return jsonResponse(req, { error: 'Invalid JSON' }, 400);
    }

    const envelope = getHubtelEnvelope(body);
    const normalizedStatus = normalizeHubtelStatus(envelope);

    if (!envelope.clientReference || (!envelope.transactionStatus && !envelope.callbackStatus && !envelope.responseCode)) {
      console.warn('[Hubtel Callback] Missing clientReference or status information. Acknowledging without update.');
      return jsonResponse(req, { message: 'Partial data received' }, 200);
    }

    const baseReference = getBaseOrderReference(envelope.clientReference);
    const paymentStage = getPaymentStage(envelope.clientReference);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', baseReference)
      .maybeSingle();

    if (orderError) {
      console.error('[Hubtel Callback] order lookup error:', orderError);
      throw orderError;
    }

    if (!order) {
      console.warn(`[Hubtel Callback] No order found for ${baseReference}`);
      return jsonResponse(req, { message: 'No order found' }, 200);
    }

    const now = new Date().toISOString();
    const expectedAmount = getExpectedAmount(order, paymentStage);
    const amountVerified = normalizedStatus === 'paid' && isAmountSatisfied(envelope.amount, expectedAmount);
    const stageLabel = paymentStage === 'balance' ? 'Balance Payment' : 'Initial Payment';
    const trackingUpdates = Array.isArray(order.tracking_updates) ? order.tracking_updates : [];
    const paymentType = envelope.paymentDetails?.PaymentType || 'N/A';
    const paymentChannel = envelope.paymentDetails?.Channel || 'N/A';

    const trackingStatus = normalizedStatus === 'paid'
      ? amountVerified
        ? `${stageLabel} Confirmed`
        : `${stageLabel} Amount Review`
      : normalizedStatus === 'failed'
        ? `${stageLabel} Failed`
        : normalizedStatus === 'cancelled'
          ? `${stageLabel} Cancelled`
          : `${stageLabel} Pending`;

    const trackingUpdate = {
      status: trackingStatus,
      message: normalizedStatus === 'paid' && !amountVerified
        ? `${stageLabel} reached the payment gateway, but the amount needs review. Expected GHS ${expectedAmount.toFixed(2)} and received GHS ${envelope.amount.toFixed(2)}. Type ${paymentType}. Channel ${paymentChannel}.`
        : `Payment confirmation received for ${stageLabel.toLowerCase()}. Expected GHS ${expectedAmount.toFixed(2)} and received GHS ${envelope.amount.toFixed(2)}. Type ${paymentType}. Channel ${paymentChannel}.`,
      timestamp: now,
      checkoutId: envelope.checkoutId,
      clientReference: envelope.clientReference,
      responseCode: envelope.responseCode || null,
      callbackStatus: envelope.callbackStatus || null,
      transactionStatus: envelope.transactionStatus || null,
      salesInvoiceId: envelope.salesInvoiceId || null,
      amount: envelope.amount,
      expectedAmount,
      paymentType,
      paymentChannel,
    };

    const updates = {
      tracking_updates: [...trackingUpdates, trackingUpdate],
      payment_reference: envelope.clientReference,
      hubtel_transaction_id: envelope.checkoutId || order.hubtel_transaction_id || null,
      hubtel_status: amountVerified
        ? 'successful'
        : normalizedStatus === 'cancelled'
          ? 'cancelled'
          : normalizedStatus === 'failed'
            ? 'failed'
            : 'pending',
    };

    let notifyCustomer = false;
    let notifyAdmins = false;
    let customerTitle = '';
    let customerMessage = '';
    let customerEmailSubject = '';
    let adminTitle = '';
    let adminMessage = '';
    let adminEmailSubject = '';

    if (paymentStage === 'balance') {
      updates.balance_checkout_id = envelope.checkoutId || order.balance_checkout_id || null;
      updates.balance_payment_reference = envelope.clientReference;

      if (amountVerified) {
        const firstTimeSuccess = order.balance_payment_status !== 'paid';
        updates.balance_payment_status = 'paid';
        updates.remaining_balance_paid = true;
        updates.remaining_balance_paid_at = now;
        updates.balance_payment_verified_amount = envelope.amount;
        updates.balance_paid_at = now;
        updates.is_fully_paid = true;
        updates.payment_stage = 'fully_paid';
        updates.payment_status = 'paid';
        updates.status = order.status === 'cancelled' ? order.status : 'confirmed';

        if (firstTimeSuccess) {
          notifyCustomer = true;
          notifyAdmins = true;
          customerTitle = 'Remaining Balance Paid';
          customerMessage = `Order #${order.order_number} is now fully paid.`;
          customerEmailSubject = `Remaining Balance Paid - #${order.order_number}`;
          adminTitle = 'Remaining Balance Paid';
          adminMessage = `Order #${order.order_number} by ${order.customer_name} is now fully paid.`;
          adminEmailSubject = `Remaining Balance Paid - #${order.order_number}`;
        }
      } else if (normalizedStatus === 'paid' && !amountVerified) {
        // A paid callback with an amount mismatch is not a failed payment. Keep it
        // pending for review so a real payment is not incorrectly blocked.
        updates.balance_payment_status = 'pending';
        updates.payment_stage = 'awaiting_balance_payment';
        adminTitle = 'Balance Payment Amount Review';
        adminMessage = `Order #${order.order_number} reported a balance payment of GHS ${envelope.amount.toFixed(2)} but expected GHS ${expectedAmount.toFixed(2)}.`;
        adminEmailSubject = `Balance Payment Amount Mismatch - #${order.order_number}`;
        notifyAdmins = true;
      } else if (normalizedStatus === 'failed') {
        updates.balance_payment_status = 'failed';
        updates.payment_stage = 'balance_payment_failed';
      } else if (normalizedStatus === 'cancelled') {
        updates.balance_payment_status = 'cancelled';
        updates.payment_stage = 'balance_payment_failed';
      }
    } else {
      updates.initial_checkout_id = envelope.checkoutId || order.initial_checkout_id || null;
      updates.initial_payment_reference = envelope.clientReference;

      if (amountVerified) {
        const balanceDue = Number(order.balance_due || 0);
        const firstTimeSuccess = order.initial_payment_status !== 'paid';
        updates.payment_status = 'paid';
        updates.initial_payment_status = 'paid';
        updates.initial_payment_verified_amount = envelope.amount;
        updates.initial_paid_at = now;
        updates.payment_stage = balanceDue > 0 ? 'initial_payment_paid' : 'fully_paid';
        updates.balance_payment_status = balanceDue > 0 ? order.balance_payment_status || 'pending' : 'not_required';
        updates.is_fully_paid = balanceDue <= 0;
        updates.status = order.status === 'cancelled' ? order.status : 'confirmed';

        if (balanceDue <= 0) {
          updates.remaining_balance_paid = true;
          updates.remaining_balance_paid_at = now;
        }

        if (firstTimeSuccess) {
          notifyCustomer = true;
          notifyAdmins = true;
          customerTitle = balanceDue > 0 ? 'Initial Payment Confirmed' : 'Payment Confirmed';
          customerMessage = balanceDue > 0
            ? `Your first payment for order #${order.order_number} has been confirmed. The remaining balance will appear on your Orders page when the order is ready for the next payment step.`
            : `Payment for order #${order.order_number} has been confirmed.`;
          customerEmailSubject = `${customerTitle} - #${order.order_number}`;
          adminTitle = 'Payment Received';
          adminMessage = `Verified successful payment for order #${order.order_number} by ${order.customer_name}.`;
          adminEmailSubject = `Payment Received - #${order.order_number}`;
        }
      } else if (normalizedStatus === 'paid' && !amountVerified) {
        // Do not turn a real gateway payment into a failed order merely because
        // the callback amount needs review. The order remains visible and retryable.
        updates.payment_status = 'pending_payment';
        updates.initial_payment_status = 'pending';
        updates.payment_stage = 'awaiting_initial_payment';
        customerTitle = 'Payment Verification Required';
        customerMessage = `We received a payment update for order #${order.order_number}, but the amount still needs manual review. The order remains open while the payment is checked.`;
        customerEmailSubject = `Payment Verification Required - #${order.order_number}`;
        adminTitle = 'Initial Payment Amount Review';
        adminMessage = `Order #${order.order_number} reported an initial payment of GHS ${envelope.amount.toFixed(2)} but expected GHS ${expectedAmount.toFixed(2)}.`;
        adminEmailSubject = `Initial Payment Amount Mismatch - #${order.order_number}`;
        notifyCustomer = true;
        notifyAdmins = true;
      } else if (normalizedStatus === 'failed') {
        updates.payment_status = 'failed';
        updates.initial_payment_status = 'failed';
        updates.payment_stage = 'awaiting_initial_payment';
      } else if (normalizedStatus === 'cancelled') {
        updates.payment_status = 'cancelled';
        updates.initial_payment_status = 'cancelled';
        updates.payment_stage = 'awaiting_initial_payment';
      }
    }

    const { error: updateError } = await supabase.from('orders').update(updates).eq('id', order.id);
    if (updateError) {
      console.error('[Hubtel Callback] order update error:', updateError);
      throw updateError;
    }

    if (notifyCustomer) {
      await createNotification(supabase, {
        user_email: order.customer_email,
        title: customerTitle,
        message: customerMessage,
        type: normalizedStatus === 'paid' && amountVerified ? 'payment_confirmed' : 'general',
        order_id: order.id,
        order_number: order.order_number,
      });
      await sendEmail(order.customer_email, customerEmailSubject || customerTitle, `Hi ${order.customer_name},

${customerMessage}

FMM CLASSICO`);
    }

    if (notifyAdmins) {
      for (const email of ADMIN_EMAILS) {
        await createNotification(supabase, {
          user_email: email,
          title: adminTitle,
          message: adminMessage,
          type: amountVerified ? 'payment_confirmed' : 'general',
          order_id: order.id,
          order_number: order.order_number,
        });
        await sendEmail(email, adminEmailSubject || adminTitle, adminMessage);
      }
    }

    return jsonResponse(req, {
      success: true,
      paymentStage,
      normalizedStatus,
      expectedAmount,
      receivedAmount: envelope.amount,
      amountVerified,
      baseReference,
    });
  } catch (error) {
    console.error('[Hubtel Callback] fatal error:', error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : 'Server error' }, 500);
  }
});
