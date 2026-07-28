import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || process.env.VITE_ALLOWED_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_SMS_NUMBERS = (process.env.ADMIN_SMS_NUMBERS || process.env.VITE_ADMIN_PHONE_NUMBERS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function getBaseOrderReference(reference = '') {
  return String(reference || '').replace(/-(INIT|DEL|FULL|BAL)$/i, '');
}

function getPaymentStage(reference = '') {
  const normalized = String(reference || '').toUpperCase();
  if (normalized.endsWith('-BAL')) return 'balance';
  return 'initial';
}

function normalizeHubtelStatus(status = '') {
  const value = String(status || '').toLowerCase();
  if (['success', 'successful', 'paid'].includes(value)) return 'paid';
  if (['failed', 'unpaid'].includes(value)) return 'failed';
  if (['cancelled', 'canceled'].includes(value)) return 'cancelled';
  return 'pending_payment';
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

async function sendSMS(to, message) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !to || !message) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ to, message }),
    });
  } catch (error) {
    console.error('[Hubtel Callback] send-sms failed:', error);
  }
}

async function createNotification(payload) {
  const { error } = await supabase.from('notifications').insert({
    ...payload,
    is_read: false,
    created_date: new Date().toISOString(),
  });
  if (error) {
    console.error('[Hubtel Callback] notification insert error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body;
    try {
      body = typeof req.json === 'function' ? await req.json() : req.body || await readBody(req);
    } catch {
      body = null;
    }

    if (!body) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.log('[Hubtel Callback] payload:', JSON.stringify(body));

    const clientReference = body?.Data?.ClientReference ?? body?.clientReference ?? null;
    const status = body?.Data?.Status ?? body?.status ?? null;
    const amount = Number(body?.Data?.Amount ?? body?.amount ?? 0) || 0;
    const checkoutId = body?.Data?.CheckoutId ?? body?.checkoutId ?? null;
    const paymentDetails = body?.Data?.PaymentDetails ?? {};

    if (!clientReference || !status) {
      return res.status(200).json({ message: 'Partial data received' });
    }

    const baseReference = getBaseOrderReference(clientReference);
    const paymentStage = getPaymentStage(clientReference);
    const normalizedStatus = normalizeHubtelStatus(status);

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
      return res.status(200).json({ message: 'No order found' });
    }

    const now = new Date().toISOString();
    const stageLabel = paymentStage === 'balance' ? 'Balance Payment' : 'Initial Payment';
    const trackingUpdates = Array.isArray(order.tracking_updates) ? order.tracking_updates : [];
    const trackingUpdate = {
      status: `${stageLabel} ${status}`,
      message: `Hubtel ${stageLabel.toLowerCase()}: ${status}. GHS ${amount.toFixed(2)}. Via ${paymentDetails?.PaymentType || 'N/A'}.`,
      timestamp: now,
      checkoutId,
      clientReference,
    };

    const updates = {
      tracking_updates: [...trackingUpdates, trackingUpdate],
      payment_reference: clientReference,
      hubtel_transaction_id: checkoutId || order.hubtel_transaction_id || null,
      hubtel_status: normalizedStatus === 'paid' ? 'successful' : normalizedStatus === 'pending_payment' ? 'pending' : 'failed',
    };

    let shouldNotifyCustomer = false;
    let shouldNotifyAdmins = false;
    let customerTitle = '';
    let customerMessage = '';
    let customerEmailSubject = '';
    let customerSms = '';
    let adminTitle = '';
    let adminMessage = '';
    let adminEmailSubject = '';
    let adminSms = '';

    if (paymentStage === 'balance') {
      updates.balance_checkout_id = checkoutId || order.balance_checkout_id || null;
      updates.balance_payment_reference = clientReference;

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
          shouldNotifyCustomer = true;
          shouldNotifyAdmins = true;
          customerTitle = 'Remaining Balance Paid';
          customerMessage = `Order #${order.order_number} is now fully paid.`;
          customerEmailSubject = `Remaining Balance Paid - #${order.order_number}`;
          customerSms = `Order ${order.order_number}: remaining balance confirmed. Your order is now fully paid.`;
          adminTitle = 'Remaining Balance Paid';
          adminMessage = `Order #${order.order_number} by ${order.customer_name} is now fully paid.`;
          adminEmailSubject = `Remaining Balance Paid - #${order.order_number}`;
          adminSms = `FMM CLASSICO: order ${order.order_number} is now fully paid.`;
        }
      } else if (normalizedStatus === 'failed') {
        updates.balance_payment_status = 'failed';
        updates.payment_stage = 'balance_payment_failed';
        shouldNotifyCustomer = order.balance_payment_status !== 'failed';
        customerTitle = 'Remaining Balance Payment Failed';
        customerMessage = `Remaining balance payment failed for order #${order.order_number}.`;
        customerEmailSubject = `Remaining Balance Payment Failed - #${order.order_number}`;
        customerSms = `Order ${order.order_number}: remaining balance payment failed.`;
      } else if (normalizedStatus === 'cancelled') {
        updates.balance_payment_status = 'cancelled';
        shouldNotifyCustomer = order.balance_payment_status !== 'cancelled';
        customerTitle = 'Remaining Balance Payment Cancelled';
        customerMessage = `Remaining balance payment was cancelled for order #${order.order_number}.`;
        customerEmailSubject = `Remaining Balance Payment Cancelled - #${order.order_number}`;
        customerSms = `Order ${order.order_number}: remaining balance payment was cancelled.`;
      }
    } else {
      updates.initial_checkout_id = checkoutId || order.initial_checkout_id || null;
      updates.initial_payment_reference = clientReference;
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
          shouldNotifyCustomer = true;
          shouldNotifyAdmins = true;
          customerTitle = balanceDue > 0 ? 'Initial Payment Confirmed' : 'Payment Confirmed';
          customerMessage = balanceDue > 0
            ? `Initial payment for order #${order.order_number} has been confirmed.`
            : `Payment for order #${order.order_number} has been confirmed.`;
          customerEmailSubject = `${customerTitle} - #${order.order_number}`;
          customerSms = balanceDue > 0
            ? `Order ${order.order_number}: initial payment confirmed. Track it from your Orders page.`
            : `Order ${order.order_number}: payment confirmed successfully.`;
          adminTitle = 'Payment Received';
          adminMessage = `Verified successful Hubtel payment for order #${order.order_number} by ${order.customer_name}.`; 
          adminEmailSubject = `Payment Received - #${order.order_number}`;
          adminSms = `FMM CLASSICO: verified payment received for order ${order.order_number}.`;
        }
      } else if (normalizedStatus === 'failed') {
        updates.initial_payment_status = 'failed';
        shouldNotifyCustomer = order.initial_payment_status !== 'failed';
        customerTitle = 'Payment Failed';
        customerMessage = `Payment failed for order #${order.order_number}. The order was not placed and the cart should remain available.`;
        customerEmailSubject = `Payment Failed - #${order.order_number}`;
        customerSms = `Order ${order.order_number}: payment failed. Your cart remains available.`;
      } else if (normalizedStatus === 'cancelled') {
        updates.initial_payment_status = 'cancelled';
        shouldNotifyCustomer = order.initial_payment_status !== 'cancelled';
        customerTitle = 'Payment Cancelled';
        customerMessage = `Payment was cancelled for order #${order.order_number}. The order was not placed and the cart should remain available.`;
        customerEmailSubject = `Payment Cancelled - #${order.order_number}`;
        customerSms = `Order ${order.order_number}: payment cancelled. Your cart remains available.`;
      }
    }

    const { error: updateError } = await supabase.from('orders').update(updates).eq('id', order.id);
    if (updateError) {
      console.error('[Hubtel Callback] order update error:', updateError);
      throw updateError;
    }

    if (shouldNotifyCustomer) {
      await createNotification({
        user_email: order.customer_email,
        title: customerTitle,
        message: customerMessage,
        type: normalizedStatus === 'paid' ? 'payment_confirmed' : 'general',
        order_id: order.id,
        order_number: order.order_number,
      });
      await Promise.allSettled([
        sendEmail(order.customer_email, customerEmailSubject || customerTitle, `Hi ${order.customer_name},\n\n${customerMessage}\n\nFMM CLASSICO`),
        sendSMS(order.customer_phone, customerSms),
      ]);
    }

    if (shouldNotifyAdmins) {
      await Promise.allSettled(ADMIN_EMAILS.map(async (email) => {
        await createNotification({
          user_email: email,
          title: adminTitle,
          message: adminMessage,
          type: 'payment_confirmed',
          order_id: order.id,
          order_number: order.order_number,
        });
        await sendEmail(email, adminEmailSubject || adminTitle, adminMessage);
      }));

      await Promise.allSettled(ADMIN_SMS_NUMBERS.map((phone) => sendSMS(phone, adminSms)));
    }

    return res.status(200).json({
      success: true,
      paymentStatus: normalizedStatus,
      paymentStage,
      baseReference,
    });
  } catch (err) {
    console.error('[Hubtel Callback] fatal error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Server error',
    });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}
