import React, { useEffect, useState } from 'react';
import { Package, ShieldCheck, Lock } from 'lucide-react';

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

  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Store order details in sessionStorage so PaymentConfirmed can retrieve them
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  // Pass amount in GHS directly (not pesewas) and set callback to PaymentConfirmed
  const callbackUrl = `${window.location.origin}/PaymentConfirmed`;
  const paystackUrl = `${PAYSTACK_BASE}?amount=${Math.round(amount)}&callback_url=${encodeURIComponent(callbackUrl)}`;

  return (
    // Full-screen page that sits UNDER the normal Layout header
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Dark Red Header Bar — Order # + Amount — ONLY on Payment page ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">FMM CLASSICO</p>
            {orderNumber && (
              <p className="text-red-200 text-[11px] leading-tight">Order #{orderNumber}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-red-200 text-[10px] uppercase tracking-wider">Amount to Pay</p>
            <p className="text-white font-black text-xl leading-tight">₵{formatAmount(amount)}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
            <Lock className="h-3 w-3 text-white" />
            <span className="text-white text-[10px] font-semibold">Secure</span>
          </div>
        </div>
      </div>

      {/* ── Paystack iframe — fills remaining height ── */}
      <div className="flex-1 relative bg-gray-100">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#fef2f2' }}>
              <ShieldCheck className="h-6 w-6" style={{ color: '#991b1b' }} />
            </div>
            <p className="text-sm font-semibold text-gray-700">Loading secure payment...</p>
            <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#991b1b' }} />
          </div>
        )}
        <iframe
          src={paystackUrl}
          title="Paystack Payment"
          className="w-full h-full border-0"
          onLoad={() => setIframeLoaded(true)}
          allow="payment"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}