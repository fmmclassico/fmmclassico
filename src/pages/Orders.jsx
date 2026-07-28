import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { checkPaymentStatus, createBalancePaymentReference, getBaseOrderReference, initiateBalancePayment } from '@/api/hubtelClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Trash2, Loader2, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

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
function toNumber(value, fallback = 0) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }
function getGrandTotal(order) { return toNumber(order?.grand_total, toNumber(order?.total_amount)); }
function getAmountPaidNow(order) { return toNumber(order?.initial_payment_amount ?? order?.amount_paid_now ?? order?.total_amount); }
function getBalanceDue(order) { return toNumber(order?.balance_due ?? order?.balance_payment_amount); }
function isTwoStageOrder(order) { return ['deposit_balance', 'pay_on_delivery'].includes(order?.payment_method || ''); }
function isFullyPaid(order) { return order?.is_fully_paid === true || (!isTwoStageOrder(order) && order?.payment_status === 'paid'); }
function isRemainingBalancePaid(order) { return order?.remaining_balance_paid === true || order?.balance_payment_status === 'paid'; }
function balanceButtonLabel(order) { return order?.payment_method === 'deposit_balance' ? 'Pay Remaining Balance' : 'Pay Product Balance'; }
function paymentSummaryLabel(order) {
  if (!isTwoStageOrder(order)) return order?.payment_status === 'paid' ? 'Fully Paid' : 'Pending Payment';
  if (isFullyPaid(order)) return 'Fully Paid';
  if (order?.initial_payment_status === 'paid' || order?.payment_status === 'paid') {
    return order?.balance_payment_enabled ? `Balance payment enabled, ₵${getBalanceDue(order).toFixed(2)} pending` : `Initial payment received, ₵${getBalanceDue(order).toFixed(2)} left`;
  }
  return 'Pending Initial Payment';
}
function formatVariantSummary(item) {
  if (item?.variant_summary) return item.variant_summary;
  const parts = [];
  if (item?.selected_color) parts.push(`Color: ${item.selected_color}`);
  if (item?.selected_wattage) parts.push(`Wattage: ${item.selected_wattage}`);
  if (item?.selected_type) parts.push(`Type: ${item.selected_type}`);
  return parts.join(' • ');
}

export default function Orders() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [payingBalanceFor, setPayingBalanceFor] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);

  useEffect(() => { if (!isAuthenticated && user === null) navigateToLogin(); }, [isAuthenticated, user, navigateToLogin]);

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

  useEffect(() => {
    if (!user || verificationDone) return;
    const reference = searchParams.get('order');
    const status = searchParams.get('status');
    const paymentStage = searchParams.get('paymentStage') || 'initial';
    const orderId = searchParams.get('orderId');
    if (!reference) { setVerificationDone(true); return; }
    setIsVerifying(true);

    setTimeout(() => {
      checkPaymentStatus(reference).then(async (result) => {
        const hubtelStatus = String(result?.data?.status || result?.data?.Status || '').toLowerCase();
        const paid = ['paid', 'success', 'successful'].includes(hubtelStatus) || status === 'success';
        const baseOrderNumber = getBaseOrderReference(reference);
        const orderList = await appClient.entities.Order.filter({ customer_email: user.email }, '-created_date', 200);
        const currentOrder = (Array.isArray(orderList) ? orderList : []).find((item) => item.id === orderId || item.order_number === baseOrderNumber);

        if (paid && currentOrder) {
          const now = new Date().toISOString();
          const tracking = (currentOrder.tracking_updates || []).concat([{ status: paymentStage === 'balance' ? 'Balance Payment Confirmed' : 'Initial Payment Confirmed', message: paymentStage === 'balance' ? `Remaining balance payment received for order #${currentOrder.order_number}.` : `Initial payment received for order #${currentOrder.order_number}.`, timestamp: now }]);
          if (paymentStage === 'balance') {
            await appClient.entities.Order.update(currentOrder.id, {
              balance_payment_status: 'paid',
              remaining_balance_paid: true,
              remaining_balance_paid_at: now,
              is_fully_paid: true,
              payment_stage: 'fully_paid',
              tracking_updates: tracking,
            });
          } else {
            await appClient.entities.Order.update(currentOrder.id, {
              payment_status: 'paid',
              initial_payment_status: 'paid',
              payment_stage: isTwoStageOrder(currentOrder) ? 'initial_payment_paid' : 'fully_paid',
              is_fully_paid: !isTwoStageOrder(currentOrder),
              balance_payment_status: isTwoStageOrder(currentOrder) ? (currentOrder.balance_payment_status || 'pending') : 'not_required',
              remaining_balance_paid: !isTwoStageOrder(currentOrder),
              remaining_balance_paid_at: !isTwoStageOrder(currentOrder) ? now : currentOrder.remaining_balance_paid_at,
              tracking_updates: tracking,
            });
            appClient.entities.CartItem.filter({ user_email: user.email }).then((items) => {
              const rows = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : [];
              rows.forEach((item) => appClient.entities.CartItem.delete(item.id).catch(() => {}));
              queryClient.invalidateQueries({ queryKey: ['cartItems', user.email] });
            }).catch(() => {});
          }
          queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
          toast.success(paymentStage === 'balance' ? 'Remaining balance payment confirmed!' : 'Payment confirmed! Your order has been placed.');
        } else if (!paid && currentOrder && paymentStage === 'balance' && ['failed', 'cancelled', 'canceled', 'unpaid'].includes(hubtelStatus || status || '')) {
          await appClient.entities.Order.update(currentOrder.id, { balance_payment_status: hubtelStatus === 'cancelled' || hubtelStatus === 'canceled' ? 'cancelled' : 'failed', payment_stage: 'balance_payment_failed', tracking_updates: (currentOrder.tracking_updates || []).concat([{ status: 'Balance Payment Failed', message: 'Customer did not complete the balance payment successfully.', timestamp: new Date().toISOString() }]) });
          toast.error('Balance payment was not completed.');
          queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
        } else if (!paid && status !== 'success') {
          toast.error('Payment verification failed. If your amount was deducted, contact Hubtel support.');
          setTimeout(() => navigate(createPageUrl('Cart')), 3000);
        }
      }).catch(() => {
        if (status === 'success') toast.success('Payment submitted. Refreshing your orders...');
        else toast.error('Payment verification failed. If amount was deducted, contact Hubtel support.');
      }).finally(() => {
        setIsVerifying(false);
        setVerificationDone(true);
      });
    }, 1500);
  }, [user, searchParams, verificationDone, queryClient, navigate]);

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = appClient.entities.Order.subscribe((event) => {
      if (event.data?.customer_email === user.email) queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
    });
    return unsubscribe;
  }, [user?.email, queryClient]);

  const deleteOrdersMutation = useMutation({ mutationFn: async (orderIds) => Promise.all(orderIds.map((id) => appClient.entities.Order.delete(id))), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setSelectedOrders([]); toast.success('Deleted'); } });
  const cancelOrderMutation = useMutation({ mutationFn: async ({ order, reason }) => { const newTracking = (order.tracking_updates || []).concat([{ status: 'Cancelled', message: `Cancelled by customer. Reason: ${reason || 'No reason'}`, timestamp: new Date().toISOString() }]); await appClient.entities.Order.update(order.id, { status: 'cancelled', tracking_updates: newTracking }); await appClient.entities.Notification.create({ user_email: order.customer_email, title: 'Order Cancelled', message: `Your order #${order.order_number} has been cancelled. Contact 0208207543 for refund.`, type: 'order_cancelled', order_id: order.id, order_number: order.order_number, is_read: false }); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setCancellingOrder(null); setCancelReason(''); toast.success('Order cancelled.'); } });

  const handleBalancePayment = async (order) => {
    setPayingBalanceFor(order.id);
    try {
      const reference = order.balance_payment_reference || createBalancePaymentReference(order.order_number);
      const callbackUrl = 'https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback';
      const returnUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${encodeURIComponent(reference)}&paymentStage=balance&status=success&orderId=${order.id}`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${encodeURIComponent(reference)}&paymentStage=balance&status=cancelled&orderId=${order.id}`;
      const result = await initiateBalancePayment({ order, callbackUrl, returnUrl, cancellationUrl });
      if (result?.data?.checkoutUrl) {
        toast.success('Redirecting to Hubtel for balance payment...');
        window.location.href = result.data.checkoutUrl;
        return;
      }
      toast.error(result?.error || 'Unable to start balance payment.');
    } catch (error) {
      toast.error(error.message || 'Unable to start balance payment.');
    } finally {
      setPayingBalanceFor(null);
    }
  };

  const handleToggleSelect = (id) => setSelectedOrders((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : prev.concat([id]));
  const handleSelectAll = () => setSelectedOrders((prev) => prev.length === orders.length ? [] : orders.map((order) => order.id));
  const handleDeleteSelected = () => { if (selectedOrders.length === 0) return; if (confirm(`Delete ${selectedOrders.length} order(s)?`)) deleteOrdersMutation.mutate(selectedOrders); };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (isVerifying) return <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6"><div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"><Loader2 className="h-8 w-8 text-green-600 animate-spin" /></div><h2 className="text-lg font-bold text-green-800 mb-2">Verifying Payment</h2><p className="text-sm text-green-600">Please wait while we confirm your payment with Hubtel...</p></div></div>;
  if (!verificationDone) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!isLoading && orders.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center p-6"><Package className="h-16 w-16 text-gray-300 mb-4" /><p className="text-gray-500 font-medium mb-2">No orders yet</p><Link to={createPageUrl('Shop')} className="text-blue-600 font-semibold">Go to Shop</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4"><div><h1 className="text-xl font-bold text-gray-900">My Orders</h1><p className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p></div>{selectedOrders.length > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="h-3 w-3 mr-1" /> Delete {selectedOrders.length}</Button>}</div>
        {orders.length > 0 && <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={selectedOrders.length === orders.length && orders.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" /><span className="text-xs text-gray-500">Select All</span></div>}
        <div className="space-y-4">
          {isLoading ? Array(3).fill(0).map((_, index) => <Skeleton key={index} className="h-56 rounded-xl" />) : orders.map((order) => {
            const isSelected = selectedOrders.includes(order.id);
            const isExpanded = expandedOrder === order.id;
            const grandTotal = getGrandTotal(order);
            const amountPaidNow = getAmountPaidNow(order);
            const balanceDue = getBalanceDue(order);
            const hasEstDelivery = !!order.estimated_delivery;
            const canPayBalance = isTwoStageOrder(order) && order.initial_payment_status === 'paid' && order.balance_payment_enabled === true && !isRemainingBalancePaid(order) && order.status === 'shipped';
            return (
              <Card key={order.id} className={`p-4 bg-white ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-start justify-between mb-2"><div className="flex items-start gap-2"><input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 cursor-pointer mt-1" /><div><p className="text-sm font-bold text-gray-900">{order.order_number}</p><p className="text-[10px] text-gray-500">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : '-'}</p></div></div><div className="text-right"><p className="text-sm font-bold text-gray-900">₵{grandTotal.toFixed(2)}</p><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>{statusConfig[order.status]?.label || order.status}</span></div></div>
                <div className="mb-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isFullyPaid(order) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{paymentSummaryLabel(order)}</span></div>
                <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-gray-700 space-y-1"><div className="flex justify-between"><span>Total order value</span><span className="font-semibold">₵{grandTotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Initial payment</span><span className="font-semibold">₵{amountPaidNow.toFixed(2)}</span></div>{balanceDue > 0 && !isRemainingBalancePaid(order) && <div className="flex justify-between text-orange-700"><span>Balance left</span><span className="font-bold">₵{balanceDue.toFixed(2)}</span></div>}</div>
                {isTwoStageOrder(order) && <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"><p className="font-semibold">Two-stage Hubtel payment</p><p className="mt-1">Once the product arrives, you must complete the remaining balance through this Order page before the product is handed over.</p>{order.balance_payment_enabled !== true && !isRemainingBalancePaid(order) && <p className="mt-2 text-blue-700">Balance payment will appear here after admin marks the order as shipped.</p>}{canPayBalance && <Button onClick={() => handleBalancePayment(order)} disabled={payingBalanceFor === order.id} className="mt-3 bg-blue-800 hover:bg-blue-900 text-white"><Wallet className="h-4 w-4 mr-2" />{payingBalanceFor === order.id ? 'Opening Hubtel...' : balanceButtonLabel(order)}</Button>}</div>}
                <div className="mb-3 border-t border-gray-100 pt-2">{(order.items || []).map((item, index) => { const variantSummary = formatVariantSummary(item); return <div key={index} className="flex items-center gap-2 py-1">{item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}<div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-700 truncate">{item.product_name}</p><p className="text-[10px] text-gray-500">x{item.quantity} Â· ₵{(toNumber(item.price) * toNumber(item.quantity, 1)).toFixed(2)}</p>{variantSummary && <p className="text-[10px] text-blue-700 mt-0.5">{variantSummary}</p>}</div></div>;})}</div>
                <div className="border-t border-gray-100 pt-2"><p className="text-xs text-gray-600">{order.delivery_address ? `📍 ${order.delivery_address}` : ''}</p>{hasEstDelivery && <p className="text-xs text-gray-500 mt-1">📅 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>}<div className="flex gap-3 mt-3"><Link to={createPageUrl('OrderTracking') + '?id=' + order.id} className="text-xs text-blue-600 font-semibold">Track Order</Link>{CANCELLABLE_STATUSES.includes(order.status) && <button onClick={() => { setCancellingOrder(order); setCancelReason(''); }} className="text-xs text-red-600 font-semibold">Cancel Order</button>}<button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="text-xs text-gray-600 font-semibold">{isExpanded ? 'Hide History' : 'Show History'}</button></div></div>
                {isExpanded && order.tracking_updates && order.tracking_updates.length > 0 && <div className="mt-3 border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2">Tracking History</p><div className="space-y-2">{order.tracking_updates.slice().reverse().map((update, index) => <div key={index} className="flex gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div><div><p className="text-xs font-semibold text-gray-800">{update.status}</p><p className="text-[10px] text-gray-500">{update.message}</p>{update.timestamp && <p className="text-[10px] text-gray-400">{format(new Date(update.timestamp), 'MMM d, yyyy h:mm a')}</p>}</div></div>)}</div></div>}
              </Card>
            );
          })}
        </div>
        {cancellingOrder && <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-6"><h3 className="text-lg font-bold mb-2">Cancel Order</h3><p className="text-sm text-gray-500 mb-4">#{cancellingOrder.order_number}</p><textarea className="w-full border rounded-lg p-3 text-sm mb-4" rows={3} placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setCancellingOrder(null)}>Keep Order</Button><Button variant="destructive" className="flex-1" onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })} disabled={cancelOrderMutation.isPending}>{cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}</Button></div></div></div>}
      </div>
    </div>
  );
}
