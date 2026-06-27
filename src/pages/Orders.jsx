import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { checkPaymentStatus } from '@/api/hubtelClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseNotifications } from '@/lib/supabaseNotifications';
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
  const { user, isAuthenticated } = useAuth();
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      base44.auth.redirectToLogin(createPageUrl('Home'));
    }
  }, [isAuthenticated, user]);

  // Check payment status ONLY if returning from Hubtel with success status
  useEffect(() => {
    if (!user?.email) return;

    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');

    // ONLY process if status is 'success' — meaning Hubtel redirected after payment
    if (!orderNumber || status !== 'success') return;

    console.log('[Orders] Hubtel redirect detected. Checking payment for:', orderNumber);

    checkPaymentStatus(orderNumber)
      .then(result => {
        if (result?.data?.status) {
          const paymentStatus = result.data.status.toLowerCase() === 'paid' ? 'paid' : 'pending_payment';

          base44.entities.Order.filter({ order_number: orderNumber })
            .then(orders => {
              const ordersList = Array.isArray(orders) ? orders : orders?.data || [];
              if (ordersList.length > 0) {
                const order = ordersList[0];
                base44.entities.Order.update(order.id, {
                  payment_status: paymentStatus,
                  tracking_updates: [
                    ...(order.tracking_updates || []),
                    {
                      status: 'Payment Status Verified',
                      message: `Payment: ${result.data.status}`,
                      timestamp: new Date().toISOString(),
                    }
                  ]
                }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['orders'] });

                  if (paymentStatus === 'paid') {
                    toast.success('✅ Payment confirmed! Your order has been received.');
                    // ONLY clear cart here — after confirmed paid + Hubtel redirect
                    base44.entities.CartItem.filter({ user_email: user.email })
                      .then(items => {
                        const cartList = Array.isArray(items) ? items : items?.data || [];
                        Promise.all(cartList.map(item => base44.entities.CartItem.delete(item.id).catch(() => {})))
                          .then(() => queryClient.invalidateQueries({ queryKey: ['cartItems'] }));
                      }).catch(() => {});
                  } else {
                    toast.info('Payment pending. Complete payment to process your order.');
                  }
                });
              }
            });
        }
      })
      .catch(err => {
        console.error('[Orders] Payment check error:', err);
      });
  }, [searchParams, user?.email, queryClient]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200);
      return Array.isArray(result) ? result : result?.data || [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      // Delete sequentially to avoid rate limits
      for (const id of orderIds) {
        await base44.entities.Order.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
      toast.success('Orders deleted successfully');
    },
    onError: (err) => {
      console.error('Delete orders error:', err);
      toast.error('Failed to delete orders. Try again.');
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
      // Create notification via Supabase
      await supabaseNotifications.create({
        user_email: order.customer_email,
        title: '❌ Order Cancelled',
        message: `Your order #${order.order_number} has been cancelled. If you paid, contact us on WhatsApp: 0509 896 035 for a refund.`,
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
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isLoading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="space-y-4">
          <Package className="h-16 w-16 text-gray-300 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">No orders yet</h2>
          <p className="text-gray-500">Start shopping to see your orders here</p>
          <Link to={createPageUrl('Shop')}>
            <Button className="rounded-full bg-[#2E86C1] hover:bg-[#2578ae] text-white px-8">
              Go to Shop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedOrders.length} selected</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteOrdersMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deleteOrdersMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
      </div>

      {/* Selection Controls */}
      {orders.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-2">
          <input
            type="checkbox"
            checked={selectedOrders.length > 0 && selectedOrders.length === orders.length}
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            Select All ({selectedOrders.length}/{orders.length})
          </span>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))
        ) : (
          orders.map((order) => {
            const StatusIcon = statusConfig[order.status]?.icon || Package;
            const isSelected = selectedOrders.includes(order.id);

            return (
              <Card key={order.id} className={`p-4 space-y-3 border ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
                {/* Top bar */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(order.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-sm">{order.order_number}</span>
                      <span className="text-xs text-gray-400 ml-2">{format(new Date(order.created_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-base">₵{order.total_amount?.toFixed(2)}</span>
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                      {order.payment_status && (
                        <Badge className={`text-xs ${paymentStatusConfig[order.payment_status]?.color || 'bg-gray-100'}`}>
                          {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product(s) */}
                <div className="flex gap-2 overflow-x-auto py-1">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 min-w-fit">
                      {item.product_image && (
                        <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-xs font-medium text-gray-800 line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Progress — Green indicators with labels */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Order Progress</p>
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
                      <div className="space-y-1.5">
                        {steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.done ? 'bg-green-500' : 'bg-gray-200'
                            }`}>
                              {step.done && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className={`text-xs font-medium ${
                              step.done ? 'text-green-700' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Delivery info + actions */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>
                  {order.estimated_delivery && (
                    <p>🗓 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link to={createPageUrl(`Orders?order=${order.order_number}`)}>
                    <Button variant="outline" size="sm" className="text-xs rounded-full">
                      Track Order
                    </Button>
                  </Link>
                  {CANCELLABLE_STATUSES.includes(order.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-600 rounded-full"
                      onClick={() => { setCancellingOrder(order); setCancelReason(''); }}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-bold">Cancel Order</h3>
              <p className="text-sm text-gray-500">#{cancellingOrder.order_number}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-1">
              <p className="font-semibold">📋 Cancellation Policy</p><ul className="list-disc pl-4 space-y-0.5">
                <li>Orders can only be cancelled while in Pending or Confirmed status.</li>
                <li>If you have already paid, contact us on WhatsApp 0509 896 035 for a refund.</li>
                <li>Refunds are processed within 1–3 business days via Mobile Money.</li>
              </ul>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <textarea
                className="w-full border rounded-lg p-2 mt-1 text-sm"
                rows={3}
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
  );
}
