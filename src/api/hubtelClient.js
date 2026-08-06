import { getSupabaseConfig, getSupabaseFunctionUrl } from '@/lib/runtime-config';

function authHeaders() {
  const { anonKey } = getSupabaseConfig();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
  };
}

function withMeta(result, response) {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return {
      ...result,
      ok: response.ok,
      httpStatus: response.status,
    };
  }

  return {
    data: result,
    ok: response.ok,
    httpStatus: response.status,
  };
}

function sanitizeDescription(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function createInitialPaymentReference(orderNumber, paymentMethod) {
  if (paymentMethod === 'deposit_balance') return `${orderNumber}-INIT`;
  if (paymentMethod === 'pay_on_delivery') return `${orderNumber}-DEL`;
  return `${orderNumber}-FULL`;
}

export function createBalancePaymentReference(orderNumber) {
  return `${orderNumber}-BAL`;
}

export function getBaseOrderReference(reference = '') {
  return String(reference || '').replace(/-(INIT|DEL|FULL|BAL)$/i, '');
}

export function getHubtelStatusValue(result) {
  return String(
    result?.data?.status
    || result?.data?.Status
    || result?.status
    || result?.Status
    || ''
  ).toLowerCase();
}

export async function initiatePayment({
  totalAmount,
  description,
  callbackUrl,
  returnUrl,
  cancellationUrl,
  clientReference,
  payeeName,
  payeeMobileNumber,
  payeeEmail,
}) {
  try {
    const response = await fetch(getSupabaseFunctionUrl('hubtel-checkout'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        totalAmount,
        description: sanitizeDescription(description),
        callbackUrl,
        returnUrl,
        cancellationUrl,
        clientReference,
        payeeName,
        payeeMobileNumber,
        payeeEmail,
      }),
    });

    const result = await response.json();
    return withMeta(result, response);
  } catch (error) {
    console.error('[HubtelClient] Error initiating payment:', error);
    return { error: error?.message || 'Unable to start payment.' };
  }
}

export async function checkPaymentStatus(clientReference) {
  try {
    const response = await fetch(
      `${getSupabaseFunctionUrl('hubtel-checkout')}?clientReference=${encodeURIComponent(clientReference)}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const result = await response.json();
    return withMeta(result, response);
  } catch (error) {
    console.error('[HubtelClient] Status check error:', error);
    return { error: error?.message || 'Unable to verify payment status.' };
  }
}

export async function verifyPaymentWithRetries(clientReference, maxRetries = 4, delayMs = 800) {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const result = await checkPaymentStatus(clientReference);
      const status = getHubtelStatusValue(result);

      if (status === 'paid' || status === 'success' || status === 'successful') {
        return { verified: true, status: 'paid', data: result };
      }
      if (status === 'failed' || status === 'unpaid') {
        return { verified: true, status: 'failed', data: result };
      }
      if (status === 'cancelled' || status === 'canceled') {
        return { verified: true, status: 'cancelled', data: result };
      }
    } catch (error) {
      console.warn('[HubtelClient] Retry attempt failed:', attempt + 1, error);
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { verified: false, status: 'unknown', data: null };
}

export async function initiateBalancePayment({ order, callbackUrl, returnUrl, cancellationUrl }) {
  const amount = Number(order?.balance_due || order?.balance_payment_amount || 0);
  const clientReference = order?.balance_payment_reference || createBalancePaymentReference(order?.order_number || '');
  const description = order?.payment_method === 'deposit_balance'
    ? `Remaining balance for Order ${order.order_number}`
    : `Product balance for Order ${order.order_number}`;

  return initiatePayment({
    totalAmount: amount,
    description,
    callbackUrl,
    returnUrl,
    cancellationUrl,
    clientReference,
    payeeName: order?.customer_name,
    payeeMobileNumber: order?.customer_phone,
    payeeEmail: order?.customer_email,
  });
}
