// Server function: Hubtel checkout callback receiver
// Hubtel will POST JSON to this endpoint when transaction finalises.
// Updates the Order entity and logs transaction for UAT.

import { createClient } from '@base44/sdk';

// Initialize Base44 client for server-side operations
const base44 = createClient({
  appId: process.env.BASE44_APP_ID,
  token: process.env.BASE44_SERVER_TOKEN,
  requiresAuth: false,
});

// In-memory sample storage for UAT (in production, use persistent storage)
const UAT_SAMPLES = {
  callbacks: [],
  statusChecks: [],
  maxSamples: 50,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let body;
    try {
      body = (typeof req.json === 'function') ? await req.json() : req.body || await readReqBody(req);
    } catch (e) {
      body = null;
    }

    if (!body) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.log(`[Hubtel Callback] Received: ${JSON.stringify(body)}`);

    // Extract key fields
    const clientReference = body.Data?.ClientReference;
    const status = body.Data?.Status;
    const amount = body.Data?.Amount;
    const checkoutId = body.Data?.CheckoutId;
    const paymentDetails = body.Data?.PaymentDetails || {};

    if (!clientReference || !status) {
      console.warn('[Hubtel Callback] Missing clientReference or status');
      return res.status(200).json({ message: 'Callback received (partial data)' });
    }

    // Store sample for UAT (with timestamp)
    UAT_SAMPLES.callbacks.push({
      timestamp: new Date().toISOString(),
      clientReference,
      status,
      amount,
      checkoutId,
      paymentMethod: paymentDetails.PaymentType || 'unknown',
      fullPayload: body,
    });
    if (UAT_SAMPLES.callbacks.length > UAT_SAMPLES.maxSamples) {
      UAT_SAMPLES.callbacks.shift();
    }

    // Lookup and update order
    try {
      const orders = await base44.entities.Order.filter({
        order_number: clientReference,
      });

      if (orders && orders.length > 0) {
        const order = orders[0];
        let paymentStatus = 'pending_payment';
        
        if (status === 'Success') {
          paymentStatus = 'paid';
        } else if (status === 'Failed') {
          paymentStatus = 'failed';
        } else if (status === 'Cancelled') {
          paymentStatus = 'cancelled';
        }

        // Add callback info to tracking updates
        const trackingUpdate = {
          status: `Payment ${status}`,
          message: `Hubtel callback received. Status: ${status}. Amount: ${amount}. Method: ${paymentDetails.PaymentType || 'N/A'}`,
          timestamp: new Date().toISOString(),
          checkoutId,
        };

        const updatedOrder = await base44.entities.Order.update(order.id, {
          payment_status: paymentStatus,
          tracking_updates: [
            ...(order.tracking_updates || []),
            trackingUpdate,
          ],
        });

        console.log(`[Hubtel Callback] Updated order ${clientReference} to payment_status=${paymentStatus}`);
      } else {
        console.warn(`[Hubtel Callback] Order not found for clientReference=${clientReference}`);
      }
    } catch (orderErr) {
      console.error('[Hubtel Callback] Order update error:', orderErr);
      // Don't fail callback response; acknowledge receipt anyway
    }

    // Respond with 200 to acknowledge receipt
    res.status(200).json({ message: 'Callback processed successfully' });
  } catch (err) {
    console.error('[Hubtel Callback] Handler error:', err);
    res.status(200).json({ message: 'Callback received (with errors)' });
  }
}

async function readReqBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
    });
    req.on('error', () => resolve(null));
  });
}

// Export UAT samples for retrieval
export function getUATSamples() {
  return UAT_SAMPLES;
}
