function readEnv(name) {
  const value = Deno.env.get(name);

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/*
 * ============================================================
 * HUBTEL SERVER-SIDE CONFIGURATION
 * ============================================================
 *
 * IMPORTANT:
 * These variables MUST exist only as Supabase Edge Function
 * secrets.
 *
 * NEVER use:
 *
 * VITE_HUBTEL_CLIENT_ID
 * VITE_HUBTEL_CLIENT_SECRET
 * VITE_HUBTEL_API_ID
 * VITE_HUBTEL_API_KEY
 * VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER
 *
 * VITE_* variables can be exposed to the browser.
 */

const HUBTEL_CLIENT_ID = readEnv('HUBTEL_CLIENT_ID');

const HUBTEL_CLIENT_SECRET = readEnv('HUBTEL_CLIENT_SECRET');

const MERCHANT_ACCOUNT_NUMBER = readEnv(
  'HUBTEL_MERCHANT_ACCOUNT_NUMBER'
);

const HUBTEL_INITIATE_URL =
  readEnv('HUBTEL_INITIATE_URL') ||
  'https://payproxyapi.hubtel.com/items/initiate';


/*
 * ============================================================
 * CORS
 * ============================================================
 */

function createCorsHeaders(req) {
  const origin = req.headers.get('origin');

  return {
    'Access-Control-Allow-Origin': origin || '*',

    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',

    'Access-Control-Allow-Methods':
      'POST, OPTIONS',

    'Access-Control-Max-Age':
      '86400',

    Vary:
      'Origin, Access-Control-Request-Headers',
  };
}


/*
 * ============================================================
 * JSON RESPONSE
 * ============================================================
 */

function jsonResponse(req, body, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...createCorsHeaders(req),
        'Content-Type': 'application/json',
      },
    }
  );
}


/*
 * ============================================================
 * CONFIGURATION VALIDATION
 * ============================================================
 */

function getMissingConfiguration() {
  return [
    !HUBTEL_CLIENT_ID
      ? 'HUBTEL_CLIENT_ID'
      : null,

    !HUBTEL_CLIENT_SECRET
      ? 'HUBTEL_CLIENT_SECRET'
      : null,

    !MERCHANT_ACCOUNT_NUMBER
      ? 'HUBTEL_MERCHANT_ACCOUNT_NUMBER'
      : null,
  ].filter(Boolean);
}


function isConfigured() {
  return getMissingConfiguration().length === 0;
}


/*
 * ============================================================
 * HUBTEL AUTHENTICATION
 * ============================================================
 *
 * Hubtel credentials remain entirely server-side.
 */

function getHubtelAuthorizationHeader() {
  if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET) {
    throw new Error(
      'Hubtel client credentials are not configured.'
    );
  }

  const credentials =
    `${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`;

  return `Basic ${btoa(credentials)}`;
}


/*
 * ============================================================
 * REQUEST BODY PARSER
 * ============================================================
 */

async function parseJsonBody(req) {
  try {
    const text = await req.text();

    if (!text) {
      return null;
    }

    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}


/*
 * ============================================================
 * SANITIZATION
 * ============================================================
 */

function sanitizeDescription(value = '') {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return cleaned || 'FMM CLASSICO checkout';
}


function sanitizePhone(value = '') {
  return String(value || '')
    .replace(/[^0-9+]/g, '')
    .slice(0, 20);
}


function sanitizeEmail(value = '') {
  return String(value || '')
    .trim()
    .slice(0, 120);
}


function sanitizeName(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}


function sanitizeClientReference(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim()
    .slice(0, 32);
}


/*
 * ============================================================
 * AMOUNT NORMALIZATION
 * ============================================================
 */

function normalizeAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Number(amount.toFixed(2));
}


/*
 * ============================================================
 * REQUEST VALIDATION
 * ============================================================
 */

function validatePayload(body = {}) {
  const totalAmount =
    normalizeAmount(body.totalAmount);

  const callbackUrl =
    String(body.callbackUrl || '').trim();

  const returnUrl =
    String(body.returnUrl || '').trim();

  const cancellationUrl =
    String(body.cancellationUrl || '').trim();

  const clientReference =
    sanitizeClientReference(
      body.clientReference || ''
    );

  const description =
    sanitizeDescription(
      body.description ||
      `Payment for ${clientReference || 'order'}`
    );

  const missingFields = [
    totalAmount == null || totalAmount <= 0
      ? 'totalAmount'
      : null,

    !callbackUrl
      ? 'callbackUrl'
      : null,

    !returnUrl
      ? 'returnUrl'
      : null,

    !cancellationUrl
      ? 'cancellationUrl'
      : null,

    !clientReference
      ? 'clientReference'
      : null,
  ].filter(Boolean);

  return {
    missingFields,

    payload: {
      totalAmount,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      clientReference,
      description,

      payeeName:
        sanitizeName(body.payeeName || ''),

      payeeMobileNumber:
        sanitizePhone(
          body.payeeMobileNumber || ''
        ),

      payeeEmail:
        sanitizeEmail(
          body.payeeEmail || ''
        ),
    },
  };
}


/*
 * ============================================================
 * HUBTEL REQUEST PAYLOAD
 * ============================================================
 */

function buildHubtelPayload(payload) {
  return {
    totalAmount:
      payload.totalAmount,

    description:
      payload.description,

    callbackUrl:
      payload.callbackUrl,

    returnUrl:
      payload.returnUrl,

    merchantAccountNumber:
      MERCHANT_ACCOUNT_NUMBER,

    cancellationUrl:
      payload.cancellationUrl,

    clientReference:
      payload.clientReference,

    ...(payload.payeeName
      ? {
          payeeName:
            payload.payeeName,
        }
      : {}),

    ...(payload.payeeMobileNumber
      ? {
          payeeMobileNumber:
            payload.payeeMobileNumber,
        }
      : {}),

    ...(payload.payeeEmail
      ? {
          payeeEmail:
            payload.payeeEmail,
        }
      : {}),
  };
}


/*
 * ============================================================
 * HUBTEL RESPONSE PARSER
 * ============================================================
 */

async function parseHubtelResponse(response) {
  const text = await response.text();

  if (!text) {
    return {
      httpStatus:
        response.status,

      ok:
        response.ok,

      body:
        {},
    };
  }

  try {
    return {
      httpStatus:
        response.status,

      ok:
        response.ok,

      body:
        JSON.parse(text),
    };
  } catch (_) {
    return {
      httpStatus:
        response.status,

      ok:
        response.ok,

      body: {
        error:
          'Invalid JSON response from Hubtel initiate API',

        raw:
          text,
      },
    };
  }
}


/*
 * ============================================================
 * HUBTEL RESPONSE EXTRACTION
 * ============================================================
 */

function extractCheckoutData(body = {}) {
  const data =
    body?.data ||
    body?.Data ||
    body;

  return {
    responseCode:
      body?.responseCode ||
      body?.ResponseCode ||
      data?.responseCode ||
      data?.ResponseCode ||
      '',

    status:
      body?.status ||
      body?.Status ||
      data?.status ||
      data?.Status ||
      '',

    checkoutUrl:
      data?.checkoutUrl ||
      data?.CheckoutUrl ||
      null,

    checkoutDirectUrl:
      data?.checkoutDirectUrl ||
      data?.CheckoutDirectUrl ||
      null,

    checkoutId:
      data?.checkoutId ||
      data?.CheckoutId ||
      null,

    clientReference:
      data?.clientReference ||
      data?.ClientReference ||
      body?.clientReference ||
      body?.ClientReference ||
      null,
  };
}


/*
 * ============================================================
 * HUBTEL ERROR MESSAGE
 * ============================================================
 */

function extractHubtelMessage(body = {}) {
  return String(
    body?.message ||
    body?.Message ||
    body?.error ||
    body?.Error ||
    body?.ResponseMessage ||
    ''
  ).trim();
}


/*
 * ============================================================
 * CLIENT RESPONSE
 * ============================================================
 *
 * Do NOT expose Hubtel credentials or authentication metadata.
 */

function createClientPayload(
  body = {},
  checkout = {},
  fallbackReference = ''
) {
  return {
    responseCode:
      checkout.responseCode ||
      body?.responseCode ||
      body?.ResponseCode ||
      '',

    status:
      checkout.status ||
      body?.status ||
      body?.Status ||
      '',

    checkoutUrl:
      checkout.checkoutUrl,

    checkoutDirectUrl:
      checkout.checkoutDirectUrl,

    checkoutId:
      checkout.checkoutId,

    clientReference:
      checkout.clientReference ||
      fallbackReference ||
      body?.clientReference ||
      body?.ClientReference ||
      null,

    message:
      extractHubtelMessage(body),
  };
}


/*
 * ============================================================
 * HUBTEL INITIATE REQUEST
 * ============================================================
 *
 * ONE authentication method only.
 */

async function callHubtelInitiate(
  hubtelPayload
) {
  const authorization =
    getHubtelAuthorizationHeader();

  const response =
    await fetch(
      HUBTEL_INITIATE_URL,
      {
        method:
          'POST',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          Authorization:
            authorization,
        },

        body:
          JSON.stringify(
            hubtelPayload
          ),
      }
    );

  const parsed =
    await parseHubtelResponse(
      response
    );

  return parsed;
}


/*
 * ============================================================
 * EDGE FUNCTION
 * ============================================================
 */

Deno.serve(async (req) => {

  /*
   * ----------------------------------------------------------
   * CORS PREFLIGHT
   * ----------------------------------------------------------
   */

  if (req.method === 'OPTIONS') {
    return new Response(
      null,
      {
        status:
          204,

        headers:
          createCorsHeaders(req),
      }
    );
  }


  /*
   * ----------------------------------------------------------
   * METHOD VALIDATION
   * ----------------------------------------------------------
   */

  if (req.method !== 'POST') {
    return jsonResponse(
      req,
      {
        error:
          'Method not allowed',
      },
      405
    );
  }


  /*
   * ----------------------------------------------------------
   * CONFIGURATION VALIDATION
   * ----------------------------------------------------------
   */

  if (!isConfigured()) {
    const missingConfiguration =
      getMissingConfiguration();

    console.error(
      '[Hubtel Initiate] Missing required server configuration:',
      missingConfiguration
    );

    return jsonResponse(
      req,
      {
        error:
          'Hubtel gateway is not configured.',
      },
      500
    );
  }


  try {

    /*
     * --------------------------------------------------------
     * PARSE REQUEST
     * --------------------------------------------------------
     */

    const body =
      await parseJsonBody(req);

    if (
      !body ||
      typeof body !== 'object'
    ) {
      return jsonResponse(
        req,
        {
          error:
            'Invalid JSON.',
        },
        400
      );
    }


    /*
     * --------------------------------------------------------
     * VALIDATE PAYMENT REQUEST
     * --------------------------------------------------------
     */

    const {
      missingFields,
      payload,
    } =
      validatePayload(body);

    if (
      missingFields.length > 0
    ) {
      return jsonResponse(
        req,
        {
          error:
            'Missing required fields.',

          missingFields,
        },
        400
      );
    }


    /*
     * --------------------------------------------------------
     * BUILD HUBTEL PAYLOAD
     * --------------------------------------------------------
     */

    const hubtelPayload =
      buildHubtelPayload(
        payload
      );


    /*
     * --------------------------------------------------------
     * SERVER LOG
     * --------------------------------------------------------
     *
     * Never log credentials.
     */

    console.log(
      '[Hubtel Initiate] Starting payment request:',
      {
        clientReference:
          payload.clientReference,

        totalAmount:
          payload.totalAmount,

        hasCallbackUrl:
          Boolean(
            payload.callbackUrl
          ),

        hasReturnUrl:
          Boolean(
            payload.returnUrl
          ),

        hasCancellationUrl:
          Boolean(
            payload.cancellationUrl
          ),
      }
    );


    /*
     * --------------------------------------------------------
     * CALL HUBTEL
     * --------------------------------------------------------
     */

    const parsed =
      await callHubtelInitiate(
        hubtelPayload
      );


    /*
     * --------------------------------------------------------
     * EXTRACT CHECKOUT DATA
     * --------------------------------------------------------
     */

    const checkout =
      extractCheckoutData(
        parsed?.body || {}
      );


    /*
     * --------------------------------------------------------
     * LOG SAFE RESPONSE INFORMATION
     * --------------------------------------------------------
     */

    console.log(
      '[Hubtel Initiate] Hubtel response:',
      {
        httpStatus:
          parsed?.httpStatus ||
          null,

        ok:
          parsed?.ok ||
          false,

        responseCode:
          checkout.responseCode ||
          null,

        status:
          checkout.status ||
          null,

        checkoutId:
          checkout.checkoutId ||
          null,

        hasCheckoutUrl:
          Boolean(
            checkout.checkoutUrl ||
            checkout.checkoutDirectUrl
          ),

        clientReference:
          checkout.clientReference ||
          payload.clientReference,
      }
    );


    /*
     * --------------------------------------------------------
     * HUBTEL FAILURE
     * --------------------------------------------------------
     */

    if (!parsed?.ok) {
      const message =
        extractHubtelMessage(
          parsed?.body || {}
        );

      return jsonResponse(
        req,
        {
          error:
            message ||
            'Hubtel initiate request failed.',

          responseCode:
            checkout.responseCode ||
            '',

          status:
            checkout.status ||
            '',

          clientReference:
            payload.clientReference,
        },
        parsed?.httpStatus || 502
      );
    }


    /*
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     */

    const clientPayload =
      createClientPayload(
        parsed?.body || {},
        checkout,
        payload.clientReference
      );

    return jsonResponse(
      req,
      clientPayload,
      parsed.httpStatus
    );

  } catch (error) {

    /*
     * --------------------------------------------------------
     * SERVER ERROR
     * --------------------------------------------------------
     */

    console.error(
      '[Hubtel Initiate] Server error:',
      error
    );

    return jsonResponse(
      req,
      {
        error:
          'Failed to reach Hubtel initiate API.',

        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      502
    );
  }
});
