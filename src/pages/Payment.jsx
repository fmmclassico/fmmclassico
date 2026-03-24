import React, { useEffect } from 'react';
import { createPageUrl } from '../utils';
import { Loader2 } from 'lucide-react';

const PAYSTACK_BASE = "https://paystack.shop/pay/1miimvhai8";

export default function Payment() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw = urlParams.get('amount');
  const amount = amountRaw ? parseFloat(amountRaw) : 0;

  // Store order details in sessionStorage so PaymentConfirmed can retrieve them
  // after Paystack redirects back (Paystack won't preserve our URL params)
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  useEffect(() => {
    if (!orderId || amount <= 0) return;

    // Build the callback URL pointing to our PaymentConfirmed page
    const callbackUrl = `${window.location.origin}${createPageUrl('PaymentConfirmed')}`;
    const paystackUrl = `${PAYSTACK_BASE}?amount=${amount}&callback_url=${encodeURIComponent(callbackUrl)}`;

    // Redirect immediately — no delay
    window.location.replace(paystackUrl);
  }, [orderId, amount]);

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      <p className="text-sm text-gray-500 font-medium">Redirecting to Paystack...</p>
    </div>
  );
}