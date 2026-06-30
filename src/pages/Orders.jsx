import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronRight, CheckCircle2, Truck, MapPin, XCircle, Trash2, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

var statusConfig = { confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2, label: 'Confirmed' }, processing: { color: 'bg-purple-100 text-purple-800', icon: Package, label: 'Processing' }, packed: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Packed' }, shipped: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Shipped' }, out_for_delivery: { color: 'bg-cyan-100 text-cyan-800', icon: MapPin, label: 'Out for Delivery' }, in_transit: { color: 'bg-cyan-100 text-cyan-800', icon: MapPin, label: 'In Transit' }, delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Delivered' }, cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' }, returned: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Returned' } };
var CANCELLABLE_STATUSES = ['confirmed', 'processing'];
var paymentStatusConfig = { paid: { color: 'bg-green-100 text-green-700', label: 'Paid' }, pending_payment: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Payment' }, failed: { color: 'bg-red-100 text-red-700', label: 'Failed' }, cancelled: { color: 'bg-gray-100 text-gray-600', label: 'Cancelled' }, refunded: { color: 'bg-blue-100 text-blue-700', label: 'Refunded' } };

export default function Orders() {
  var [user, setUser] = useState(null);
  var [selectedOrders, setSelectedOrders] = useState([]);
  var [cancellingOrder, setCancellingOrder] = useState(null);
  var [cancelReason, setCancelReason] = useState('');
  var [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  var [verificationDone, setVerificationDone] = useState(false);
  var [searchParams, setSearchParams] = useSearchParams();
  var queryClient = useQueryClient();

  useEffect(function() {
    supabase.auth.getUser().then(function(result) {
      if (result.data && result.data.user) { setUser(result.data.user); }
      else { window.location.href = '/'; }
    });
  }, []);

  useEffect(function() {
    var channel = supabase.channel('orders-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function() { queryClient.invalidateQueries({ queryKey: ['orders'] }); }).subscribe();
    return function() { supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(function() {
    var orderNumber = searchParams.get('order');
    var status = searchParams.get('status');
    if (!orderNumber || !user || verificationDone) return;
    if (status === 'cancelled') { toast.error('Payment was cancelled. Your items are still in your cart.'); setSearchParams({}); setVerificationDone(true); return; }

    setIsVerifyingPayment(true);
    var pollCount = 0;
    var maxPolls = 20;
    var pollInterval = 2000;
    var done = false;

    function pollOrder() {
      if (done || pollCount >= maxPolls) {
        if (!done) { setIsVerifyingPayment(false); setVerificationDone(true); setSearchParams({}); toast.info('Order is being processed. Check back shortly.'); }
        return;
      }
      pollCount++;

      supabase.from('orders').select('*').eq('order_number', orderNumber).then(function(result) {
        var found = result.data;
        if (!found || found.length === 0) { setTimeout(pollOrder, pollInterval); return; }

        var order = found[0];

        if (!order.customer_email && user.email) {
          supabase.from('orders').update({ customer_email: user.email }).eq('id', order.id);
        }

        if (order.payment_status === 'paid') {
          done = true;
          setIsVerifyingPayment(false);
          setVerificationDone(true);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          toast.success('Payment confirmed! Your order is being processed.');
          supabase.from('cart_items').delete().eq('user_email', user.email).then(function() { queryClient.invalidateQueries({ queryKey: ['cartItems'] }); });
          setSearchParams({});
          return;
        }

        if (pollCount >= 10 && status === 'success') {
          var updatedTracking = (order.tracking_updates || []).concat([{ status: 'Payment Confirmed', message: 'Payment verified via redirect.', timestamp: new Date().toISOString() }]);
          supabase.from('orders').update({ payment_status: 'paid', status: 'confirmed', tracking_updates: updatedTracking, customer_email: user.email }).eq('id', order.id).then(function() {
            done = true; setIsVerifyingPayment(false); setVerificationDone(true);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Payment confirmed!');
            supabase.from('cart_items').delete().eq('user_email', user.email).then(function() { queryClient.invalidateQueries({ queryKey: ['cartItems'] }); });
            setSearchParams({});
          });
          return;
        }

        setTimeout(pollOrder, pollInterval);
      }).catch(function() { setTimeout(pollOrder, pollInterval); });
    }

    setTimeout(pollOrder, 1500);
  }, [searchParams, user, queryClient, verificationDone]);

  var ordersQuery = useQuery({
    queryKey: ['orders', user ? user.email : null],
    queryFn: function() { return supabase.from('orders').select('*').eq('customer_email', user.email).order('created_date', { ascending: false }).limit(200).then(function(r) { return r.data || []; }); },
    enabled: !!(user && user.email),
    staleTime: 5000,
    refetchInterval: isVerifyingPayment ? 2000 : 30000,
  });
  var allOrders = ordersQuery.data || [];
  var isLoading = ordersQuery.isLoading;
  var orders = allOrders.filter(function(order) {
    if (order.payment_status === 'paid' || order.payment_status === 'refunded') return true;
    if (order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') return true;
    if (order.payment_status === 'pending_payment') { return (Date.now() - new Date(order.created_date).getTime()) < 120000; }
    return false;
  });

  var deleteOrdersMutation = useMutation({ mutationFn: function(ids) { return Promise.all(ids.map(function(id) { return supabase.from('orders').delete().eq('id', id); })); }, onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['orders'] }); setSelectedOrders([]); toast.success('Orders deleted'); } });
  var handleToggleSelect = function(id) { setSelectedOrders(function(p) { return p.includes(id) ? p.filter(function(x) { return x !== id; }) : p.concat([id]); }); };
  var handleSelectAll = function() { if (selectedOrders.length === orders.length) { setSelectedOrders([]); } else { setSelectedOrders(orders.map(function(o) { return o.id; })); } };
  var cancelOrderMutation = useMutation({ mutationFn: function(params) { var o = params.order; var r = params.reason; var t = (o.tracking_updates || []).concat([{ status: 'Cancelled', message: 'Cancelled by customer. Reason: ' + (r || 'No reason'), timestamp: new Date().toISOString() }]); return supabase.from('orders').update({ status: 'cancelled', tracking_updates: t }).eq('id', o.id); }, onSuccess: function() { queryClient.invalidateQueries({ queryKey: ['orders'] }); setCancellingOrder(null); setCancelReason(''); toast.success('Order cancelled.'); } });
  var handleDeleteSelected = function() { if (selectedOrders.length === 0) return; if (confirm('Delete ' + selectedOrders.length + ' order(s)?')) { deleteOrdersMutation.mutate(selectedOrders); } };

  if (!user) { return <div className="p-4 space-y-4">{Array(3).fill(0).map(function(_, i) { return <Skeleton key={i} className="h-32 w-full rounded-xl" />; })}</div>; }
  if (isVerifyingPayment) { return <div className="min-h-screen flex flex-col items-center justify-center p-6"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mb-4"></div><p className="text-lg font-semibold text-blue-800">Verifying your payment...</p><p className="text-sm text-gray-500 mt-2">Please wait, this takes a few seconds.</p></div>; }
  if (orders.length === 0) { return <div className="min-h-screen flex flex-col items-center justify-center p-6"><Package className="h-16 w-16 text-gray-300 mb-4" /><h2 className="text-xl font-bold text-gray-700">No orders yet</h2><p className="text-gray-500 mt-1">Start shopping to see your orders here</p><Link to={createPageUrl('Shop')}><Button className="mt-4 bg-blue-800 text-white rounded-xl">Go to Shop</Button></Link></div>; }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4"><div><h1 className="text-2xl font-bold text-gray-900">My Orders</h1><p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p></div></div>
        {selectedOrders.length > 0 && <div className="flex items-center gap-2 mb-3"><span className="text-sm text-gray-600">{selectedOrders.length} selected</span><Button size="sm" variant="destructive" onClick={handleDeleteSelected} className="rounded-lg"><Trash2 className="h-4 w-4 mr-1" />Delete</Button></div>}
        {orders.length > 0 && <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={selectedOrders.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" /><span className="text-xs text-gray-500">Select All ({selectedOrders.length}/{orders.length})</span></div>}
        <div className="space-y-4">
          {isLoading ? Array(3).fill(0).map(function(_, i) { return <Card key={i} className="p-4 rounded-2xl"><Skeleton className="h-6 w-full mb-2" /><Skeleton className="h-16 w-full" /></Card>; }) : orders.map(function(order) {
            var isSelected = selectedOrders.includes(order.id);
            return (
              <Card key={order.id} className={"p-4 rounded-2xl border " + (isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-100')}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isSelected} onChange={function() { handleToggleSelect(order.id); }} className="w-4 h-4 cursor-pointer" />
                    <div><span className="font-bold text-sm">{order.order_number}</span><p className="text-xs text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy')}</p></div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm">GHS {order.total_amount ? order.total_amount.toFixed(2) : '0.00'}</span>
                    <div className="flex flex-col gap-1 mt-1">
                      <Badge className={(statusConfig[order.status] && statusConfig[order.status].color) || 'bg-gray-100 text-gray-800'}>{(statusConfig[order.status] && statusConfig[order.status].label) || order.status}</Badge>
                      {order.payment_status && <Badge className={(paymentStatusConfig[order.payment_status] && paymentStatusConfig[order.payment_status].color) || 'bg-gray-100'}>{(paymentStatusConfig[order.payment_status] && paymentStatusConfig[order.payment_status].label) || order.payment_status}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mb-3 space-y-1">{order.items && order.items.map(function(item, idx) { return <div key={idx} className="flex items-center gap-2">{item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.product_name}</p><p className="text-xs text-gray-500">x{item.quantity} · GHS {(item.price * item.quantity).toFixed(2)}</p></div></div>; })}</div>
                <div className="mb-3"><p className="text-xs font-semibold text-gray-600 mb-1">Order Progress</p>{(function() { var ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 }; var rank = ORDER_RANK[order.status] || 0; var isPaidOrder = order.payment_status === 'paid'; var steps = [{ label: 'Order Placed', done: true }, { label: 'Payment Confirmed', done: isPaidOrder }, { label: 'Processing', done: isPaidOrder && rank >= 2 }, { label: 'Shipped', done: isPaidOrder && rank >= 4 }, { label: 'Delivered', done: isPaidOrder && rank >= 6 }]; return <div className="flex items-center gap-1 flex-wrap">{steps.map(function(step, i) { return <div key={i} className="flex items-center gap-1"><div className={"w-5 h-5 rounded-full flex items-center justify-center text-xs " + (step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400')}>{step.done && <Check className="w-3 h-3" />}</div><span className={"text-[10px] " + (step.done ? 'text-green-700' : 'text-gray-400')}>{step.label}</span></div>; })}</div>; })()}</div>
                <div className="text-xs text-gray-500 mb-2"><p>📍 {order.delivery_address}{order.city ? ', ' + order.city : ''}</p>{order.estimated_delivery && <p>🗓 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>}</div>
                <div className="flex gap-2"><Link to={createPageUrl('OrderTracking') + '?id=' + order.id} className="flex-1"><Button size="sm" variant="outline" className="w-full rounded-lg text-xs"><ChevronRight className="h-3 w-3 mr-1" />Track Order</Button></Link>{CANCELLABLE_STATUSES.includes(order.status) && <Button size="sm" variant="ghost" className="text-red-500 text-xs" onClick={function() { setCancellingOrder(order); setCancelReason(''); }}><XCircle className="h-3 w-3 mr-1" />Cancel</Button>}</div>
              </Card>
            );
          })}
        </div>
        {cancellingOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md p-6 rounded-2xl bg-white"><div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-red-500" /><div><h3 className="font-bold text-lg">Cancel Order</h3><p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p></div></div><div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4"><ul className="text-xs text-yellow-700 space-y-1 list-disc pl-4"><li>Orders can only be cancelled while in Pending or Confirmed status.</li><li>If you already paid, contact WhatsApp 0509 896 035 for refund.</li></ul></div><div className="mb-4"><label className="text-sm font-medium">Reason (optional)</label><textarea className="w-full mt-1 p-2 border rounded-lg text-sm" rows={3} value={cancelReason} onChange={function(e) { setCancelReason(e.target.value); }} /></div><div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-lg" onClick={function() { setCancellingOrder(null); }}>Keep Order</Button><Button className="flex-1 rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={function() { cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason }); }} disabled={cancelOrderMutation.isPending}>{cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}</Button></div></Card></div>}
      </div>
    </div>
  );
}
