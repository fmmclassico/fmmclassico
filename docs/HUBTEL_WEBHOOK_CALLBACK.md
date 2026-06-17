/**
 * HUBTEL WEBHOOK CALLBACK HANDLER
 * ===============================
 * 
 * WHAT IS THIS?
 * This is a backend endpoint that receives payment confirmations from Hubtel.
 * 
 * HOW IT WORKS:
 * 1. Customer completes payment on Hubtel's page
 * 2. Hubtel sends a POST request to your server (this endpoint)
 * 3. You verify the payment details
 * 4. You create/update the order in your database
 * 5. You send back "OK" to Hubtel
 * 
 * IMPORTANT: This MUST run on your SERVER, not in the browser!
 * (Base44 handles this automatically)
 */

/**
 * EXAMPLE HUBTEL WEBHOOK PAYLOAD:
 * ================================
 * 
 * This is what Hubtel sends to your callback URL:
 * 
 * POST /api/hubtel/callback
 * 
 * {
 *   "ResponseCode": "0000",
 *   "Status": "Success",
 *   "Data": {
 *     "CheckoutId": "59e2fbbff4e443b98e09346881ac7e9a",
 *     "SalesInvoiceId": "e96ccfb4746045bba13f425bd573a31c",
 *     "ClientReference": "FMM-ABC123",           // ← Your order reference
 *     "Status": "Success",
 *     "Amount": 100.50,
 *     "CustomerPhoneNumber": "233242825109",
 *     "PaymentDetails": {
 *       "MobileMoneyNumber": "233242825109",
 *       "PaymentType": "mobilemoney",
 *       "Channel": "mtn-gh"
 *     },
 *     "Description": "The MTN Mobile Money payment has been approved..."
 *   }
 * }
 */

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ IF YOU'RE USING NODE.JS + EXPRESS (Backend Server)                  ║
 * ║ Copy this code to your backend API route handler                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

/*
// backend/routes/hubtel-webhook.js (or similar)

const express = require('express');
const router = express.Router();

// Middleware to parse JSON
router.use(express.json());

// POST /api/hubtel/callback
router.post('/api/hubtel/callback', async (req, res) => {
  try {
    console.log('📨 Received Hubtel webhook callback');
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    // ✅ Step 1: Get the data from Hubtel
    const hubtelData = req.body?.Data || {};
    const clientReference = hubtelData.ClientReference;   // Your order number
    const status = hubtelData.Status;                      // "Success" or "Failed"
    const amount = hubtelData.Amount;
    const customerPhone = hubtelData.CustomerPhoneNumber;
    const paymentMethod = hubtelData.PaymentDetails?.PaymentType;

    // ✅ Step 2: Validate the callback
    if (!clientReference) {
      console.error('❌ Missing clientReference in callback');
      return res.status(400).json({ error: 'Missing clientReference' });
    }

    if (!status || status !== 'Success') {
      console.warn('⚠️ Payment failed or cancelled:', status);
      // Don't create order for failed payments
      return res.status(200).json({ message: 'Payment failed - no order created' });
    }

    // ✅ Step 3: Find and update the order in your database
    // This depends on YOUR database structure
    // Example (using Base44 or any database):
    
    const order = await db.orders.findOne({ order_number: clientReference });
    
    if (!order) {
      console.error('❌ Order not found:', clientReference);
      // Even if order doesn't exist, tell Hubtel we received it
      // (so they don't keep trying)
      return res.status(200).json({ message: 'Order not found - callback received' });
    }

    // ✅ Step 4: Update order with payment confirmation
    await db.orders.updateOne(
      { id: order.id },
      {
        payment_status: 'paid',
        status: 'confirmed',
        hubtel_transaction_id: hubtelData.CheckoutId,
        hubtel_sales_invoice_id: hubtelData.SalesInvoiceId,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        tracking_updates: [
          ...order.tracking_updates,
          {
            status: 'Payment Confirmed (Webhook)',
            message: `Payment of ₵${amount} received via ${paymentMethod}`,
            timestamp: new Date().toISOString(),
          }
        ]
      }
    );

    console.log('✅ Order updated:', clientReference);

    // ✅ Step 5: Send back success to Hubtel
    return res.status(200).json({
      ResponseCode: '0000',
      Status: 'Success',
      Message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to tell Hubtel we received it
    // (Otherwise they'll retry infinitely)
    return res.status(200).json({
      ResponseCode: '0001',
      Status: 'Error',
      Message: error.message
    });
  }
});

module.exports = router;
*/

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ IF YOU'RE USING BASE44                                              ║
 * ║ Use Base44's Function/API feature to create this endpoint            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

/*
// In Base44 Functions (like a Cloud Function):
// This would be called when Hubtel sends a POST to your webhook

exports.hubtelCallback = async (req, res) => {
  try {
    // Same logic as above, but using Base44 entities
    
    const hubtelData = req.body?.Data || {};
    const clientReference = hubtelData.ClientReference;
    const status = hubtelData.Status;

    if (status !== 'Success') {
      return res.json({ message: 'Payment failed' });
    }

    // Update order using Base44
    const order = await base44.entities.Order.filter({ 
      order_number: clientReference 
    }).then(orders => orders[0]);

    if (order) {
      await base44.entities.Order.update(order.id, {
        payment_status: 'paid',
        status: 'confirmed',
        hubtel_transaction_id: hubtelData.CheckoutId,
      });
    }

    return res.json({
      ResponseCode: '0000',
      Status: 'Success'
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({
      ResponseCode: '0001',
      Status: 'Error'
    });
  }
};
*/

/**
 * THINGS TO REMEMBER:
 * ===================
 * 
 * 1. ALWAYS respond with HTTP 200 (even if there's an error)
 *    - Otherwise Hubtel will think something's wrong and keep retrying
 * 
 * 2. ALWAYS verify the client reference matches your order
 *    - Don't create random orders
 * 
 * 3. ALWAYS check the status is "Success" before updating
 *    - Don't mark failed payments as paid
 * 
 * 4. ALWAYS save the Hubtel transaction ID
 *    - You need this for refunds and inquiries
 * 
 * 5. VERIFY YOUR WEBHOOK URL is publicly accessible
 *    - Test it with: curl -X POST https://yoursite.com/api/hubtel/callback
 * 
 * 6. TELL HUBTEL YOUR WEBHOOK URL in the Payment request
 *    - Use "callbackUrl" parameter when initiating payment
 *    - Example: https://yoursite.com/api/hubtel/callback
 */

/**
 * HOW TO TEST YOUR WEBHOOK:
 * =========================
 * 
 * Using curl (command line):
 * 
 * curl -X POST https://yoursite.com/api/hubtel/callback \\
 *   -H "Content-Type: application/json" \\
 *   -d '{
 *     "ResponseCode": "0000",
 *     "Status": "Success",
 *     "Data": {
 *       "CheckoutId": "test123",
 *       "ClientReference": "FMM-TEST123",
 *       "Status": "Success",
 *       "Amount": 10,
 *       "CustomerPhoneNumber": "233242825109",
 *       "PaymentDetails": {
 *         "MobileMoneyNumber": "233242825109",
 *         "PaymentType": "mobilemoney",
 *         "Channel": "mtn-gh"
 *       }
 *     }
 *   }'
 */

export default {
  description: 'Hubtel webhook callback handler template',
  note: 'This is a reference implementation. Implement on your backend server.',
};
