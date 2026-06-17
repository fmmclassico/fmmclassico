async function handleHubtelCallback(req, res) {
  try {
    console.log("Hubtel Callback Received");

    const hubtelData = req.body?.Data || {};

    const clientReference = hubtelData.ClientReference;
    const status = hubtelData.Status;
    const transactionId = hubtelData.CheckoutId;
    const amount = hubtelData.Amount;

    if (!clientReference) {
      return res.status(200).json({
        ResponseCode: "0001",
        Status: "Error",
        Message: "Missing reference"
      });
    }

    // FIND ORDER USING payment_reference (IMPORTANT FIX)
    const orders = await base44.entities.Order.filter({
      payment_reference: clientReference
    });

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