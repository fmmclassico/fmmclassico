import React, { useEffect, useState } from 'react';
import { Package, Lock, ShieldCheck, Loader2 } from 'lucide-react';

// Your Paystack payment link
const PAYSTACK_LINK = "https://paystack.shop/pay/1miimvhai8";

function formatAmount(num) {
  const n = Number(num);
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
}

export default function Payment() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId    = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw  = urlParams.get('amount');
  const amount     = amountRaw ? parseFloat(amountRaw) : 0;

  const [countdown, setCountdown] = useState(4);

  // Save order to sessionStorage so PaymentConfirmed can read it after callback
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  useEffect(() => {
    if (amount <= 0 || !orderId) return;

    if (countdown <= 0) {
      // Build Paystack URL:
      // - amount in PESEWAS (GHS × 100)
      // - callback_url goes back to our PaymentConfirmed page
      const callbackUrl = `${window.location.origin}/PaymentConfirmed?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}`;
      const paystackUrl = `${PAYSTACK_LINK}?amount=${Math.round(amount * 100)}&callback_url=${encodeURIComponent(callbackUrl)}`;
      window.location.href = paystackUrl;
      return;
    }

    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, amount, orderId]);

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  // Progress percentage for the countdown ring (4s total)
  const progress = ((4 - countdown) / 4) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Dark ash header — Order # + Amount ── */}
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
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Redirecting to Payment</h2>
          <p className="text-gray-500 text-sm">
            You're being taken to Paystack's secure payment page.<br/>
            <span className="text-xs text-gray-400">After payment, you'll be automatically returned to FMM CLASSICO.</span>
          </p>
        </div>

        {/* Order summary card */}
        <div className="w-full max-w-xs rounded-2xl border-2 border-gray-200 p-5 text-center bg-gray-50">
          {orderNumber && (
            <p className="text-xs text-gray-500 mb-1">
              Order <span className="font-semibold text-gray-700">#{orderNumber}</span>
            </p>
          )}
          <p className="text-4xl font-black text-gray-800 my-2">₵{formatAmount(amount)}</p>
          <p className="text-xs text-gray-400">Total payable to FMM CLASSICO</p>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="#1f2937"
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black text-gray-800">
                {countdown > 0 ? countdown : <Loader2 className="h-5 w-5 animate-spin text-gray-700" />}
              </span>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {countdown > 0 ? `Opening Paystack in ${countdown}s...` : 'Connecting to Paystack...'}
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
          <span>🔒 SSL Secured</span>
          <span>·</span>
          <span>✅ Paystack Verified</span>
          <span>·</span>
          <span>🛡️ Safe Checkout</span>
        </div>

        <p className="text-xs text-gray-300 text-center max-w-xs">
          Do not close or refresh this page. You will be redirected automatically.
        </p>
      </div>
    </div>
  );
}