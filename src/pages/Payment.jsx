import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const PAYSTACK_BASE = "https://paystack.shop/pay/1miimvhai8";

export default function Payment() {
  const [user, setUser] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw = urlParams.get('amount');
  const amount = amountRaw ? parseFloat(amountRaw) : 0;

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  const paystackUrl = `${PAYSTACK_BASE}`;

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      } else {
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    getUser();
  }, []);

  if (!user || !orderId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-gray-500 text-sm">Loading payment...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-4">
      {/* Payment header */}
      <div className="bg-orange-50 border border-orange-200 rounded-t-xl md:rounded-xl px-4 py-3 flex items-center justify-between mb-0 md:mb-3">
        <div>
          <p className="text-sm font-bold text-orange-800">Secure Payment</p>
          <p className="text-xs text-orange-600">Order #{orderNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-orange-500">Amount</p>
          <p className="font-black text-orange-700 text-lg">₵{amount % 1 === 0 ? amount : amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Paystack iframe */}
      <div className="relative bg-white border border-gray-200 rounded-b-xl md:rounded-xl overflow-hidden"
           style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-gray-500">Loading Paystack securely...</p>
          </div>
        )}
        <iframe
          src={paystackUrl}
          title="Paystack Payment"
          className="w-full h-full border-0"
          onLoad={() => setIframeLoaded(true)}
          allow="payment *"
          loading="eager"
          sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation allow-popups"
        />
      </div>

      <p className="text-center text-xs text-gray-400 mt-2 pb-2">
        🔒 Payments are secured and encrypted by Paystack
      </p>
    </div>
  );
}