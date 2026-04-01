import React, { useEffect } from 'react';
import { Loader2, ShieldCheck, Package } from 'lucide-react';

const PAYSTACK_BASE = "https://paystack.shop/pay/1miimvhai8";

// Format amount: remove trailing .00 but keep decimals if meaningful e.g. 120 not 120.00, but 120.50 stays
function formatAmount(num) {
  const n = Number(num);
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
}

export default function Payment() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw = urlParams.get('amount');
  const amount = amountRaw ? parseFloat(amountRaw) : 0;

  // Store order details in sessionStorage so PaymentConfirmed can retrieve them
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  useEffect(() => {
    if (!orderId || amount <= 0) return;
    const callbackUrl = `${window.location.origin}/?paystack_return=1`;
    const paystackUrl = `${PAYSTACK_BASE}?amount=${Math.round(amount * 100)}&callback_url=${encodeURIComponent(callbackUrl)}`;
    const target = window.top || window;
    setTimeout(() => {
      target.location.href = paystackUrl;
    }, 1200);
  }, [orderId, amount]);

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 font-semibold text-center">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Title Bar — ONLY on this Payment page ── */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-white" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">FMM CLASSICO</p>
            {orderNumber && (
              <p className="text-orange-100 text-[11px] leading-tight">Order #{orderNumber}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-orange-100 text-[11px]">Amount to Pay</p>
          <p className="text-white font-black text-lg leading-tight">₵{formatAmount(amount)}</p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-10">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
          <ShieldCheck className="h-10 w-10 text-orange-500" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Secure Payment</h2>
          <p className="text-gray-500 text-sm">You are being redirected to Paystack's secure payment page</p>
        </div>

        {/* Order Summary Box */}
        <div className="w-full max-w-xs bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
          {orderNumber && (
            <p className="text-xs text-gray-500 mb-1">Order <span className="font-semibold text-gray-700">#{orderNumber}</span></p>
          )}
          <p className="text-4xl font-black text-orange-600 my-2">₵{formatAmount(amount)}</p>
          <p className="text-xs text-gray-400">Total payable to FMM CLASSICO</p>
        </div>

        {/* Redirecting indicator */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Redirecting to Paystack...</p>
            <p className="text-xs text-gray-400">Please wait, do not close this page</p>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
          <span>🔒 SSL Secured</span>
          <span>·</span>
          <span>✅ Paystack Verified</span>
          <span>·</span>
          <span>🛡️ Safe Checkout</span>
        </div>
      </div>
    </div>
  );
}