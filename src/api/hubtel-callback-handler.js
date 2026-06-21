import { createClientFromRequest } from "npm:@base44/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// hubtelCallback – Base44 backend function
// Called directly BY HUBTEL (a webhook POST), not by your frontend app.
//
// After you deploy this function, Base44 will show you its public URL.
// Copy that URL into:
//   1) The HUBTEL_CALLBACK_URL secret (used by hubtelInitiate)
//   2) Your Hubtel merchant dashboard → "Callback URL" field
//
// FIX: The original code looked up Orders by { payment_reference: clientReference }
// but PaymentConfirmed.jsx stored payment_reference as the orderNumber, while
// Payment.jsx sent a DIFFERENT generated clientReference to Hubtel.
// Those two values never matched, so orders were never marked as paid.
//
// The fix: store BOTH the orderNumber AND the hubtelClientReference on the order,
// and look up by hubtel_client_reference first, then fall back to payment_reference.
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Optional shared-secret check — only enforced if you set HUBTEL_CALLBACK_SECRET
    const CALLBACK_SECRET = Deno.env.get("HUBTEL_CALLBACK_SECRET");
    if (CALLBACK_SECRET) {
      const sig = req.headers.get("x-hubtel-signature") || req.headers.get("x-hubtel-secret");
      if (sig !== CALLBACK_SECRET) {
        console.warn("hubtelCallback: signature mismatch, rejecting request");
        return Response.json({ ResponseCode: "0001", Status: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    console.log("hubtelCallback received body:", JSON.stringify(body));

    // Hubtel may send either PascalCase (Data) or camelCase (data)
    const hubtelData = body?.Data || body?.data || body || {};

    const clientReference = hubtelData.ClientReference || hubtelData.clientReference || hubtelData.ClientRef || hubtelData.clientRef || "";
    const status = (hubtelData.Status || hubtelData.status || "").toString();
    const transactionId = hubtelData.CheckoutId || hubtelData.checkoutId || hubtelData.SalesInvoiceId || hubtelData.salesInvoiceId || "";
    const amount = hubtelData.Amount || hubtelData.amount || 0;

    if (!clientReference) {
      console.error("hubtelCallback: missing clientReference in payload");
      return Response.json({ ResponseCode: "0001", Status: "Error", Message: "Missing clientReference" });
    }

    // FIX: Look up the order by hubtel_client_reference first (the value Payment.jsx
    // sent to Hubtel), then fall back to payment_reference (the orderNumber).
    // This ensures the lookup succeeds regardless of which field was populated.
    let order = null;

    const byHubtelRef = await base44.asServiceRole.entities.Order.filter({ hubtel_client_reference: clientReference }).catch(() => []);
    if (byHubtelRef && byHubtelRef.length > 0) {
      order = byHubtelRef[0];
    }

    if (!order) {
      // Fallback: some older orders may have stored orderNumber as payment_reference
      const byPayRef = await base44.asServiceRole.entities.Order.filter({ payment_reference: clientReference }).catch(() => []);
      if (byPayRef && byPayRef.length > 0) {
        order = byPayRef[0];
      }
    }

    if (!order) {
      console.warn(`hubtelCallback: no order found for clientReference="${clientReference}"`);
      // Still return 0000 so Hubtel does not keep retrying
      return Response.json({ ResponseCode: "0000", Status: "Success", Message: "Order not found – acknowledged" });
    }

    const isPaid = status === "Success" || status === "Paid" || status === "success" || status === "paid";

    if (isPaid) {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: "paid",
        hubtel_status: "successful",
        hubtel_transaction_id: transactionId,
        tracking_updates: [
          ...(order.tracking_updates || []),
          {
            status: "Payment Confirmed",
            message: `Payment of ₵${amount} confirmed via Hubtel (callback). Ref: ${clientReference}`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      console.log(`hubtelCallback: order ${order.id} marked as PAID`);
    } else {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: "failed",
        hubtel_status: "failed",
        hubtel_transaction_id: transactionId,
        tracking_updates: [
          ...(order.tracking_updates || []),
          {
            status: "Payment Failed",
            message: `Hubtel reported status: ${status}. Ref: ${clientReference}`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      console.log(`hubtelCallback: order ${order.id} marked as FAILED (status=${status})`);
    }

    return Response.json({ ResponseCode: "0000", Status: "Success" });
  } catch (error) {
    console.error("hubtelCallback error:", error);
    return Response.json({ ResponseCode: "0001", Status: "Error" });
  }
});