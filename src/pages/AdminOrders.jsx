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
  CheckCircle2, Package, Truck, XCircle, FileText, Trash2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Package },
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

const nextStatusMap = {
  confirmed: { newStatus: 'processing', label: 'Mark Processing', message: 'Order is being processed and prepared.' },
  processing: { newStatus: 'packed', label: 'Mark Packed', message: 'Order has been packed and is ready for dispatch.' },
  packed: { newStatus: 'shipped', label: 'Mark Shipped', message: 'Order has been shipped.' },
  shipped: { newStatus: 'out_for_delivery', label: 'Mark Out for Delivery', message: 'Order is out for delivery.' },
  out_for_delivery: { newStatus: 'delivered', label: 'Mark Delivered', message: 'Order has been delivered successfully.' },
};

function getFirstName(fullName) {
  if (!fullName) return 'Customer';
  return fullName.split(' ')[0];
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

  // Only show paid orders to admin (pending_payment orders are not real yet)
  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const activeOrders = paidOrders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status));
  const fulfilledOrders = paidOrders.filter(o => ['delivered', 'cancelled', 'returned'].includes(o.status));

  const [adminMessages, setAdminMessages] = useState({});

  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ order, message }) => {
      const firstName = getFirstName(order.customer_name);
      await Promise.all([
        base44.entities.Notification.create({
          user_email: order.customer_email,
          title: 'Message from FMM CLASSICO',
          message: 'Dear ' + firstName + ', ' + message,
          type: 'general',
          order_id: order.id,
          order_number: order.order_number,
          is_read: false,
          created_date: new Date().toISOString()
        }),
        base44.integrations.Core.SendEmail({
          to: order.customer_email,
          from_name: 'FMM CLASSICO',
          subject: 'Message about your order #' + order.order_number,
          body: 'Dear ' + firstName + ',\n\n' + message + '\n\nFor help: 0509896035\n\nFMM CLASSICO Team'
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
      const firstName = getFirstName(order.customer_name);
      const productNames = order.items ? order.items.map(i => i.product_name).join(', ') : 'your order';

      const newTrackingUpdates = [
        ...(order.tracking_updates || []),
        { status: statusConfig[newStatus]?.label || newStatus, message, timestamp: new Date().toISOString() }
      ];
      await base44.entities.Order.update(order.id, { status: newStatus, tracking_updates: newTrackingUpdates });

      // Personalized notification messages
      const notifMap = {
        processing: {
          title: 'Order Being Prepared',
          msg: 'Dear ' + firstName + ', your order #' + order.order_number + ' for "' + productNames + '" is being prepared. Kindly track your order status from your order page.',
          type: 'order_processing'
        },
        packed: {
          title: 'Order Packed',
          msg: 'Dear ' + firstName + ', your order #' + order.order_number + ' for "' + productNames + '" has been packed and is ready for dispatch. Kindly track your order status from your order page.',
          type: 'order_processing'
        },
        shipped: {
          title: 'Order Shipped!',
          msg: 'Dear ' + firstName + ', your order #' + order.order_number + ' for "' + productNames + '" has been shipped! Kindly track your order status from your order page.',
          type: 'order_shipped'
        },
        out_for_delivery: {
          title: 'Out for Delivery!',
          msg: 'Dear ' + firstName + ', your order #' + order.order_number + ' for "' + productNames + '" is out for delivery. Expect it soon!',
          type: 'order_shipped'
        },
        delivered: {
          title: 'Order Delivered!',
          msg: 'Dear ' + firstName + ', your order #' + order.order_number + ' for "' + productNames + '" has been delivered. Thank you for shopping with FMM CLASSICO!',
          type: 'order_delivered'
        },
        cancelled: {
          title: 'Order Cancelled',
          msg: 'Dear ' + firstName + ', your order #' + order.order_number + ' has been cancelled. Contact 0509896035 for help.',
          type: 'order_cancelled'
        },
      };

      const notif = notifMap[newStatus];
      if (notif) {
        await Promise.all([
          base44.entities.Notification.create({
            user_email: order.customer_email,
            title: notif.title,
            message: notif.msg,
            type: notif.type,
            order_id: order.id,
            order_number: order.order_number,
            is_read: false,
            created_date: new Date().toISOString()
          }),
          base44.integrations.Core.SendEmail({
            to: order.customer_email,
            from_name: 'FMM CLASSICO',
            subject: notif.title + ' - Order #' + order.order_number,
            body: notif.msg + '\n\nOrder: #' + order.order_number + '\nTotal: GHS ' + (order.total_amount?.toFixed(2) || '0.00') + '\nDelivery: ' + (order.delivery_address || '') + (order.city ? ', ' + order.city : '') + '\n\nTrack your order on FMM CLASSICO.\nFor help: 0509896035\n\nFMM CLASSICO Team'
          })
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Order updated! Customer notified via app and email.');
    }
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
    if (confirm('Delete ' + selectedOrders.length + ' order(s)? This cannot be undone.')) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!isAdmin && user) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  if (!user) {
    return (<div className="p-8 text-center"><p>Loading...</p></div>);
  }

  const renderOrderCard = (order) => {
    const next = nextStatusMap[order.status];
    return (
      <Card key={order.id} className="p-4 rounded-2xl shadow-sm border border-gray-100 mb-3">
        <div className="flex items-start gap-3">
          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
              <div className="flex gap-1 flex-wrap">
                <Badge className={'text-[10px] ' + (statusConfig[order.status]?.color || '')}>
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
                {order.payment_status === 'paid' && (
                  <Badge className="text-[10px] bg-green-100 text-green-800">Paid</Badge>
                )}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 mt-1">{order.customer_name}</p>
            <p className="text-xs text-gray-500">{order.customer_email} | {order.customer_phone}</p>
            <p className="text-xs text-gray-500">{order.delivery_address}{order.city ? ', ' + order.city : ''}</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{'\u20B5'}{order.total_amount?.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{order.created_date && format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}</p>

            <div className="mt-2 bg-gray-50 rounded-xl p-2 space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {item.product_image && <img src={item.product_image} alt={item.product_name} className="w-8 h-8 rounded-md object-cover" />}
                  <span className="text-xs text-gray-700">{item.product_name} x{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <Link to={createPageUrl('AdminInvoice') + '?order=' + order.id}>
                <Button variant="outline" size="sm" className="text-xs rounded-lg">
                  <FileText className="w-3 h-3 mr-1" /> Invoice
                </Button>
              </Link>
              {next && order.payment_status === 'paid' && (
                <Button size="sm" className="text-xs rounded-lg bg-blue-700 text-white hover:bg-blue-800" onClick={() => updateStatusMutation.mutate({ order, newStatus: next.newStatus, message: next.message })} disabled={updateStatusMutation.isPending}>
                  {next.label}
                </Button>
              )}
              {next && order.payment_status !== 'paid' && (
                <Button size="sm" disabled className="text-xs rounded-lg opacity-50">
                  {next.label} (Awaiting Payment)
                </Button>
              )}
              {!['cancelled', 'delivered', 'returned'].includes(order.status) && (
                <Button variant="destructive" size="sm" className="text-xs rounded-lg" onClick={() => updateStatusMutation.mutate({ order, newStatus: 'cancelled', message: 'Order cancelled by admin.' })} disabled={updateStatusMutation.isPending}>
                  Cancel
                </Button>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Textarea placeholder="Message to customer..." className="text-xs flex-1" rows={1} value={adminMessages[order.id] || ''} onChange={(e) => setAdminMessages(prev => ({ ...prev, [order.id]: e.target.value }))} />
              <Button size="sm" variant="outline" className="self-end" onClick={() => sendAdminMessageMutation.mutate({ order, message: adminMessages[order.id] })} disabled={!adminMessages[order.id]?.trim()}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin - Manage Orders</h1>
        {selectedOrders.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete {selectedOrders.length} Selected
          </Button>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length > 0 && (
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={activeOrders.every(o => selectedOrders.includes(o.id))} onChange={() => handleSelectAll(activeOrders)} className="w-4 h-4 cursor-pointer" />
              Select all
            </label>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : activeOrders.length === 0 ? (
          <p className="text-gray-400 text-sm">No active orders</p>
        ) : (
          <div>{activeOrders.map(renderOrderCard)}</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">Completed and Cancelled ({fulfilledOrders.length})</h2>
          {fulfilledOrders.length > 0 && (
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={fulfilledOrders.every(o => selectedOrders.includes(o.id))} onChange={() => handleSelectAll(fulfilledOrders)} className="w-4 h-4 cursor-pointer" />
              Select all
            </label>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : fulfilledOrders.length === 0 ? (
          <p className="text-gray-400 text-sm">No completed orders yet</p>
        ) : (
          <div>{fulfilledOrders.map(renderOrderCard)}</div>
        )}
      </div>
    </div>
  );
}
