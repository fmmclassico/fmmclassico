import { createClientFromRequest } from "npm:@base44/sdk";

// Called from the frontend via: base44.functions.invoke('hubtelStatus', { clientReference })
// Hubtel's rule: if you don't get a callback within 5 minutes, you MUST check status yourself.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const clientReference = body?.clientReference;

    if (!clientReference) {
      return Response.json({ ok: false, error: "clientReference is required" });
    }

    const HUBTEL_API_ID = Deno.env.get("HUBTEL_API_ID");
    const HUBTEL_API_KEY = Deno.env.get("HUBTEL_API_KEY");
    const HUBTEL_MERCHANT_ACCOUNT = Deno.env.get("HUBTEL_MERCHANT_ACCOUNT_NUMBER");

    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
      return Response.json({ ok: false, error: "Hubtel is not configured on the server." });
    }

    const basicAuth = btoa(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`);
    const url = `https://api-txnstatus.hubtel.com/transactions/${HUBTEL_MERCHANT_ACCOUNT}/status?clientReference=${encodeURIComponent(clientReference)}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return Response.json({
        ok: false,
        error: "Hubtel status check failed",
        httpStatus: resp.status,
        detail: data,
      });
    }

    // Normalise Hubtel's response shape into a flat shape the app expects.
    const d = data?.data || {};
    const status = d.status || data?.status || "";
    const success = (data?.responseCode === "0000" || data?.responseCode === "00") && status === "Paid";

    return Response.json({
      ok: true,
      success,
      status,
      transactionId: d.transactionId || d.externalTransactionId || null,
      amount: d.amount ?? null,
      paymentMethod: d.paymentMethod || null,
      raw: data,
    });
  } catch (error) {
    console.error("hubtelStatus error:", error);
    return Response.json({ ok: false, error: error.message || "Status check failed" });
  }
});