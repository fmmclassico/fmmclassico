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
import { Trash2, Send, Calendar, FileText, Wallet, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const NL = String.fromCharCode(10);
const statusConfig = {
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  packed: { label: 'Packed', color: 'bg-orange-100 text-orange-800' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Product Successfully Delivered', color: 'bg-green-200 text-green-900' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700' },
};
function toNumber(value, fallback = 0) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }
function getGrandTotal(order) { return toNumber(order?.grand_total, toNumber(order?.total_amount)); }
function getAmountPaidNow(order) { return toNumber(order?.initial_payment_amount ?? order?.amount_paid_now ?? order?.total_amount); }
function getBalanceDue(order) { return toNumber(order?.balance_due ?? order?.balance_payment_amount); }
function isTwoStageOrder(order) { return ['deposit_balance', 'pay_on_delivery'].includes(order?.payment_method || ''); }
function isRemainingBalancePaid(order) { return order?.remaining_balance_paid === true || order?.balance_payment_status === 'paid'; }
function formatVariantSummary(item) { if (item?.variant_summary) return item.variant_summary; const parts = []; if (item?.selected_color) parts.push(`Color: ${item.selected_color}`); if (item?.selected_wattage) parts.push(`Wattage: ${item.selected_wattage}`); if (item?.selected_type) parts.push(`Type: ${item.selected_type}`); return parts.join(' • '); }
function getPaymentMethodLabel(method) { if (method === 'full_payment') return { text: 'Full Payment', color: 'bg-green-100 text-green-700' }; if (method === 'deposit_balance') return { text: 'Deposit + Balance', color: 'bg-orange-100 text-orange-700' }; if (method === 'pay_on_delivery') return { text: 'Delivery First', color: 'bg-red-100 text-red-700' }; return { text: 'Full Payment', color: 'bg-green-100 text-green-700' }; }
function getNextStatus(order) { if (order.status === 'confirmed') return { newStatus: 'processing', label: 'Mark Processing', message: 'Order is being processed.' }; if (order.status === 'processing') return { newStatus: 'packed', label: 'Mark Packed', message: 'Order packed.' }; if (order.status === 'packed') return { newStatus: 'shipped', label: isTwoStageOrder(order) ? 'Mark Shipped & Enable Balance Payment' : 'Mark Shipped', message: isTwoStageOrder(order) ? 'Order shipped. Customer can now pay the remaining balance through the Order page.' : 'Order shipped.' }; if (order.status === 'shipped' && !isTwoStageOrder(order)) return { newStatus: 'delivered', label: 'Product Successfully Delivered', message: 'Order delivered successfully.' }; if (order.status === 'shipped' && isTwoStageOrder(order) && isRemainingBalancePaid(order)) return { newStatus: 'delivered', label: 'Product Successfully Delivered', message: 'Full payment has been confirmed and product delivered successfully.' }; return null; }

async function sendOrderSignals(order, { title, message, emailSubject, smsMessage, type = 'general' }) {
  const emailBody = `Hi ${order.customer_name},${NL}${NL}${message}${NL}${NL}FMM CLASSICO${NL}0208207543`;
  const tasks = [appClient.entities.Notification.create({ user_email: order.customer_email, title, message, type, order_id: order.id, order_number: order.order_number, is_read: false })];
  if (order.customer_email) tasks.push(appClient.integrations.Core.SendEmail({ to: order.customer_email, from_name: 'FMM CLASSICO', subject: emailSubject || title, body: emailBody }));
  if (order.customer_phone && smsMessage) tasks.push(appClient.integrations.Core.SendSMS({ to: order.customer_phone, message: smsMessage }));
  await Promise.all(tasks);
}

export default function AdminOrders() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [adminMessages, setAdminMessages] = useState({});
  const [deliveryDates, setDeliveryDates] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => { appClient.auth.isAuthenticated().then((isAuth) => { if (isAuth) { appClient.auth.me().then((userData) => { setUser(userData); setIsAdmin(userData.role === 'admin'); }); } }); }, []);
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['adminOrders'], queryFn: () => appClient.entities.Order.list('-created_date', 100), enabled: isAdmin, refetchInterval: 30000 });
  const activeOrders = orders.filter((order) => !['delivered', 'cancelled', 'returned'].includes(order.status));
  const fulfilledOrders = orders.filter((order) => ['delivered', 'cancelled', 'returned'].includes(order.status));

  const sendAdminMessageMutation = useMutation({ mutationFn: async ({ order, message }) => { await sendOrderSignals(order, { title: 'Message from FMM CLASSICO', message, emailSubject: `Message - Order #${order.order_number}`, smsMessage: message, type: 'general' }); }, onSuccess: (_, variables) => { setAdminMessages((prev) => ({ ...prev, [variables.order.id]: '' })); toast.success('Message sent!'); } });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, newStatus, message }) => {
      if (newStatus === 'delivered' && isTwoStageOrder(order) && !isRemainingBalancePaid(order)) throw new Error('Confirm the balance payment before handing over the product.');
      const now = new Date().toISOString();
      const payload = { status: newStatus, tracking_updates: (order.tracking_updates || []).concat([{ status: statusConfig[newStatus]?.label || newStatus, message, timestamp: now }]) };
      if (newStatus === 'shipped' && isTwoStageOrder(order)) {
        payload.balance_payment_enabled = true;
        payload.balance_payment_enabled_at = now;
        payload.payment_stage = 'awaiting_balance_payment';
        payload.balance_payment_status = 'enabled';
      }
      await appClient.entities.Order.update(order.id, payload);
      const smsMap = {
        processing: `Order ${order.order_number} is now being processed by FMM CLASSICO.`,
        packed: `Order ${order.order_number} has been packed and is being prepared for shipment.`,
        shipped: isTwoStageOrder(order) ? `Order ${order.order_number} has been shipped. Remaining balance: GHS ${getBalanceDue(order).toFixed(2)}. Pay through your Order page before handover.` : `Order ${order.order_number} has been shipped successfully.`,
        delivered: `Order ${order.order_number} has been successfully delivered. Thank you for shopping with FMM CLASSICO.`,
        cancelled: `Order ${order.order_number} has been cancelled. Contact FMM CLASSICO for assistance.`,
        returned: `Order ${order.order_number} has been returned because delivery could not be completed under the payment terms.`,
      };
      const titleMap = { processing: 'Order Being Prepared', packed: 'Order Packed', shipped: 'Order Shipped', delivered: 'Order Delivered', cancelled: 'Order Cancelled', returned: 'Product Returned' };
      await sendOrderSignals(order, { title: titleMap[newStatus] || 'Order Update', message, emailSubject: `${titleMap[newStatus] || 'Order Update'} - #${order.order_number}`, smsMessage: smsMap[newStatus], type: newStatus === 'delivered' ? 'order_processing' : 'general' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Updated!'); },
  });

  const confirmRemainingBalanceMutation = useMutation({
    mutationFn: async (order) => {
      const now = new Date().toISOString();
      await appClient.entities.Order.update(order.id, {
        remaining_balance_paid: true,
        remaining_balance_paid_at: now,
        balance_payment_status: 'paid',
        is_fully_paid: true,
        payment_stage: 'fully_paid',
        tracking_updates: (order.tracking_updates || []).concat([{ status: 'Balance Paid', message: `Admin confirmed the balance payment of ₵${getBalanceDue(order).toFixed(2)}.`, timestamp: now }]),
      });
      await sendOrderSignals(order, { title: 'Balance Payment Confirmed', message: `The remaining balance for order #${order.order_number} has been confirmed as paid. Your order is now fully paid.`, emailSubject: `Balance Payment Confirmed - #${order.order_number}`, smsMessage: `Order ${order.order_number}: remaining balance received. Full amount is now paid.`, type: 'payment_confirmed' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Balance payment confirmed.'); },
  });

  const markBalanceFailedMutation = useMutation({
    mutationFn: async (order) => {
      const now = new Date().toISOString();
      await appClient.entities.Order.update(order.id, {
        balance_payment_status: 'failed',
        payment_stage: 'balance_payment_failed',
        tracking_updates: (order.tracking_updates || []).concat([{ status: 'Balance Payment Failed', message: `Balance payment of ₵${getBalanceDue(order).toFixed(2)} was not completed successfully.`, timestamp: now }]),
      });
      await sendOrderSignals(order, { title: 'Balance Payment Failed', message: `The remaining balance payment for order #${order.order_number} was not completed successfully.`, emailSubject: `Balance Payment Failed - #${order.order_number}`, smsMessage: `Order ${order.order_number}: remaining balance payment failed. Please complete payment through your Order page before handover.`, type: 'general' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Balance payment marked as failed.'); },
  });

  const updateDeliveryDateMutation = useMutation({
    mutationFn: async ({ order, date }) => {
      await appClient.entities.Order.update(order.id, { estimated_delivery: date, tracking_updates: (order.tracking_updates || []).concat([{ status: 'Delivery Date Set', message: `Estimated delivery date set for ${date}.`, timestamp: new Date().toISOString() }]) });
      await sendOrderSignals(order, { title: 'Delivery Date Scheduled', message: `Your delivery date for order #${order.order_number} has been set for ${date}.`, emailSubject: `Delivery Date Scheduled - #${order.order_number}`, smsMessage: `Order ${order.order_number}: delivery date set for ${date}.${isTwoStageOrder(order) ? ` Remaining amount due: GHS ${getBalanceDue(order).toFixed(2)}.` : ''}`, type: 'order_processing' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); toast.success('Delivery date set!'); },
  });

  const deleteOrdersMutation = useMutation({ mutationFn: async (orderIds) => { await Promise.all(orderIds.map((id) => appClient.entities.Order.delete(id))); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminOrders'] }); setSelectedOrders([]); toast.success('Deleted'); } });

  const handleToggleSelect = (id) => setSelectedOrders((prev) => prev.includes(id) ? prev.filter((itemId) => itemId !== id) : prev.concat([id]));
  const handleSelectAll = (list) => { const ids = list.map((order) => order.id); const allSelected = ids.every((id) => selectedOrders.includes(id)); if (allSelected) setSelectedOrders((prev) => prev.filter((id) => !ids.includes(id))); else setSelectedOrders((prev) => [...new Set(prev.concat(ids))]); };
  const handleDeleteSelected = () => { if (selectedOrders.length === 0) return; if (confirm(`Delete ${selectedOrders.length} order(s)?`)) deleteOrdersMutation.mutate(selectedOrders); };

  if (!isAdmin && user) return <div className="p-8 text-center"><p className="text-red-600 font-bold">Access Denied</p></div>;
  if (!user) return <div className="p-8 text-center"><p>Loading...</p></div>;

  const renderOrderCard = (order) => {
    const next = getNextStatus(order);
    const methodLabel = getPaymentMethodLabel(order.payment_method || 'full_payment');
    const grandTotal = getGrandTotal(order);
    const amountPaidNow = getAmountPaidNow(order);
    const balanceDue = getBalanceDue(order);
    const twoStage = isTwoStageOrder(order);
    const isClosed = ['delivered', 'cancelled', 'returned'].includes(order.status);
    const awaitingBalance = twoStage && order.status === 'shipped' && !isRemainingBalancePaid(order);
    const showDecisionBar = awaitingBalance;
    const showDeliveredButton = next && next.newStatus === 'delivered';
    return (
      <Card key={order.id} className="p-4 bg-white mb-3">
        <div className="flex items-start gap-2">
          <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 mt-1 cursor-pointer" />
          <div className="flex-1">
            <div className="flex items-center justify-between"><div><p className="text-sm font-bold">{order.order_number}</p><p className="text-[10px] text-gray-400">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : ''}</p></div><div className="text-right"><p className="text-sm font-bold">₵{grandTotal.toFixed(2)}</p><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[order.status]?.color || ''}`}>{statusConfig[order.status]?.label || order.status}</span></div></div>
            <div className="flex flex-wrap gap-1.5 mt-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${methodLabel.color}`}>{methodLabel.text}</span><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.initial_payment_status === 'paid' || order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.initial_payment_status === 'paid' || order.payment_status === 'paid' ? 'Initial Payment Received' : 'Awaiting Initial Payment'}</span>{twoStage && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isRemainingBalancePaid(order) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{isRemainingBalancePaid(order) ? 'Balance Paid' : `Balance Pending: ₵${balanceDue.toFixed(2)}`}</span>}</div>
            <div className="mt-2 grid gap-1 text-xs text-gray-700 bg-slate-50 rounded-lg p-2"><div className="flex justify-between"><span>Total order value</span><span className="font-semibold">₵{grandTotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Initial payment</span><span className="font-semibold">₵{amountPaidNow.toFixed(2)}</span></div>{twoStage && <div className="flex justify-between text-orange-700"><span>Remaining balance</span><span className="font-bold">₵{balanceDue.toFixed(2)}</span></div>}</div>
            <div className="mt-2 text-xs text-gray-600 space-y-0.5"><p className="font-medium text-gray-800">{order.customer_name}</p><p>{order.customer_email}{order.customer_phone ? ` | ${order.customer_phone}` : ''}</p><p>📍 {order.delivery_address}</p></div>
            <div className="mt-2 flex flex-col gap-1.5">{(order.items || []).map((item, index) => { const variantSummary = formatVariantSummary(item); return <div key={index} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">{item.product_image && <img src={item.product_image} className="w-8 h-8 rounded object-cover" />}<div className="min-w-0"><span className="text-[10px] text-gray-700 block">{item.product_name} x{item.quantity}</span>{variantSummary && <span className="text-[10px] text-blue-700 block">{variantSummary}</span>}</div></div>;})}</div>
            <div className="mt-3 pt-2 border-t border-gray-100"><div className="flex items-center gap-2 mb-1"><Calendar className="h-3.5 w-3.5 text-gray-500" /><span className="text-xs text-gray-600 font-medium">Est. Delivery:</span>{order.estimated_delivery ? <span className="text-xs font-bold text-gray-800">{format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</span> : <span className="text-xs text-gray-400">Not set</span>}</div>{!isClosed && <div className="flex items-center gap-2"><Input type="date" className="text-xs h-8 w-40" value={deliveryDates[order.id] || ''} onChange={(e) => setDeliveryDates((prev) => ({ ...prev, [order.id]: e.target.value }))} /><Button size="sm" variant="outline" className="text-xs h-8" onClick={() => { const date = deliveryDates[order.id]; if (!date) return toast.error('Pick a date'); updateDeliveryDateMutation.mutate({ order, date }); }} disabled={updateDeliveryDateMutation.isPending}>Set</Button></div>}</div>
            <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100"><Link to={createPageUrl('AdminInvoice') + '?orderId=' + order.id}><Button size="sm" variant="outline" className="text-xs h-8"><FileText className="h-3 w-3 mr-1" /> Invoice</Button></Link>{next && next.newStatus !== 'delivered' && <Button size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700" onClick={() => updateStatusMutation.mutate({ order, newStatus: next.newStatus, message: next.message })} disabled={updateStatusMutation.isPending}>{next.label}</Button>}{showDecisionBar && <><Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => confirmRemainingBalanceMutation.mutate(order)} disabled={confirmRemainingBalanceMutation.isPending}><Wallet className="h-3 w-3 mr-1" /> Balance Paid</Button><Button size="sm" variant="outline" className="text-xs h-8 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => markBalanceFailedMutation.mutate(order)} disabled={markBalanceFailedMutation.isPending}><AlertTriangle className="h-3 w-3 mr-1" /> Failed Payment</Button><Button size="sm" variant="destructive" className="text-xs h-8" onClick={() => updateStatusMutation.mutate({ order, newStatus: 'cancelled', message: 'Cancelled by admin.' })} disabled={updateStatusMutation.isPending}>Cancel Order</Button></>}{showDeliveredButton && <Button size="sm" className="text-xs h-8 bg-green-700 hover:bg-green-800" onClick={() => updateStatusMutation.mutate({ order, newStatus: next.newStatus, message: next.message })} disabled={updateStatusMutation.isPending}>{next.label}</Button>}</div>
            {!isClosed && <div className="mt-2 flex gap-2"><Textarea className="text-xs flex-1" rows={1} placeholder="Message to customer..." value={adminMessages[order.id] || ''} onChange={(e) => setAdminMessages((prev) => ({ ...prev, [order.id]: e.target.value }))} /><Button size="sm" variant="outline" className="h-8" onClick={() => sendAdminMessageMutation.mutate({ order, message: adminMessages[order.id] })}><Send className="h-3 w-3" /></Button></div>}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6"><h1 className="text-xl font-bold">Admin - Orders</h1>{selectedOrders.length > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteSelected}><Trash2 className="h-3 w-3 mr-1" /> Delete {selectedOrders.length}</Button>}</div>
      <div className="mb-8"><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-700">Active Orders ({activeOrders.length})</h2>{activeOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={activeOrders.every((order) => selectedOrders.includes(order.id))} onChange={() => handleSelectAll(activeOrders)} className="w-3.5 h-3.5" /> Select all</label>}</div>{isLoading ? <Skeleton className="h-32" /> : activeOrders.length === 0 ? <p className="text-sm text-gray-400">No active orders</p> : activeOrders.map(renderOrderCard)}</div>
      <div><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-700">Completed ({fulfilledOrders.length})</h2>{fulfilledOrders.length > 0 && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={fulfilledOrders.every((order) => selectedOrders.includes(order.id))} onChange={() => handleSelectAll(fulfilledOrders)} className="w-3.5 h-3.5" /> Select all</label>}</div>{isLoading ? <Skeleton className="h-32" /> : fulfilledOrders.length === 0 ? <p className="text-sm text-gray-400">None</p> : fulfilledOrders.map(renderOrderCard)}</div>
    </div>
  );
}
