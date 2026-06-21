import { createClientFromRequest } from "npm:@base44/sdk";

// This one is called directly BY HUBTEL (a webhook), not by your app.
// After you create this function, Base44 will show you its public URL.
// Copy that URL into:
//   1) The HUBTEL_CALLBACK_URL secret (used by hubtelInitiate above)
//   2) Your Hubtel merchant dashboard's "Callback URL" field

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Optional shared-secret check — only enforced if you set HUBTEL_CALLBACK_SECRET
    const CALLBACK_SECRET = Deno.env.get("HUBTEL_CALLBACK_SECRET");
    if (CALLBACK_SECRET) {
      const sig = req.headers.get("x-hubtel-signature") || req.headers.get("x-hubtel-secret");
      if (sig !== CALLBACK_SECRET) {
        return Response.json({ ResponseCode: "0001", Status: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const hubtelData = body?.Data || body?.data || body || {};

    const clientReference = hubtelData.ClientReference || hubtelData.clientReference || hubtelData.ClientRef || hubtelData.clientRef;
    const status = hubtelData.Status || hubtelData.status;
    const transactionId = hubtelData.CheckoutId || hubtelData.checkoutId || hubtelData.checkout_id;
    const amount = hubtelData.Amount || hubtelData.amount;

    if (!clientReference) {
      return Response.json({ ResponseCode: "0001", Status: "Error", Message: "Missing reference" });
    }

    // Hubtel's server has no logged-in user, so we use asServiceRole to read/write Orders.
    const orders = await base44.asServiceRole.entities.Order.filter({ payment_reference: clientReference });
    const order = orders?.[0];

    if (!order) {
      return Response.json({ ResponseCode: "0000", Status: "Success", Message: "Order not found" });
    }

    if (status === "Success" || status === "Paid") {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: "paid",
        hubtel_status: "successful",
        hubtel_transaction_id: transactionId,
        tracking_updates: [
          ...(order.tracking_updates || []),
          {

});