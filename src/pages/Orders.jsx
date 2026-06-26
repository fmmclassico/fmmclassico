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
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
  packed: { color: 'bg-orange-100 text-orange-800', label: 'Packed' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
  out_for_delivery: { color: 'bg-cyan-100 text-cyan-800', label: 'Out for Delivery' },
  in_transit: { color: 'bg-cyan-100 text-cyan-800', label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

const paymentStatusConfig = {
  paid: { color: 'bg-green-100 text-green-700', label: '✅ Paid' },
  pending_payment: { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending' },
  failed: { color: 'bg-red-100 text-red-700', label: '❌ Failed' },
};

// Only these statuses allow cancellation
const CANCELLABLE = ['confirmed', 'processing', 'packed'];

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  // Payment verification on return from Hubtel
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');
    if (!orderNumber || !user) return;

    setVerifyingPayment(true);

    const verify = async () => {
      try {
        const rawOrders = await base44.entities.Order.filter({ order_number: orderNumber });
        const ordersList = Array.isArray(rawOrders) ? rawOrders : Array.isArray(rawOrders?.data) ? rawOrders.data : [];
        if (ordersList.length === 0) { setVerifyingPayment(false); return; }

        const order = ordersList[0];
        if (order.payment_status === 'paid') {
          setVerifyingPayment(false);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          return;
        }

        if (status === 'success') {
          await base44.entities.Order.update(order.id, {
            payment_status: 'paid',
            status: order.status === 'processing' ? 'confirmed' : order.status,
            tracking_updates: [
              ...(order.tracking_updates || []),
              { status: 'Payment Confirmed', message: 'Payment confirmed via Hubtel.', timestamp: new Date().toISOString() }
            ]
          });

          // Send notification
          await base44.entities.Notification.create({
            user_email: order.customer_email,
            title: '✅ Payment Confirmed',
            message: `Payment for order #${order.order_number} has been confirmed. We're processing your order now!`,
            type: 'payment_confirmed',
            order_id: order.id,
            order_number: order.order_number,
            is_read: false
          });

          // Clear cart
          if (user?.email) {
            try {
              const rawItems = await base44.entities.CartItem.filter({ user_email: user.email });
              const items = Array.isArray(rawItems) ? rawItems : Array.isArray(rawItems?.data) ? rawItems.data : [];
              await Promise.all(items.map(item => base44.entities.CartItem.delete(item.id).catch(() => {})));
              queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            } catch (e) {}
          }
        } else {
          try {
            const result = await checkPaymentStatus(orderNumber);
            const hubtelStatus = result?.data?.status?.toLowerCase();
            if (hubtelStatus === 'paid' || hubtelStatus === 'success') {
              await base44.entities.Order.update(order.id, {
                payment_status: 'paid',
                status: order.status === 'processing' ? 'confirmed' : order.status,
                tracking_updates: [
                  ...(order.tracking_updates || []),
                  { status: 'Payment Confirmed', message: 'Payment confirmed via verification.', timestamp: new Date().toISOString() }
                ]
              });
            }
          } catch (e) {}
        }

        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } catch (e) {
        console.error('[Orders] verify error:', e);
      } finally {
        setVerifyingPayment(false);
      }
    };

    verify();
  }, [searchParams, queryClient, user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200);
      return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // DELETE orders
  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      for (const id of orderIds) {
        await base44.entities.Order.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
    },
    onError: (err) => {
      console.error('Delete failed:', err);
    }
  });

  // CANCEL order
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      await base44.entities.Order.update(order.id, {
        status: 'cancelled',
        tracking_updates: [
          ...(order.tracking_updates || []),
          {
            status: 'Cancelled',
            message: `Cancelled by customer. Reason: ${reason || 'No reason given'}`,
            timestamp: new Date().toISOString()
          }
        ]
      });
      await base44.entities.Notification.create({
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
    },
    onError: (err) => {
      console.error('Cancel failed:', err);
    }
  });

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)? This cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  // Loading states
  if (verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
        <p className="text-gray-700 font-semibold">Verifying payment...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!isLoading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <Package className="h-14 w-14 text-gray-300" />
        <p className="text-lg font-semibold text-gray-700">No orders yet</p>
        <Link to={createPageUrl('Shop')}>
          <Button className="rounded-xl bg-blue-800">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold">My Orders</h1>
          <p className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>
        {selectedOrders.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleteOrdersMutation.isPending}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete ({selectedOrders.length})
          </Button>
        )}
      </div>

      {/* Select all */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={selectedOrders.length === orders.length && orders.length > 0}
          onChange={() => setSelectedOrders(selectedOrders.length === orders.length ? [] : orders.map(o => o.id))}
          className="w-4 h-4"
        />
        <span className="text-xs text-gray-500">Select All</span>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : (
          orders.map(order => {
            const isSelected = selectedOrders.includes(order.id);
            const isPaid = order.payment_status === 'paid';
            const canCancel = CANCELLABLE.includes(order.status);
            const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
            const rank = ORDER_RANK[order.status] || 0;

            return (
              <Card key={order.id} className={`p-3 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                {/* Header row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => setSelectedOrders(prev =>
                        prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
                      )}
                      className="w-3.5 h-3.5"
                    />
                    <div>
                      <p className="text-xs font-bold">{order.order_number}</p>
                      <p className="text-[10px] text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₵{order.total_amount?.toFixed(2)}</p>
                    <div className="flex gap-1 justify-end flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>
                        {statusConfig[order.status]?.label || order.status}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${paymentStatusConfig[order.payment_status]?.color || 'bg-gray-100'}`}>
                        {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 mb-2">
                  {order.items?.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {item.product_image && <img src={item.product_image} className="w-9 h-9 rounded object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.product_name}</p>
                        <p className="text-[10px] text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {order.items?.length > 2 && <p className="text-[10px] text-gray-400">+{order.items.length - 2} more</p>}
                </div>

                {/* Progress (compact) */}
                <div className="flex items-center gap-0.5 mb-2 overflow-x-auto">
                  {['Placed', 'Paid', 'Processing', 'Shipped', 'Delivered'].map((label, i) => {
                    const done = [
                      true,
                      isPaid,
                      isPaid && rank >= 2,
                      isPaid && rank >= 4,
                      isPaid && rank >= 6
                    ][i];
                    return (
                      <div key={i} className="flex items-center">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-gray-200'}`}>
                          {done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-[8px] mx-0.5 whitespace-nowrap ${done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>{label}</span>
                        {i < 4 && <div className={`w-2 h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link to={`${createPageUrl('OrderTracking')}?id=${order.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-[11px] h-8">
                      Track Order
                    </Button>
                  </Link>
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-red-600 h-8"
                      onClick={() => { setCancellingOrder(order); setCancelReason(''); }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Cancel Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">Cancel Order</h3>
                <p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs text-gray-600">
              <p className="font-semibold mb-1">📋 Cancellation Policy</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Orders can only be cancelled while in Confirmed or Processing status.</li>
                <li>Once shipped, cancellation is not possible.</li>
                <li>If paid, contact WhatsApp 0509 896 035 for refund.</li>
                <li>Refunds processed within 1-3 business days via MoMo.</li>
              </ul>
            </div>

            <textarea
              className="w-full p-2 border rounded-lg text-sm mb-3"
              rows={2}
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancellingOrder(null)}>
                Keep Order
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={cancelOrderMutation.isPending}
                onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })}
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
