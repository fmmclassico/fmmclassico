import {
  getHubtelCallbackUrl,
  getHubtelInitiateUrl,
  getHubtelStatusUrl,
  getSupabaseConfig,
} from '@/lib/runtime-config';

function authHeaders() {
  const { anonKey } = getSupabaseConfig();

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
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

async function readJsonResponse(response, fallbackErrorMessage) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_) {
    return {
      error: fallbackErrorMessage,
      raw: text,
    };
  }
}

function sanitizeDescription(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function compactMessage(value = '', maxLength = 240) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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

export function getHubtelCheckoutUrl(result) {
  return String(
    result?.data?.checkoutUrl
      || result?.data?.checkoutDirectUrl
      || result?.checkoutUrl
      || result?.checkoutDirectUrl
      || ''
  ).trim();
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

export function getHubtelPaidAmount(result) {
  const candidates = [
    result?.data?.amount,
    result?.data?.Amount,
    result?.data?.paidAmount,
    result?.data?.PaidAmount,
    result?.data?.transactionAmount,
    result?.data?.TransactionAmount,
    result?.amount,
    result?.Amount,
    result?.paidAmount,
    result?.PaidAmount,
    result?.transactionAmount,
    result?.TransactionAmount,
  ];

  for (const value of candidates) {
    const amount = Number(value);

    if (Number.isFinite(amount) && amount >= 0) {
      return amount;
    }
  }

  return null;
}

export function getHubtelErrorMessage(result, fallback = 'Unable to continue with Hubtel right now.') {
  const genericErrors = new Set([
    'Unable to start payment.',
    'Unable to verify payment status.',
  ]);

  const candidates = [
    result?.data?.error,
    result?.data?.message,
    result?.message,
    result?.details,
    result?.technicalError,
    genericErrors.has(String(result?.error || '').trim()) ? '' : result?.error,
    result?.raw,
    result?.error,
  ].map((value) => compactMessage(value));

  const firstMessage = candidates.find(Boolean);
  if (firstMessage) {
    return firstMessage;
  }

  if (Array.isArray(result?.missingFields) && result.missingFields.length > 0) {
    return `Missing required fields: ${result.missingFields.join(', ')}`;
  }

  if (result?.httpStatus) {
    return `Hubtel request failed with HTTP ${result.httpStatus}.`;
  }

  return fallback;
}

export function isHubtelPaymentVerified(result, expectedAmount = 0) {
  if (!result || result.ok === false) {
    return false;
  }

  const status = getHubtelStatusValue(result);

  const successfulStatus =
    status === 'paid' ||
    status === 'success' ||
    status === 'successful' ||
    status === 'completed' ||
    status === 'complete';

  if (!successfulStatus) {
    return false;
  }

  const expected = Number(expectedAmount || 0);
  const paid = getHubtelPaidAmount(result);

  if (expected <= 0 || paid == null) {
    return successfulStatus;
  }

  return Math.abs(paid - expected) < 0.01;
}

export function getHubtelCallbackTarget() {
  return getHubtelCallbackUrl();
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
  const endpoint = getHubtelInitiateUrl();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: authHeaders(),
      cache: 'no-store',
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

    const result = await readJsonResponse(response, 'Unable to parse Hubtel initiation response.');
    return {
      ...withMeta(result, response),
      endpoint,
    };
  } catch (error) {
    console.error('[HubtelClient] Error initiating payment:', error);
    return {
      error: 'Unable to start payment.',
      technicalError: error?.message || 'Unknown network error.',
      endpoint,
    };
  }
}

export async function checkPaymentStatus(clientReference, extraQuery = {}) {
  try {
    const url = new URL(getHubtelStatusUrl());
    if (clientReference) {
      url.searchParams.set('clientReference', clientReference);
    }

    Object.entries(extraQuery || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value).trim()) {
        url.searchParams.set(key, String(value).trim());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    const result = await readJsonResponse(response, 'Unable to parse Hubtel status response.');
    return {
      ...withMeta(result, response),
      endpoint: url.toString(),
    };
  } catch (error) {
    console.error('[HubtelClient] Status check error:', error);
    return {
      error: 'Unable to verify payment status.',
      technicalError: error?.message || 'Unknown network error.',
    };
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
    callbackUrl: callbackUrl || getHubtelCallbackUrl(),
    returnUrl,
    cancellationUrl,
    clientReference,
    payeeName: order?.customer_name,
    payeeMobileNumber: order?.customer_phone,
    payeeEmail: order?.customer_email,
  });
}
