import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { checkPaymentStatus } from '@/api/hubtelClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Truck, MapPin, XCircle, Trash2, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2, label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', icon: Package, label: 'Processing' },
  packed: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Packed' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Shipped' },
  out_for_delivery: { color: 'bg-cyan-100 text-cyan-800', icon: MapPin, label: 'Out for Delivery' },
  in_transit: { color: 'bg-cyan-100 text-cyan-800', icon: MapPin, label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
  returned: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Returned' },
};

const CANCELLABLE_STATUSES = ['confirmed', 'processing'];

const paymentStatusConfig = {
  paid: { color: 'bg-green-100 text-green-700', label: '✅ Paid' },
  pending_payment: { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending' },
  failed: { color: 'bg-red-100 text-red-700', label: '❌ Failed' },
};

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const checkDone = useRef(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  // =============================================
  // PAYMENT VERIFICATION (only on return from Hubtel)
  // =============================================
  useEffect(() => {
    if (!user || checkDone.current) return;
    const orderNumber = searchParams.get('order');
    const urlStatus = searchParams.get('status');
    if (!orderNumber) return;

    checkDone.current = true;

    // If user cancelled on Hubtel side, just clean up
    if (urlStatus === 'cancelled') {
      localStorage.removeItem('pendingOrder');
      return;
    }

    setVerifying(true);
    verifyAndCreateOrder(orderNumber);
  }, [user, searchParams]);

  const verifyAndCreateOrder = async (orderNumber) => {
    try {
      // Check if order already exists in DB (callback may have created it)
      const existing = await base44.entities.Order.filter({ order_number: orderNumber });
      if (existing && existing.length > 0) {
        // Order exists. If paid, clear cart.
        if (existing[0].payment_status === 'paid') {
          await clearCart(user.email);
          localStorage.removeItem('pendingOrder');
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        setVerifying(false);
        return;
      }

      // Order doesn't exist yet. Verify payment with Hubtel.
      const result = await checkPaymentStatus(orderNumber);
      let isPaid = false;
      if (result?.data?.status) {
        const s = result.data.status.toLowerCase();
        isPaid = (s === 'paid' || s === 'success');
      }

      if (isPaid) {
        // Payment confirmed! Create the order now.
        await createOrderFromPending(orderNumber);
        await clearCart(user.email);
        await sendNotifications(orderNumber);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        localStorage.removeItem('pendingOrder');
        setVerifying(false);
      } else {
        // Not confirmed yet. Poll DB for callback to create it.
        pollForOrder(orderNumber, 0);
      }
    } catch (err) {
      console.error('[Orders] Verification error:', err);
      setVerifying(false);
    }
  };

  const pollForOrder = (orderNumber, attempt) => {
    if (attempt > 6) {
      // After 30 seconds, give up polling. User can refresh.
      setVerifying(false);
      return;
    }
    setTimeout(async () => {
      const orders = await base44.entities.Order.filter({ order_number: orderNumber });
      if (orders && orders.length > 0 && orders[0].payment_status === 'paid') {
        await clearCart(user.email);
        localStorage.removeItem('pendingOrder');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        setVerifying(false);
      } else {
        pollForOrder(orderNumber, attempt + 1);
      }
    }, 5000);
  };

  const createOrderFromPending = async (orderNumber) => {
    const pending = localStorage.getItem('pendingOrder');
    if (!pending) return;
    const data = JSON.parse(pending);
    await base44.entities.Order.create({
      ...data,
      order_number: orderNumber,
      payment_status: 'paid',
      status: 'confirmed',
      tracking_updates: [
        { status: 'Payment Confirmed', message: 'Payment verified. Order confirmed.', timestamp: new Date().toISOString() }
      ],
    });
  };

  const clearCart = async (email) => {
    try {
      const items = await base44.entities.CartItem.filter({ user_email: email });
      for (const item of items || []) {
        await base44.entities.CartItem.delete(item.id).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
    } catch (e) { /* silent */ }
  };

  const sendNotifications = async (orderNumber) => {
    try {
      const pending = localStorage.getItem('pendingOrder');
      if (!pending) return;
      const data = JSON.parse(pending);

      // Customer notification
      await base44.entities.Notification.create({
        user_email: user.email,
        title: '✅ Payment Confirmed!',
        message: `Order #${orderNumber} (GHS ${data.total_amount?.toFixed(2)}) confirmed! Your order is being processed.`,
        type: 'payment_confirmed',
        order_number: orderNumber,
        is_read: false,
      });

      // Admin notifications
      const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      for (const email of adminEmails) {
        await base44.entities.Notification.create({
          user_email: email,
          title: '💰 New Paid Order!',
          message: `#${orderNumber} by ${data.customer_name} (${data.customer_phone}) paid GHS ${data.total_amount?.toFixed(2)}.`,
          type: 'payment_confirmed',
          order_number: orderNumber,
          is_read: false,
        });
      }
    } catch (e) { /* silent */ }
  };

  // =============================================
  // DATA + MUTATIONS
  // =============================================
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
    enabled: !!user?.email,
    staleTime: 10000,
    refetchInterval: verifying ? 5000 : 60000,
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      for (const id of orderIds) {
        await base44.entities.Order.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      await base44.entities.Order.update(order.id, {
        status: 'cancelled',
        tracking_updates: [...(order.tracking_updates || []), { status: 'Cancelled', message: `Customer cancelled. Reason: ${reason || 'None'}`, timestamp: new Date().toISOString() }]
      });
      await base44.entities.Notification.create({
        user_email: order.customer_email,
        title: '❌ Order Cancelled',
        message: `Order #${order.order_number} cancelled. If paid, contact WhatsApp 0509 896 035 for refund.`,
        type: 'order_cancelled',
        order_number: order.order_number,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCancellingOrder(null);
      setCancelReason('');
    }
  });

  const handleToggleSelect = (id) => setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAll = () => setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map(o => o.id));
  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)? Cannot undo.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  if (!user) return <div className="p-4 space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;

  if (!isLoading && orders.length === 0 && !verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 font-medium">No orders yet</p>
          <Link to={createPageUrl('Shop')} className="inline-block mt-2 px-6 py-2 bg-blue-800 text-white rounded-full font-semibold text-sm">Go to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-lg mx-auto p-4">

        {verifying && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Verifying payment...</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-xl font-bold">My Orders</h1><p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p></div>
          {selectedOrders.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={deleteOrdersMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-1" />Delete {selectedOrders.length}
            </Button>
          )}
        </div>

        {orders.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={selectedOrders.length === orders.length && orders.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" />
            <span className="text-xs text-gray-500">Select All</span>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />) : orders.map((order) => {
            const isSelected = selectedOrders.includes(order.id);
            return (
              <Card key={order.id} className={`p-4 ${isSelected ? 'ring-2 ring-blue-300' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 cursor-pointer mt-1" />
                    <div>
                      <p className="font-semibold text-sm">{order.order_number}</p>
                      <p className="text-xs text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₵{order.total_amount?.toFixed(2)}</p>
                    <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>{statusConfig[order.status]?.label || order.status}</Badge>
                    {order.payment_status && <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${paymentStatusConfig[order.payment_status]?.color || ''}`}>{paymentStatusConfig[order.payment_status]?.label || order.payment_status}</p>}
                  </div>
                </div>

                <div className="mb-3 space-y-2">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{item.product_name}</p><p className="text-xs text-gray-400">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p></div>
                    </div>
                  ))}
                </div>

                <div className="mb-3">
                  {(() => {
                    const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
                    const rank = ORDER_RANK[order.status] || 0;
                    const isPaid = order.payment_status === 'paid';
                    const steps = [{ label: 'Placed', done: true }, { label: 'Paid', done: isPaid }, { label: 'Processing', done: isPaid && rank >= 2 }, { label: 'Shipped', done: isPaid && rank >= 4 }, { label: 'Delivered', done: isPaid && rank >= 6 }];
                    return <div className="flex items-center gap-1">{steps.map((step, i) => <div key={i} className="flex items-center gap-0.5"><div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${step.done ? 'bg-green-500' : 'bg-gray-200'}`}>{step.done && <Check className="w-3 h-3" />}</div><span className="text-[10px] text-gray-500 hidden sm:inline">{step.label}</span></div>)}</div>;
                  })()}
                </div>

                <p className="text-xs text-gray-500 mb-3">📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>

                <div className="flex items-center gap-2">
                  <Link to={createPageUrl(`OrderTracking?id=${order.id}`)} className="flex-1 text-center py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">Track Order</Link>
                  {CANCELLABLE_STATUSES.includes(order.status) && <button onClick={() => { setCancellingOrder(order); setCancelReason(''); }} className="flex-1 text-center py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">Cancel</button>}
                </div>
              </Card>
            );
          })}
        </div>

        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-bold">Cancel #{cancellingOrder.order_number}?</h3>
              <p className="text-xs text-gray-500">If you paid, contact WhatsApp 0509 896 035 for refund.</p>
              <textarea className="w-full border rounded-lg p-2 text-sm" placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancellingOrder(null)}>Keep</Button>
                <Button variant="destructive" className="flex-1" onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })} disabled={cancelOrderMutation.isPending}>{cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
