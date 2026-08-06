import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
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
  const [statusTone, setStatusTone] = useState('pending');

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
            setStatusTone('success');
            setMessage('Payment confirmed successfully. Redirecting you to your orders...');
            setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1200);
            return;
          }

          const result = await checkPaymentStatus(ref).catch(() => null);
          const statusValue = getStatusValue(result);

          if (statusValue === 'paid' || statusValue === 'success' || statusValue === 'successful') {
            if (currentOrder) {
              const now = new Date().toISOString();
              await appClient.entities.Order.update(currentOrder.id, {
                payment_status: 'paid',
                initial_payment_status: 'paid',
                payment_stage: Number(currentOrder.balance_due || 0) > 0 ? 'initial_payment_paid' : 'fully_paid',
                balance_payment_status: Number(currentOrder.balance_due || 0) > 0 ? (currentOrder.balance_payment_status || 'pending') : 'not_required',
                is_fully_paid: Number(currentOrder.balance_due || 0) <= 0,
                remaining_balance_paid: Number(currentOrder.balance_due || 0) <= 0,
                remaining_balance_paid_at: Number(currentOrder.balance_due || 0) <= 0 ? now : currentOrder.remaining_balance_paid_at,
                status: 'confirmed',
                tracking_updates: (currentOrder.tracking_updates || []).concat([{ status: 'Initial Payment Confirmed', message: `Payment status check confirmed order #${currentOrder.order_number} as paid.`, timestamp: now }]),
              });
              queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            }
            await clearLoggedInCart(user.email, queryClient);
            setStatusTone('success');
            setMessage('Payment confirmed successfully. Redirecting you to your orders...');
            setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1200);
            return;
          }

          if (statusValue === 'failed' || statusValue === 'unpaid') {
            if (currentOrder) {
              await appClient.entities.Order.update(currentOrder.id, {
                payment_status: 'failed',
                initial_payment_status: 'failed',
                payment_stage: 'awaiting_initial_payment',
                tracking_updates: (currentOrder.tracking_updates || []).concat([{ status: 'Initial Payment Failed', message: `Payment status check returned ${statusValue || 'failed'} for order #${currentOrder.order_number}.`, timestamp: new Date().toISOString() }]),
              });
              queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            }
            setStatusTone('error');
            setMessage('Payment failed. Your cart is still available. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
            return;
          }

          if (statusValue === 'cancelled' || statusValue === 'canceled') {
            if (currentOrder) {
              await appClient.entities.Order.update(currentOrder.id, {
                payment_status: 'cancelled',
                initial_payment_status: 'cancelled',
                payment_stage: 'awaiting_initial_payment',
                tracking_updates: (currentOrder.tracking_updates || []).concat([{ status: 'Initial Payment Cancelled', message: `Payment was cancelled for order #${currentOrder.order_number}.`, timestamp: new Date().toISOString() }]),
              });
              queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            }
            setStatusTone('warning');
            setMessage('Payment was cancelled. Your cart is still available. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
            return;
          }

          if (attempt < VERIFICATION_ATTEMPTS) {
            await sleep(VERIFICATION_INTERVAL_MS);
          }
        }

        if (hintedStatus === 'cancelled' || hintedStatus === 'canceled') {
          setStatusTone('warning');
          setMessage('Payment was cancelled. Your cart is still available. Redirecting you back to checkout...');
        } else {
          setStatusTone('error');
          setMessage('No successful payment was confirmed. Your cart is still available. Redirecting you back to checkout...');
        }
        setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
      } catch (error) {
        console.error('Payment verification page error:', error);
        setStatusTone('error');
        setMessage('We could not verify the payment right now. Your cart is still available. Redirecting you back to checkout...');
        setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
      }
    };

    runVerification();

    return () => {
      active = false;
    };
  }, [navigate, queryClient, searchParams]);

  const toneClasses = statusTone === 'success'
    ? { shell: 'bg-emerald-50', iconWrap: 'bg-emerald-100', icon: 'text-emerald-600', title: 'text-emerald-800', subtitle: 'text-emerald-700' }
    : statusTone === 'warning'
      ? { shell: 'bg-amber-50', iconWrap: 'bg-amber-100', icon: 'text-amber-600', title: 'text-amber-800', subtitle: 'text-amber-700' }
      : statusTone === 'error'
        ? { shell: 'bg-red-50', iconWrap: 'bg-red-100', icon: 'text-red-600', title: 'text-red-800', subtitle: 'text-red-700' }
        : { shell: 'bg-green-50', iconWrap: 'bg-green-100', icon: 'text-green-600', title: 'text-green-800', subtitle: 'text-green-600' };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${toneClasses.shell}`}>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${toneClasses.iconWrap}`}>
          <Loader2 className={`h-8 w-8 animate-spin ${toneClasses.icon}`} />
        </div>
        <h2 className={`text-lg font-bold mb-2 ${toneClasses.title}`}>Verifying Payment</h2>
        <p className={`text-sm mb-3 ${toneClasses.subtitle}`}>Please wait while we verify your Hubtel payment.</p>
        <p className="text-xs text-gray-500 leading-6">{message}</p>
        <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Secure verification in progress
        </div>
      </div>
    </div>
  );
}
