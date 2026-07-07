import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronRight, CheckCircle2, Truck, MapPin, XCircle, Trash2, Check, AlertTriangle } from 'lucide-react';
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

// Smart payment badge based on payment_method
function getPaymentBadge(order) {
  const method = order.payment_method || 'full_payment';
  const isPaid = order.payment_status === 'paid';

  if (method === 'full_payment') {
    if (isPaid) return { color: 'bg-green-100 text-green-700', label: 'Confirmed, Paid' };
    return { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending Payment' };
  }
  if (method === 'deposit_balance') {
    if (isPaid) return { color: 'bg-orange-100 text-orange-700', label: 'Delivery Paid, ₵' + (order.balance_due || 0).toFixed(2) + ' left to be paid' };
    return { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending Payment' };
  }
  if (method === 'pay_on_delivery') {
    if (isPaid || order.payment_status === 'pending_payment') return { color: 'bg-red-100 text-red-700', label: 'Delivery Paid, Product payment yet to be paid' };
    return { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending Payment' };
  }
  return { color: 'bg-gray-100 text-gray-600', label: order.payment_status || 'Unknown' };
}

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

  // NO flash page. Just silently clear cart if coming from successful payment.
  useEffect(() => {
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');
    if (orderNumber && status === 'success' && user?.email) {
      // Clear cart silently
      base44.entities.CartItem.filter({ user_email: user.email }).then(items => {
        const arr = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : [];
        arr.forEach(item => base44.entities.CartItem.delete(item.id).catch(() => {}));
        queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
    mutationFn: async (orderIds) => { await Promise.all(orderIds.map(id => base44.entities.Order.delete(id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setSelectedOrders([]); toast.success('Orders deleted'); }
  });

  const handleToggleSelect = (orderId) => { setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]); };
  const handleSelectAll = () => { setSelectedOrders(prev => prev.length === orders.length ? [] : orders.map(o => o.id)); };

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      const newTracking = [...(order.tracking_updates || []), { status: 'Cancelled', message: 'Order cancelled by customer. Reason: ' + (reason || 'No reason given'), timestamp: new Date().toISOString() }];
      await base44.entities.Order.update(order.id, { status: 'cancelled', tracking_updates: newTracking });
      await base44.entities.Notification.create({ user_email: order.customer_email, title: '❌ Order Cancelled', message: 'Your order #' + order.order_number + ' has been cancelled. If you paid, contact us on WhatsApp: 0208207543 for a refund.', type: 'order_cancelled', order_id: order.id, order_number: order.order_number, is_read: false });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setCancellingOrder(null); setCancelReason(''); toast.success('Order cancelled.'); }
  });

  const handleDeleteSelected = () => { if (selectedOrders.length === 0) return; if (confirm('Delete ' + selectedOrders.length + ' order(s)?')) deleteOrdersMutation.mutate(selectedOrders); };

  if (!user) return <div className="min-h-screen p-4"><div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div></div>;

  if (orders.length === 0) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6"><Package className="h-16 w-16 text-gray-300 mb-4" /><p className="text-gray-500 font-medium mb-2">No orders yet</p><p className="text-gray-400 text-sm mb-4">Start shopping to see your orders here</p><Link to={createPageUrl('Shop')} className="text-blue-600 font-semibold">Go to Shop</Link></div>;
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
            <span className="text-xs text-gray-500">Select All ({selectedOrders.length}/{orders.length})</span>
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />) : orders.map((order) => {
            const isSelected = selectedOrders.includes(order.id);
            const payBadge = getPaymentBadge(order);
            const method = order.payment_method || 'full_payment';
            const isPaid = order.payment_status === 'paid';
            const s = order.status;
            const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
            const rank = ORDER_RANK[s] || 0;

            // Build progress steps based on payment method
            let steps;
            if (method === 'full_payment') {
              steps = [
                { label: 'Order Placed', done: true },
                { label: 'Delivery Payment Confirmed', done: isPaid },
                { label: 'Product Payment', done: isPaid, color: 'text-green-600' },
                { label: 'Processing', done: isPaid && rank >= 2 },
                { label: 'Packed', done: isPaid && rank >= 3 },
                { label: 'Shipped', done: isPaid && rank >= 4 },
                { label: 'Delivered', done: rank >= 6 },
              ];
            } else if (method === 'deposit_balance') {
              steps = [
                { label: 'Order Placed', done: true },
                { label: 'Delivery Payment Confirmed', done: isPaid },
                { label: 'Product Payment', done: rank >= 6, color: 'text-orange-600' },
                { label: 'Processing', done: isPaid && rank >= 2 },
                { label: 'Packed', done: isPaid && rank >= 3 },
                { label: 'Shipped', done: isPaid && rank >= 4 },
                { label: 'Delivered', done: rank >= 6 },
              ];
            } else {
              // pay_on_delivery
              steps = [
                { label: 'Order Placed', done: true },
                { label: 'Delivery Payment Confirmed', done: isPaid || order.payment_status === 'pending_payment' },
                { label: 'Product Payment', done: rank >= 6, color: 'text-red-600' },
                { label: 'Processing', done: rank >= 2 },
                { label: 'Packed', done: rank >= 3 },
                { label: 'Shipped', done: rank >= 4 },
                { label: 'Delivered', done: rank >= 6 },
              ];
            }

            return (
              <Card key={order.id} className={`p-4 bg-white ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 cursor-pointer mt-1" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₵{order.total_amount?.toFixed(2)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>{statusConfig[order.status]?.label || order.status}</span>
                  </div>
                </div>

                {/* Payment method badge */}
                <div className="mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${payBadge.color}`}>{payBadge.label}</span>
                </div>

                {/* Products */}
                <div className="mb-3 border-t border-gray-100 pt-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1">
                      {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-700 truncate">{item.product_name}</p><p className="text-[10px] text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p></div>
                    </div>
                  ))}
                </div>

                {/* Progress steps */}
                <div className="mb-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-gray-700 mb-2">Order Progress</p>
                  <div className="space-y-1.5">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${step.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {step.done && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <span className={`text-xs ${step.done ? (step.color || 'text-gray-800 font-medium') : 'text-gray-400'}`}>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery info */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-600">📍 {order.delivery_address}</p>
                  {order.estimated_delivery && <p className="text-xs text-gray-500 mt-1">📅 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>}
                  <div className="flex gap-2 mt-3">
                    <Link to={createPageUrl('Orders')} className="text-xs text-blue-600 font-semibold">Track Order</Link>
                    {CANCELLABLE_STATUSES.includes(order.status) && (
                      <button onClick={() => { setCancellingOrder(order); setCancelReason(''); }} className="text-xs text-red-600 font-semibold">Cancel Order</button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Cancel Modal */}
        {cancellingOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-2">Cancel Order</h3>
              <p className="text-sm text-gray-500 mb-4">#{cancellingOrder.order_number}</p>
              <textarea className="w-full border rounded-lg p-3 text-sm mb-4" rows={3} placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancellingOrder(null)}>Keep Order</Button>
                <Button variant="destructive" className="flex-1" onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })} disabled={cancelOrderMutation.isPending}>
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
