import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { checkPaymentStatus } from '@/api/hubtelClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package,
  ChevronRight,
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
  pending_payment: { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending Payment' },
  failed: { color: 'bg-red-100 text-red-700', label: '❌ Failed' },
  cancelled: { color: 'bg-gray-100 text-gray-600', label: '🚫 Cancelled' },
  refunded: { color: 'bg-blue-100 text-blue-700', label: '↩️ Refunded' },
};

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  // Check payment status if returning from Hubtel
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');

    if (orderNumber && user) {
      console.log('[Orders] Checking payment for:', orderNumber, 'Status param:', status);

      checkPaymentStatus(orderNumber)
        .then(async (result) => {
          console.log('[Orders] Payment status result:', result);

          if (result?.data?.status) {
            const hubtelStatus = result.data.status.toLowerCase();
            const paymentStatus = (hubtelStatus === 'paid' || hubtelStatus === 'success') ? 'paid' : 'pending_payment';

            // Find the order
            const orders = await base44.entities.Order.filter({ order_number: orderNumber });
            if (orders && orders.length > 0) {
              const order = orders[0];

              // Update order with payment status
              await base44.entities.Order.update(order.id, {
                payment_status: paymentStatus,
                status: paymentStatus === 'paid' ? 'confirmed' : order.status,
                tracking_updates: [
                  ...(order.tracking_updates || []),
                  {
                    status: paymentStatus === 'paid' ? 'Payment Confirmed' : 'Payment Status Checked',
                    message: `Payment verified via Hubtel: ${result.data.status}`,
                    timestamp: new Date().toISOString(),
                  }
                ]
              });

              queryClient.invalidateQueries({ queryKey: ['orders'] });

              // NOTIFICATIONS: Only when payment is confirmed as PAID
              if (paymentStatus === 'paid') {
                toast.success('✅ Payment confirmed! Your order has been received.');

                // Clear cart
                try {
                  const cartItems = await base44.entities.CartItem.filter({ user_email: user.email });
                  for (const item of cartItems) {
                    await base44.entities.CartItem.delete(item.id).catch(() => {});
                  }
                  queryClient.invalidateQueries({ queryKey: ['cartItems'] });
                } catch (e) { console.warn('Cart clear error:', e); }

                // Notify CUSTOMER
                try {
                  await base44.entities.Notification.create({
                    user_email: order.customer_email || user.email,
                    title: '✅ Payment Confirmed!',
                    message: `Payment for order #${orderNumber} (GHS ${order.total_amount?.toFixed(2)}) has been confirmed! Your order is now being processed.`,
                    type: 'payment_confirmed',
                    order_id: order.id,
                    order_number: orderNumber,
                    is_read: false,
                  });
                } catch (e) { console.warn('Customer notification error:', e); }

                // Notify ADMIN(s)
                try {
                  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
                  for (const adminEmail of adminEmails) {
                    await base44.entities.Notification.create({
                      user_email: adminEmail,
                      title: '💰 New Payment Received!',
                      message: `Order #${orderNumber} by ${order.customer_name} (${order.customer_phone}) - GHS ${order.total_amount?.toFixed(2)} payment confirmed via Hubtel! Ready to process.`,
                      type: 'payment_confirmed',
                      order_id: order.id,
                      order_number: orderNumber,
                      is_read: false,
                    });
                  }
                } catch (e) { console.warn('Admin notification error:', e); }

                queryClient.invalidateQueries({ queryKey: ['notifications'] });

              } else {
                toast.info('Payment status checked. Please complete payment if needed.');
              }
            }
          }
        })
        .catch(err => {
          console.error('[Orders] Payment status check error:', err);
        });
    }
  }, [searchParams, user, queryClient]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
    enabled: !!user?.email,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      await Promise.all(orderIds.map(id => base44.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
      toast.success('Orders deleted successfully');
    }
  });

  const handleToggleSelect = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      const newTracking = [
        ...(order.tracking_updates || []),
        {
          status: 'Cancelled',
          message: `Order cancelled by customer. Reason: ${reason || 'No reason given'}`,
          timestamp: new Date().toISOString()
        }
      ];
      await base44.entities.Order.update(order.id, { status: 'cancelled', tracking_updates: newTracking });
      await base44.entities.Notification.create({
        user_email: order.customer_email,
        title: '❌ Order Cancelled',
        message: `Your order #${order.order_number} has been cancelled. If you paid, please contact us on WhatsApp: 0509 896 035 for a refund.`,
        type: 'order_cancelled',
        order_id: order.id,
        order_number: order.order_number,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCancellingOrder(null);
      setCancelReason('');
      toast.success('Order cancelled successfully.');
    }
  });

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)? This cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-sm text-gray-400">Start shopping to see your orders here</p>
          <Link to={createPageUrl('Shop')} className="inline-block mt-2 px-6 py-2 bg-blue-800 text-white rounded-full font-semibold text-sm hover:bg-blue-900">
            Go to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-lg mx-auto p-4">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">My Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>

          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedOrders.length} selected</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Selection Controls */}
        {orders.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={selectedOrders.length === orders.length && orders.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-gray-500">
              Select All ({selectedOrders.length}/{orders.length})
            </span>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-16 w-full" />
              </Card>
            ))
          ) : (
            orders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Package;
              const isSelected = selectedOrders.includes(order.id);

              return (
                <Card key={order.id} className={`p-4 ${isSelected ? 'ring-2 ring-blue-300' : ''}`}>

                  {/* Top bar: checkbox + order number + amount */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(order.id)}
                        className="w-4 h-4 cursor-pointer mt-1"
                      />
                      <div>
                        <p className="font-semibold text-sm">{order.order_number}</p>
                        <p className="text-xs text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₵{order.total_amount?.toFixed(2)}</p>
                      <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                      {order.payment_status && (
                        <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${paymentStatusConfig[order.payment_status]?.color || ''}`}>
                          {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product(s) with images */}
                  <div className="mb-3">
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {item.product_image && (
                            <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-400">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking checklist */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Order Progress</p>
                    {(() => {
                      const s = order.status;
                      const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
                      const rank = ORDER_RANK[s] || 0;
                      const isPaid = order.payment_status === 'paid';
                      const steps = [
                        { label: 'Order Placed', done: true },
                        { label: 'Payment Confirmed', done: isPaid },
                        { label: 'Processing', done: isPaid && rank >= 2 },
                        { label: 'Shipped', done: isPaid && rank >= 4 },
                        { label: 'Delivered', done: isPaid && rank >= 6 },
                      ];
                      return (
                        <div className="flex items-center gap-1">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${step.done ? 'bg-green-500' : 'bg-gray-200'}`}>
                                {step.done && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-[10px] text-gray-500 hidden sm:inline">{step.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Delivery info + actions */}
                  <div className="text-xs text-gray-500 mb-3">
                    <p>📍 {order.delivery_address}, {order.city}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={createPageUrl(`OrderTracking?id=${order.id}`)}
                      className="flex-1 text-center py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100"
                    >
                      Track Order
                    </Link>
                    {CANCELLABLE_STATUSES.includes(order.status) && (
                      <button
                        onClick={() => { setCancellingOrder(order); setCancelReason(''); }}
                        className="flex-1 text-center py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>

                </Card>
              );
            })
          )}
        </div>

        {/* Cancel Order Modal */}
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Cancel Order</h3>
                  <p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold">📋 Cancellation Policy</p>
                <p>Orders can only be cancelled while in Pending or Confirmed status.</p>
                <p>Once an order is Shipped or In Transit, it cannot be cancelled.</p>
                <p>If you have already paid, contact us on WhatsApp 0509 896 035 to arrange a refund.</p>
                <p>Refunds are processed within 1–3 business days via Mobile Money.</p>
                <p>Custom or special orders may not be eligible for cancellation.</p>
              </div>

              <div>
                <label className="text-sm font-medium">Reason for cancellation (optional)</label>
                <textarea
                  className="w-full border rounded-lg p-2 mt-1 text-sm"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setCancellingOrder(null); setCancelReason(''); }}>
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })}
                  disabled={cancelOrderMutation.isPending}
                >
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
