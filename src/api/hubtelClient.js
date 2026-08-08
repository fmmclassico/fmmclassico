import {
  getHubtelCallbackUrl,
  getHubtelInitiateUrl,
  getHubtelStatusUrl,
} from '@/lib/runtime-config';

import { supabaseClient } from '@/lib/supabase';

async function getAuthorizationHeaders() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error('[HubtelClient] Failed to get Supabase session:', error);
    throw new Error('Unable to verify your login session.');
  }

  if (!session?.access_token) {
    throw new Error('Your login session has expired. Please sign in again.');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function buildRequestHeaders({
  includeJsonContentType = false,
  includeAuthorization = false,
} = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (includeAuthorization) {
    const authHeaders = await getAuthorizationHeaders();
    Object.assign(headers, authHeaders);
  }

  return headers;
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

  if (!text) {
    return {};
  }

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

function isNetworkBoundaryError(error) {
  const message = String(error?.message || '').toLowerCase();

  return (
    error instanceof TypeError ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('cors')
  );
}

function createReachabilityError(error, fallback) {
  const likelyCorsOrDeploymentIssue = isNetworkBoundaryError(error);

  return {
    error: likelyCorsOrDeploymentIssue
      ? 'The Hubtel payment gateway could not be reached.'
      : fallback,
    technicalError: error?.message || 'Unknown network error.',
    likelyCorsOrDeploymentIssue,
  };
}

function resolveRequestUrl(url) {
  if (/^https?:\/\//i.test(String(url || ''))) {
    return String(url);
  }

  if (typeof window === 'undefined') {
    throw new Error(
      'A browser origin is required to resolve the Hubtel request URL.'
    );
  }

  return new URL(String(url || ''), window.location.origin).toString();
}

function getHubtelDataNode(result = {}) {
  if (!result || typeof result !== 'object') {
    return {};
  }

  const directData = result?.data;

  if (
    directData &&
    typeof directData === 'object' &&
    !Array.isArray(directData)
  ) {
    if (
      directData?.data &&
      typeof directData.data === 'object' &&
      !Array.isArray(directData.data)
    ) {
      return directData.data;
    }

    if (
      directData?.Data &&
      typeof directData.Data === 'object' &&
      !Array.isArray(directData.Data)
    ) {
      return directData.Data;
    }

    return directData;
  }

  if (
    result?.Data &&
    typeof result.Data === 'object' &&
    !Array.isArray(result.Data)
  ) {
    return result.Data;
  }

  return result;
}

function getHubtelResponseCode(result = {}) {
  return String(
    result?.responseCode ||
      result?.ResponseCode ||
      result?.data?.responseCode ||
      result?.data?.ResponseCode ||
      ''
  ).trim();
}

function extractDiagnosticCandidates(result) {
  const payload = getHubtelDataNode(result);

  return [
    payload?.error,
    payload?.message,
    payload?.Message,
    result?.data?.error,
    result?.data?.message,
    result?.message,
    result?.details,
    result?.technicalError,
    result?.raw,
    result?.error,
  ]
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean);
}

function hasAuthorizationProxyError(result) {
  const values = extractDiagnosticCandidates(result);

  return (
    result?.httpStatus === 401 ||
    values.some(
      (value) =>
        value.includes('missing authorization header') ||
        value.includes('authorization credentials') ||
        value.includes('unauthorized') ||
        value.includes('invalid authorization') ||
        value.includes('invalid api key') ||
        value.includes('invalid credentials')
    )
  );
}

function hasWhitelistingOrForbiddenStatusError(result) {
  const values = extractDiagnosticCandidates(result);

  return (
    result?.httpStatus === 403 ||
    values.some(
      (value) =>
        value.includes('forbidden') ||
        value.includes('whitelist') ||
        value.includes('not been whitelisted') ||
        value.includes('ip address')
    )
  );
}

export function createInitialPaymentReference(
  orderNumber,
  paymentMethod
) {
  if (paymentMethod === 'deposit_balance') {
    return `${orderNumber}-INIT`;
  }

  if (paymentMethod === 'pay_on_delivery') {
    return `${orderNumber}-DEL`;
  }

  return `${orderNumber}-FULL`;
}

export function createBalancePaymentReference(orderNumber) {
  return `${orderNumber}-BAL`;
}

export function getBaseOrderReference(reference = '') {
  return String(reference || '').replace(
    /-(INIT|DEL|FULL|BAL)$/i,
    ''
  );
}

export function getHubtelCheckoutUrl(result) {
  const payload = getHubtelDataNode(result);

  return String(
    payload?.checkoutUrl ||
      payload?.CheckoutUrl ||
      payload?.checkoutDirectUrl ||
      payload?.CheckoutDirectUrl ||
      result?.checkoutUrl ||
      result?.CheckoutUrl ||
      result?.checkoutDirectUrl ||
      result?.CheckoutDirectUrl ||
      ''
  ).trim();
}

export function getHubtelStatusValue(result) {
  const payload = getHubtelDataNode(result);

  return String(
    payload?.status ||
      payload?.Status ||
      payload?.transactionStatus ||
      payload?.TransactionStatus ||
      result?.status ||
      result?.Status ||
      result?.transactionStatus ||
      result?.TransactionStatus ||
      ''
  )
    .toLowerCase()
    .trim();
}

export function getHubtelPaidAmount(result) {
  const payload = getHubtelDataNode(result);

  const candidates = [
    payload?.amount,
    payload?.Amount,
    payload?.paidAmount,
    payload?.PaidAmount,
    payload?.transactionAmount,
    payload?.TransactionAmount,
    payload?.customerChargeAmount,
    payload?.CustomerChargeAmount,
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

export function getHubtelDiagnosticMessage(
  result,
  fallback = 'Unable to continue with Hubtel right now.'
) {
  const payload = getHubtelDataNode(result);

  const genericErrors = new Set([
    'Unable to start payment.',
    'Unable to verify payment status.',
  ]);

  const candidates = [
    payload?.error,
    payload?.message,
    payload?.Message,
    result?.data?.error,
    result?.data?.message,
    result?.message,
    result?.details,
    result?.technicalError,
    genericErrors.has(String(result?.error || '').trim())
      ? ''
      : result?.error,
    result?.raw,
  ].map((value) => compactMessage(value));

  const firstMessage = candidates.find(Boolean);

  if (firstMessage) {
    return firstMessage;
  }

  if (
    Array.isArray(result?.missingFields) &&
    result.missingFields.length > 0
  ) {
    return `Missing required fields: ${result.missingFields.join(', ')}`;
  }

  const responseCode = getHubtelResponseCode(result);

  if (responseCode) {
    return `Hubtel returned response code ${responseCode}.`;
  }

  if (result?.httpStatus) {
    return `Hubtel request failed with HTTP ${result.httpStatus}.`;
  }

  return fallback;
}

export function getHubtelCustomerErrorMessage(
  result,
  fallback = 'We could not start your payment right now. Please try again.'
) {
  if (result?.likelyCorsOrDeploymentIssue) {
    return 'We could not reach the secure payment service right now. Please try again in a moment.';
  }

  if (hasAuthorizationProxyError(result)) {
    return 'We could not start your secure payment right now. Please try again shortly or contact support if the issue continues.';
  }

  if (hasWhitelistingOrForbiddenStatusError(result)) {
    return 'We could not verify the payment service right now. Please try again later.';
  }

  const responseCode = getHubtelResponseCode(result);

  if (responseCode === '4070') {
    return 'This payment could not be completed right now. Please try again later or contact support.';
  }

  if (
    responseCode === '4000' ||
    (Array.isArray(result?.missingFields) &&
      result.missingFields.length > 0)
  ) {
    return 'Some checkout details were incomplete. Please review your information and try again.';
  }

  if (result?.httpStatus >= 500) {
    return 'The secure payment service is temporarily unavailable. Please try again later.';
  }

  if (result?.httpStatus >= 400) {
    return 'We could not start your secure payment right now. Please review your details and try again.';
  }

  return fallback;
}

export function isHubtelPaymentVerified(
  result,
  expectedAmount = 0
) {
  if (!result || result.ok === false) {
    return false;
  }

  const status = getHubtelStatusValue(result);
  const responseCode = getHubtelResponseCode(result);

  const successfulStatus =
    status === 'paid' ||
    status === 'success' ||
    status === 'successful' ||
    status === 'completed' ||
    status === 'complete' ||
    (!status && responseCode === '0000');

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
    const headers = await buildRequestHeaders({
      includeJsonContentType: true,
      includeAuthorization: true,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
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

    const result = await readJsonResponse(
      response,
      'Unable to parse Hubtel initiation response.'
    );

    return withMeta(result, response);
  } catch (error) {
    console.error(
      '[HubtelClient] Error initiating payment:',
      error
    );

    return createReachabilityError(
      error,
      'Unable to start payment.'
    );
  }
}

export async function checkPaymentStatus(
  clientReference,
  extraQuery = {}
) {
  const url = new URL(
    resolveRequestUrl(getHubtelStatusUrl())
  );

  if (clientReference) {
    url.searchParams.set(
      'clientReference',
      clientReference
    );
  }

  Object.entries(extraQuery || {}).forEach(
    ([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim()
      ) {
        url.searchParams.set(
          key,
          String(value).trim()
        );
      }
    }
  );

  try {
    const headers = await buildRequestHeaders({
      includeAuthorization: true,
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const result = await readJsonResponse(
      response,
      'Unable to parse Hubtel status response.'
    );

    return withMeta(result, response);
  } catch (error) {
    console.error(
      '[HubtelClient] Status check error:',
      error
    );

    return createReachabilityError(
      error,
      'Unable to verify payment status.'
    );
  }
}

export async function verifyPaymentWithRetries(
  clientReference,
  maxRetries = 4,
  delayMs = 800
) {
  for (
    let attempt = 0;
    attempt < maxRetries;
    attempt += 1
  ) {
    const result = await checkPaymentStatus(
      clientReference
    );

    const status = getHubtelStatusValue(result);

    if (
      status === 'paid' ||
      status === 'success' ||
      status === 'successful' ||
      isHubtelPaymentVerified(result)
    ) {
      return {
        verified: true,
        status: 'paid',
        data: result,
      };
    }

    if (
      status === 'failed' ||
      status === 'unpaid'
    ) {
      return {
        verified: true,
        status: 'failed',
        data: result,
      };
    }

    if (
      status === 'cancelled' ||
      status === 'canceled'
    ) {
      return {
        verified: true,
        status: 'cancelled',
        data: result,
      };
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );
    }
  }

  return {
    verified: false,
    status: 'unknown',
    data: null,
  };
}

export async function initiateBalancePayment({
  order,
  callbackUrl,
  returnUrl,
  cancellationUrl,
}) {
  const amount = Number(
    order?.balance_due ||
      order?.balance_payment_amount ||
      0
  );

  const clientReference =
    order?.balance_payment_reference ||
    createBalancePaymentReference(
      order?.order_number || ''
    );

  const description =
    order?.payment_method === 'deposit_balance'
      ? `Remaining balance for Order ${order.order_number}`
      : `Product balance for Order ${order.order_number}`;

  return initiatePayment({
    totalAmount: amount,
    description,
    callbackUrl:
      callbackUrl || getHubtelCallbackUrl(),
    returnUrl,
    cancellationUrl,
    clientReference,
    payeeName: order?.customer_name,
    payeeMobileNumber: order?.customer_phone,
    payeeEmail: order?.customer_email,
  });
}
