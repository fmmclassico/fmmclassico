import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { checkPaymentStatus } from '@/api/hubtelClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Truck, MapPin, XCircle, Trash2, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

var statusConfig = {
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
  packed: { color: 'bg-orange-100 text-orange-800', label: 'Packed' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
  out_for_delivery: { color: 'bg-cyan-100 text-cyan-800', label: 'Out for Delivery' },
  in_transit: { color: 'bg-cyan-100 text-cyan-800', label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  returned: { color: 'bg-gray-100 text-gray-800', label: 'Returned' },
};

var CANCELLABLE_STATUSES = ['confirmed', 'processing'];

function getPaymentBadge(order) {
  var method = order.payment_method || 'full_payment';
  var isPaid = order.payment_status === 'paid';
  if (method === 'full_payment') {
    if (isPaid) return { color: 'bg-green-100 text-green-700', label: 'Confirmed, Paid' };
    return { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Payment' };
  }
  if (method === 'deposit_balance') {
    if (isPaid) return { color: 'bg-orange-100 text-orange-700', label: 'Delivery Paid, ₵' + (order.balance_due || 0).toFixed(2) + ' left to be paid' };
    return { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Payment' };
  }
  if (method === 'pay_on_delivery') {
    if (isPaid || order.payment_status === 'pending_payment') return { color: 'bg-red-100 text-red-700', label: 'Delivery Paid, Product payment yet to be paid' };
    return { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Payment' };
  }
  return { color: 'bg-gray-100 text-gray-600', label: order.payment_status || 'Unknown' };
}

export default function Orders() {
  var [user, setUser] = useState(null);
  var [authChecked, setAuthChecked] = useState(false);
  var [selectedOrders, setSelectedOrders] = useState([]);
  var [cancellingOrder, setCancellingOrder] = useState(null);
  var [cancelReason, setCancelReason] = useState('');
  var [expandedOrder, setExpandedOrder] = useState(null);
  var [searchParams] = useSearchParams();
  var navigate = useNavigate();
  var queryClient = useQueryClient();

  // Payment verification state
  var [isVerifying, setIsVerifying] = useState(false);
  var [verificationDone, setVerificationDone] = useState(false);

  // Auth check with retry (prevents homepage flash)
  useEffect(function() {
    var attempts = 0;
    function checkAuth() {
      base44.auth.me()
        .then(function(userData) { setUser(userData); setAuthChecked(true); })
        .catch(function() {
          attempts++;
          if (attempts < 3) { setTimeout(checkAuth, 800); }
          else { setAuthChecked(true); base44.auth.redirectToLogin(createPageUrl('Home')); }
        });
    }
    checkAuth();
  }, []);

  // Payment verification after Hubtel redirect
  useEffect(function() {
    if (!user || verificationDone) return;
    var orderNumber = searchParams.get('order');
    var status = searchParams.get('status');

    if (!orderNumber) { setVerificationDone(true); return; }

    // Show verification screen
    setIsVerifying(true);

    // Give callback a moment to process, then check
    setTimeout(function() {
      checkPaymentStatus(orderNumber)
        .then(function(result) {
          var hubtelStatus = result?.data?.status || '';
          var isPaid = hubtelStatus.toLowerCase() === 'paid' || hubtelStatus.toLowerCase() === 'success';

          if (isPaid || status === 'success') {
            // Payment successful - clear cart
            base44.entities.CartItem.filter({ user_email: user.email }).then(function(items) {
              var arr = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : [];
              arr.forEach(function(item) { base44.entities.CartItem.delete(item.id).catch(function() {}); });
              queryClient.invalidateQueries({ queryKey: ['cartItems', user.email] });
              queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            }).catch(function() {});

            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Payment confirmed! Your order has been placed.');
            setIsVerifying(false);
            setVerificationDone(true);
          } else {
            // Payment failed or cancelled
            toast.error('Payment failed. Please crosscheck payment again. If your amount was deducted, contact Hubtel to verify.');
            setIsVerifying(false);
            setVerificationDone(true);
            // Redirect to cart after short delay
            setTimeout(function() {
              navigate(createPageUrl('Cart'));
            }, 3000);
          }
        })
        .catch(function() {
          // If status check fails, check the URL status param
          if (status === 'success') {
            base44.entities.CartItem.filter({ user_email: user.email }).then(function(items) {
              var arr = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : [];
              arr.forEach(function(item) { base44.entities.CartItem.delete(item.id).catch(function() {}); });
              queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            }).catch(function() {});
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Payment confirmed!');
            setIsVerifying(false);
            setVerificationDone(true);
          } else {
            toast.error('Payment verification failed. If amount was deducted, contact Hubtel support.');
            setIsVerifying(false);
            setVerificationDone(true);
            setTimeout(function() { navigate(createPageUrl('Cart')); }, 3000);
          }
        });
    }, 2000); // Wait 2s for callback to process
  }, [user, searchParams, verificationDone, queryClient, navigate]);

  var { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: function() { return base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200); },
    enabled: !!user?.email && verificationDone,
    staleTime: 15000,
  });

  var deleteOrdersMutation = useMutation({
    mutationFn: async function(orderIds) { await Promise.all(orderIds.map(function(id) { return base44.entities.Order.delete(id); })); },
    onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['orders'] }); setSelectedOrders([]); toast.success('Deleted'); }
  });

  var cancelOrderMutation = useMutation({
    mutationFn: async function({ order, reason }) {
      var newTracking = (order.tracking_updates || []).concat([{ status: 'Cancelled', message: 'Cancelled by customer. Reason: ' + (reason || 'No reason'), timestamp: new Date().toISOString() }]);
      await base44.entities.Order.update(order.id, { status: 'cancelled', tracking_updates: newTracking });
      await base44.entities.Notification.create({ user_email: order.customer_email, title: 'Order Cancelled', message: 'Your order #' + order.order_number + ' has been cancelled. Contact 0208207543 for refund.', type: 'order_cancelled', order_id: order.id, order_number: order.order_number, is_read: false });
    },
    onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['orders'] }); setCancellingOrder(null); setCancelReason(''); toast.success('Order cancelled.'); }
  });

  var handleToggleSelect = function(id) { setSelectedOrders(function(p) { return p.includes(id) ? p.filter(function(x) { return x !== id; }) : p.concat([id]); }); };
  var handleSelectAll = function() { setSelectedOrders(function(p) { return p.length === orders.length ? [] : orders.map(function(o) { return o.id; }); }); };
  var handleDeleteSelected = function() { if (selectedOrders.length === 0) return; if (confirm('Delete ' + selectedOrders.length + ' order(s)?')) deleteOrdersMutation.mutate(selectedOrders); };

  // Loading while auth checking
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  // ========== GREEN VERIFICATION SCREEN ==========
  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-green-800 mb-2">Verifying Payment</h2>
          <p className="text-sm text-green-600">Please wait while we confirm your payment with Hubtel...</p>
          <div className="mt-4 h-1.5 bg-green-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!verificationDone) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!isLoading && orders.length === 0) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6"><Package className="h-16 w-16 text-gray-300 mb-4" /><p className="text-gray-500 font-medium mb-2">No orders yet</p><Link to={createPageUrl('Shop')} className="text-blue-600 font-semibold">Go to Shop</Link></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-xl font-bold text-gray-900">My Orders</h1><p className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p></div>
          {selectedOrders.length > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="h-3 w-3 mr-1" /> Delete {selectedOrders.length}</Button>}
        </div>

        {orders.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={selectedOrders.length === orders.length && orders.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" />
            <span className="text-xs text-gray-500">Select All</span>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? Array(3).fill(0).map(function(_, i) { return <Skeleton key={i} className="h-48 rounded-xl" />; }) : orders.map(function(order) {
            var isSelected = selectedOrders.includes(order.id);
            var payBadge = getPaymentBadge(order);
            var method = order.payment_method || 'full_payment';
            var isPaid = order.payment_status === 'paid';
            var s = order.status;
            var ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
            var rank = ORDER_RANK[s] || 0;
            var isExpanded = expandedOrder === order.id;

            var steps;
            if (method === 'full_payment') {
              steps = [
                { label: 'Order Placed', done: true },
                { label: 'Delivery Payment Confirmed', done: isPaid },
                { label: 'Product Payment', done: isPaid, color: isPaid ? 'text-green-600' : '' },
                { label: 'Processing', done: isPaid && rank >= 2 },
                { label: 'Packed', done: isPaid && rank >= 3 },
                { label: 'Shipped', done: isPaid && rank >= 4 },
                { label: 'Delivered', done: rank >= 6 },
              ];
            } else if (method === 'deposit_balance') {
              steps = [
                { label: 'Order Placed', done: true },
                { label: 'Delivery Payment Confirmed', done: isPaid },
                { label: 'Product Payment', done: rank >= 5, color: rank >= 5 ? 'text-green-600' : 'text-orange-600' },
                { label: 'Processing', done: isPaid && rank >= 2 },
                { label: 'Packed', done: isPaid && rank >= 3 },
                { label: 'Shipped', done: isPaid && rank >= 4 },
                { label: 'Delivered', done: rank >= 6 },
              ];
            } else {
              steps = [
                { label: 'Order Placed', done: true },
                { label: 'Delivery Payment Confirmed', done: true },
                { label: 'Product Payment', done: rank >= 5, color: rank >= 5 ? 'text-green-600' : 'text-red-600' },
                { label: 'Processing', done: rank >= 2 },
                { label: 'Packed', done: rank >= 3 },
                { label: 'Shipped', done: rank >= 4 },
                { label: 'Delivered', done: rank >= 6 },
              ];
            }

            return (
              <Card key={order.id} className={'p-4 bg-white ' + (isSelected ? 'ring-2 ring-blue-400' : '')}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isSelected} onChange={function() { handleToggleSelect(order.id); }} className="w-4 h-4 cursor-pointer mt-1" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
                      <p className="text-[10px] text-gray-500">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₵{order.total_amount?.toFixed(2)}</p>
                    <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' + (statusConfig[order.status]?.color || 'bg-gray-100')}>{statusConfig[order.status]?.label || order.status}</span>
                  </div>
                </div>

                <div className="mb-3"><span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + payBadge.color}>{payBadge.label}</span></div>

                <div className="mb-3 border-t border-gray-100 pt-2">
                  {order.items?.map(function(item, idx) {
                    return (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                        <div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-700 truncate">{item.product_name}</p><p className="text-[10px] text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p></div>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-3 border-t border-gray-100 pt-2">
                  <p className="text-xs font-bold text-gray-700 mb-2">Order Progress</p>
                  <div className="space-y-1.5">
                    {steps.map(function(step, i) {
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (step.done ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                            {step.done && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className={'text-xs ' + (step.done ? (step.color || 'text-gray-800 font-medium') : 'text-gray-400')}>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-600">📍 {order.delivery_address}</p>
                  <p className="text-xs text-gray-500 mt-1">📅 Est. delivery: {order.estimated_delivery && order.estimated_delivery.length > 4 && !order.estimated_delivery.startsWith('1970') ? format(new Date(order.estimated_delivery), 'MMM d, yyyy') : '—'}</p>
                  <div className="flex gap-3 mt-3">
                    <Link to={createPageUrl('OrderTracking') + '?id=' + order.id} className="text-xs text-blue-600 font-semibold">Track Order</Link>

                    {CANCELLABLE_STATUSES.includes(order.status) && (
                      <button onClick={function() { setCancellingOrder(order); setCancelReason(''); }} className="text-xs text-red-600 font-semibold">Cancel Order</button>
                    )}
                  </div>
                </div>

                {isExpanded && order.tracking_updates && order.tracking_updates.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold text-gray-700 mb-2">Tracking History</p>
                    <div className="space-y-2">
                      {order.tracking_updates.slice().reverse().map(function(update, idx) {
                        return (
                          <div key={idx} className="flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{update.status}</p>
                              <p className="text-[10px] text-gray-500">{update.message}</p>
                              {update.timestamp && <p className="text-[10px] text-gray-400">{format(new Date(update.timestamp), 'MMM d, yyyy h:mm a')}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {cancellingOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-2">Cancel Order</h3>
              <p className="text-sm text-gray-500 mb-4">#{cancellingOrder.order_number}</p>
              <textarea className="w-full border rounded-lg p-3 text-sm mb-4" rows={3} placeholder="Reason (optional)" value={cancelReason} onChange={function(e) { setCancelReason(e.target.value); }} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={function() { setCancellingOrder(null); }}>Keep Order</Button>
                <Button variant="destructive" className="flex-1" onClick={function() { cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason }); }} disabled={cancelOrderMutation.isPending}>
                  {cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
