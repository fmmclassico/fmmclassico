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
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  // ══════════════════════════════════════════════
  // FIX: Payment status check on return from Hubtel
  // Only runs AFTER user is loaded
  // ══════════════════════════════════════════════
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');

    // Don't run until user is loaded
    if (!orderNumber || !user) return;

    setVerifyingPayment(true);
    console.log('[Orders] Payment return - order:', orderNumber, 'status:', status);

    const updateOrderPayment = async () => {
      try {
        const rawOrders = await base44.entities.Order.filter({ order_number: orderNumber });
        const ordersList = Array.isArray(rawOrders) ? rawOrders : Array.isArray(rawOrders?.data) ? rawOrders.data : [];

        if (ordersList.length === 0) {
          console.warn('[Orders] No order found with number:', orderNumber);
          setVerifyingPayment(false);
          return;
        }

        const order = ordersList[0];

        // If already paid, no need to update again
        if (order.payment_status === 'paid') {
          toast.success('✅ Payment already confirmed!');
          setVerifyingPayment(false);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          return;
        }

        if (status === 'success') {
          // Hubtel ONLY redirects to returnUrl on successful payment
          // So we can trust this and mark as paid immediately
          await base44.entities.Order.update(order.id, {
            payment_status: 'paid',
            status: order.status === 'processing' ? 'confirmed' : order.status,
            tracking_updates: [
              ...(order.tracking_updates || []),
              {
                status: 'Payment Confirmed',
                message: 'Payment confirmed via Hubtel.',
                timestamp: new Date().toISOString(),
              }
            ]
          });

          queryClient.invalidateQueries({ queryKey: ['orders'] });
          toast.success('✅ Payment confirmed! Your order has been received.');

          // Clear cart after successful payment
          if (user?.email) {
            try {
              const rawItems = await base44.entities.CartItem.filter({ user_email: user.email });
              const items = Array.isArray(rawItems) ? rawItems : Array.isArray(rawItems?.data) ? rawItems.data : [];
              await Promise.all(items.map(item => base44.entities.CartItem.delete(item.id).catch(() => {})));
              queryClient.invalidateQueries({ queryKey: ['cartItems'] });
            } catch (e) {
              console.warn('[Orders] Cart clear error:', e);
            }
          }
        } else {
          // Cancelled or unknown status - verify with Hubtel API
          try {
            const result = await checkPaymentStatus(orderNumber);
            console.log('[Orders] Hubtel status check result:', result);

            const hubtelStatus = result?.data?.status?.toLowerCase();
            if (hubtelStatus === 'paid' || hubtelStatus === 'success') {
              await base44.entities.Order.update(order.id, {
                payment_status: 'paid',
                status: order.status === 'processing' ? 'confirmed' : order.status,
                tracking_updates: [
                  ...(order.tracking_updates || []),
                  {
                    status: 'Payment Confirmed',
                    message: 'Payment confirmed via Hubtel status check.',
                    timestamp: new Date().toISOString(),
                  }
                ]
              });
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              toast.success('✅ Payment confirmed!');
            } else {
              toast.info('Payment not completed. Please retry or contact support.');
            }
          } catch (err) {
            console.error('[Orders] Status check API error:', err);
            toast.info('Could not verify payment. Please refresh the page.');
          }
        }
      } catch (err) {
        console.error('[Orders] Payment verification error:', err);
        toast.error('Error verifying payment. Please refresh.');
      } finally {
        setVerifyingPayment(false);
      }
    };

    updateOrderPayment();
  }, [searchParams, queryClient, user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200);
      return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    },
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

  // ══════════════════════════════════════════════
  // FIX: Show spinner while verifying payment (no more flash)
  // ══════════════════════════════════════════════
  if (verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin" />
        <p className="text-gray-700 font-semibold text-lg">Verifying your payment...</p>
        <p className="text-gray-500 text-sm">Please wait, this will only take a moment.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <Package className="h-16 w-16 text-gray-300" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">No orders yet</p>
          <p className="text-gray-500 mt-1">Start shopping to see your orders here</p>
        </div>
        <Link to={createPageUrl('Shop')}>
          <Button className="rounded-xl bg-blue-800 hover:bg-blue-900">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">My Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>

          {selectedOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{selectedOrders.length} selected</span>
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
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
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-16 w-full" />
              </Card>
            ))
          ) : (
            orders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Package;
              const isSelected = selectedOrders.includes(order.id);

              return (
                <Card key={order.id} className={`p-4 border ${isSelected ? 'border-blue-400 bg-blue-50/30' : ''}`}>
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
                        <p className="font-bold text-sm">{order.order_number}</p>
                        <p className="text-xs text-gray-500">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₵{order.total_amount?.toFixed(2)}</p>
                      <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                      {order.payment_status && (
                        <Badge className={`text-xs ml-1 ${paymentStatusConfig[order.payment_status]?.color || 'bg-gray-100'}`}>
                          {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Product(s) with images */}
                  <div className="mb-3">
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          {item.product_image && (
                            <img src={item.product_image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking checklist */}
                  <div className="mb-3">
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
                        <div className="flex items-center gap-1">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                {step.done && <Check className="w-3 h-3" />}
                              </div>
                              <span className={`text-[10px] ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Delivery info + actions */}
                  <div className="text-xs text-gray-500 mb-3">
                    <p>📍 {order.delivery_address}, {order.city}</p>
                    {order.estimated_delivery && (
                      <p>🗓 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link to={`${createPageUrl('OrderTracking')}?id=${order.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Package className="w-3 h-3 mr-1" />
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

        {/* Cancel Order Modal */}
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Cancel Order</h3>
                  <p className="text-sm text-gray-500">#{cancellingOrder.order_number}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <p className="font-semibold mb-1">📋 Cancellation Policy</p><ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                  <li>Orders can only be cancelled while in Pending or Confirmed status.</li>
                  <li>Once an order is Shipped or In Transit, it cannot be cancelled.</li>
                  <li>If you have already paid, contact us on WhatsApp 0509 896 035 to arrange a refund.</li>
                  <li>Refunds are processed within 1–3 business days via Mobile Money.</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium">Reason for cancellation (optional)</label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
