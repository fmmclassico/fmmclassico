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

  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  if (!user || !orderId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const paystackUrl = `${PAYSTACK_BASE}?amount=${amount.toFixed(2)}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 100 }}>
      {/* Loading overlay */}
      {!iframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm text-gray-500">Loading Paystack securely...</p>
        </div>
      )}

      {/* Paystack iframe — full screen, no chrome around it */}
      <iframe
        src={paystackUrl}
        title="Paystack Payment"
        className="w-full flex-1 border-0"
        style={{ height: '100%', minHeight: '100vh' }}
        onLoad={() => setIframeLoaded(true)}
        allow="payment *"
        loading="eager"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}