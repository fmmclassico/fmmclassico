import { createClientFromRequest } from "npm:@base44/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// hubtelInitiate – Base44 backend function
// Called from the frontend via: base44.functions.invoke('hubtelInitiate', { ... })
//
// REQUIRED SECRETS — set these in Base44 → Project Settings → Secrets:
//   HUBTEL_API_ID                  →  pQGpB7y         (username)
//   HUBTEL_API_KEY                 →  14fda6847ee44c8fa910f355675cce73  (password)
//   HUBTEL_MERCHANT_ACCOUNT_NUMBER →  2039285         (Collection Account)
//   HUBTEL_CALLBACK_URL            →  (the public URL Base44 gives for hubtelCallback function)
//
// ⚠️  NEVER hard-code credentials here. They must live in Base44 Secrets only.
//     The values above are shown here only so you know which secret names to create.
// ─────────────────────────────────────────────────────────────────────────────

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

    // Load credentials from environment secrets — NEVER from the request body
    const HUBTEL_API_ID = Deno.env.get("HUBTEL_API_ID");
    const HUBTEL_API_KEY = Deno.env.get("HUBTEL_API_KEY");
    const HUBTEL_MERCHANT_ACCOUNT = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT_NUMBER");
    const HUBTEL_CALLBACK_URL = Deno.env.get("HUBTEL_CALLBACK_URL");

    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
      return Response.json({
        ok: false,ation
    // This MUST be the public URL of your hubtelCallback function in Base44
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

    // Basic auth: base64 encode "API_ID:API_KEY"
    const basicAuth = btoa(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`);

    const resp = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${basicAuth}`,
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(hubtelBody),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return Response.json({
        ok: false,
        error: "Hubtel rejected the request",
        httpStatus: resp.status,
        detail: data,
      });
    }

    // Pass through full Hubtel response + ok flag
    return Response.json({ ok: true, ...data });

  } catch (error) {
    console.error("hubtelInitiate error:", error);
    return Response.json({ ok: false, error: error.message || "Failed to initiate Hubtel checkout" });
  }
});