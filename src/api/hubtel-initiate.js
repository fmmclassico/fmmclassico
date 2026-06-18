import { createClientFromRequest } from "npm:@base44/sdk";

// Called from the frontend via: base44.functions.invoke('hubtelInitiate', { ... })
// Required secrets (Base44 → Settings → Secrets/Environment Variables):
//   HUBTEL_API_ID
//   HUBTEL_API_KEY
//   HUBTEL_MERCHANT_ACCOUNT_NUMBER
//   HUBTEL_CALLBACK_URL  -> paste the public URL Base44 shows you for the
//                           "hubtelCallback" function once you create it below.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const {
      totalAmount,
      description,
      clientReference,
      payeeName,
      payeeMobileNumber,
      payeeEmail,
      orderNumber,
      appOrigin,
    } = body || {};

    const HUBTEL_API_ID = Deno.env.get("HUBTEL_API_ID");
    const HUBTEL_API_KEY = Deno.env.get("HUBTEL_API_KEY");
    const HUBTEL_MERCHANT_ACCOUNT = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT_NUMBER");
    const HUBTEL_CALLBACK_URL = Deno.env.get("HUBTEL_CALLBACK_URL");

    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
      return Response.json({
        ok: false,
        error: "Hubtel is not configured. Add HUBTEL_API_ID, HUBTEL_API_KEY and HUBTEL_MERCHANT_ACCOUNT_NUMBER as secrets in Base44.",
      });
    }
    if (!totalAmount || !clientReference) {
      return Response.json({ ok: false, error: "totalAmount and clientReference are required" });
    }

    const origin = (appOrigin || "").replace(/\/$/, "") || "https://fmmclassico.com";
    const returnUrl = `${origin}/PaymentConfirmed?orderNumber=${encodeURIComponent(orderNumber || "")}&amount=${encodeURIComponent(totalAmount)}`;
    const cancellationUrl = `${origin}/PaymentConfirmed?orderNumber=${encodeURIComponent(orderNumber || "")}&amount=${encodeURIComponent(totalAmount)}&status=cancelled`;
    const callbackUrl = HUBTEL_CALLBACK_URL || `${origin}/functions/hubtelCallback`;

    const hubtelBody = {
      totalAmount: Number(Number(totalAmount).toFixed(2)),
      description: description || `FMM CLASSICO Order ${clientReference}`,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT,
      clientReference,
      payeeName: payeeName || "",
      payeeMobileNumber: payeeMobileNumber || "",
      payeeEmail: payeeEmail || "",
    };

    const basicAuth = btoa(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`);

    const resp = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify(hubtelBody),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return Response.json({ ok: false, error: "Hubtel rejected the request", httpStatus: resp.status, detail: data });
    }

    return Response.json({ ok: true, ...data });
  } catch (error) {
    console.error("hubtelInitiate error:", error);
    return Response.json({ ok: false, error: error.message || "Failed to initiate Hubtel checkout" });
  }
});