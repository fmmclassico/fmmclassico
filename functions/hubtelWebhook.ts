export default async function hubtelWebhook(data, context) {
  // Hubtel sends payment status updates to this endpoint
  const { 
    ResponseCode, 
    Status,
    TransactionId,
    ClientReference,
    Amount,
    Data
  } = data;
  
  // Extract transaction reference
  const transaction_reference = ClientReference || Data?.ClientReference;
  
  if (!transaction_reference) {
    return { error: 'No transaction reference provided' };
  }
  
  // Find payment record
  const payments = await context.entities.Payment.filter({ 
    transaction_reference 
  });
  
  if (payments.length === 0) {
    return { error: 'Payment not found' };
  }
  
  const payment = payments[0];
  
  // Determine payment status
  let paymentStatus = 'PENDING';
  let orderStatus = null;
  
  // Hubtel success codes
  if (ResponseCode === '0000' || Status === 'Success' || Status === 'Successful') {
    paymentStatus = 'SUCCESS';
    orderStatus = 'confirmed';
  } else if (Status === 'Failed' || ResponseCode === '1000') {
    paymentStatus = 'FAILED';
  }
  
  // Update payment record
  await context.entities.Payment.update(payment.id, {
    status: paymentStatus,
    hubtel_transaction_id: TransactionId || Data?.TransactionId,
    payment_date: new Date().toISOString(),
    failure_reason: paymentStatus === 'FAILED' ? (Data?.Message || 'Payment failed') : null
  });
  
  // If payment successful, update order status
  if (paymentStatus === 'SUCCESS' && payment.order_id) {
    const orders = await context.entities.Order.filter({
      order_number: payment.order_id
    });
    
    if (orders.length > 0) {
      const order = orders[0];
      
      // Update order status and add tracking update
      const trackingUpdates = order.tracking_updates || [];
      trackingUpdates.push({
        status: 'Payment Confirmed',
        message: 'Payment of ₵' + Amount + ' received via ' + payment.network + ' Mobile Money',
        timestamp: new Date().toISOString()
      });
      
      await context.entities.Order.update(order.id, {
        status: 'confirmed',
        tracking_updates: trackingUpdates
      });
      
      // Send confirmation email to customer
      try {
        await context.integrations.Core.SendEmail({
          to: payment.customer_email,
          subject: '✅ Payment Confirmed - FMM CLASSICO',
          body: `
            <h2>Payment Successful!</h2>
            <p>Dear ${payment.customer_name},</p>
            <p>Your payment of <strong>₵${Amount}</strong> has been confirmed.</p>
            <p><strong>Order Number:</strong> ${payment.order_id}</p>
            <p><strong>Transaction Reference:</strong> ${transaction_reference}</p>
            <p>Your order is now being processed and will be delivered within 3-5 business days.</p>
            <p>Thank you for shopping with FMM CLASSICO!</p>
          `
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }
  }
  
  return { 
    success: true, 
    status: paymentStatus,
    transaction_reference 
  };
}