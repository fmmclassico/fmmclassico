import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const PAYSTACK_BASE = "https://paystack.shop/pay/1miimvhai8";

export default function Payment() {
  const [user, setUser] = useState(null);
  const [launched, setLaunched] = useState(false);

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

  // Auto-open Paystack in current tab as soon as user & order are ready
  useEffect(() => {
    if (user && orderId && !launched) {
      setLaunched(true);
      window.location.href = paystackUrl;
    }
  }, [user, orderId, launched, paystackUrl]);

  // Show a loading/redirect screen — Paystack will take over the tab
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4" style={{ zIndex: 100 }}>
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      <p className="text-gray-600 font-medium text-sm">Redirecting you to Paystack...</p>
      <p className="text-xs text-gray-400">Order #{orderNumber} · ₵{Number.isInteger(amount) ? amount : amount.toFixed(2)}</p>
    </div>
  );
}