import React, { useEffect, useState } from 'react';
import { Package, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

const PAYSTACK_BASE = "https://paystack.shop/pay/1miimvhai8";

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
  const [countdown, setCountdown] = useState(3);

  // Store order details in sessionStorage so PaymentConfirmed can retrieve them
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  // Countdown then redirect to Paystack with correct amount in pesewas and callback to /PaymentConfirmed
  useEffect(() => {
    if (!orderId || amount <= 0) return;
    const callbackUrl = `${window.location.origin}/PaymentConfirmed`;
    // Paystack shop links take amount in pesewas (GHS × 100)
    const paystackUrl = `${PAYSTACK_BASE}?amount=${Math.round(amount * 100)}&callback_url=${encodeURIComponent(callbackUrl)}`;

    if (countdown <= 0) {
      window.location.href = paystackUrl;
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, orderId, amount]);

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Dark Red Header Bar — Order # + Amount — ONLY on Payment page ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 shadow-md"
        style={{ background: 'linear-gradient(90deg, #1f2937 0%, #374151 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">FMM CLASSICO</p>
            {orderNumber && (
              <p className="text-gray-300 text-[11px] leading-tight">Order #{orderNumber}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-gray-300 text-[10px] uppercase tracking-wider">Amount to Pay</p>
            <p className="text-white font-black text-xl leading-tight">₵{formatAmount(amount)}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
            <Lock className="h-3 w-3 text-white" />
            <span className="text-white text-[10px] font-semibold">Secure</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-10">

        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center shadow-inner">
          <ShieldCheck className="h-10 w-10 text-gray-700" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Secure Payment</h2>
          <p className="text-gray-500 text-sm">You'll be taken to Paystack's secure payment page</p>
        </div>

        {/* Order + Amount summary card */}
        <div className="w-full max-w-xs rounded-2xl border-2 border-gray-200 p-5 text-center bg-gray-50">
          {orderNumber && (
            <p className="text-xs text-gray-500 mb-1">
              Order <span className="font-semibold text-gray-700">#{orderNumber}</span>
            </p>
          )}
          <p className="text-4xl font-black text-gray-800 my-2">₵{formatAmount(amount)}</p>
          <p className="text-xs text-gray-400">Total payable to FMM CLASSICO</p>
        </div>

        {/* Countdown launcher */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1f2937, #374151)' }}
          >
            {countdown > 0 ? countdown : <ArrowRight className="h-7 w-7" />}
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {countdown > 0 ? `Redirecting in ${countdown}...` : 'Opening Paystack...'}
          </p>
          <p className="text-xs text-gray-400">Please wait — do not close this page</p>
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