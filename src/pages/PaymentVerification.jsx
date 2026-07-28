import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { checkPaymentStatus, getBaseOrderReference } from '@/api/hubtelClient';
import { useQueryClient } from '@tanstack/react-query';

const VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_INTERVAL_MS = 1000;

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function clearLoggedInCart(userEmail, queryClient) {
  const cartRows = ensureArray(await appClient.entities.CartItem.filter({ user_email: userEmail }));
  await Promise.allSettled(cartRows.map((item) => appClient.entities.CartItem.delete(item.id)));
  queryClient.invalidateQueries({ queryKey: ['cartItems', userEmail] });
}

function getStatusValue(result) {
  return String(result?.data?.status || result?.data?.Status || result?.status || '').toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('Checking payment status with Hubtel and verifying callback logs...');

  useEffect(() => {
    let active = true;

    const runVerification = async () => {
      const ref = searchParams.get('hubtelRef') || '';
      const orderId = searchParams.get('orderId') || '';
      const paymentStage = searchParams.get('paymentStage') || 'initial';
      const hintedStatus = String(searchParams.get('status') || '').toLowerCase();

      if (!ref || paymentStage !== 'initial') {
        navigate(createPageUrl('Checkout'), { replace: true });
        return;
      }

      try {
        const user = await appClient.auth.me();
        const baseReference = getBaseOrderReference(ref);

        for (let attempt = 1; attempt <= VERIFICATION_ATTEMPTS; attempt += 1) {
          if (!active) return;
          setMessage(`Verifying payment... (${attempt}/${VERIFICATION_ATTEMPTS})`);

          const orders = ensureArray(await appClient.entities.Order.filter({ customer_email: user.email }, '-created_date', 200));
          const currentOrder = orders.find((item) => item.id === orderId || item.order_number === baseReference);

          if (currentOrder && (currentOrder.initial_payment_status === 'paid' || currentOrder.payment_status === 'paid' || currentOrder.payment_stage === 'fully_paid')) {
            await clearLoggedInCart(user.email, queryClient);
            toast.success('Payment confirmed successfully.');
            navigate(createPageUrl('Orders'), { replace: true });
            return;
          }

          const result = await checkPaymentStatus(ref).catch(() => null);
          const statusValue = getStatusValue(result);

          if (statusValue === 'failed' || statusValue === 'unpaid') {
            toast.error('Payment failed. Your cart is still available.');
            navigate(createPageUrl('Checkout'), { replace: true });
            return;
          }

          if (statusValue === 'cancelled' || statusValue === 'canceled') {
            toast.error('Payment was cancelled. Your cart is still available.');
            navigate(createPageUrl('Checkout'), { replace: true });
            return;
          }

          if (attempt < VERIFICATION_ATTEMPTS) {
            await sleep(VERIFICATION_INTERVAL_MS);
          }
        }

        if (hintedStatus === 'cancelled' || hintedStatus === 'canceled') {
          toast.error('Payment was cancelled. Your cart is still available.');
        } else {
          toast.error('No successful payment was confirmed. Your cart is still available.');
        }
        navigate(createPageUrl('Checkout'), { replace: true });
      } catch (error) {
        console.error('Payment verification page error:', error);
        toast.error('We could not verify the payment right now. Your cart is still available.');
        navigate(createPageUrl('Checkout'), { replace: true });
      }
    };

    runVerification();

    return () => {
      active = false;
    };
  }, [navigate, queryClient, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-green-800 mb-2">Verifying Payment</h2>
        <p className="text-sm text-green-600 mb-3">Please wait while we verify your Hubtel payment.</p>
        <p className="text-xs text-gray-500">{message}</p>
        <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Secure verification in progress
        </div>
      </div>
    </div>
  );
}

