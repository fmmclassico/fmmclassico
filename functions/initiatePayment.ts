export default async function initiatePayment(data, context) {
  const { amount, customer_phone, network, customer_name, customer_email, order_reference } = data;
  
  // Generate unique transaction reference
  const transaction_reference = 'FMM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Get Hubtel credentials from secrets
  const HUBTEL_CLIENT_ID = context.secrets.HUBTEL_CLIENT_ID;
  const HUBTEL_CLIENT_SECRET = context.secrets.HUBTEL_CLIENT_SECRET;
  const HUBTEL_MERCHANT_ACCOUNT = context.secrets.HUBTEL_MERCHANT_ACCOUNT || '0599676419';
  
  if (!HUBTEL_CLIENT_ID || !HUBTEL_CLIENT_SECRET) {
    throw new Error('Hubtel API credentials not configured');
  }
  
  // Format phone number (ensure it starts with 233)
  let formattedPhone = customer_phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '233' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('233')) {
    formattedPhone = '233' + formattedPhone;
  }
  
  // Map network names to Hubtel format
  const networkMapping = {
    'MTN': 'mtn-gh',
    'VODAFONE': 'vodafone-gh',
    'AIRTELTIGO': 'tigo-gh'
  };
  
  const hubtelNetwork = networkMapping[network] || 'mtn-gh';
  
  // Create payment record
  const payment = await context.entities.Payment.create({
    transaction_reference,
    order_id: order_reference,
    customer_email,
    customer_name,
    customer_phone: formattedPhone,
    network,
    amount,
    status: 'PENDING'
  });
  
  try {
    // Get Hubtel access token
    const authResponse = await fetch('https://api.hubtel.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(HUBTEL_CLIENT_ID + ':' + HUBTEL_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Hubtel');
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    
    // Initiate Hubtel payment (Receive Money API)
    const paymentResponse = await fetch('https://api.hubtel.com/v2/merchantaccount/merchants/' + HUBTEL_MERCHANT_ACCOUNT + '/receive/mobilemoney', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        CustomerName: customer_name,
        CustomerMsisdn: formattedPhone,
        CustomerEmail: customer_email,
        Channel: hubtelNetwork,
        Amount: amount,
        PrimaryCallbackUrl: context.appUrl + '/api/functions/hubtelWebhook',
        Description: 'FMM CLASSICO Order Payment',
        ClientReference: transaction_reference
      })
    });
    
    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(errorData.message || 'Payment initiation failed');
    }
    
    const paymentData = await paymentResponse.json();
    
    // Update payment with Hubtel transaction ID
    await context.entities.Payment.update(payment.id, {
      hubtel_transaction_id: paymentData.TransactionId || paymentData.Data?.TransactionId
    });
    
    return {
      success: true,
      transaction_reference,
      payment_id: payment.id,
      message: 'Payment prompt sent to ' + formattedPhone
    };
    
  } catch (error) {
    // Update payment status to failed
    await context.entities.Payment.update(payment.id, {
      status: 'FAILED',
      failure_reason: error.message
    });
    
    throw error;
  }
}