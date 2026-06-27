import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { supabase } from '@/lib/supabase';
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

// Helper to send notification to both customer and admin
async function sendNotification({ userEmail, adminEmails, title, message, type, orderNumber, orderId }) {
  // Notify customer
  await supabase.from('notifications').insert({
    user_email: userEmail,
    title,
    message,
    type,
    order_number: orderNumber,
    order_id: orderId,
    is_read: false,
  });
  // Notify all admins
  if (adminEmails && adminEmails.length > 0) {
    const adminNotifs = adminEmails.map(email => ({
      user_email: email,
      title: `[ADMIN] ${title}`,
      message: `Customer (${userEmail}): ${message}`,
      type,
      order_number: orderNumber,
      order_id: orderId,
      is_read: false,
    }));
    await supabase.from('notifications').insert(adminNotifs);
  }
}

function getAdminEmails() {
  const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || '';
  return envAdminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser(authUser);
      } else {
        window.location.href = createPageUrl('Login');
      }
    });
  }, []);

  // Check payment status if returning from Hubtel
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');

    if (!orderNumber || !user) return;

    console.log('[Orders] Checking payment status for order:', orderNumber);

    const timer = setTimeout(async () => {
      try {
        const result = await checkPaymentStatus(orderNumber);
        console.log('[Orders] Hubtel Transaction Status response:', result);

        let paymentStatus = 'pending_payment';
        if (result?.data?.status) {
          const hubtelStatus = result.data.status.toLowerCase();
          paymentStatus = (hubtelStatus === 'paid' || hubtelStatus === 'success') ? 'paid' : 'pending_payment';
        } else if (status === 'success') {
          paymentStatus = 'paid';
        }

        const { data: orders, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', orderNumber)
          .limit(1);

        if (fetchError || !orders || orders.length === 0) {
          console.error('[Orders] Could not find order:', orderNumber);
          return;
        }

        const order = orders[0];

        // Only update if status actually changed
        if (order.payment_status === paymentStatus) {
          if (paymentStatus === 'paid') {
            toast.success('✅ Payment already confirmed!');
          }
          return;
        }

        const trackingUpdates = order.tracking_updates || [];
        trackingUpdates.push({
          status: paymentStatus === 'paid' ? 'Payment Confirmed' : 'Payment Pending',
          message: `Payment verified via Hubtel Status API: ${paymentStatus}`,
          timestamp: new Date().toISOString(),
        });

        await supabase
          .from('orders')
          .update({
            payment_status: paymentStatus,
            tracking_updates: trackingUpdates,
          })
          .eq('id', order.id);

        // Send notifications to customer AND admin
        const adminEmails = getAdminEmails();
        if (paymentStatus === 'paid') {
          await sendNotification({
            userEmail: user.email,
            adminEmails,
            title: '✅ Payment Confirmed',
            message: `Payment for order #${orderNumber} (₵${order.total_amount?.toFixed(2)}) has been confirmed successfully!`,
            type: 'payment_confirmed',
            orderNumber: orderNumber,
            orderId: order.id,
          });

          toast.success('✅ Payment confirmed! Your order has been received.');

          // Clear cart
          await supabase.from('cart_items').delete().eq('user_email', user.email);
          queryClient.invalidateQueries({ queryKey: ['cartItems'] });
        } else {
          await sendNotification({
            userEmail: user.email,
            adminEmails,
            title: '⏳ Payment Pending',
            message: `Payment for order #${orderNumber} is still being processed. We'll notify you once confirmed.`,
            type: 'payment_pending',
            orderNumber: orderNumber,
            orderId: order.id,
          });
          toast.info('Payment is being processed. It may take a moment to confirm.');
        }

        // Force refresh
        queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
        queryClient.refetchQueries({ queryKey: ['orders', user.email] });
        queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });

      } catch (err) {
        console.error('[Orders] Payment status check error:', err);
        if (status === 'success') {
          const { data: orders } = await supabase
            .from('orders')
            .select('id, total_amount')
            .eq('order_number', orderNumber)
            .limit(1);
          if (orders && orders.length > 0) {
            await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orders[0].id);

            const adminEmails = getAdminEmails();
            await sendNotification({
              userEmail: user.email,
              adminEmails,
              title: '✅ Payment Confirmed',
              message: `Payment for order #${orderNumber} (₵${orders[0].total_amount?.toFixed(2)}) has been confirmed!`,
              type: 'payment_confirmed',
              orderNumber: orderNumber,
              orderId: orders[0].id,
            });

            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            queryClient.refetchQueries({ queryKey: ['orders', user.email] });
            queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });
            toast.success('✅ Payment confirmed!');
          }
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchParams, queryClient, user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', user.email)
        .order('created_date', { ascending: false })
        .limit(200);
      if (error) { console.error('Fetch orders error:', error); return []; }
      return data || [];
    },
    enabled: !!user?.email,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      await Promise.all(orderIds.map(async (id) => {
        await supabase.from('orders').delete().eq('id', id);
      }));
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
      await supabase.from('orders').update({ status: 'cancelled', tracking_updates: newTracking }).eq('id', order.id);

      const adminEmails = getAdminEmails();
      await sendNotification({
        userEmail: order.customer_email,
        adminEmails,
        title: '❌ Order Cancelled',
        message: `Order #${order.order_number} has been cancelled. ${reason ? `Reason: ${reason}` : ''} If paid, contact WhatsApp: 0509 896 035 for a refund.`,
        type: 'order_cancelled',
        orderNumber: order.order_number,
        orderId: order.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Card className="p-8 max-w-sm w-full">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">No orders yet</h2>
          <p className="text-gray-500 mt-2 mb-6">Start shopping to see your orders here</p>
          <Link to={createPageUrl('Shop')}>
            <Button className="w-full rounded-xl bg-blue-800 hover:bg-blue-900">Go to Shop</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedOrders.length} selected</span>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {orders.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={selectedOrders.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            Select All ({selectedOrders.length}/{orders.length})
          </span>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : (
          orders.map((order) => {
            const isSelected = selectedOrders.includes(order.id);

            return (
              <Card key={order.id} className={`p-4 rounded-xl border ${isSelected ? 'border-blue-400 bg-blue-50/30' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(order.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-sm">{order.order_number}</span>
                      <p className="text-xs text-gray-500">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-base">₵{order.total_amount?.toFixed(2)}</span>
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>
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

                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 flex-1 min-w-[200px]">
                        {item.product_image && (
                          <img src={item.product_image} alt={item.product_name} className="w-10 h-10 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.product_name}</p>
                          <p className="text-xs text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
                      <div className="flex flex-wrap gap-2">
                        {steps.map((step, i) => (
                          <div key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${step.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${step.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                              {step.done && <Check className="w-2 h-2 text-white" />}
                            </div>
                            <span>{step.label}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  <p>📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`${createPageUrl('OrderTracking')}?order=${order.order_number}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs rounded-lg">
                      Track Order
                    </Button>
                  </Link>
                  {CANCELLABLE_STATUSES.includes(order.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-600"
                      onClick={() => { setCancellingOrder(order); setCancelReason(''); }}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 rounded-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Cancel Order</h3>
                <p className="text-sm text-gray-500">#{cancellingOrder.order_number}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800">
              <p className="font-semibold mb-1">📋 Cancellation Policy</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Orders can only be cancelled while in Pending or Confirmed status.</li>
                <li>Once an order is Shipped or In Transit, it cannot be cancelled.</li>
                <li>If you have already paid, contact us on WhatsApp 0509 896 035 to arrange a refund.</li>
                <li>Refunds are processed within 1–3 business days via Mobile Money.</li>
                <li>Custom or special orders may not be eligible for cancellation.</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">Reason for cancellation (optional)</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-lg text-sm"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setCancellingOrder(null); setCancelReason(''); }}
              >
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
          </Card>
        </div>
      )}
    </div>
  );
}
