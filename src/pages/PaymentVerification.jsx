import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { appClient } from '@/api/appClient.js';
import { reconcileReturnedPayment } from '@/api/hubtelClient';
import { createPageUrl } from '../utils';

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearLoggedInCart(userEmail, queryClient) {
  const cartRows = ensureArray(await appClient.entities.CartItem.filter({ user_email: userEmail }));
  await Promise.allSettled(cartRows.map((item) => appClient.entities.CartItem.delete(item.id)));
  queryClient.invalidateQueries({ queryKey: ['cartItems', userEmail] });
}

const VERIFICATION_ATTEMPTS = 12;
const VERIFICATION_INTERVAL_MS = 2500;

function getMessageFromState(state, latestTrackingMessage) {
  const fallback = String(latestTrackingMessage || '').trim();

  if (state === 'paid' || state === 'paid_from_status_fallback') {
    return fallback || 'Payment confirmed successfully. Redirecting you to your orders...';
  }

  if (state === 'failed') {
    return fallback || 'Payment was not completed. Redirecting you back to checkout...';
  }

  if (state === 'not_found') {
    return 'We could not find this order. Redirecting you back to checkout...';
  }

  return fallback || 'We are still confirming your payment. Your Orders page will update automatically once verification completes.';
}

export default function PaymentVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('Waiting for payment confirmation...');
  const [statusTone, setStatusTone] = useState('pending');

  useEffect(() => {
    let active = true;

    const run = async () => {
      const ref = searchParams.get('hubtelRef') || '';
      const paymentStage = searchParams.get('paymentStage') || 'initial';
      const hintedStatus = String(searchParams.get('status') || '').toLowerCase();

      if (!ref || paymentStage !== 'initial') {
        navigate(createPageUrl('Checkout'), { replace: true });
        return;
      }

      if (hintedStatus === 'cancelled' || hintedStatus === 'canceled') {
        setStatusTone('warning');
        setMessage('Payment was cancelled. Redirecting you back to checkout...');
        setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1500);
        return;
      }

      try {
        const user = await appClient.auth.me();

        for (let attempt = 1; attempt <= VERIFICATION_ATTEMPTS; attempt += 1) {
          if (!active) return;

          setMessage(`Confirming your payment... (${attempt}/${VERIFICATION_ATTEMPTS})`);

          const result = await reconcileReturnedPayment({ clientReference: ref }).catch(() => null);
          const state = String(result?.state || '').toLowerCase();
          const latestTrackingMessage = result?.latestTracking?.message || '';

          if (state === 'paid' || state === 'paid_from_status_fallback') {
            await clearLoggedInCart(user.email, queryClient);
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            setStatusTone('success');
            setMessage(getMessageFromState(state, latestTrackingMessage));
            setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1200);
            return;
          }

          if (state === 'failed' || state === 'not_found') {
            setStatusTone('error');
            setMessage(getMessageFromState(state, latestTrackingMessage));
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1800);
            return;
          }

          if (attempt < VERIFICATION_ATTEMPTS) {
            await sleep(VERIFICATION_INTERVAL_MS);
          }
        }

        if (!active) return;

        setStatusTone('warning');
        setMessage('Your payment is still being confirmed. We have kept the order open and the payment history will continue updating on your Orders page.');
        setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1800);
      } catch (error) {
        console.error('Payment verification page error:', error);
        setStatusTone('error');
        setMessage('We could not verify the payment right now. Please open your Orders page shortly to review the latest status.');
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [navigate, queryClient, searchParams]);

  const cardTone = statusTone === 'success'
    ? 'bg-green-50 border-green-200 text-green-900'
    : statusTone === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : statusTone === 'error'
        ? 'bg-red-50 border-red-200 text-red-900'
        : 'bg-white border-slate-200 text-slate-900';

  const Icon = statusTone === 'success'
    ? ShieldCheck
    : statusTone === 'error'
      ? AlertCircle
      : Loader2;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-sm ${cardTone}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon className={`h-8 w-8 ${statusTone === 'pending' ? 'animate-spin text-blue-600' : statusTone === 'warning' ? 'text-amber-600' : statusTone === 'error' ? 'text-red-600' : 'text-green-600'}`} />
        </div>
        <h1 className="text-lg font-bold text-center mb-2">Confirming Payment</h1>
        <p className="text-sm text-center leading-6">{message}</p>
      </div>
    </div>
  );
}
