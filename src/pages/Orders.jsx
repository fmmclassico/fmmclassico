import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Truck, MapPin, XCircle, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
  packed: { color: 'bg-orange-100 text-orange-800', label: 'Packed' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped' },
  out_for_delivery: { color: 'bg-cyan-100 text-cyan-800', label: 'Out for Delivery' },
  in_transit: { color: 'bg-cyan-100 text-cyan-800', label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

const CANCELLABLE = ['confirmed', 'processing'];

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState([]);
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const done = useRef(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(createPageUrl('Home'))); }, []);

  // On return from Hubtel: create order as PAID immediately
  useEffect(() => {
    if (!user || done.current) return;
    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');
    if (!orderNumber) return;
    done.current = true;

    if (status === 'cancelled') { localStorage.removeItem('pendingOrder'); return; }

    // Create order from localStorage as PAID
    const pending = localStorage.getItem('pendingOrder');
    if (!pending) return;

    const createOrder = async () => {
      try {
        const data = JSON.parse(pending);
        // Check if already created (by callback)
        const existing = await base44.entities.Order.filter({ order_number: orderNumber });
        if (existing && existing.length > 0) {
          // Already exists, make sure it's paid
          if (existing[0].payment_status !== 'paid') {
            await base44.entities.Order.update(existing[0].id, { payment_status: 'paid', status: 'confirmed' });
          }
        } else {
          // Create new paid order
          await base44.entities.Order.create({
            ...data,
            order_number: orderNumber,
            payment_status: 'paid',
            status: 'confirmed',
            tracking_updates: [{ status: 'Payment Confirmed', message: 'Payment successful via Hubtel.', timestamp: new Date().toISOString() }],
          });
        }

        // Notifications
        try {
          await base44.entities.Notification.create({
            user_email: user.email, title: '✅ Payment Confirmed!',
            message: `Order #${orderNumber} (GHS ${data.total_amount?.toFixed(2)}) confirmed.`,
            type: 'payment_confirmed', order_number: orderNumber, is_read: false,
          });
          const admins = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
          for (const email of admins) {
            await base44.entities.Notification.create({
              user_email: email, title: '💰 New Paid Order!',
              message: `#${orderNumber} by ${data.customer_name} (${data.customer_phone}) paid GHS ${data.total_amount?.toFixed(2)}.`,
              type: 'payment_confirmed', order_number: orderNumber, is_read: false,
            });
          }
        } catch (e) { /* silent */ }

        localStorage.removeItem('pendingOrder');
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (e) { console.error('[Orders] Create error:', e); }
    };
    createOrder();
  }, [user, searchParams, queryClient]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids) => { for (const id of ids) { await base44.entities.Order.delete(id); } },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setSelected([]); },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      await base44.entities.Order.update(order.id, { status: 'cancelled', tracking_updates: [...(order.tracking_updates || []), { status: 'Cancelled', message: reason || 'Customer cancelled', timestamp: new Date().toISOString() }] });
      await base44.entities.Notification.create({ user_email: order.customer_email, title: '❌ Order Cancelled', message: `Order #${order.order_number} cancelled. Contact 0509 896 035 for refund.`, type: 'order_cancelled', order_number: order.order_number, is_read: false });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setCancelling(null); },
  });

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAll = () => setSelected(selected.length === orders.length ? [] : orders.map(o => o.id));
  const handleDelete = () => { if (selected.length && confirm(`Delete ${selected.length} order(s)?`)) deleteMutation.mutate(selected); };

  if (!user) return <div className="p-4 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  if (!isLoading && orders.length === 0) return <div className="flex items-center justify-center min-h-[60vh] p-4"><div className="text-center space-y-3"><Package className="w-12 h-12 text-gray-300 mx-auto" /><p className="text-gray-500 font-medium">No orders yet</p><Link to={createPageUrl('Shop')} className="inline-block mt-2 px-6 py-2 bg-blue-800 text-white rounded-full font-semibold text-sm">Go to Shop</Link></div></div>;

  return (
    <div className="bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-xl font-bold">My Orders</h1><p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p></div>
          {selected.length > 0 && <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4 mr-1" />Delete {selected.length}</Button>}
        </div>

        {orders.length > 0 && <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={selected.length === orders.length && orders.length > 0} onChange={selectAll} className="w-4 h-4" /><span className="text-xs text-gray-500">Select All</span></div>}

        <div className="space-y-4">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />) : orders.map(order => {
            const isSel = selected.includes(order.id);
            const isPaid = order.payment_status === 'paid';
            const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
            const rank = ORDER_RANK[order.status] || 0;
            const steps = [{ l: 'Placed', d: true }, { l: 'Paid', d: isPaid }, { l: 'Processing', d: isPaid && rank >= 2 }, { l: 'Shipped', d: isPaid && rank >= 4 }, { l: 'Delivered', d: isPaid && rank >= 6 }];

            return (
              <Card key={order.id} className={`p-4 ${isSel ? 'ring-2 ring-blue-300' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isSel} onChange={() => toggle(order.id)} className="w-4 h-4 mt-1" />
                    <div>
                      <p className="font-semibold text-sm">{order.order_number}</p>
                      <p className="text-xs text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy · h:mm a')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₵{order.total_amount?.toFixed(2)}</p>
                    <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-100'}`}>{statusConfig[order.status]?.label || order.status}</Badge>
                    <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{isPaid ? '✅ Paid' : '⏳ Pending'}</p>
                  </div>
                </div>

                <div className="mb-3 space-y-2">{order.items?.map((item, i) => <div key={i} className="flex items-center gap-2">{item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />}<div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{item.product_name}</p><p className="text-xs text-gray-400">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p></div></div>)}</div>

                <div className="mb-3">
                  <div className="flex items-center gap-1">{steps.map((s, i) => <div key={i} className="flex items-center gap-0.5"><div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${s.d ? 'bg-green-500' : 'bg-gray-200'}`}>{s.d && <Check className="w-3 h-3" />}</div><span className="text-[10px] text-gray-500 hidden sm:inline">{s.l}</span></div>)}</div>
                </div>

                <p className="text-xs text-gray-500 mb-3">📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>

                <div className="flex items-center gap-2">
                  <Link to={createPageUrl(`OrderTracking?id=${order.id}`)} className="flex-1 text-center py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">Track Order</Link>
                  {CANCELLABLE.includes(order.status) && <button onClick={() => setCancelling(order)} className="flex-1 text-center py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">Cancel</button>}
                </div>
              </Card>
            );
          })}
        </div>

        {cancelling && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-bold">Cancel #{cancelling.order_number}?</h3>
              <p className="text-xs text-gray-500">If paid, contact WhatsApp 0509 896 035 for refund.</p>
              <textarea className="w-full border rounded-lg p-2 text-sm" placeholder="Reason (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCancelling(null)}>Keep</Button>
                <Button variant="destructive" className="flex-1" onClick={() => cancelMutation.mutate({ order: cancelling, reason: cancelReason })} disabled={cancelMutation.isPending}>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}