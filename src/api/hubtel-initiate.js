import { createClientFromRequest } from "npm:@base44/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// hubtelInitiate – Base44 backend function
// Called from the frontend via: base44.functions.invoke('hubtelInitiate', { ... })
//
// REQUIRED SECRETS — set these in Base44 → Project Settings → Secrets:
//   HUBTEL_API_ID                  →  your API ID (username)
//   HUBTEL_API_KEY                 →  your API KEY (password)
//   HUBTEL_MERCHANT_ACCOUNT_NUMBER →  your Collection Account Number
//   HUBTEL_CALLBACK_URL            →  the public URL Base44 gives for hubtelCallback function
//
// ⚠️  NEVER hard-code credentials here. They must live in Base44 Secrets only.
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
        ok: false,
        error: "Hubtel is not configured. Add HUBTEL_API_ID, HUBTEL_API_KEY and HUBTEL_MERCHANT_ACCOUNT_NUMBER as secrets in Base44 Project Settings → Secrets.",
      });
    }

    if (!totalAmount || !clientReference) {
      return Response.json({ ok: false, error: "totalAmount and clientReference are required" });
    }

    // FIX: clientReference must not exceed 32 characters (Hubtel hard limit).
    const safeClientRef = String(clientReference).slice(0, 32);

    const origin = (appOrigin || "").replace(/\/$/, "") || "https://fmmclassico.com";

    // returnUrl — Hubtel appends ?status=&clientReference=&transactionId= to this URL
    const returnUrl = `${origin}/PaymentConfirmed?orderNumber=${encodeURIComponent(orderNumber || "")}`;
    const cancellationUrl = `${origin}/PaymentConfirmed?orderNumber=${encodeURIComponent(orderNumber || "")}&status=cancelled`;

    // callbackUrl — server-to-server webhook where Hubtel sends payment confirmation
    // HUBTEL_CALLBACK_URL must be the public URL of your hubtelCallback Base44 function.
    if (!HUBTEL_CALLBACK_URL) {
      console.warn("HUBTEL_CALLBACK_URL secret is not set. Hubtel will not be able to confirm payments automatically.");
    }
    const callbackUrl = HUBTEL_CALLBACK_URL || `${origin}/functions/hubtelCallback`;

    const hubtelBody = {
      totalAmount: Number(Number(totalAmount).toFixed(2)),
      description: description || `FMM CLASSICO Order ${safeClientRef}`,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT,
      clientReference: safeClientRef,
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

    // Pass through full Hubtel response + ok flag + the safe client ref used
    return Response.json({ ok: true, usedClientReference: safeClientRef, ...data });

  } catch (error) {
    console.error("hubtelInitiate error:", error);
    return Response.json({ ok: false, error: error.message || "Failed to initiate Hubtel checkout" });
  }
});