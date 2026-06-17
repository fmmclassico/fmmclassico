async function handleHubtelCallback(req, res) {
  try {
    console.log("Hubtel Callback Received");

    // Basic verification (optional): if HUBTEL_CALLBACK_SECRET is set, require matching header
    const CALLBACK_SECRET = process.env.HUBTEL_CALLBACK_SECRET;
    if (CALLBACK_SECRET) {
      const sig = req.headers['x-hubtel-signature'] || req.headers['x-hubtel-secret'];
      if (sig !== CALLBACK_SECRET) {
        console.warn('Hubtel callback rejected due to invalid signature');
        return res.status(403).json({ ResponseCode: '0001', Status: 'Forbidden' });
      }
    }

    const body = req.body || {};
    const hubtelData = body.Data || body.data || body || {};

    const clientReference = hubtelData.ClientReference || hubtelData.clientReference || hubtelData.ClientRef || hubtelData.clientRef;
    const status = hubtelData.Status || hubtelData.status;
    const transactionId = hubtelData.CheckoutId || hubtelData.checkoutId || hubtelData.checkout_id;
    const amount = hubtelData.Amount || hubtelData.amount;

    if (!clientReference) {
      return res.status(200).json({
        ResponseCode: "0001",
        Status: "Error",
        Message: "Missing reference"
      });
    }

    // Ensure base44 is available in this server handler
    let base44;
    try {
      base44 = require('./base44Client').base44;
    } catch (e) {
      console.error('base44 client not available in callback handler:', e.message);
      return res.status(500).json({ ResponseCode: '0001', Status: 'Error', Message: 'Server misconfiguration' });
    }

    // FIND ORDER USING payment_reference (IMPORTANT FIX)
    const orders = await base44.entities.Order.filter({ payment_reference: clientReference });
    const order = orders?.[0];

    if (!order) {
      return res.status(200).json({
        ResponseCode: "0000",
        Status: "Success",
        Message: "Order not found"
      });
    }

    // SUCCESS PAYMENT
    if (status === "Success") {
      await base44.entities.Order.update(order.id, {
        payment_status: "paid",
        hubtel_status: "successful",
        hubtel_transaction_id: transactionId,
        tracking_updates: [
          ...(order.tracking_updates || []),
          {
            status: "Payment Confirmed",
            message: `Payment of ₵${amount} confirmed via Hubtel`,
            timestamp: new Date().toISOString()
          }
        ]
      });

    } else {
      // FAILED PAYMENT
      await base44.entities.Order.update(order.id, {
        payment_status: "failed",
        hubtel_status: "failed",
        hubtel_transaction_id: transactionId
      });
    }

    return res.status(200).json({
      ResponseCode: "0000",
      Status: "Success"
    });

  } catch (error) {
    console.error(error);

    return res.status(200).json({
      ResponseCode: "0001",
      Status: "Error"
    });
  }
}

module.exports = {
  handler: handleHubtelCallback,
  route: "/api/hubtel/callback",
  method: "POST"
};