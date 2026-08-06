const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    return jsonResponse({
      callbacks: [],
      statusChecks: [],
      note: 'Samples are collected automatically when payments are processed. Run a test payment to populate.',
      exampleCallbackStructure: {
        ResponseCode: '0000',
        Status: 'Success',
        Data: {
          CheckoutId: '7569a11e8b784f21baa9443b3fce31ed',
          SalesInvoiceId: 'e96ccfb4746045bba13f425bd573a31c',
          ClientReference: 'FMMP9V9Q',
          Status: 'Success',
          Amount: 50.0,
          CustomerPhoneNumber: '233242825109',
          PaymentDetails: {
            MobileMoneyNumber: '233242825109',
            PaymentType: 'mobilemoney',
            Channel: 'mtn-gh',
          },
          Description: 'The MTN Mobile Money payment has been approved and processed successfully.',
        },
      },
      exampleStatusCheckResponse: {
        message: 'Successful',
        responseCode: '0000',
        data: {
          date: '2026-06-22T12:30:00.000Z',
          status: 'Paid',
          transactionId: '7fd01221faeb41469daec7b3561bddc5',
          externalTransactionId: '0000006824852622',
          paymentMethod: 'mobilemoney',
          clientReference: 'FMMP9V9Q',
          currencyCode: null,
          amount: 50.0,
          charges: 1.0,
          amountAfterCharges: 49.0,
          isFulfilled: null,
        },
      },
    }, 200);
  } catch (error) {
    console.error('[Hubtel UAT Samples] Failed to prepare response:', error);
    return jsonResponse({ error: 'Failed to retrieve samples' }, 500);
  }
});
