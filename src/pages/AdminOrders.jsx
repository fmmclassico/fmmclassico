import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send, Calendar, FileText, CheckCircle2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const NL = String.fromCharCode(10);

const statusConfig = {
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  packed: { label: 'Packed', color: 'bg-orange-100 text-orange-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-cyan-100 text-cyan-800' },
  delivered: { label: 'Delivered', color: 'bg-green-200 text-green-900' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700' },
};

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getGrandTotal(order) {
  return toNumber(order?.grand_total, toNumber(order?.total_amount));
}

function getAmountPaidNow(order) {
  if (order?.amount_paid_now != null) return toNumber(order.amount_paid_now);
  if ((order?.payment_method || 'full_payment') === 'full_payment') return getGrandTotal(order);
  return toNumber(order?.total_amount);
}

function getBalanceDue(order) {
  return toNumber(order?.balance_due);
}

function hasRemainingBalance(order) {
  const method = order?.payment_method || 'full_payment';
  return (method === 'deposit_balance' || method === 'pay_on_delivery') && getBalanceDue(order) > 0;
}

function isRemainingBalancePaid(order) {
  if (!hasRemainingBalance(order)) return true;
  return order?.remaining_balance_paid === true;
}

function formatVariantSummary(item) {
  if (item?.variant_summary) return item.variant_summary;
  const parts = [];
  if (item?.selected_color) parts.push(`Color: ${item.selected_color}`);
  if (item?.selected_wattage) parts.push(`Wattage: ${item.selected_wattage}`);
  if (item?.selected_type) parts.push(`Type: ${item.selected_type}`);
  return parts.join(' • ');
}

function getPaymentMethodLabel(method) {
  if (method === 'full_payment') return { text: 'Full Payment', color: 'bg-green-100 text-green-700' };
  if (method === 'deposit_balance') return { text: 'Deposit + Balance', color: 'bg-orange-100 text-orange-700' };
  if (method === 'pay_on_delivery') return { text: 'Pay on Delivery', color: 'bg-red-100 text-red-700' };
  return { text: 'Full Payment', color: 'bg-green-100 text-green-700' };
}

function getPaymentBadges(order) {
  const badges = [];

  if (order?.payment_status === 'paid') {
    badges.push({ text: 'Initial Payment Received', color: 'bg-green-100 text-green-700' });
  } else if (order?.payment_status === 'pending_payment') {
    badges.push({ text: 'Awaiting Initial Payment', color: 'bg-yellow-100 text-yellow-700' });
  }

  if (hasRemainingBalance(order)) {
    if (isRemainingBalancePaid(order)) {
      badges.push({ text: 'Remaining Balance Paid', color: 'bg-emerald-100 text-emerald-700' });
    } else {
      badges.push({ text: `Balance Pending: ₵${getBalanceDue(order).toFixed(2)}`, color: 'bg-orange-100 text-orange-700' });
    }
  } else if (order?.payment_status === 'paid') {
    badges.push({ text: 'Fully Paid', color: 'bg-emerald-100 text-emerald-700' });
  }

  return badges;
}

function getNextStatus(order) {
  const status = order.status;
  const needsBalanceConfirmation = hasRemainingBalance(order);

  if (status === 'confirmed') return { newStatus: 'processing', label: 'Mark Processing', message: 'Order is being processed.' };
  if (status === 'processing') return { newStatus: 'packed', label: 'Mark Packed', message: 'Order packed.' };
  if (status === 'packed') return { newStatus: 'shipped', label: 'Mark Shipped', message: 'Order shipped.' };
  if (status === 'shipped') {
    if (needsBalanceConfirmation) return { newStatus: 'out_for_delivery', label: 'Mark Out for Delivery', message: 'Order is out for delivery.' };
    return { newStatus: 'delivered', label: 'Mark Delivered Successfully', message: 'Order delivered.' };
  }
  if (status === 'out_for_delivery') return { newStatus: 'delivered', label: 'Mark Delivered Successfully', message: 'Order delivered.' };
  return null;
}

function getReturnStatusMessage(order) {
  const balanceDue = getBalanceDue(order).toFixed(2);

  if ((order?.payment_method || 'full_payment') === 'deposit_balance') {
    return `Product returned because the remaining balance of ₵${balanceDue} was not paid on delivery. Follow the deposit payment terms for the 50% deposit refund timeline or for pickup/redelivery after the outstanding balance is settled. Delivery fees remain non-refundable.`;
  }

  if ((order?.payment_method || 'full_payment') === 'pay_on_delivery') {
    return `Product returned because the outstanding balance of ₵${balanceDue} was not paid on delivery. Follow the payment terms for refund handling or for pickup/redelivery after the outstanding balance is settled. Delivery fees remain non-refundable.`;
  }

  return 'Product returned.';
}

export default function AdminOrders() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [adminMessages, setAdminMessages] = useState({});
  const [deliveryDates, setDeliveryDates] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    appClient.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        appClient.auth.me().then((userData) => {
          setUser(userData);
          setIsAdmin(userData.role === 'admin');
        });
      }
    });
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => appClient.entities.Order.list('-created_date', 100),
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const activeOrders = orders.filter((order) => !['delivered', 'cancelled', 'returned'].includes(order.status));
  const fulfilledOrders = orders.filter((order) => ['delivered', 'cancelled', 'returned'].includes(order.status));

  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ order, message }) => {
      const emailBody = `Hi ${order.customer_name},${NL}${NL}${message}${NL}${NL}FMM CLASSICO${NL}0208207543`;
      await Promise.all([
        appClient.entities.Notification.create({ user_email: order.customer_email, title: 'Message from FMM CLASSICO', message, type: 'general', order_id: order.id, order_number: order.order_number, is_read: false }),
        appClient.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: `Message - Order #${order.order_number}`, body: emailBody }),
      ]);
    },
    onSuccess: (_, variables) => {
      setAdminMessages((prev) => ({ ...prev, [variables.order.id]: '' }));
      toast.success('Message sent!');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, newStatus, message }) => {
      if (newStatus === 'delivered' && hasRemainingBalance(order) && !isRemainingBalancePaid(order)) {
        throw new Error('Confirm the remaining balance payment before marking this order as delivered.');
      }

      const newTracking = (order.tracking_updates || []).concat([
        { status: statusConfig[newStatus]?.label || newStatus, message, timestamp: new Date().toISOString() },
      ]);

      await appClient.entities.Order.update(order.id, { status: newStatus, tracking_updates: newTracking });

      const notifMap = {
        processing: { title: 'Order Being Prepared', msg: `Your order #${order.order_number} is being prepared.` },
        packed: { title: 'Order Packed', msg: `Your order #${order.order_number} has been packed.` },
        shipped: { title: 'Order Shipped!', msg: `Your order #${order.order_number} has been shipped!` },
        out_for_delivery: { title: 'Order Out for Delivery', msg: `Your order #${order.order_number} is out for delivery.` },
        delivered: { title: 'Order Delivered!', msg: `Order #${order.order_number} delivered. Thank you!` },
        cancelled: { title: 'Order Cancelled', msg: `Order #${order.order_number} cancelled.` },
        returned: { title: 'Product Returned', msg: `Order #${order.order_number} was returned because delivery could not be completed under the selected payment terms.` },
      };

      const notif = notifMap[newStatus];
      if (notif) {
        const emailBody = `Hi ${order.customer_name},${NL}${NL}${notif.msg}${NL}${NL}Order: #${order.order_number}${NL}FMM CLASSICO | 0208207543`;
        await Promise.all([
          appClient.entities.Notification.create({ user_email: order.customer_email, title: notif.title, message: notif.msg, type: 'order_processing', order_id: order.id, order_number: order.order_number, is_read: false }),
          appClient.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: `${notif.title} - #${order.order_number}`, body: emailBody }),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Updated!');
    },
  });

  const confirmRemainingBalanceMutation = useMutation({
    mutationFn: async (order) => {
      const now = new Date().toISOString();
      const newTracking = (order.tracking_updates || []).concat([
        { status: 'Remaining Balance Paid', message: `Admin confirmed the remaining balance of ₵${getBalanceDue(order).toFixed(2)} was paid.`, timestamp: now },
      ]);

      await appClient.entities.Order.update(order.id, {
        remaining_balance_paid: true,
        remaining_balance_paid_at: now,
        tracking_updates: newTracking,
      });

      const msg = `The remaining balance for order #${order.order_number} has been confirmed as paid.`;
      const emailBody = `Hi ${order.customer_name},${NL}${NL}${msg}${NL}${NL}FMM CLASSICO${NL}0208207543`;

      await Promise.all([
        appClient.entities.Notification.create({ user_email: order.customer_email, title: 'Remaining Balance Confirmed', message: msg, type: 'payment_confirmed', order_id: order.id, order_number: order.order_number, is_read: false }),
        appClient.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: `Remaining Balance Confirmed - #${order.order_number}`, body: emailBody }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Remaining balance confirmed.');
    },
  });

  const updateDeliveryDateMutation = useMutation({
    mutationFn: async ({ order, date }) => {
      await appClient.entities.Order.update(order.id, { estimated_delivery: date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Delivery date set!');
    },
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      await Promise.all(orderIds.map((id) => appClient.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedOrders([]);
      toast.success('Deleted');
    },
  });

  const handleToggleSelect = (id) => {
    setSelectedOrders((prev) => prev.includes(id) ? prev.filter((itemId) => itemId !== id) : prev.concat([id]));
  };

  const handleSelectAll = (list) => {
    const ids = list.map((order) => order.id);
    const allSelected = ids.every((id) => selectedOrders.includes(id));
    if (allSelected) {
      setSelectedOrders((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedOrders((prev) => [...new Set(prev.concat(ids))]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)?`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!isAdmin && user) return <div className="p-8 text-center"><p className="text-red-600 font-bold">Access Denied</p></div>;
  if (!user) return <div className="p-8 text-center"><p>Loading...</p></div>;

  const renderOrderCard = (order) => {
    const next = getNextStatus(order);
    const method = order.payment_method || 'full_payment';
    const methodLabel = getPaymentMethodLabel(method);
    const grandTotal = getGrandTotal(order);
    const amountPaidNow = getAmountPaidNow(order);
    const balanceDue = getBalanceDue(order);
    const paymentBadges = getPaymentBadges(order);
    const isDelivered = order.status === 'delivered';
    const isCancelled = order.status === 'cancelled' || order.status === 'returned';
    const isClosed = isDelivered || isCancelled;
    const canConfirmBalance = hasRemainingBalance(order) && order.payment_status === 'paid' && !isRemainingBalancePaid(order) && !isClosed && ['shipped', 'out_for_delivery'].includes(order.status);
    const canAdvance = next && order.payment_status === 'paid' && !isClosed;
    const canMarkReturned = hasRemainingBalance(order) && order.payment_status === 'paid' && !isClosed && ['shipped', 'out_for_delivery'].includes(order.status);
    const deliveryBlocked = next?.newStatus === 'delivered' && hasRemainingBalance(order) && !isRemainingBalancePaid(order);

    return (
      <Card key={order.id} className="p-4 bg-white mb-3">
        <div className="flex items-start gap-2">
          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 mt-1 cursor-pointer" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{order.order_number}</p>
                <p className="text-[10px] text-gray-400">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">₵{grandTotal.toFixed(2)}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color || ''}`}>{statusConfig[order.status]?.label || order.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${methodLabel.color}`}>{methodLabel.text}</span>
              {paymentBadges.map((badge) => <span key={badge.text} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.text}</span>)}
            </div>

            <div className="mt-2 grid gap-1 text-xs text-gray-700 bg-slate-50 rounded-lg p-2">
              <div className="flex justify-between"><span>Total order value</span><span className="font-semibold">₵{grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Paid now</span><span className="font-semibold">₵{amountPaidNow.toFixed(2)}</span></div>
              {balanceDue > 0 && <div className="flex justify-between text-orange-700"><span>Remaining balance</span><span className="font-bold">₵{balanceDue.toFixed(2)}</span></div>}
            </div>

            <div className="mt-2 text-xs text-gray-600 space-y-0.5">
              <p className="font-medium text-gray-800">{order.customer_name}</p>
              <p>{order.customer_email}{order.customer_phone ? ` | ${order.customer_phone}` : ''}</p>
              <p>📍 {order.delivery_address}</p>
            </div>

            <div className="mt-2 flex flex-col gap-1.5">
              {(order.items || []).map((item, index) => {
                const variantSummary = formatVariantSummary(item);
                return (
                  <div key={index} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                    {item.product_image && <img src={item.product_image} className="w-8 h-8 rounded object-cover" />}
                    <div className="min-w-0">
                      <span className="text-[10px] text-gray-700 block">{item.product_name} x{item.quantity}</span>
                      {variantSummary && <span className="text-[10px] text-blue-700 block">{variantSummary}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">Est. Delivery:</span>
                {order.estimated_delivery ? <span className="text-xs font-bold text-gray-800">{format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</span> : <span className="text-xs text-gray-400">Not set</span>}
              </div>
              {!isClosed && (
                <div className="flex items-center gap-2">
                  <Input type="date" className="text-xs h-8 w-40" value={deliveryDates[order.id] || ''} onChange={(e) => setDeliveryDates((prev) => ({ ...prev, [order.id]: e.target.value }))} />
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => {
                    const date = deliveryDates[order.id];
                    if (!date) return toast.error('Pick a date');
                    updateDeliveryDateMutation.mutate({ order, date });
                  }} disabled={updateDeliveryDateMutation.isPending}>Set</Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100">
              <Link to={createPageUrl('AdminInvoice') + '?orderId=' + order.id}>
                <Button size="sm" variant="outline" className="text-xs h-8"><FileText className="h-3 w-3 mr-1" /> Invoice</Button>
              </Link>

              {canConfirmBalance && (
                <Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => confirmRemainingBalanceMutation.mutate(order)} disabled={confirmRemainingBalanceMutation.isPending}>
                  <Wallet className="h-3 w-3 mr-1" /> Confirm Balance Paid
                </Button>
              )}

              {canAdvance && !deliveryBlocked && (
                <Button size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700" onClick={() => updateStatusMutation.mutate({ order, newStatus: next.newStatus, message: next.message })} disabled={updateStatusMutation.isPending}>
                  {next.label}
                </Button>
              )}

              {canAdvance && deliveryBlocked && (
                <Button size="sm" variant="outline" className="text-xs h-8 opacity-50" disabled>
                  Confirm Balance Paid First
                </Button>
              )}

              {canMarkReturned && (
                <Button size="sm" variant="outline" className="text-xs h-8 border-gray-400 text-gray-700 hover:bg-gray-100" onClick={() => updateStatusMutation.mutate({ order, newStatus: 'returned', message: getReturnStatusMessage(order) })} disabled={updateStatusMutation.isPending}>
                  Mark Product Returned
                </Button>
              )}

              {!canAdvance && next && order.payment_status !== 'paid' && !isClosed && (
                <Button size="sm" variant="outline" className="text-xs h-8 opacity-50" disabled>
                  {next.label} (Awaiting Payment)
                </Button>
              )}

              <Button size="sm" variant="destructive" className="text-xs h-8" onClick={() => updateStatusMutation.mutate({ order, newStatus: 'cancelled', message: 'Cancelled by admin.' })} disabled={updateStatusMutation.isPending || isClosed}>
                Cancel
              </Button>
            </div>

            {!isClosed && (
              <div className="mt-2 flex gap-2">
                <Textarea className="text-xs flex-1" rows={1} placeholder="Message to customer..." value={adminMessages[order.id] || ''} onChange={(e) => setAdminMessages((prev) => ({ ...prev, [order.id]: e.target.value }))} />
                <Button size="sm" variant="outline" className="h-8" onClick={() => sendAdminMessageMutation.mutate({ order, message: adminMessages[order.id] })}><Send className="h-3 w-3" /></Button>
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
          {activeOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={activeOrders.every((order) => selectedOrders.includes(order.id))} onChange={() => handleSelectAll(activeOrders)} className="w-3.5 h-3.5" /> Select all</label>}
        </div>
        {isLoading ? <Skeleton className="h-32" /> : activeOrders.length === 0 ? <p className="text-sm text-gray-400">No active orders</p> : activeOrders.map(renderOrderCard)}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Completed ({fulfilledOrders.length})</h2>
          {fulfilledOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={fulfilledOrders.every((order) => selectedOrders.includes(order.id))} onChange={() => handleSelectAll(fulfilledOrders)} className="w-3.5 h-3.5" /> Select all</label>}
        </div>
        {isLoading ? <Skeleton className="h-32" /> : fulfilledOrders.length === 0 ? <p className="text-sm text-gray-400">None</p> : fulfilledOrders.map(renderOrderCard)}
      </div>
    </div>
  );
}
