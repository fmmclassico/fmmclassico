import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { appClient } from '@/api/appClient.js';
import { checkPaymentStatus, getBaseOrderReference, getHubtelPaidAmount, isHubtelPaymentVerified } from '@/api/hubtelClient';
import { createPageUrl } from '../utils';

const VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_INTERVAL_MS = 1000;

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function getExpectedInitialAmount(order) {
  return Number(order?.initial_payment_amount ?? order?.amount_paid_now ?? 0) || 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearLoggedInCart(userEmail, queryClient) {
  const cartRows = ensureArray(await appClient.entities.CartItem.filter({ user_email: userEmail }));
  await Promise.allSettled(cartRows.map((item) => appClient.entities.CartItem.delete(item.id)));
  queryClient.invalidateQueries({ queryKey: ['cartItems', userEmail] });
}

export default function PaymentVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('Checking your payment and confirming the amount received...');
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
          setMessage(`Verifying your payment... (${attempt}/${VERIFICATION_ATTEMPTS})`);

          const orders = ensureArray(await appClient.entities.Order.filter({ customer_email: user.email }, '-created_date', 200));
          const currentOrder = orders.find((item) => item.id === orderId || item.order_number === baseReference);

          if (!currentOrder) {
            setStatusTone('error');
            setMessage('We could not find this pending order. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
            return;
          }

          if (currentOrder.initial_payment_status === 'paid' || currentOrder.payment_stage === 'fully_paid' || currentOrder.payment_stage === 'initial_payment_paid') {
            await clearLoggedInCart(user.email, queryClient);
            setStatusTone('success');
            setMessage('Your payment is already confirmed. Redirecting you to your orders...');
            setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1200);
            return;
          }

          const expectedAmount = getExpectedInitialAmount(currentOrder);
          const result = await checkPaymentStatus(ref).catch(() => null);

          if (isHubtelPaymentVerified(result, expectedAmount)) {
            const paidAmount = getHubtelPaidAmount(result) || expectedAmount;
            const now = new Date().toISOString();

            await appClient.entities.Order.update(currentOrder.id, {
              payment_status: 'paid',
              initial_payment_status: 'paid',
              payment_stage: Number(currentOrder.balance_due || 0) > 0 ? 'initial_payment_paid' : 'fully_paid',
              balance_payment_status: Number(currentOrder.balance_due || 0) > 0 ? (currentOrder.balance_payment_status || 'pending') : 'not_required',
              is_fully_paid: Number(currentOrder.balance_due || 0) <= 0,
              remaining_balance_paid: Number(currentOrder.balance_due || 0) <= 0,
              remaining_balance_paid_at: Number(currentOrder.balance_due || 0) <= 0 ? now : currentOrder.remaining_balance_paid_at,
              initial_payment_verified_amount: paidAmount,
              initial_paid_at: now,
              status: 'confirmed',
              tracking_updates: (currentOrder.tracking_updates || []).concat([{
                status: 'Initial Payment Confirmed',
                message: `Hubtel payment verified successfully. Expected GHS ${expectedAmount.toFixed(2)} and confirmed GHS ${paidAmount.toFixed(2)}.`,
                timestamp: now,
              }]),
            });

            await clearLoggedInCart(user.email, queryClient);
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            setStatusTone('success');
            setMessage('Payment confirmed successfully. Redirecting you to your orders...');
            setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1200);
            return;
          }

          const paidAmount = getHubtelPaidAmount(result);
          if (paidAmount != null && paidAmount > 0 && paidAmount < expectedAmount) {
            setStatusTone('error');
            setMessage('The amount received did not match the expected payment. Please contact support for help. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1800);
            return;
          }

          const statusValue = String(result?.data?.status || result?.data?.Status || result?.status || '').toLowerCase();
          if (statusValue === 'failed' || statusValue === 'unpaid') {
            await appClient.entities.Order.update(currentOrder.id, {
              payment_status: 'failed',
              initial_payment_status: 'failed',
              payment_stage: 'awaiting_initial_payment',
              tracking_updates: (currentOrder.tracking_updates || []).concat([{
                status: 'Initial Payment Failed',
                message: `Hubtel status check returned ${statusValue || 'failed'} for order #${currentOrder.order_number}.`,
                timestamp: new Date().toISOString(),
              }]),
            });
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            setStatusTone('error');
            setMessage('Payment was not completed. Your items are still in your cart so you can try again. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
            return;
          }

          if (statusValue === 'cancelled' || statusValue === 'canceled') {
            await appClient.entities.Order.update(currentOrder.id, {
              payment_status: 'cancelled',
              initial_payment_status: 'cancelled',
              payment_stage: 'awaiting_initial_payment',
              tracking_updates: (currentOrder.tracking_updates || []).concat([{
                status: 'Initial Payment Cancelled',
                message: `Payment was cancelled for order #${currentOrder.order_number}.`,
                timestamp: new Date().toISOString(),
              }]),
            });
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            setStatusTone('warning');
            setMessage('Payment was cancelled. Your items are still in your cart so you can try again. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1400);
            return;
          }

          if (attempt < VERIFICATION_ATTEMPTS) {
            await sleep(VERIFICATION_INTERVAL_MS);
          }
        }

        if (hintedStatus === 'cancelled' || hintedStatus === 'canceled') {
          setStatusTone('warning');
          setMessage('Payment was cancelled. Your items are still in your cart so you can try again. Redirecting you back to checkout...');
        } else {
          setStatusTone('error');
          setMessage('We could not confirm the payment yet. Your items are still in your cart so you can try again. Redirecting you back to checkout...');
        }
        setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1600);
      } catch (error) {
        console.error('Payment verification page error:', error);
        setStatusTone('error');
        setMessage('We could not verify the payment right now. Redirecting you back to checkout...');
        setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1600);
      }
    };

    runVerification();

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-sm ${cardTone}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          {statusTone === 'success' ? <ShieldCheck className="h-8 w-8 text-green-600" /> : <Loader2 className="h-8 w-8 animate-spin text-blue-600" />}
        </div>
        <h1 className="text-lg font-bold text-center mb-2">Verifying Payment</h1>
        <p className="text-sm text-center leading-6">{message}</p>
      </div>
    </div>
  );
}
