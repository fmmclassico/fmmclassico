// Server function: retrieve UAT sample payloads for documentation
// Use: GET /api/hubtel/uat-samples

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Import callback module to access samples (if deployed in same context)
  // For now, return placeholder structure that will be filled by callbacks
  try {
    const samples = {
      callbacks: [],
      statusChecks: [],
      note: 'Samples are collected automatically when payments are processed. Run a test payment to populate.',
      exampleCallbackStructure: {
        "ResponseCode": "0000",
        "Status": "Success",
        "Data": {
          "CheckoutId": "7569a11e8b784f21baa9443b3fce31ed",
          "SalesInvoiceId": "e96ccfb4746045bba13f425bd573a31c",
          "ClientReference": "FMMP9V9Q",
          "Status": "Success",
          "Amount": 50.00,
          "CustomerPhoneNumber": "233242825109",
          "PaymentDetails": {
            "MobileMoneyNumber": "233242825109",
            "PaymentType": "mobilemoney",
            "Channel": "mtn-gh"
          },
          "Description": "The MTN Mobile Money payment has been approved and processed successfully."
        }
      },
      exampleStatusCheckResponse: {
        "message": "Successful",
        "responseCode": "0000",
        "data": {
          "date": "2026-06-22T12:30:00.000Z",
          "status": "Paid",
          "transactionId": "7fd01221faeb41469daec7b3561bddc5",
          "externalTransactionId": "0000006824852622",
          "paymentMethod": "mobilemoney",
          "clientReference": "FMMP9V9Q",
          "currencyCode": null,
          "amount": 50.00,
          "charges": 1.00,
          "amountAfterCharges": 49.00,
          "isFulfilled": null
        }
      }
    };

    res.status(200).json(samples);
  } catch (err) {
    console.error('UAT samples error:', err);
    res.status(500).json({ error: 'Failed to retrieve samples' });
  }
}
