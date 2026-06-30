import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { verifyPaymentWithRetries } from '@/api/hubtelClient';
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
  Loader2,
  ShieldCheck
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

// Only allow cancel if NOT shipped, out_for_delivery, in_transit, or delivered
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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Payment verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null); // 'paid' | 'failed' | null

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  // === PAYMENT VERIFICATION ON REDIRECT FROM HUBTEL ===
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');

    if (!orderNumber || !user) return;

    // Start verification
    setIsVerifying(true);
    setVerificationResult(null);

    console.log('[Orders] Verifying payment for:', orderNumber, 'redirect status:', status);

    const doVerification = async () => {
      // If Hubtel redirected with cancelled status, mark as failed immediately
      if (status === 'cancelled') {
        setVerificationResult('failed');
        setIsVerifying(false);

        // Send failure notification
        await base44.entities.Notification.create({
          user_email: user.email,
          title: '❌ Payment Cancelled',
          message: `Your payment for order #${orderNumber} was cancelled. Your items are still in your cart. You can try again anytime.`,
          type: 'order_cancelled',
          order_number: orderNumber,
          is_read: false,
          created_date: new Date().toISOString(),
        }).catch(() => {});

        // Delete the pending order so it doesn't appear
        try {
          const orders = await base44.entities.Order.filter({ order_number: orderNumber });
          if (orders && orders.length > 0 && orders[0].payment_status !== 'paid') {
            await base44.entities.Order.delete(orders[0].id);
          }
        } catch (e) { console.error(e); }

        // Clear URL params after 3 seconds
        setTimeout(() => {
          setSearchParams({});
          setVerificationResult(null);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }, 3000);
        return;
      }

      // Verify payment with Hubtel (retries for ~3 seconds)
      const result = await verifyPaymentWithRetries(orderNumber, 4, 800);

      if (result.verified && result.status === 'paid') {
        setVerificationResult('paid');

        // Update order to paid + confirmed
        try {
          const orders = await base44.entities.Order.filter({ order_number: orderNumber });
          if (orders && orders.length > 0) {
            const order = orders[0];
            if (order.payment_status !== 'paid') {
              await base44.entities.Order.update(order.id, {
                payment_status: 'paid',
                status: 'confirmed',
                tracking_updates: [
                  ...(order.tracking_updates || []),
                  {
                    status: 'Payment Confirmed',
                    message: 'Payment verified successfully via Hubtel.',
                    timestamp: new Date().toISOString(),
                  }
                ]
              });
            }

            // Clear the cart
            const cartItems = await base44.entities.CartItem.filter({ user_email: user.email });
            for (const item of cartItems) {
              await base44.entities.CartItem.delete(item.id).catch(() => {});
            }
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });

            // Send payment success notification to customer
            await base44.entities.Notification.create({
              user_email: user.email,
              title: '✅ Payment Confirmed!',
              message: `Your payment for order #${orderNumber} (₵${order.total_amount?.toFixed(2)}) was successful! Your order is now being processed.`,
              type: 'payment_confirmed',
              order_id: order.id,
              order_number: orderNumber,
              is_read: false,
              created_date: new Date().toISOString(),
            }).catch(() => {});

            // Send email to customer
            await base44.integrations.Core.SendEmail({
              to: user.email,
              from_name: 'FMM CLASSICO',
              subject: `✅ Payment Confirmed – Order #${orderNumber}`,
              body: `Hi ${order.customer_name || user.full_name},\n\nYour payment of ₵${order.total_amount?.toFixed(2)} for order #${orderNumber} has been confirmed!\n\nYour order is now being processed and will be shipped soon.\n\n📦 Order: #${orderNumber}\n💰 Total: ₵${order.total_amount?.toFixed(2)}\n📍 Delivery: ${order.delivery_address}\n\nTrack your order on FMM CLASSICO.\nFor help: 0509896035\n\nThank you for shopping with us!\nFMM CLASSICO Team`
            }).catch(() => {});
          }
        } catch (e) { console.error('[Orders] Verification update error:', e); }

        toast.success('✅ Payment confirmed! Your order has been received.');
      } else if (result.verified && (result.status === 'failed' || result.status === 'cancelled')) {
        setVerificationResult('failed');

        // Send failure notification
        await base44.entities.Notification.create({
          user_email: user.email,
          title: '❌ Payment Failed',
          message: `Your payment for order #${orderNumber} could not be completed. Your items are still in your cart. Please try again.`,
          type: 'payment_pending',
          order_number: orderNumber,
          is_read: false,
          created_date: new Date().toISOString(),
        }).catch(() => {});

        // Delete the failed order
        try {
          const orders = await base44.entities.Order.filter({ order_number: orderNumber });
          if (orders && orders.length > 0 && orders[0].payment_status !== 'paid') {
            await base44.entities.Order.delete(orders[0].id);
          }
        } catch (e) { console.error(e); }

        toast.error('Payment could not be verified. Please try again.');
      } else {
        // Unknown/pending - the callback will handle it, check the DB
        try {
          const orders = await base44.entities.Order.filter({ order_number: orderNumber });
          if (orders && orders.length > 0 && orders[0].payment_status === 'paid') {
            setVerificationResult('paid');
            // Cart clear
            const cartItems = await base44.entities.CartItem.filter({ user_email: user.email });
            for (const item of cartItems) {
              await base44.entities.CartItem.delete(item.id).catch(() => {});
            }
            queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            toast.success('✅ Payment confirmed! Your order has been received.');
          } else {
            // Still pending, wait for callback - show as pending
            setVerificationResult('pending');
          }
        } catch (e) {
          setVerificationResult('pending');
        }
      }

      setIsVerifying(false);

      // Clear URL params after showing result for 3 seconds
      setTimeout(() => {
        setSearchParams({});
        setVerificationResult(null);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }, 3500);
    };

    doVerification();
  }, [searchParams, user, queryClient, setSearchParams]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
    enabled: !!user?.email,
    staleTime: 10000,
    gcTime: 5 * 60 * 1000,
  });

  // ONLY show orders that have been paid (failed/cancelled orders get deleted by callback)
  const displayOrders = orders.filter(o => o.payment_status === 'paid');

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
    if (selectedOrders.length === displayOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(displayOrders.map(o => o.id));
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
        is_read: false,
        created_date: new Date().toISOString(),
      });

      // Email to customer
      await base44.integrations.Core.SendEmail({
        to: order.customer_email,
        from_name: 'FMM CLASSICO',
        subject: `❌ Order #${order.order_number} Cancelled`,
        body: `Hi ${order.customer_name},\n\nYour order #${order.order_number} has been cancelled.\nReason: ${reason || 'No reason given'}\n\nIf you have already paid, please contact us on WhatsApp: 0509 896 035 for a refund. Refunds are processed within 1-3 business days via Mobile Money.\n\nFMM CLASSICO Team`
      }).catch(() => {});
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

  // === PAYMENT VERIFICATION SCREEN ===
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-sm w-full shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
          <p className="text-gray-500 text-sm mb-4">Please wait while we confirm your payment with Hubtel.</p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </Card>
      </div>
    );
  }

  if (verificationResult === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-sm w-full shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 text-sm">Your order has been confirmed. You'll see it below shortly.</p>
        </Card>
      </div>
    );
  }

  if (verificationResult === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-sm w-full shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Payment Failed</h2>
          <p className="text-gray-500 text-sm mb-4">Your payment could not be verified. Your items are still in your cart.</p>
          <Link to={createPageUrl('Cart')}>
            <Button className="w-full bg-blue-700 text-white">Try Again</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (verificationResult === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-sm w-full shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-yellow-700 mb-2">Payment Processing</h2>
          <p className="text-gray-500 text-sm mb-4">Your payment is still being processed. Please check back in a moment.</p>
          <Button onClick={() => { setVerificationResult(null); setSearchParams({}); queryClient.invalidateQueries({ queryKey: ['orders'] }); }} className="w-full bg-blue-700 text-white">
            View Orders
          </Button>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-40" />
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  if (displayOrders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="p-8 text-center max-w-sm w-full">
          <Package className="mx-auto w-12 h-12 text-gray-300 mb-4" />
          <h2 className="font-bold text-lg text-gray-700">No orders yet</h2>
          <p className="text-sm text-gray-400 mt-1">Start shopping to see your orders here</p>
          <Link to={createPageUrl('Home')}>
            <Button className="mt-4 bg-blue-800 text-white rounded-xl">Go to Shop</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">{displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''}</p>
          </div>

          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedOrders.length} selected</span>
              <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={deleteOrdersMutation.isPending}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Selection Controls */}
        {displayOrders.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={selectedOrders.length === displayOrders.length && displayOrders.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-gray-500">
              Select All ({selectedOrders.length}/{displayOrders.length})
            </span>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-32 w-full" />
              </Card>
            ))
          ) : (
            displayOrders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Package;
              const isSelected = selectedOrders.includes(order.id);

              return (
                <Card key={order.id} className={`p-4 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
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
                        <span className="font-bold text-sm text-gray-900">{order.order_number}</span>
                        <p className="text-xs text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm">₵{order.total_amount?.toFixed(2)}</span>
                      <div className="flex gap-1 mt-1 flex-wrap justify-end">
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

                  {/* Product(s) with images, name, quantity, order number */}
                  <div className="border-t pt-3 mb-3">
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          {item.product_image && (
                            <img src={item.product_image} alt={item.product_name} className="w-14 h-14 rounded-lg object-cover border" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-500">Order: {order.order_number}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking checklist */}
                  <div className="border-t pt-3 mb-3">
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
                        <div className="space-y-1">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${step.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {step.done && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`text-xs ${step.done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>{step.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Delivery info + estimated time + actions */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500">📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>
                    {order.estimated_delivery && (
                      <p className="text-xs text-gray-500 mt-1">🗓 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>
                    )}
                    {order.delivery_time_note && (
                      <p className="text-xs text-blue-600 mt-1">🚚 {order.delivery_time_note}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Link to={createPageUrl('TrackOrder') + `?order=${order.order_number}`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Truck className="w-3 h-3 mr-1" />
                        Track Order
                      </Button>
                    </Link>
                    {/* Cancel button only shows if NOT shipped/delivered */}
                    {CANCELLABLE_STATUSES.includes(order.status) && (
                      <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => { setCancellingOrder(order); setCancelReason(''); }}>
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

        {/* Cancel Order Modal with Policy */}
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 bg-white max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-bold text-lg">Cancel Order</h3>
                  <p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="font-semibold text-sm text-yellow-800 mb-2">📋 Cancellation Policy</p>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc pl-4">
                  <li>Orders can only be cancelled while in Confirmed, Processing, or Packed status.</li>
                  <li>Once an order is <strong>Shipped</strong> or <strong>Out for Delivery</strong>, it <strong>cannot</strong> be cancelled.</li>
                  <li>If you have already paid, contact us on WhatsApp <strong>0509 896 035</strong> to arrange a refund.</li>
                  <li>Refunds are processed within 1–3 business days via Mobile Money.</li>
                  <li>Custom or special orders may not be eligible for cancellation.</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700">Reason for cancellation (optional)</label>
                <textarea
                  className="w-full mt-1 border rounded-lg p-2 text-sm"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you want to cancel..."
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
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
