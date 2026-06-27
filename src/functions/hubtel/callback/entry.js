import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body;
    try {
      body = typeof req.json === 'function' ? await req.json() : req.body || await readBody(req);
    } catch { body = null; }

    if (!body) return res.status(400).json({ error: 'Invalid JSON' });

    console.log('[Hubtel Callback]', JSON.stringify(body));

    const clientReference = body.Data?.ClientReference || body.clientReference;
    const status = body.Data?.Status || body.status;
    const amount = body.Data?.Amount || body.amount;
    const checkoutId = body.Data?.CheckoutId || body.checkoutId;
    const paymentDetails = body.Data?.PaymentDetails || {};

    if (!clientReference || !status) {
      return res.status(200).json({ message: 'Partial data received' });
    }

    // Find the order
    const { data: orders } = await supabase
      .from('orders').select('*').eq('order_number', clientReference);

    if (!orders?.length) {
      console.warn(`[Hubtel Callback] No order for: ${clientReference}`);
      return res.status(200).json({ message: 'No order found' });
    }

    const order = orders[0];
    let paymentStatus = 'pending_payment';
    if (status === 'Success' || status === 'Paid') paymentStatus = 'paid';
    else if (status === 'Failed') paymentStatus = 'failed';
    else if (status === 'Cancelled') paymentStatus = 'cancelled';

    const trackingUpdate = {
      status: `Payment ${status}`,
      message: `Hubtel: ${status}. GHS ${amount}. Via ${paymentDetails.PaymentType || 'N/A'}`,
      timestamp: new Date().toISOString(),
      checkoutId,
    };

    // Update order
    await supabase.from('orders').update({
      payment_status: paymentStatus,
      status: paymentStatus === 'paid' ? 'confirmed' : order.status,
      tracking_updates: [...(order.tracking_updates || []), trackingUpdate],
    }).eq('id', order.id);

    // Notifications
    if (paymentStatus === 'paid') {
      // Customer notification
      await supabase.from('notifications').insert({
        user_email: order.customer_email,
        title: '✅ Payment Confirmed!',
        message: `Payment for order #${order.order_number} confirmed (GHS ${order.total_amount?.toFixed(2)}). Now being processed!`,
        type: 'payment_confirmed',
        order_id: order.id,
        order_number: order.order_number,
        is_read: false,
        created_date: new Date().toISOString(),
      });

      // Admin notifications
      const admins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      for (const email of admins) {
        await supabase.from('notifications').insert({
          user_email: email,
          title: '💰 Payment Received!',
          message: `#${order.order_number} by ${order.customer_name} (GHS ${order.total_amount?.toFixed(2)}) paid! Ready to process.`,
          type: 'payment_confirmed',
          order_id: order.id,
          order_number: order.order_number,
          is_read: false,
          created_date: new Date().toISOString(),
        });
      }
    } else if (paymentStatus === 'failed') {
      await supabase.from('notifications').insert({
        user_email: order.customer_email,
        title: '❌ Payment Failed',
        message: `Payment for #${order.order_number} failed. Try again or call 0509 896 035.`,
        type: 'general',
        order_id: order.id,
        order_number: order.order_number,
        is_read: false,
        created_date: new Date().toISOString(),
      });
    }

    return res.status(200).json({ success: true, paymentStatus });
  } catch (err) {
    console.error('[Hubtel Callback] Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}
