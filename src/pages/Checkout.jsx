const handleCheckout = async () => {
  if (!validateBeforeSubmit()) return;

  setIsSubmitting(true);
  setFeedback(null);

  const orderNumber = createOrderNumber();
  const initialPaymentReference = createInitialPaymentReference(orderNumber, formData.payment_method);
  const balancePaymentReference = orderSummary.balanceDue > 0 ? createBalancePaymentReference(orderNumber) : null;
  const paymentLabel = getPaymentMethodLabel(formData.payment_method);
  const orderItems = buildOrderItems(cartItems);
  const deliveryAddress = buildDeliveryAddress({
    address: formData.address,
    landmark: formData.landmark,
    city: locationValidation.canonicalCity || formData.city,
    region: locationValidation.canonicalRegion || formData.region,
  });
  const payDescription = sanitizeHubtelDescription(`FMM CLASSICO ${paymentLabel} ${orderNumber}`);

  try {
    const returnUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=success&orderNumber=${encodeURIComponent(orderNumber)}`;
    const cancellationUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=cancelled&orderNumber=${encodeURIComponent(orderNumber)}`;

    const initRes = await initiatePayment({
      totalAmount: orderSummary.totalToPayNow,
      description: payDescription,
      callbackUrl: HUBTEL_CALLBACK_URL,
      returnUrl,
      cancellationUrl,
      clientReference: initialPaymentReference,
      payeeName: formData.customer_name.trim(),
      payeeMobileNumber: formData.customer_phone.trim(),
      payeeEmail: user.email,
    });

    const checkoutUrl = initRes?.data?.checkoutUrl;
    const checkoutId = initRes?.data?.checkoutId || null;
    const responseCode = initRes?.responseCode || null;
    const gatewayStatus = initRes?.status || null;

    if (!(checkoutUrl && responseCode === '0000')) {
      showFeedback(
        'error',
        initRes?.error || initRes?.message || gatewayStatus || 'Hubtel did not return a valid checkout link.',
        'Unable to continue'
      );
      return;
    }

    const orderRecord = await appClient.entities.Order.create({
      order_number: orderNumber,
      customer_name: formData.customer_name.trim(),
      customer_email: user.email,
      customer_phone: formData.customer_phone.trim(),
      delivery_address: deliveryAddress,
      address: formData.address.trim(),
      landmark: formData.landmark.trim() || null,
      region: locationValidation.canonicalRegion || formData.region.trim(),
      city: locationValidation.canonicalCity || formData.city.trim(),
      delivery_zone_id: selectedZone.id,
      delivery_zone_label: selectedZone.label,
      delivery_fee: orderSummary.deliveryFee,
      subtotal: orderSummary.subtotal,
      total_amount: orderSummary.totalToPayNow,
      grand_total: orderSummary.grandTotal,
      amount_paid_now: orderSummary.totalToPayNow,
      initial_payment_amount: orderSummary.totalToPayNow,
      balance_due: orderSummary.balanceDue,
      balance_payment_amount: orderSummary.balanceDue,
      payment_method: formData.payment_method,
      payment_status: 'pending_payment',
      initial_payment_status: 'pending_payment',
      balance_payment_status: orderSummary.isTwoStage ? 'pending' : 'not_required',
      payment_stage: orderSummary.isTwoStage ? 'awaiting_initial_payment' : 'awaiting_full_payment',
      remaining_balance_paid: false,
      is_fully_paid: false,
      balance_payment_enabled: false,
      initial_payment_reference: initialPaymentReference,
      balance_payment_reference: balancePaymentReference,
      initial_checkout_id: checkoutId,
      payment_reference: initialPaymentReference,
      items: orderItems,
      status: 'pending_payment',
      tracking_updates: [
        {
          status: 'Hubtel Redirect Created',
          message: `Hubtel accepted the payment request for ${paymentLabel}. ResponseCode ${responseCode || 'N/A'}. CheckoutId ${checkoutId || 'N/A'}. Waiting for verified payment confirmation before placing the order.`,
          timestamp: new Date().toISOString(),
        },
      ],
      created_date: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
    showFeedback('info', 'Redirecting you to Hubtel for secure payment...', 'Opening payment');
    window.location.href = checkoutUrl;
    return;
  } catch (error) {
    console.error('Checkout error:', error);
    showFeedback('error', error?.message || 'We could not start your checkout right now. Please try again.', 'Checkout failed');
  } finally {
    setIsSubmitting(false);
  }
};
