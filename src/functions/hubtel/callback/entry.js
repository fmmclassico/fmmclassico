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

function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBaseOrderReference(reference = '') {
  return String(reference || '').replace(/-(INIT|DEL|FULL|BAL)$/i, '');
}

function getPaymentStage(reference = '') {
  const normalized = String(reference || '').toUpperCase();
  if (normalized.endsWith('-BAL')) return 'balance';
  return 'initial';
}

function normalizeHubtelStatus({ responseCode = '', callbackStatus = '', transactionStatus = '' } = {}) {
  const normalizedResponseCode = String(responseCode || '').trim();
  const normalizedCallbackStatus = String(callbackStatus || '').toLowerCase().trim();
  const normalizedTransactionStatus = String(transactionStatus || '').toLowerCase().trim();
  const statusValue = normalizedTransactionStatus || normalizedCallbackStatus;

  if (normalizedResponseCode === '0000' || ['success', 'successful', 'paid'].includes(statusValue)) return 'paid';
  if (['failed', 'unpaid'].includes(statusValue)) return 'failed';
  if (['cancelled', 'canceled'].includes(statusValue)) return 'cancelled';
  if (normalizedResponseCode === '0005') return 'pending_payment';
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
    description: data?.Description ?? data?.description ?? '',
  };
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
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    console.error('[Hubtel Callback] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse({ error: 'Server configuration is incomplete.' }, 500);
  }

  try {
    const body = await parseJsonBody(req);

    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }

    console.log('[Hubtel Callback] Raw payload:', JSON.stringify(body));

    const envelope = getHubtelEnvelope(body);
    const normalizedStatus = normalizeHubtelStatus(envelope);

    console.log('[Hubtel Callback] Normalized event:', {
      responseCode: envelope.responseCode || null,
      callbackStatus: envelope.callbackStatus || null,
      transactionStatus: envelope.transactionStatus || null,
      normalizedStatus,
      clientReference: envelope.clientReference || null,
      checkoutId: envelope.checkoutId || null,
      salesInvoiceId: envelope.salesInvoiceId || null,
      amount: envelope.amount,
      paymentType: envelope.paymentDetails?.PaymentType || null,
      channel: envelope.paymentDetails?.Channel || null,
      customerPhoneNumber: envelope.customerPhoneNumber || null,
    });

    if (!envelope.clientReference || (!envelope.transactionStatus && !envelope.callbackStatus && !envelope.responseCode)) {
      console.warn('[Hubtel Callback] Missing clientReference or status information. Acknowledging without update.');
      return jsonResponse({ message: 'Partial data received' }, 200);
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
      return jsonResponse({ message: 'No order found' }, 200);
    }

    const now = new Date().toISOString();
    const stageLabel = paymentStage === 'balance' ? 'Balance Payment' : 'Initial Payment';
    const trackingUpdates = Array.isArray(order.tracking_updates) ? order.tracking_updates : [];
    const paymentType = envelope.paymentDetails?.PaymentType || 'N/A';
    const paymentChannel = envelope.paymentDetails?.Channel || 'N/A';
    const networkReference = envelope.paymentDetails?.MobileMoneyNumber || envelope.customerPhoneNumber || 'N/A';

    const trackingUpdate = {
      status: `${stageLabel} ${normalizedStatus}`,
      message: `Hubtel ${stageLabel.toLowerCase()} callback: ${normalizedStatus}. ResponseCode ${envelope.responseCode || 'N/A'}. Amount GHS ${envelope.amount.toFixed(2)}. Type ${paymentType}. Channel ${paymentChannel}. Ref ${networkReference}.`,
      timestamp: now,
      checkoutId: envelope.checkoutId,
      clientReference: envelope.clientReference,
      responseCode: envelope.responseCode || null,
      callbackStatus: envelope.callbackStatus || null,
      transactionStatus: envelope.transactionStatus || null,
      salesInvoiceId: envelope.salesInvoiceId || null,
    };

    /** @type {Record<string, any>} */
    const updates = {
      tracking_updates: [...trackingUpdates, trackingUpdate],
      payment_reference: envelope.clientReference,
      hubtel_transaction_id: envelope.checkoutId || order.hubtel_transaction_id || null,
      hubtel_status: normalizedStatus === 'paid'
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

      if (normalizedStatus === 'paid') {
        const firstTimeSuccess = order.balance_payment_status !== 'paid';
        updates.balance_payment_status = 'paid';
        updates.remaining_balance_paid = true;
        updates.remaining_balance_paid_at = now;
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
      } else if (normalizedStatus === 'failed') {
        updates.balance_payment_status = 'failed';
        updates.payment_stage = 'balance_payment_failed';
        notifyCustomer = order.balance_payment_status !== 'failed';
        customerTitle = 'Remaining Balance Payment Failed';
        customerMessage = `Remaining balance payment failed for order #${order.order_number}.`;
        customerEmailSubject = `Remaining Balance Payment Failed - #${order.order_number}`;
      } else if (normalizedStatus === 'cancelled') {
        updates.balance_payment_status = 'cancelled';
        updates.payment_stage = 'balance_payment_failed';
      }
    } else {
      updates.initial_checkout_id = envelope.checkoutId || order.initial_checkout_id || null;
      updates.initial_payment_reference = envelope.clientReference;
      updates.payment_status = normalizedStatus;

      if (normalizedStatus === 'paid') {
        const balanceDue = Number(order.balance_due || 0);
        const firstTimeSuccess = order.initial_payment_status !== 'paid';
        updates.initial_payment_status = 'paid';
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
            ? `Initial payment for order #${order.order_number} has been confirmed.`
            : `Payment for order #${order.order_number} has been confirmed.`;
          customerEmailSubject = `${customerTitle} - #${order.order_number}`;
          adminTitle = 'Payment Received';
          adminMessage = `Verified successful Hubtel payment for order #${order.order_number} by ${order.customer_name}.`;
          adminEmailSubject = `Payment Received - #${order.order_number}`;
        }
      } else if (normalizedStatus === 'failed') {
        updates.initial_payment_status = 'failed';
        updates.payment_stage = 'awaiting_initial_payment';
        notifyCustomer = order.initial_payment_status !== 'failed';
        customerTitle = 'Payment Failed';
        customerMessage = `Payment failed for order #${order.order_number}. The order was not placed and the cart remains available.`;
        customerEmailSubject = `Payment Failed - #${order.order_number}`;
      } else if (normalizedStatus === 'cancelled') {
        updates.initial_payment_status = 'cancelled';
        updates.payment_stage = 'awaiting_initial_payment';
      }
    }

    console.log('[Hubtel Callback] Applying order updates:', {
      orderNumber: order.order_number,
      paymentStage,
      normalizedStatus,
      paymentStatus: updates.payment_status || null,
      initialPaymentStatus: updates.initial_payment_status || null,
      balancePaymentStatus: updates.balance_payment_status || null,
      paymentStageValue: updates.payment_stage || null,
      isFullyPaid: updates.is_fully_paid ?? null,
    });

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
        type: normalizedStatus === 'paid' ? 'payment_confirmed' : 'general',
        order_id: order.id,
        order_number: order.order_number,
      });
      await sendEmail(
        order.customer_email,
        customerEmailSubject || customerTitle,
        `Hi ${order.customer_name},

${customerMessage}

FMM CLASSICO`
      );
    }

    if (notifyAdmins) {
      for (const email of ADMIN_EMAILS) {
        await createNotification(supabase, {
          user_email: email,
          title: adminTitle,
          message: adminMessage,
          type: 'payment_confirmed',
          order_id: order.id,
          order_number: order.order_number,
        });
        await sendEmail(email, adminEmailSubject || adminTitle, adminMessage);
      }
    }

    return jsonResponse({
      success: true,
      paymentStatus: normalizedStatus,
      paymentStage,
      baseReference,
    }, 200);
  } catch (error) {
    console.error('[Hubtel Callback] fatal error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Server error',
    }, 500);
  }
});
