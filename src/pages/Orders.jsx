import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Package, Trash2, Wallet } from 'lucide-react';

import { appClient } from '@/api/appClient.js';
import { createBalancePaymentReference, getHubtelCheckoutId, getHubtelCheckoutUrl, getHubtelCustomerErrorMessage, getPaymentStatusLabel, initiateBalancePayment, isBalancePaymentEnabled as isHubtelBalancePaymentEnabled, isInitialPaymentConfirmed, isOrderFullyPaid, isRemainingBalancePaid as isHubtelRemainingBalancePaid, isTwoStagePaymentOrder, reconcileReturnedPayment } from '@/api/hubtelClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import InlineNotice from '@/components/ui/InlineNotice';
import { useAuth } from '@/lib/AuthContext';
import { getHubtelCallbackUrl } from '@/lib/runtime-config';
import { createPageUrl } from '../utils';

const statusConfig = {
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
  packed: { color: 'bg-orange-100 text-orange-800', label: 'Packed' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
  out_for_delivery: { color: 'bg-cyan-100 text-cyan-800', label: 'Out for Delivery' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  returned: { color: 'bg-gray-100 text-gray-800', label: 'Returned' },
};

const CANCELLABLE_STATUSES = ['confirmed', 'processing'];

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getGrandTotal(order) {
  return toNumber(order?.grand_total, toNumber(order?.total_amount));
}

function getAmountPaidNow(order) {
  const verifiedAmount = Number(order?.initial_payment_verified_amount);
  if (Number.isFinite(verifiedAmount) && verifiedAmount > 0) return verifiedAmount;
  return isInitialPaymentConfirmed(order)
    ? toNumber(order?.initial_payment_amount ?? order?.amount_paid_now ?? order?.total_amount)
    : 0;
}

function getBalanceDue(order) {
  return toNumber(order?.balance_due ?? order?.balance_payment_amount);
}

function isTwoStageOrder(order) {
  return isTwoStagePaymentOrder(order);
}

function isRemainingBalancePaid(order) {
  return isHubtelRemainingBalancePaid(order);
}

function isFullyPaid(order) {
  return isOrderFullyPaid(order);
}

function formatVariantSummary(item) {
  if (item?.variant_summary) return item.variant_summary;
  const parts = [];
  if (item?.selected_color) parts.push(`Color: ${item.selected_color}`);
  if (item?.selected_wattage) parts.push(`Wattage: ${item.selected_wattage}`);
  if (item?.selected_type) parts.push(`Type: ${item.selected_type}`);
  return parts.join(' • ');
}

function paymentSummaryLabel(order) {
  if (isFullyPaid(order)) return 'Fully Paid';
  if (isInitialPaymentConfirmed(order)) {
    return isBalancePaymentEnabled(order)
      ? `Balance payment enabled, ₵${getBalanceDue(order).toFixed(2)} pending`
      : `Initial payment received, ₵${getBalanceDue(order).toFixed(2)} left`;
  }
  return 'Pending Checkout Payment';
}

function isVisibleOrder() {
  return true;
}

function isBalancePaymentEnabled(order) {
  return isHubtelBalancePaymentEnabled(order);
}

function getTrackingUpdates(order) {
  return Array.isArray(order?.tracking_updates) ? order.tracking_updates : [];
}

function sanitizeCustomerTrackingMessage(order, entry) {
  const raw = String(entry?.message || '').trim();
  if (/amount mismatch/i.test(String(entry?.status || '')) || /amount mismatch/i.test(raw)) {
    return `A payment update is being reviewed for order #${order.order_number}. If the payment already went through, the page will refresh automatically once verification completes.`;
  }

  return raw
    .replace(/hubtel/gi, 'payment gateway')
    .replace(/ghs/gi, '₵')
    .replace(/payment gateway verifies the exact amount/gi, 'the payment is fully confirmed');
}

export default function Orders() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [payingBalanceFor, setPayingBalanceFor] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated && user === null) {
      navigateToLogin();
    }
  }, [isAuthenticated, navigateToLogin, user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: async () => {
      try {
        const result = await appClient.entities.Order.filter({ customer_email: user.email }, '-created_date', 200);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (error) {
        console.error('Failed to load orders:', error);
        return [];
      }
    },
    enabled: !!user?.email && verificationDone,
    staleTime: 3000,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  // A callback normally updates the row in real time. If the callback is late or
  // was lost, retry reconciliation for older checkout rows so payment status does
  // not remain pending forever after the customer leaves the return page.
  const pendingPayments = orders.map((order) => {
    const providerStatus = String(order?.hubtel_status || '').toLowerCase();
    const initialStatus = String(order?.initial_payment_status || '').toLowerCase();
    const balanceStatus = String(order?.balance_payment_status || '').toLowerCase();

    if (order?.initial_payment_reference
      && !isInitialPaymentConfirmed(order)
      && !['failed', 'cancelled'].includes(initialStatus)
      && !['failed', 'cancelled'].includes(providerStatus)) {
      return { order, clientReference: order.initial_payment_reference, stage: 'initial' };
    }

    if (order?.balance_payment_reference
      && order?.balance_checkout_id
      && !isRemainingBalancePaid(order)
      && !['failed', 'cancelled'].includes(balanceStatus)) {
      return { order, clientReference: order.balance_payment_reference, stage: 'balance' };
    }

    return null;
  }).filter(Boolean);
  const pendingPaymentSignature = pendingPayments
    .map(({ order, clientReference, stage }) => `${order.id}:${stage}:${clientReference}`)
    .join('|');

  useEffect(() => {
    if (!user?.email || !verificationDone || !pendingPayments.length) return undefined;

    let active = true;
    const reconcilePendingPayments = async () => {
      const readyPayments = pendingPayments
        .filter(({ order, stage }) => {
          const expectedLogStatus = stage === 'balance'
            ? 'Balance Checkout Created'
            : 'Checkout Created';
          const latestInitiation = getTrackingUpdates(order)
            .slice()
            .reverse()
            .find((entry) => String(entry?.status || '') === expectedLogStatus);
          const startedAt = new Date(
            latestInitiation?.timestamp
              || (stage === 'initial' ? order.created_date || order.created_at : 0)
          ).getTime();
          return !startedAt || Date.now() - startedAt >= 5 * 60 * 1000;
        })
        .slice(0, 5);

      if (!readyPayments.length) return;

      await Promise.allSettled(readyPayments.map(({ clientReference }) => (
        reconcileReturnedPayment({ clientReference })
      )));

      if (active) {
        queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
      }
    };

    reconcilePendingPayments().catch((error) => {
      console.error('Pending payment reconciliation error:', error);
    });
    const timer = window.setInterval(reconcilePendingPayments, 60000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pendingPaymentSignature, queryClient, user?.email, verificationDone]);

  const showFeedback = (variant, message, title) => {
    setFeedback({ variant, message, title });
  };

  useEffect(() => {
    if (!user || verificationDone) return;

    const reference = searchParams.get('order');
    const status = String(searchParams.get('status') || '').toLowerCase();
    const paymentStage = searchParams.get('paymentStage') || 'initial';

    if (!reference || paymentStage !== 'balance') {
      setVerificationDone(true);
      return;
    }

    if (status === 'cancelled' || status === 'canceled') {
      showFeedback('warning', 'The remaining balance payment was cancelled.', 'Payment cancelled');
      setVerificationDone(true);
      return;
    }

    setIsVerifying(true);

    let active = true;

    const runBalanceVerification = async () => {
      try {
        for (let attempt = 1; attempt <= 12; attempt += 1) {
          if (!active) return;

          const result = await reconcileReturnedPayment({ clientReference: reference }).catch(() => null);
          const state = String(result?.state || '').toLowerCase();
          const latestTrackingMessage = result?.latestTracking?.message || '';

          if (state === 'paid' || state === 'paid_from_status_fallback') {
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            showFeedback(
              'success',
              latestTrackingMessage || 'Your remaining balance payment was confirmed successfully.',
              'Payment confirmed'
            );
            setIsVerifying(false);
            setVerificationDone(true);
            return;
          }

          if (state === 'failed') {
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            showFeedback(
              'error',
              latestTrackingMessage || 'The remaining balance payment was not completed.',
              'Verification failed'
            );
            setIsVerifying(false);
            setVerificationDone(true);
            return;
          }

          if (state === 'not_found') {
            showFeedback('error', 'We could not find this balance-payment order.', 'Unable to verify');
            setIsVerifying(false);
            setVerificationDone(true);
            return;
          }

          if (state === 'pending_callback' || state === 'pending_or_unknown') {
            if (attempt < 12) {
              await new Promise((resolve) => setTimeout(resolve, 2500));
              continue;
            }

            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            showFeedback(
              'warning',
              latestTrackingMessage || 'Payment is still being confirmed. This order will keep updating automatically.',
              'Still processing'
            );
            setIsVerifying(false);
            setVerificationDone(true);
            return;
          }
        }

        queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
        showFeedback('warning', 'Payment is still being confirmed. The order remains open and this page will update shortly.', 'Still processing');
      } catch (error) {
        console.error('Balance verification error:', error);
        showFeedback('error', 'The remaining balance payment could not be verified right now.', 'Verification failed');
      } finally {
        if (active) {
          setIsVerifying(false);
          setVerificationDone(true);
        }
      }
    };

    runBalanceVerification();

    return () => {
      active = false;
    };
  }, [queryClient, searchParams, user, verificationDone]);

  useEffect(() => {
    if (!user?.email) return undefined;
    const unsubscribe = appClient.entities.Order.subscribe((event) => {
      if (event.data?.customer_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
      }
    });
    return unsubscribe;
  }, [queryClient, user?.email]);

  const visibleOrders = orders.filter(isVisibleOrder);

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => Promise.all(orderIds.map((id) => appClient.entities.Order.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
      showFeedback('info', 'The selected orders were removed.', 'Orders deleted');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      const newTracking = (order.tracking_updates || []).concat([{
        status: 'Cancelled',
        message: `Cancelled by customer. Reason: ${reason || 'No reason provided.'}`,
        timestamp: new Date().toISOString(),
      }]);

      await appClient.entities.Order.update(order.id, { status: 'cancelled', tracking_updates: newTracking });
      await appClient.entities.Notification.create({
        user_email: order.customer_email,
        title: 'Order Cancelled',
        message: `Your order #${order.order_number} has been cancelled. Contact customer support for further assistance.`,
        type: 'order_cancelled',
        order_id: order.id,
        order_number: order.order_number,
        is_read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCancellingOrder(null);
      setCancelReason('');
      showFeedback('info', 'Your order was cancelled successfully.', 'Order cancelled');
    },
  });

  const handleBalancePayment = async (order) => {
    setPayingBalanceFor(order.id);
    try {
      if (!isInitialPaymentConfirmed(order)) {
        showFeedback('warning', 'The first checkout payment is still being confirmed. The balance button will appear automatically once it is verified.', 'Payment confirmation pending');
        return;
      }

      const reference = order.balance_payment_reference || createBalancePaymentReference(order.order_number);
      const callbackUrl = getHubtelCallbackUrl();
      const returnUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${encodeURIComponent(reference)}&paymentStage=balance&status=success&orderId=${order.id}`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${encodeURIComponent(reference)}&paymentStage=balance&status=cancelled&orderId=${order.id}`;
      const result = await initiateBalancePayment({ order, callbackUrl, returnUrl, cancellationUrl });
      const checkoutId = getHubtelCheckoutId(result);

      try {
        await appClient.entities.Order.update(order.id, {
          balance_payment_reference: reference,
          balance_checkout_id: checkoutId || null,
          hubtel_transaction_id: checkoutId || order.hubtel_transaction_id || null,
          hubtel_status: checkoutId ? 'initiated' : order.hubtel_status || 'pending',
          tracking_updates: getTrackingUpdates(order).concat([{
            status: checkoutId ? 'Balance Checkout Created' : 'Balance Checkout Response Received',
            message: checkoutId
              ? `Secure checkout created for the remaining balance. Expected amount: GHS ${getBalanceDue(order).toFixed(2)}.`
              : 'The remaining-balance checkout response did not include a checkout ID. The order remains open for review.',
            timestamp: new Date().toISOString(),
            clientReference: reference,
            checkoutId: checkoutId || null,
          }]),
        });
      } catch (loggingError) {
        // Do not block the customer from completing payment because an optional
        // browser-side audit write failed. The callback remains authoritative.
        console.error('[Orders] Could not save balance checkout log:', loggingError);
      }

      const checkoutUrl = getHubtelCheckoutUrl(result);
      if (checkoutUrl) {
        showFeedback('info', 'Redirecting you to the secure payment page...', 'Opening secure checkout');
        window.location.href = checkoutUrl;
        return;
      }

      showFeedback(
        'error',
        getHubtelCustomerErrorMessage(result, 'We could not start the remaining balance payment right now. Please try again.'),
        'Unable to continue'
      );
    } catch (error) {
      showFeedback('error', error.message || 'We could not start the remaining balance payment right now. Please try again.', 'Unable to continue');
    } finally {
      setPayingBalanceFor(null);
    }
  };

  const handleToggleSelect = (id) => setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : prev.concat([id])));
  const handleSelectAll = () => setSelectedOrders((prev) => (prev.length === visibleOrders.length ? [] : visibleOrders.map((order) => order.id)));
  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (window.confirm(`Delete ${selectedOrders.length} order(s)?`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (isVerifying) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6"><div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"><Loader2 className="h-8 w-8 text-green-600 animate-spin" /></div><h2 className="text-lg font-bold text-green-800 mb-2">Verifying Payment</h2><p className="text-sm text-green-600">Please wait while we confirm your payment.</p></div></div>;
  }

  if (!verificationDone) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!isLoading && visibleOrders.length === 0) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6"><Package className="h-16 w-16 text-gray-300 mb-4" /><p className="text-gray-500 font-medium mb-2">No orders yet</p><Link to={createPageUrl('Shop')} className="text-blue-600 font-semibold">Go to Shop</Link></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
            <p className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
          {selectedOrders.length > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="h-3 w-3 mr-1" /> Delete {selectedOrders.length}</Button>}
        </div>
        <InlineNotice variant={feedback?.variant} title={feedback?.title} message={feedback?.message} onDismiss={() => setFeedback(null)} className="mb-4" />
        {orders.length > 0 && <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={selectedOrders.length === visibleOrders.length && visibleOrders.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" /><span className="text-xs text-gray-500">Select All</span></div>}
        <div className="space-y-4">
          {isLoading ? Array(3).fill(0).map((_, index) => <Skeleton key={index} className="h-56 rounded-xl" />) : visibleOrders.map((order) => {
            const isSelected = selectedOrders.includes(order.id);
            const grandTotal = getGrandTotal(order);
            const amountPaidNow = getAmountPaidNow(order);
            const balanceDue = getBalanceDue(order);
            const hasEstDelivery = !!order.estimated_delivery;
            const trackingUpdates = getTrackingUpdates(order);
            const canPayBalance = isTwoStageOrder(order) && isInitialPaymentConfirmed(order) && isBalancePaymentEnabled(order) && !isRemainingBalancePaid(order) && ['shipped', 'out_for_delivery'].includes(order.status);
            return (
              <Card key={order.id} className={`p-4 bg-white ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-start justify-between mb-2"><div className="flex items-start gap-2"><input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 cursor-pointer mt-1" /><div><p className="text-sm font-bold text-gray-900">{order.order_number}</p><p className="text-[10px] text-gray-500">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : '-'}</p></div></div><div className="text-right"><p className="text-sm font-bold text-gray-900">₵{grandTotal.toFixed(2)}</p><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>{statusConfig[order.status]?.label || order.status}</span></div></div>
                <div className="mb-3 flex flex-wrap gap-2"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isFullyPaid(order) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{paymentSummaryLabel(order)}</span><span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700">Checkout status: {getPaymentStatusLabel(order)}</span></div>
                <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-gray-700 space-y-1"><div className="flex justify-between"><span>Total order value</span><span className="font-semibold">₵{grandTotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Amount confirmed so far</span><span className="font-semibold">₵{amountPaidNow.toFixed(2)}</span></div><div className="flex justify-between"><span>First checkout payment</span><span className="font-semibold capitalize">{String(order.initial_payment_status || 'pending').replace(/_/g, ' ')}</span></div>{isTwoStageOrder(order) && <div className="flex justify-between"><span>Balance checkout payment</span><span className="font-semibold capitalize">{String(order.balance_payment_status || 'pending').replace(/_/g, ' ')}</span></div>}{balanceDue > 0 && !isRemainingBalancePaid(order) && <div className="flex justify-between text-orange-700"><span>Balance left to clear</span><span className="font-bold">₵{balanceDue.toFixed(2)}</span></div>}</div>
                {trackingUpdates.length > 0 && <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"><p className="font-semibold text-slate-900">Payment log ({trackingUpdates.length})</p><div className="mt-2 space-y-2">{trackingUpdates.slice().reverse().slice(0, 5).map((entry, index) => <div key={`${entry.timestamp || 't'}-${index}`} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0"><div className="flex items-start justify-between gap-2"><p className="font-medium text-slate-800">{entry.status || 'Update'}</p>{entry.timestamp && <span className="shrink-0 text-[10px] text-slate-400">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</span>}</div><p className="mt-1 leading-5 text-slate-600">{sanitizeCustomerTrackingMessage(order, entry) || 'No details provided.'}</p>{entry.clientReference && <p className="mt-1 text-[10px] text-slate-400">Reference: {entry.clientReference}</p>}</div>)}</div></div>}
                {isTwoStageOrder(order) && !isRemainingBalancePaid(order) && <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"><p className="font-semibold">Remaining Balance</p><p className="mt-1">This page shows the amount already confirmed, what that payment covered, and what remains before handover. Return here to clear the outstanding balance once the next payment step is enabled.</p>{!isBalancePaymentEnabled(order) && <p className="mt-2 text-blue-700">The payment button will appear here as soon as the remaining balance is enabled for this order.</p>}{canPayBalance && <Button onClick={() => handleBalancePayment(order)} disabled={payingBalanceFor === order.id} className="mt-3 bg-blue-800 hover:bg-blue-900 text-white"><Wallet className="h-4 w-4 mr-2" />{payingBalanceFor === order.id ? 'Opening secure payment...' : 'Pay Remaining Balance'}</Button>}</div>}
                <div className="mb-3 border-t border-gray-100 pt-2">{(order.items || []).map((item, index) => { const variantSummary = formatVariantSummary(item); return <div key={index} className="flex items-center gap-2 py-1">{item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}<div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-700 truncate">{item.product_name}</p><p className="text-[10px] text-gray-500">x{item.quantity} · ₵{(toNumber(item.price) * toNumber(item.quantity, 1)).toFixed(2)}</p>{variantSummary && <p className="text-[10px] text-blue-700 mt-0.5">{variantSummary}</p>}</div></div>;})}</div>
                <div className="border-t border-gray-100 pt-2"><p className="text-xs text-gray-600">{order.delivery_address ? `📍 ${order.delivery_address}` : ''}</p>{hasEstDelivery && <p className="text-xs text-gray-500 mt-1">📅 Estimated delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>}<div className="flex gap-3 mt-3"><Link to={createPageUrl('OrderTracking') + '?id=' + order.id} className="text-xs text-blue-600 font-semibold">Track Order</Link>{CANCELLABLE_STATUSES.includes(order.status) && <button onClick={() => { setCancellingOrder(order); setCancelReason(''); }} className="text-xs text-red-600 font-semibold">Cancel Order</button>}</div></div>
              </Card>
            );
          })}
        </div>
        {cancellingOrder && <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6"><h3 className="text-lg font-bold mb-2">Cancel Order</h3><p className="text-sm text-gray-500 mb-4">#{cancellingOrder.order_number}</p><textarea className="w-full border rounded-lg p-3 text-sm mb-4" rows={3} placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setCancellingOrder(null)}>Keep Order</Button><Button variant="destructive" className="flex-1" onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })} disabled={cancelOrderMutation.isPending}>{cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}</Button></div></div></div>}
      </div>
    </div>
  );
}
