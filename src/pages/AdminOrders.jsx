import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Package, Truck, XCircle, FileText, Trash2, Send, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

var NL = String.fromCharCode(10);

var statusConfig = {
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  packed: { label: 'Packed', color: 'bg-orange-100 text-orange-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  out_for_delivery: { label: 'Payment Confirmed', color: 'bg-cyan-100 text-cyan-800' },
  in_transit: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', color: 'bg-green-200 text-green-900' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700' },
};

function getNextStatus(order) {
  var s = order.status;
  var method = order.payment_method || 'full_payment';
  var needsPaymentConfirmation = method === 'deposit_balance' || method === 'pay_on_delivery';
  if (s === 'confirmed') return { newStatus: 'processing', label: 'Mark Processing', message: 'Order is being processed.' };
  if (s === 'processing') return { newStatus: 'packed', label: 'Mark Packed', message: 'Order packed.' };
  if (s === 'packed') return { newStatus: 'shipped', label: 'Mark Shipped', message: 'Order shipped.' };
  if (s === 'shipped') {
    if (needsPaymentConfirmation) return { newStatus: 'out_for_delivery', label: 'Mark Payment Confirmed', message: 'Product payment confirmed on delivery.' };
    return { newStatus: 'delivered', label: 'Mark Delivered Successfully', message: 'Order delivered.' };
  }
  if (s === 'out_for_delivery') return { newStatus: 'delivered', label: 'Mark Delivered Successfully', message: 'Order delivered.' };
  return null;
}

function getPaymentMethodLabel(method) {
  if (method === 'full_payment') return { text: 'Full Payment', color: 'bg-green-100 text-green-700' };
  if (method === 'deposit_balance') return { text: 'Deposit + Balance', color: 'bg-orange-100 text-orange-700' };
  if (method === 'pay_on_delivery') return { text: 'Pay on Delivery', color: 'bg-red-100 text-red-700' };
  return { text: 'Full Payment', color: 'bg-green-100 text-green-700' };
}

export default function AdminOrders() {
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [selectedOrders, setSelectedOrders] = useState([]);
  var [adminMessages, setAdminMessages] = useState({});
  var [deliveryDates, setDeliveryDates] = useState({});
  var queryClient = useQueryClient();

  useEffect(function() {
    appClient.auth.isAuthenticated().then(function(isAuth) {
      if (isAuth) {
        appClient.auth.me().then(function(userData) { setUser(userData); setIsAdmin(userData.role === 'admin'); });
      }
    });
  }, []);

  var { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: function() { return appClient.entities.Order.list('-created_date', 100); },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  var activeOrders = orders.filter(function(o) { return !['delivered', 'cancelled', 'returned'].includes(o.status); });
  var fulfilledOrders = orders.filter(function(o) { return ['delivered', 'cancelled', 'returned'].includes(o.status); });

  var sendAdminMessageMutation = useMutation({
    mutationFn: async function({ order, message }) {
      var emailBody = 'Hi ' + order.customer_name + ',' + NL + NL + message + NL + NL + 'FMM CLASSICO' + NL + '0208207543';
      await Promise.all([
        appClient.entities.Notification.create({ user_email: order.customer_email, title: 'Message from FMM CLASSICO', message: message, type: 'general', order_id: order.id, order_number: order.order_number, is_read: false }),
        appClient.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: 'Message - Order #' + order.order_number, body: emailBody })
      ]);
    },
    onSuccess: function(_, variables) { setAdminMessages(function(p) { return { ...p, [variables.order.id]: '' }; }); toast.success('Message sent!'); }
  });

  var updateStatusMutation = useMutation({
    mutationFn: async function({ order, newStatus, message }) {
      var newTracking = (order.tracking_updates || []).concat([{ status: statusConfig[newStatus]?.label || newStatus, message: message, timestamp: new Date().toISOString() }]);
      await appClient.entities.Order.update(order.id, { status: newStatus, tracking_updates: newTracking });
      var notifMap = {
        processing: { title: 'Order Being Prepared', msg: 'Your order #' + order.order_number + ' is being prepared.' },
        packed: { title: 'Order Packed', msg: 'Your order #' + order.order_number + ' has been packed.' },
        shipped: { title: 'Order Shipped!', msg: 'Your order #' + order.order_number + ' has been shipped!' },
        out_for_delivery: { title: 'Payment Confirmed', msg: 'Product payment for order #' + order.order_number + ' confirmed.' },
        delivered: { title: 'Order Delivered!', msg: 'Order #' + order.order_number + ' delivered. Thank you!' },
        cancelled: { title: 'Order Cancelled', msg: 'Order #' + order.order_number + ' cancelled.' },
      };
      var notif = notifMap[newStatus];
      if (notif) {
        var emailBody = 'Hi ' + order.customer_name + ',' + NL + NL + notif.msg + NL + NL + 'Order: #' + order.order_number + NL + 'FMM CLASSICO | 0208207543';
        await Promise.all([
          appClient.entities.Notification.create({ user_email: order.customer_email, title: notif.title, message: notif.msg, type: 'order_processing', order_id: order.id, order_number: order.order_number, is_read: false }),
          appClient.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: notif.title + ' - #' + order.order_number, body: emailBody })
        ]);
      }
    },
    onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Updated!'); }
  });

  var updateDeliveryDateMutation = useMutation({
    mutationFn: async function({ order, date }) {
      await appClient.entities.Order.update(order.id, { estimated_delivery: date });
    },
    onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Delivery date set!'); }
  });

  var deleteOrdersMutation = useMutation({
    mutationFn: async function(orderIds) { await Promise.all(orderIds.map(function(id) { return appClient.entities.Order.delete(id); })); },
    onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); setSelectedOrders([]); toast.success('Deleted'); }
  });

  var handleToggleSelect = function(id) { setSelectedOrders(function(p) { return p.includes(id) ? p.filter(function(x) { return x !== id; }) : p.concat([id]); }); };
  var handleSelectAll = function(list) {
    var ids = list.map(function(o) { return o.id; });
    var allSel = ids.every(function(id) { return selectedOrders.includes(id); });
    if (allSel) setSelectedOrders(function(p) { return p.filter(function(id) { return !ids.includes(id); }); });
    else setSelectedOrders(function(p) { return [...new Set(p.concat(ids))]; });
  };
  var handleDeleteSelected = function() { if (selectedOrders.length === 0) return; if (confirm('Delete ' + selectedOrders.length + ' order(s)?')) deleteOrdersMutation.mutate(selectedOrders); };

  if (!isAdmin && user) return <div className="p-8 text-center"><p className="text-red-600 font-bold">Access Denied</p></div>;
  if (!user) return <div className="p-8 text-center"><p>Loading...</p></div>;

  var renderOrderCard = function(order) {
    var next = getNextStatus(order);
    var method = order.payment_method || 'full_payment';
    var methodLabel = getPaymentMethodLabel(method);
    var isDelivered = order.status === 'delivered';
    var isCancelled = order.status === 'cancelled' || order.status === 'returned';
    var isClosed = isDelivered || isCancelled;

    return (
      <Card key={order.id} className="p-4 bg-white mb-3">
        <div className="flex items-start gap-2">
          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={function() { handleToggleSelect(order.id); }} className="w-4 h-4 mt-1 cursor-pointer" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{order.order_number}</p>
                <p className="text-[10px] text-gray-400">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">₵{order.total_amount?.toFixed(2)}</p>
                <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' + (statusConfig[order.status]?.color || '')}>{statusConfig[order.status]?.label || order.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' + methodLabel.color}>{methodLabel.text}</span>
              {order.payment_status === 'paid' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Paid</span>}
              {order.payment_status === 'pending_payment' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">Pending</span>}
            </div>

            {(method === 'deposit_balance' || method === 'pay_on_delivery') && order.balance_due > 0 && (
              <p className="text-xs font-bold text-orange-700 mt-2 bg-orange-50 px-2 py-1.5 rounded-lg inline-block">₵{order.balance_due?.toFixed(2)} left to be paid on delivery</p>
            )}

            <div className="mt-2 text-xs text-gray-600 space-y-0.5">
              <p className="font-medium text-gray-800">{order.customer_name}</p>
              <p>{order.customer_email}{order.customer_phone ? ' | ' + order.customer_phone : ''}</p>
              <p>📍 {order.delivery_address}</p>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {order.items?.map(function(item, idx) {
                return (
                  <div key={idx} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                    {item.product_image && <img src={item.product_image} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-[10px] text-gray-700">{item.product_name} x{item.quantity}</span>
                  </div>
                );
              })}
            </div>

            {/* Est. Delivery - Admin can set */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">Est. Delivery:</span>
                {order.estimated_delivery && order.estimated_delivery.length > 4 && !order.estimated_delivery.startsWith('1970') ? (
                  <span className="text-xs font-bold text-gray-800">{format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</span>
                ) : (
                  <span className="text-xs text-gray-400">Not set</span>
                )}
              </div>
              {!isClosed && (
                <div className="flex items-center gap-2">
                  <Input type="date" className="text-xs h-8 w-40" value={deliveryDates[order.id] || ''} onChange={function(e) { setDeliveryDates(function(p) { return { ...p, [order.id]: e.target.value }; }); }} />
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={function() { var d = deliveryDates[order.id]; if (d) updateDeliveryDateMutation.mutate({ order: order, date: d }); else toast.error('Pick a date'); }} disabled={updateDeliveryDateMutation.isPending}>Set</Button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100">
              <Link to={createPageUrl('AdminInvoice') + '?order=' + order.order_number}>
                <Button size="sm" variant="outline" className="text-xs h-8"><FileText className="h-3 w-3 mr-1" /> Invoice</Button>
              </Link>
              {next && order.payment_status === 'paid' && !isClosed && (
                <Button size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700" onClick={function() { updateStatusMutation.mutate({ order: order, newStatus: next.newStatus, message: next.message }); }} disabled={updateStatusMutation.isPending || isClosed}>
                  {next.label}
                </Button>
              )}
              {next && order.payment_status !== 'paid' && !isClosed && (
                <Button size="sm" variant="outline" className="text-xs h-8 opacity-50" disabled>{next.label} (Awaiting Payment)</Button>
              )}
              <Button size="sm" variant="destructive" className="text-xs h-8" onClick={function() { updateStatusMutation.mutate({ order: order, newStatus: 'cancelled', message: 'Cancelled by admin.' }); }} disabled={updateStatusMutation.isPending || isClosed}>
                Cancel
              </Button>
            </div>

            {/* Admin message */}
            {!isClosed && (
              <div className="mt-2 flex gap-2">
                <Textarea className="text-xs flex-1" rows={1} placeholder="Message to customer..." value={adminMessages[order.id] || ''} onChange={function(e) { setAdminMessages(function(p) { return { ...p, [order.id]: e.target.value }; }); }} />
                <Button size="sm" variant="outline" className="h-8" onClick={function() { sendAdminMessageMutation.mutate({ order: order, message: adminMessages[order.id] }); }}><Send className="h-3 w-3" /></Button>
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
        <h1 className="text-xl font-bold">Admin - Orders</h1>
        {selectedOrders.length > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="h-3 w-3 mr-1" /> Delete {selectedOrders.length}</Button>}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={activeOrders.every(function(o) { return selectedOrders.includes(o.id); })} onChange={function() { handleSelectAll(activeOrders); }} className="w-3.5 h-3.5" /> Select all</label>}
        </div>
        {isLoading ? <Skeleton className="h-32" /> : activeOrders.length === 0 ? <p className="text-sm text-gray-400">No active orders</p> : activeOrders.map(renderOrderCard)}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Completed ({fulfilledOrders.length})</h2>
          {fulfilledOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={fulfilledOrders.every(function(o) { return selectedOrders.includes(o.id); })} onChange={function() { handleSelectAll(fulfilledOrders); }} className="w-3.5 h-3.5" /> Select all</label>}
        </div>
        {isLoading ? <Skeleton className="h-32" /> : fulfilledOrders.length === 0 ? <p className="text-sm text-gray-400">None</p> : fulfilledOrders.map(renderOrderCard)}
      </div>
    </div>
  );
}
