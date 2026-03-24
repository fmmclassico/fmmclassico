import React, { useEffect } from 'react';
import { createPageUrl } from '../utils';
import { Loader2, ShieldCheck } from 'lucide-react';

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

    // Build the callback URL — point to root "/" so the app always loads,
    // then Home page detects the redirect param and navigates to PaymentConfirmed.
    // This avoids ERR_TIMED_OUT caused by deep SPA routes failing on cold starts.
    const callbackUrl = `${window.location.origin}/?paystack_return=1`;
    const paystackUrl = `${PAYSTACK_BASE}?amount=${amount}&callback_url=${encodeURIComponent(callbackUrl)}`;

    // Use window.top to break out of any iframe (e.g. preview sandbox)
    const target = window.top || window;
    setTimeout(() => {
      target.location.href = paystackUrl;
    }, 800);
  }, [orderId, amount]);

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4 px-6">
      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-2">
        <ShieldCheck className="h-8 w-8 text-orange-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Secure Payment</h2>
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-8 py-4 text-center">
        <p className="text-sm text-gray-500 mb-1">Amount to Pay</p>
        <p className="text-3xl font-black text-orange-600">₵{Number(amount).toFixed(2)}</p>
        {orderNumber && <p className="text-xs text-gray-400 mt-1">Order #{orderNumber}</p>}
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        <p className="text-sm font-medium">Redirecting to Paystack...</p>
      </div>
      <p className="text-xs text-gray-400 text-center max-w-xs">You will be redirected to Paystack's secure payment page. Do not close this page.</p>
    </div>
  );
}