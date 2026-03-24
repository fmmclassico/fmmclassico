import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
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

  const paystackUrl = `${PAYSTACK_BASE}?amount=${amount.toFixed(2)}`;

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
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 100 }}>
      {/* Header bar */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <p className="text-xs text-orange-100">Order #{orderNumber}</p>
          <p className="text-xs text-orange-100 mt-0.5">Pay securely with Paystack</p>
        </div>
        <div className="text-right bg-white/20 rounded-xl px-3 py-1.5">
          <p className="text-xs text-orange-100">Amount</p>
          <p className="font-black text-white text-xl">₵{Number.isInteger(amount) ? amount : amount.toFixed(2).replace(/\.00$/, '')}</p>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative overflow-y-auto">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-gray-500">Opening Paystack securely...</p>
          </div>
        )}
        <iframe
          src={paystackUrl}
          title="Paystack Payment"
          className="w-full h-full border-0"
          style={{ minHeight: '100%' }}
          onLoad={() => setIframeLoaded(true)}
          allow="payment *"
          loading="eager"
        />
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 bg-white border-t px-4 pt-3 pb-4 shadow-2xl" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 text-base rounded-2xl shadow-lg"
          onClick={() => window.open(paystackUrl, '_blank')}
        >
          💳 Pay Now with Paystack
        </Button>
        <p className="text-xs text-center text-gray-400 mt-1">Tap to open Paystack and complete your payment</p>
      </div>
    </div>
  );
}