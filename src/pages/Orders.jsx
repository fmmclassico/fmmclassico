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
import {
  Package,
  ChevronRight,
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  Trash2,
  Check,
  AlertTriangle,
  Loader2
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

// Cancel allowed ONLY before shipping (confirmed, processing, packed)
const CANCELLABLE_STATUSES = ['confirmed', 'processing', 'packed'];

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
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const verificationDone = useRef(false);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  // === FAST PAYMENT VERIFICATION after Hubtel redirect ===
  useEffect(() => {
    if (!user || verificationDone.current) return;

    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');

    if (!orderNumber) return;
    verificationDone.current = true;
    setVerifyingPayment(true);

    console.log('[Orders] Payment verification started for:', orderNumber, 'Status param:', status);

    const verifyPayment = async () => {
      let paymentConfirmed = false;
      let attempts = 0;
      const maxAttempts = 3;

      // Poll up to 3 times, 1 second apart, to catch the callback update
      while (attempts < maxAttempts && !paymentConfirmed) {
        attempts++;
        console.log(`[Orders] Verification attempt ${attempts}/${maxAttempts}`);

        try {
          // First check: see if callback already updated the order in DB
          const orders = await base44.entities.Order.filter({ order_number: orderNumber });
          if (orders && orders.length > 0 && orders[0].payment_status === 'paid') {
            paymentConfirmed = true;
            console.log('[Orders] Payment already confirmed by callback!');
            break;
          }

          // Second check: verify directly with Hubtel
          const result = await checkPaymentStatus(orderNumber);
          console.log('[Orders] Hubtel status check result:', result);

          if (result?.data?.status) {
            const hubtelStatus = result.data.status.toLowerCase();
            if (hubtelStatus === 'paid' || hubtelStatus === 'success') {
              paymentConfirmed = true;

              // Update order to paid if callback hasn't done it yet
              if (orders && orders.length > 0 && orders[0].payment_status !== 'paid') {
                await base44.entities.Order.update(orders[0].id, {
                  payment_status: 'paid',
                  status: 'confirmed',
                  tracking_updates: [
                    ...(orders[0].tracking_updates || []),
                    {
                      status: 'Payment Confirmed',
                      message: `Payment verified: GHS ${result.data.amount || orders[0].total_amount}`,
                      timestamp: new Date().toISOString(),
                    }
                  ]
                });
              }
              break;
            }
          }
        } catch (err) {
          console.error(`[Orders] Verification attempt ${attempts} error:`, err);
        }

        // Wait 1 second before next attempt
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // === HANDLE RESULT ===
      if (paymentConfirmed) {
        // SUCCESS: Clear cart, send notifications, show success
        toast.success('✅ Payment confirmed! Your order has been received.');

        // Clear cart
        try {
          const cartItems = await base44.entities.CartItem.filter({ user_email: user.email });
          await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
          queryClient.invalidateQueries({ queryKey: ['cartItems'] });
        } catch (err) {
          console.error('[Orders] Cart clear error:', err);
        }

        // Send confirmation email to customer
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            from_name: 'FMM CLASSICO',
            subject: `✅ Payment Confirmed - Order #${orderNumber}`,
            body: `Hi ${user.full_name || 'Customer'},\n\nYour payment for order #${orderNumber} was successful!\n\nYour order is now being processed and you'll receive updates as it progresses.\n\nTrack your order at: ${window.location.origin}${createPageUrl('Orders')}\n\nThank you for shopping with FMM CLASSICO!\nFor help: 0509 896 035`
          });
        } catch (err) {
          console.error('[Orders] Email send error:', err);
        }

      } else {
        // FAILED/CANCELLED: Show failure message, don't clear cart
        if (status === 'cancelled') {
          toast.error('Payment was cancelled. Your cart items are still saved.');
        } else {
          toast.error('Payment could not be verified. If you completed payment, it will update shortly.');
        }

        // Send failure notification to customer
        try {
          await base44.entities.Notification.create({
            user_email: user.email,
            title: status === 'cancelled' ? '🚫 Payment Cancelled' : '⚠️ Payment Not Verified',
            message: status === 'cancelled'
              ? `Your payment for order #${orderNumber} was cancelled. Your items are still in your cart. You can try again anytime.`
              : `We couldn't verify payment for order #${orderNumber}. If you completed payment, it will update automatically. Otherwise, try again from your cart.`,
            type: status === 'cancelled' ? 'order_cancelled' : 'payment_pending',
            order_number: orderNumber,
            is_read: false,
          });
        } catch (err) {
          console.error('[Orders] Notification error:', err);
        }
      }

      // Clean up URL params and refresh orders
      setSearchParams({});
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setVerifyingPayment(false);
    };

    verifyPayment();
  }, [user, searchParams, queryClient, setSearchParams]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
    enabled: !!user?.email,
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
  });

  // ONLY show paid orders to customer (failed/cancelled payment orders are deleted by callback)
  const visibleOrders = orders.filter(o => o.payment_status === 'paid');

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
    if (selectedOrders.length === visibleOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(visibleOrders.map(o => o.id));
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

      // Notification to customer
      await base44.entities.Notification.create({
        user_email: order.customer_email,
        title: '❌ Order Cancelled',
        message: `Your order #${order.order_number} has been cancelled. If you paid, please contact us on WhatsApp: 0509 896 035 for a refund.`,
        type: 'order_cancelled',
        order_id: order.id,
        order_number: order.order_number,
        is_read: false
      });

      // Email to customer
      await base44.integrations.Core.SendEmail({
        to: order.customer_email,
        from_name: 'FMM CLASSICO',
        subject: `Order #${order.order_number} Cancelled`,
        body: `Hi ${order.customer_name},\n\nYour order #${order.order_number} has been cancelled.\nReason: ${reason || 'No reason given'}\n\nIf you paid, please contact us on WhatsApp: 0509 896 035 for a refund.\nRefunds are processed within 1-3 business days via Mobile Money.\n\nFMM CLASSICO Team`
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

  // === PAYMENT VERIFICATION LOADING SCREEN ===
  if (verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <h2 className="text-xl font-bold text-gray-800">Verifying Payment...</h2>
        <p className="text-gray-500 text-center text-sm">Please wait while we confirm your payment with Hubtel. This takes a few seconds.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  if (visibleOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <Package className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-700">No orders yet</h2>
        <p className="text-gray-500 text-sm">Start shopping to see your orders here</p>
        <Link to={createPageUrl('Home')}>
          <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-6">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">{visibleOrders.length} order{visibleOrders.length !== 1 ? 's' : ''}</p>
          </div>

          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedOrders.length} selected</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected} className="rounded-lg">
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Selection Controls */}
        {visibleOrders.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedOrders.length === visibleOrders.length && visibleOrders.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-gray-500">
              Select All ({selectedOrders.length}/{visibleOrders.length})
            </span>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4 rounded-xl">
                <Skeleton className="h-24 w-full rounded-lg" />
              </Card>
            ))
          ) : (
            visibleOrders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Package;
              const isSelected = selectedOrders.includes(order.id);

              return (
                <Card key={order.id} className={`p-4 rounded-xl border ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
                  {/* Top bar: checkbox + order number + amount */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(order.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-sm text-gray-900">#{order.order_number}</span>
                        <span className="text-xs text-gray-400 ml-2">{format(new Date(order.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-base text-gray-900">₵{order.total_amount?.toFixed(2)}</span>
                      <div className="flex gap-1 mt-1 flex-wrap justify-end">
                        <Badge className={`text-[10px] px-2 py-0.5 ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                        {order.payment_status && (
                          <Badge className={`text-[10px] px-2 py-0.5 ${paymentStatusConfig[order.payment_status]?.color || 'bg-gray-100'}`}>
                            {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Product(s) with images */}
                  <div className="border-t border-gray-100 pt-3 mb-3">
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          {item.product_image && (
                            <img src={item.product_image} alt={item.product_name} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking checklist */}
                  <div className="border-t border-gray-100 pt-3 mb-3">
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
                        { label: 'Packed', done: isPaid && rank >= 3 },
                        { label: 'Shipped', done: isPaid && rank >= 4 },
                        { label: 'Delivered', done: isPaid && rank >= 6 },
                      ];
                      return (
                        <div className="flex flex-wrap gap-2">
                          {steps.map((step, i) => (
                            <div key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${step.done ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${step.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {step.done && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span>{step.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Delivery info */}
                  <div className="border-t border-gray-100 pt-3 mb-3 text-xs text-gray-500 space-y-1">
                    <p>📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>
                    {order.estimated_delivery && (
                      <p>🗓 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link to={`${createPageUrl('Orders')}?track=${order.order_number}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs">
                        <Truck className="w-3.5 h-3.5 mr-1" />
                        Track Order
                      </Button>
                    </Link>
                    {/* Cancel button ONLY if not yet shipped */}
                    {CANCELLABLE_STATUSES.includes(order.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs"
                        onClick={() => { setCancellingOrder(order); setCancelReason(''); }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Cancel Order</h3>
                    <p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="font-semibold text-sm text-yellow-800 mb-2">📋 Cancellation Policy</p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Orders can only be cancelled before shipping (Confirmed, Processing, or Packed).</li>
                    <li>Once shipped or in transit, cancellation is not possible.</li>
                    <li>If you have already paid, contact us on WhatsApp <strong>0509 896 035</strong> to arrange a refund.</li>
                    <li>Refunds are processed within 1-3 business days via Mobile Money.</li>
                    <li>Custom or special orders may not be eligible for cancellation.</li>
                  </ul>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Reason for cancellation (optional)</label>
                  <textarea
                    className="w-full mt-1 p-3 border rounded-xl text-sm resize-none h-20"
                    placeholder="Tell us why you're cancelling..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => { setCancellingOrder(null); setCancelReason(''); }}
                  >
                    Keep Order
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })}
                    disabled={cancelOrderMutation.isPending}
                  >
                    {cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
