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
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  XCircle,
  FileText,
  Trash2,
  Send
} from 'lucide-react';
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

// Next logical status for each current status
const nextStatusMap = {
  confirmed: { newStatus: 'processing', label: 'Mark Processing', message: 'Order is being processed and prepared.' },
  processing: { newStatus: 'packed', label: 'Mark Packed', message: 'Order has been packed and is ready for dispatch.' },
  packed: { newStatus: 'shipped', label: 'Mark Shipped', message: 'Order has been shipped.' },
  shipped: { newStatus: 'out_for_delivery', label: 'Mark Out for Delivery', message: 'Order is out for delivery.' },
  out_for_delivery: { newStatus: 'delivered', label: 'Mark Delivered', message: 'Order has been delivered successfully.' },
};

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
    refetchInterval: 30000, // auto-refresh every 30s
  });

  // All orders are now confirmed+ (no pending) — just split into active and fulfilled
  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status));
  const fulfilledOrders = orders.filter(o => ['delivered', 'cancelled', 'returned'].includes(o.status));

  const [adminMessages, setAdminMessages] = useState({});

  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ order, message }) => {
      await Promise.all([
        base44.entities.Notification.create({
          user_email: order.customer_email,
          title: '💬 Message from FMM CLASSICO',
          message: message,
          type: 'general',
          order_id: order.id,
          order_number: order.order_number,
          is_read: false
        }),
        base44.integrations.Core.SendEmail({
          to: order.customer_email,
          from_name: 'FMM CLASSICO',
          subject: `Message about your order #${order.order_number}`,
          body: `Hi ${order.customer_name},\n\n${message}\n\nFor help: 0509896035\n\nFMM CLASSICO Team`
        })
      ]);
    },
    onSuccess: (_, variables) => {
      setAdminMessages(prev => ({ ...prev, [variables.order.id]: '' }));
      toast.success('Message sent to customer!');
    }
  });



  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, newStatus, message }) => {
      const newTrackingUpdates = [
        ...(order.tracking_updates || []),
        { status: statusConfig[newStatus]?.label || newStatus, message, timestamp: new Date().toISOString() }
      ];
      await base44.entities.Order.update(order.id, { status: newStatus, tracking_updates: newTrackingUpdates });

      const notifMap = {
        processing: { title: '📦 Order Being Prepared', msg: `Your order #${order.order_number} is being prepared.`, type: 'order_processing' },
        packed: { title: '📦 Order Packed', msg: `Your order #${order.order_number} has been packed and is ready for dispatch.`, type: 'order_processing' },
        shipped: { title: '🚚 Order Shipped!', msg: `Your order #${order.order_number} has been shipped!`, type: 'order_shipped' },
        out_for_delivery: { title: '🛵 Out for Delivery!', msg: `Your order #${order.order_number} is out for delivery. Expect it soon!`, type: 'order_shipped' },
        delivered: { title: '🎉 Order Delivered!', msg: `Your order #${order.order_number} has been delivered. Thank you for shopping with FMM CLASSICO!`, type: 'order_delivered' },
        cancelled: { title: '❌ Order Cancelled', msg: `Your order #${order.order_number} has been cancelled. Contact 0509896035 for help.`, type: 'order_cancelled' },
      };
      const notif = notifMap[newStatus];
      if (notif) {
        await Promise.all([
          base44.entities.Notification.create({ user_email: order.customer_email, title: notif.title, message: notif.msg, type: notif.type, order_id: order.id, order_number: order.order_number, is_read: false }),
          base44.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: `${notif.title} – Order #${order.order_number}`, body: `Hi ${order.customer_name},\n\n${notif.msg}\n\n📦 Order: #${order.order_number}\n💰 Total: ₵${order.total_amount?.toFixed(2)}\n📍 Delivery: ${order.delivery_address}, ${order.city}\n\nTrack on FMM CLASSICO.\nFor help: 0509896035\n\nFMM CLASSICO Team` })
        ]);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Order updated! Customer notified.'); }
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      await Promise.all(orderIds.map(id => base44.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedOrders([]);
      toast.success('Orders deleted successfully');
    }
  });

  const handleToggleSelect = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = (orderList) => {
    const ids = orderList.map(o => o.id);
    const allSelected = ids.every(id => selectedOrders.includes(id));
    if (allSelected) {
      setSelectedOrders(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedOrders(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)? This cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!isAdmin && user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const renderOrderCard = (order) => {
    const StatusIcon = statusConfig[order.status]?.icon || Package;
    const next = nextStatusMap[order.status];
    return (
      <Card key={order.id} className="p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-gray-800">{order.order_number}</span>
                <Badge className={statusConfig[order.status]?.color || 'bg-gray-100 text-gray-700'}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
                {order.payment_status === 'paid' && (
                  <Badge className="bg-green-100 text-green-700 text-[10px]">✅ Paid</Badge>
                )}
                {order.payment_status === 'pending_payment' && (
                  <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">⏳ Pending Payment</Badge>
                )}
                {order.payment_status === 'failed' && (
                  <Badge className="bg-red-100 text-red-700 text-[10px]">❌ Payment Failed</Badge>
                )}
              </div>
              <p className="text-sm text-gray-700 font-semibold">{order.customer_name}</p>
              <p className="text-xs text-gray-500">{order.customer_email} · {order.customer_phone}</p>
              <p className="text-xs text-gray-500">📍 {order.delivery_address}, {order.city}</p>
              <p className="text-sm font-bold text-blue-800 mt-1">₵{order.total_amount?.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">{order.created_date && format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}</p>
              {/* Items */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-1">
                    {item.product_image && <img src={item.product_image} alt="" className="w-7 h-7 rounded object-cover" />}
                    <span className="text-[10px] text-gray-700 max-w-[120px] truncate">{item.product_name} ×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[140px]">
            <Link to={createPageUrl(`AdminInvoice?orderId=${order.id}`)}>
              <Button size="sm" variant="outline" className="w-full gap-1 border-orange-400 text-orange-600 hover:bg-orange-50">
                <FileText className="h-4 w-4" /> Invoice
              </Button>
            </Link>
            {next && order.payment_status === 'paid' && (
              <Button size="sm" className="w-full" onClick={() => updateStatusMutation.mutate({ order, newStatus: next.newStatus, message: next.message })} disabled={updateStatusMutation.isPending}>
                {next.label}
              </Button>
            )}
            {next && order.payment_status !== 'paid' && (
              <Button size="sm" className="w-full bg-gray-300 text-gray-600 cursor-not-allowed" disabled>
                {next.label} (⏳ Awaiting Payment)
              </Button>
            )}
            {!['cancelled','delivered','returned'].includes(order.status) && (
              <Button size="sm" variant="outline" className="w-full gap-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => updateStatusMutation.mutate({ order, newStatus: 'cancelled', message: 'Order cancelled by admin.' })}
                disabled={updateStatusMutation.isPending}>
                <XCircle className="h-3 w-3" /> Cancel
              </Button>
            )}
          </div>
        </div>
        {/* Admin message */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex gap-2">
            <Textarea rows={1} placeholder="Send a message to customer..." className="text-xs flex-1 resize-none"
              value={adminMessages[order.id] || ''} onChange={(e) => setAdminMessages(prev => ({ ...prev, [order.id]: e.target.value }))} />
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 self-end" disabled={!adminMessages[order.id]?.trim() || sendAdminMessageMutation.isPending}
              onClick={() => sendAdminMessageMutation.mutate({ order, message: adminMessages[order.id] })}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin – Manage Orders</h1>
        {selectedOrders.length > 0 && (
          <Button variant="destructive" size="sm" className="gap-2" onClick={handleDeleteSelected} disabled={deleteOrdersMutation.isPending}>
            <Trash2 className="h-4 w-4" /> Delete {selectedOrders.length} Selected
          </Button>
        )}
      </div>

      {/* Active Orders */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={activeOrders.every(o => selectedOrders.includes(o.id))} onChange={() => handleSelectAll(activeOrders)} className="w-4 h-4 cursor-pointer" />
              <span className="text-xs text-gray-500">Select all</span>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : activeOrders.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">No active orders</Card>
        ) : (
          <div className="space-y-3">{activeOrders.map(renderOrderCard)}</div>
        )}
      </div>

      {/* Fulfilled / Closed Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-500">Completed & Cancelled ({fulfilledOrders.length})</h2>
          {fulfilledOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={fulfilledOrders.every(o => selectedOrders.includes(o.id))} onChange={() => handleSelectAll(fulfilledOrders)} className="w-4 h-4 cursor-pointer" />
              <span className="text-xs text-gray-500">Select all</span>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : fulfilledOrders.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">No completed orders yet</Card>
        ) : (
          <div className="space-y-3">{fulfilledOrders.map(renderOrderCard)}</div>
        )}
      </div>
    </div>
  );
}