import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  CreditCard,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PAYSTACK_LINK = "https://paystack.shop/pay/1miimvhai8";

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2, label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', icon: Package, label: 'Processing' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Shipped' },
  in_transit: { color: 'bg-cyan-100 text-cyan-800', icon: MapPin, label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
};

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      } else {
        base44.auth.redirectToLogin(createPageUrl('Home'));
      }
    };
    getUser();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
    enabled: !!user?.email,
    refetchInterval: 5000,
    retry: 5,
    retryDelay: 1000,
    staleTime: 2000,
  });

  const claimPaymentMutation = useMutation({
    mutationFn: async (order) => {
      const newTracking = [
        ...(order.tracking_updates || []),
        {
          status: 'Payment Claimed',
          message: 'Customer confirmed payment – awaiting FMM CLASSICO verification',
          timestamp: new Date().toISOString()
        }
      ];
      await base44.entities.Order.update(order.id, { tracking_updates: newTracking });
      await base44.entities.Notification.create({
           user_email: order.customer_email,
           title: '⏳ Payment Being Verified',
           message: `We received your payment claim for order #${order.order_number}. We'll confirm within 2–5 minutes.`,
           type: 'payment_pending',
           order_id: order.id,
           order_number: order.order_number,
           is_read: false
         });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment claim sent! We\'ll verify and confirm shortly.');
    }
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

  if (!user || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading your orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Package className="h-8 w-8 text-blue-800" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">No orders yet</h3>
        <p className="text-gray-500 mb-4">Start shopping to see your orders here</p>
        <Link to={createPageUrl('Shop')}>
          <Button className="bg-blue-800 hover:bg-blue-900">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Package className="h-6 w-6 text-blue-800" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{selectedOrders.length} selected</span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Selection Controls */}
      {orders.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={selectedOrders.length === orders.length && orders.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />
          <label className="text-sm font-medium text-gray-600 cursor-pointer">
            Select All ({selectedOrders.length}/{orders.length})
          </label>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ))
        ) : (
          orders.map((order) => {
            const StatusIcon = statusConfig[order.status]?.icon || Package;
            const isSelected = selectedOrders.includes(order.id);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Top bar: checkbox + order number + amount */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(order.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-sm text-gray-800">{order.order_number}</span>
                        <p className="text-[10px] text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-800 text-base">₵{order.total_amount?.toFixed(2)}</p>
                      <Badge className={`text-[10px] ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Product(s) with images */}
                  <div className="px-4 py-3 border-b">
                    <div className="flex flex-wrap gap-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                          {item.product_image && (
                            <img src={item.product_image} alt={item.product_name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-gray-800 max-w-[140px] truncate">{item.product_name}</p>
                            <p className="text-[10px] text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking checklist */}
                  <div className="px-4 py-3 border-b bg-white">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Progress <span className="text-green-600 font-normal normal-case">(green = processed)</span></p>
                    {(() => {
                      const tracking = order.tracking_updates || [];
                      const hasStatus = (keywords) => tracking.some(t =>
                        keywords.some(k => t.status?.toLowerCase().includes(k.toLowerCase()))
                      );
                      const steps = [
                        { label: 'Payment Confirmed', done: hasStatus(['confirmed', 'order placed', 'payment confirmed']) || ['confirmed','processing','shipped','in_transit','delivered'].includes(order.status) },
                        { label: 'Order(s) Placed', done: hasStatus(['order placed', 'processing']) || ['processing','shipped','in_transit','delivered'].includes(order.status) },
                        { label: 'Order(s) Shipped', done: hasStatus(['shipped','in_transit']) || ['shipped','in_transit','delivered'].includes(order.status) },
                        { label: 'Product(s) Delivered', done: hasStatus(['delivered']) || order.status === 'delivered' },
                      ];
                      return (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${step.done ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                {step.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className={`text-xs font-medium ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Delivery info + actions */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 mb-2">📍 <span className="font-medium text-gray-700">{order.delivery_address}, {order.city}</span></p>
                    {order.estimated_delivery && (
                      <p className="text-xs text-gray-500 mb-2">🗓 Est. delivery: <span className="font-medium text-gray-700">{format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</span></p>
                    )}
                    <div className="flex gap-2 flex-wrap mt-2">
                      <Link to={createPageUrl(`OrderTracking?id=${order.id}`)}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <ChevronRight className="h-4 w-4" />
                          Track Order
                        </Button>
                      </Link>
                      {order.status === 'pending' && !order.tracking_updates?.some(t => t.status === 'Payment Claimed') && (
                        <Button 
                          size="sm" 
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => claimPaymentMutation.mutate(order)}
                          disabled={claimPaymentMutation.isPending}
                        >
                          <CreditCard className="h-4 w-4" />
                          {claimPaymentMutation.isPending ? 'Sending...' : 'Payment Completed'}
                        </Button>
                      )}
                      {order.status === 'pending' && order.tracking_updates?.some(t => t.status === 'Payment Claimed') && (
                        <Button variant="outline" size="sm" disabled className="gap-1 text-orange-600">
                          <Clock className="h-4 w-4" />
                          Awaiting Verification
                        </Button>
                      )}
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { setCancellingOrder(order); setCancelReason(''); }}
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel Order
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Cancel Order</h2>
                <p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">📋 Cancellation Policy</p>
              <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                <li>Orders can only be cancelled while in <strong>Pending</strong> or <strong>Confirmed</strong> status.</li>
                <li>Once an order is <strong>Shipped or In Transit</strong>, it cannot be cancelled.</li>
                <li>If you have already paid, contact us on WhatsApp <strong>0509 896 035</strong> to arrange a refund.</li>
                <li>Refunds are processed within <strong>1–3 business days</strong> via Mobile Money.</li>
                <li>Custom or special orders may not be eligible for cancellation.</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows={3}
                placeholder="Tell us why you're cancelling..."
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
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })}
                disabled={cancelOrderMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}