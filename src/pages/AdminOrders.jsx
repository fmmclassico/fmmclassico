import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Package, Truck, XCircle, FileText, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusConfig = {
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Package },
  packed: { label: 'Packed', color: 'bg-orange-100 text-orange-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-cyan-100 text-cyan-800', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-200 text-green-900', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

// Dynamic next status based on payment method
function getNextStatus(order) {
  const s = order.status;
  const method = order.payment_method || 'full_payment';
  const needsPaymentConfirmation = method === 'deposit_balance' || method === 'pay_on_delivery';

  if (s === 'confirmed') return { newStatus: 'processing', label: 'Mark Processing', message: 'Order is being processed.' };
  if (s === 'processing') return { newStatus: 'packed', label: 'Mark Packed', message: 'Order packed and ready for dispatch.' };
  if (s === 'packed') return { newStatus: 'shipped', label: 'Mark Shipped', message: 'Order has been shipped.' };
  if (s === 'shipped') {
    if (needsPaymentConfirmation) {
      return { newStatus: 'out_for_delivery', label: 'Mark Payment Confirmed', message: 'Customer product payment confirmed upon delivery.' };
    }
    return { newStatus: 'delivered', label: 'Mark Delivered Successfully', message: 'Order delivered successfully.' };
  }
  if (s === 'out_for_delivery') return { newStatus: 'delivered', label: 'Mark Delivered Successfully', message: 'Order delivered successfully.' };
  return null;
}

function getPaymentMethodLabel(method) {
  if (method === 'full_payment') return { text: 'Full Payment', color: 'bg-green-100 text-green-700' };
  if (method === 'deposit_balance') return { text: 'Deposit + Balance on Delivery', color: 'bg-orange-100 text-orange-700' };
  if (method === 'pay_on_delivery') return { text: 'Pay on Delivery', color: 'bg-red-100 text-red-700' };
  return { text: 'Full Payment', color: 'bg-green-100 text-green-700' };
}

export default function AdminOrders() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status));
  const fulfilledOrders = orders.filter(o => ['delivered', 'cancelled', 'returned'].includes(o.status));

  const [adminMessages, setAdminMessages] = useState({});

  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ order, message }) => {
      await Promise.all([
        base44.entities.Notification.create({ user_email: order.customer_email, title: '💬 Message from FMM CLASSICO', message, type: 'general', order_id: order.id, order_number: order.order_number, is_read: false }),
        base44.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: 'Message about your order #' + order.order_number, body: 'Hi ' + order.customer_name + ',

' + message + '

For help: 0208207543

FMM CLASSICO Team' })
      ]);
    },
    onSuccess: (_, variables) => { setAdminMessages(prev => ({ ...prev, [variables.order.id]: '' })); toast.success('Message sent!'); }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, newStatus, message }) => {
      const newTrackingUpdates = [...(order.tracking_updates || []), { status: statusConfig[newStatus]?.label || newStatus, message, timestamp: new Date().toISOString() }];
      await base44.entities.Order.update(order.id, { status: newStatus, tracking_updates: newTrackingUpdates });

      const notifMap = {
        processing: { title: '📦 Order Being Prepared', msg: 'Your order #' + order.order_number + ' is being prepared.', type: 'order_processing' },
        packed: { title: '📦 Order Packed', msg: 'Your order #' + order.order_number + ' has been packed.', type: 'order_processing' },
        shipped: { title: '🚚 Order Shipped!', msg: 'Your order #' + order.order_number + ' has been shipped!', type: 'order_shipped' },
        out_for_delivery: { title: '✅ Payment Confirmed', msg: 'Product payment for order #' + order.order_number + ' has been confirmed. Thank you!', type: 'payment_confirmed' },
        delivered: { title: '🎉 Order Delivered!', msg: 'Your order #' + order.order_number + ' has been delivered. Thank you for shopping with FMM CLASSICO!', type: 'order_delivered' },
        cancelled: { title: '❌ Order Cancelled', msg: 'Your order #' + order.order_number + ' has been cancelled.', type: 'order_cancelled' },
      };
      const notif = notifMap[newStatus];
      if (notif) {
        await Promise.all([
          base44.entities.Notification.create({ user_email: order.customer_email, title: notif.title, message: notif.msg, type: notif.type, order_id: order.id, order_number: order.order_number, is_read: false }),
          base44.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: notif.title + ' – Order #' + order.order_number, body: 'Hi ' + order.customer_name + ',

' + notif.msg + '

Order: #' + order.order_number + '
Total: ₵' + order.total_amount?.toFixed(2) + '
Delivery: ' + order.delivery_address + '

FMM CLASSICO
0208207543' })
        ]);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Order updated! Customer notified.'); }
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => { await Promise.all(orderIds.map(id => base44.entities.Order.delete(id))); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); setSelectedOrders([]); toast.success('Deleted'); }
  });

  const handleToggleSelect = (orderId) => { setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]); };
  const handleSelectAll = (orderList) => {
    const ids = orderList.map(o => o.id);
    const allSelected = ids.every(id => selectedOrders.includes(id));
    setSelectedOrders(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };
  const handleDeleteSelected = () => { if (selectedOrders.length === 0) return; if (confirm('Delete ' + selectedOrders.length + ' order(s)?')) deleteOrdersMutation.mutate(selectedOrders); };

  if (!isAdmin && user) return <div className="p-8 text-center"><p className="text-red-600 font-bold">Access Denied</p></div>;
  if (!user) return <div className="p-8 text-center"><p>Loading...</p></div>;

  const renderOrderCard = (order) => {
    const next = getNextStatus(order);
    const method = order.payment_method || 'full_payment';
    const methodLabel = getPaymentMethodLabel(method);
    const isDelivered = order.status === 'delivered';
    const isClosed = ['delivered', 'cancelled', 'returned'].includes(order.status);

    return (
      <Card key={order.id} className="p-4 bg-white mb-3">
        <div className="flex items-start gap-2">
          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 mt-1 cursor-pointer" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{order.order_number}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color}`}>{statusConfig[order.status]?.label}</span>
            </div>

            {/* Payment method + status badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${methodLabel.color}`}>{methodLabel.text}</span>
              {order.payment_status === 'paid' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">✅ Paid</span>}
              {order.payment_status === 'pending_payment' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">⏳ Pending</span>}
            </div>

            {/* Balance due for option 2 & 3 */}
            {(method === 'deposit_balance' || method === 'pay_on_delivery') && order.balance_due > 0 && (
              <p className="text-xs font-semibold text-orange-700 mt-1.5 bg-orange-50 px-2 py-1 rounded inline-block">
                ⚠️ Balance due on delivery: ₵{order.balance_due?.toFixed(2)}
              </p>
            )}

            {/* Customer info */}
            <div className="mt-2 text-xs text-gray-600 space-y-0.5">
              <p className="font-medium text-gray-800">{order.customer_name}</p>
              <p>{order.customer_email} · {order.customer_phone}</p>
              <p>📍 {order.delivery_address}</p>
              <p className="font-bold">₵{order.total_amount?.toFixed(2)}</p>
              {order.created_date && <p className="text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}</p>}
            </div>

            {/* Items */}
            <div className="mt-2 flex flex-wrap gap-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                  {item.product_image && <img src={item.product_image} className="w-8 h-8 rounded object-cover" />}
                  <span className="text-[10px] text-gray-700">{item.product_name} ×{item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Actions - HIDE after delivered */}
            {!isClosed && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                <Link to={createPageUrl('AdminInvoice') + '?order=' + order.order_number}>
                  <Button size="sm" variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Invoice</Button>
                </Link>
                {next && order.payment_status === 'paid' && (
                  <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700" onClick={() => updateStatusMutation.mutate({ order, newStatus: next.newStatus, message: next.message })} disabled={updateStatusMutation.isPending}>
                    {next.label}
                  </Button>
                )}
                {next && order.payment_status !== 'paid' && (
                  <Button size="sm" variant="outline" className="text-xs opacity-50" disabled>{next.label} (⏳ Awaiting Payment)</Button>
                )}
                <Button size="sm" variant="destructive" className="text-xs" onClick={() => updateStatusMutation.mutate({ order, newStatus: 'cancelled', message: 'Cancelled by admin.' })} disabled={updateStatusMutation.isPending}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Admin message */}
            {!isClosed && (
              <div className="mt-3 flex gap-2">
                <Textarea className="text-xs flex-1" rows={1} placeholder="Message to customer..." value={adminMessages[order.id] || ''} onChange={(e) => setAdminMessages(prev => ({ ...prev, [order.id]: e.target.value }))} />
                <Button size="sm" variant="outline" onClick={() => sendAdminMessageMutation.mutate({ order, message: adminMessages[order.id] })}><Send className="h-3 w-3" /></Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin – Orders</h1>
        {selectedOrders.length > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="h-3 w-3 mr-1" /> Delete {selectedOrders.length}</Button>}
      </div>

      {/* Active */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={activeOrders.every(o => selectedOrders.includes(o.id))} onChange={() => handleSelectAll(activeOrders)} className="w-3.5 h-3.5" /> Select all</label>}
        </div>
        {isLoading ? <Skeleton className="h-32" /> : activeOrders.length === 0 ? <p className="text-sm text-gray-400">No active orders</p> : activeOrders.map(renderOrderCard)}
      </div>

      {/* Completed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Completed & Cancelled ({fulfilledOrders.length})</h2>
          {fulfilledOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={fulfilledOrders.every(o => selectedOrders.includes(o.id))} onChange={() => handleSelectAll(fulfilledOrders)} className="w-3.5 h-3.5" /> Select all</label>}
        </div>
        {isLoading ? <Skeleton className="h-32" /> : fulfilledOrders.length === 0 ? <p className="text-sm text-gray-400">No completed orders</p> : fulfilledOrders.map(renderOrderCard)}
      </div>
    </div>
  );
}
