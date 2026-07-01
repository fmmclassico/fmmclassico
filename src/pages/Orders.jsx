import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { checkPaymentStatus } from '@/api/hubtelClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
 Package,
 ChevronRight,
 CheckCircle2,
 Truck,
 MapPin,
 XCircle,
 Trash2,
 Check,
 AlertTriangle,
 Loader2
} from 'lucide-react';
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
 pending: { color: 'bg-yellow-100 text-yellow-800', icon: Package, label: 'Pending' },
};

// Cancel is ONLY allowed in these statuses. Once "packed", cancel disappears.
const CANCELLABLE_STATUSES = ['confirmed', 'processing', 'pending'];

const paymentStatusConfig = {
 paid: { color: 'bg-green-100 text-green-700', label: '✅ Paid' },
 pending_payment: { color: 'bg-yellow-100 text-yellow-700', label: '⏳ Pending Payment' },
 failed: { color: 'bg-red-100 text-red-700', label: '❌ Failed' },
 cancelled: { color: 'bg-gray-100 text-gray-600', label: '🚫 Cancelled' },
 refunded: { color: 'bg-blue-100 text-blue-700', label: '↩️ Refunded' },
};

export default function Orders() {
 const [user, setUser] = useState(null);
 const [selectedOrders, setSelectedOrders] = useState([]);
 const [cancellingOrder, setCancellingOrder] = useState(null);
 const [cancelReason, setCancelReason] = useState('');
 const [isVerifying, setIsVerifying] = useState(false);
 const [searchParams, setSearchParams] = useSearchParams();
 const queryClient = useQueryClient();
 const verificationDone = useRef(false);

 useEffect(() => {
  base44.auth.me()
   .then(setUser)
   .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
 }, []);

 // ============ PAYMENT VERIFICATION (runs only after user loads) ============
 useEffect(() => {
  if (!user?.email) return;
  if (verificationDone.current) return;

  const orderNumber = searchParams.get('order');
  const status = searchParams.get('status');

  if (!orderNumber) return;
  verificationDone.current = true;

  console.log('[Orders] Payment return detected. Order:', orderNumber, 'Status:', status);

  if (status === 'cancelled') {
   toast.info('Payment was cancelled. Your items are still in your cart.');
   // Clean URL params
   setSearchParams({});
   return;
  }

  // Start verification with retries
  setIsVerifying(true);
  verifyPaymentWithRetry(orderNumber, user.email, 0);
 }, [user, searchParams]);

 const verifyPaymentWithRetry = async (orderNumber, userEmail, attempt) => {
  const MAX_ATTEMPTS = 4;
  const DELAY_MS = 2500;

  try {
   console.log(`[Orders] Verification attempt ${attempt + 1}/${MAX_ATTEMPTS} for ${orderNumber}`);

   // First check if callback already updated the order
   const orders = await base44.entities.Order.filter({ order_number: orderNumber });
   
   if (orders && orders.length > 0) {
    const order = orders[0];
    
    // If callback already marked it as paid, we're done!
    if (order.payment_status === 'paid') {
     console.log('[Orders] Order already marked as paid by callback!');
     await clearCartAfterPayment(userEmail);
     toast.success('✅ Payment confirmed! Your order has been received.');
     queryClient.invalidateQueries({ queryKey: ['orders'] });
     setIsVerifying(false);
     setSearchParams({});
     return;
    }
   }

   // If callback hasn't processed yet, check Hubtel directly
   const result = await checkPaymentStatus(orderNumber);
   console.log('[Orders] Hubtel status check result:', result);

   let hubtelStatus = null;
   if (result?.data?.status) {
    hubtelStatus = result.data.status;
   } else if (result?.data?.paymentStatus) {
    hubtelStatus = result.data.paymentStatus;
   }

   const isPaid = hubtelStatus && (hubtelStatus.toLowerCase() === 'paid' || hubtelStatus.toLowerCase() === 'success');

   if (isPaid) {
    // Update order from frontend as backup (callback should have done this already)
    if (orders && orders.length > 0 && orders[0].payment_status !== 'paid') {
     const order = orders[0];
     await base44.entities.Order.update(order.id, {
      payment_status: 'paid',
      status: 'confirmed',
      tracking_updates: [
       ...(order.tracking_updates || []),
       {
        status: 'Payment Confirmed',
        message: `Payment verified successfully. Status: ${hubtelStatus}`,
        timestamp: new Date().toISOString(),
       }
      ]
     });
    }

    // Clear cart NOW that payment is verified
    await clearCartAfterPayment(userEmail);
    toast.success('✅ Payment confirmed! Your order has been received.');
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setIsVerifying(false);
    setSearchParams({});
    return;
   }

   // Not paid yet, retry if we have attempts left
   if (attempt < MAX_ATTEMPTS - 1) {
    console.log(`[Orders] Not confirmed yet, retrying in ${DELAY_MS}ms...`);
    setTimeout(() => verifyPaymentWithRetry(orderNumber, userEmail, attempt + 1), DELAY_MS);
   } else {
    // Max attempts reached - check one more time if callback processed it
    const finalCheck = await base44.entities.Order.filter({ order_number: orderNumber });
    if (finalCheck?.length > 0 && finalCheck[0].payment_status === 'paid') {
     await clearCartAfterPayment(userEmail);
     toast.success('✅ Payment confirmed! Your order has been received.');
    } else {
     toast.info('Payment is being processed. Your order will update shortly.');
    }
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setIsVerifying(false);
    setSearchParams({});
   }
  } catch (err) {
   console.error('[Orders] Payment verification error:', err);
   if (attempt < MAX_ATTEMPTS - 1) {
    setTimeout(() => verifyPaymentWithRetry(orderNumber, userEmail, attempt + 1), DELAY_MS);
   } else {
    toast.info('Payment verification is taking longer than expected. Check back in a moment.');
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setIsVerifying(false);
    setSearchParams({});
   }
  }
 };

 const clearCartAfterPayment = async (userEmail) => {
  try {
   const items = await base44.entities.CartItem.filter({ user_email: userEmail });
   if (items && items.length > 0) {
    await Promise.all(items.map(item => base44.entities.CartItem.delete(item.id).catch(() => {})));
   }
   queryClient.invalidateQueries({ queryKey: ['cartItems'] });
   console.log('[Orders] Cart cleared after payment verification');
  } catch (err) {
   console.error('[Orders] Cart clearing error:', err);
  }
 };

 const { data: orders = [], isLoading } = useQuery({
  queryKey: ['orders', user?.email],
  queryFn: () => base44.entities.Order.filter({ customer_email: user.email }, '-created_date', 200),
  enabled: !!user?.email,
  staleTime: 10000,
  gcTime: 5 * 60 * 1000,
  refetchInterval: isVerifying ? 3000 : 30000,
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
    is_read: false,
    created_date: new Date().toISOString()
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

 // ============ VERIFYING OVERLAY ============
 if (isVerifying) {
  return (
   <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
    <div className="text-center px-6">
     <div className="relative mx-auto w-16 h-16 mb-6">
      <div className="absolute inset-0 rounded-full border-4 border-green-100"></div>
      <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin"></div>
     </div>
     <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
     <p className="text-gray-500 text-sm">Please wait while we confirm your payment with Hubtel.</p>
     <p className="text-gray-400 text-xs mt-4">This may take a few seconds.</p>
    </div>
   </div>
  );
 }

 if (!user) {
  return (
   <div className="max-w-lg mx-auto px-4 py-10">
    <div className="space-y-4">
     {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
    </div>
   </div>
  );
 }

 if (orders.length === 0) {
  return (
   <div className="max-w-lg mx-auto px-4 py-16 text-center">
    <Card className="p-8 rounded-2xl shadow-sm">
     <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
     <h2 className="text-lg font-bold text-gray-800">No orders yet</h2>
     <p className="text-gray-500 text-sm mt-1">Start shopping to see your orders here</p>
     <Link to={createPageUrl('Shop')}>
      <Button className="mt-4 rounded-xl bg-blue-800 text-white">Go to Shop</Button>
     </Link>
    </Card>
   </div>
  );
 }

 return (
  <div className="max-w-lg mx-auto px-4 py-6 pb-32">
   {/* Header */}
   <div className="flex items-center justify-between mb-4">
    <div>
     <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
     <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
    </div>

    {selectedOrders.length > 0 && (
     <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{selectedOrders.length} selected</span>
      <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="rounded-lg">
       <Trash2 className="w-4 h-4 mr-1" />
       Delete
      </Button>
     </div>
    )}
   </div>

   {/* Selection Controls */}
   {orders.length > 0 && (
    <div className="flex items-center gap-2 mb-4 px-1">
     <input type="checkbox" checked={selectedOrders.length === orders.length && orders.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" />
     <span className="text-xs text-gray-500">
      Select All ({selectedOrders.length}/{orders.length})
     </span>
    </div>
   )}

   {/* Orders List */}
   <div className="space-y-4">
    {isLoading ? (
     Array(3).fill(0).map((_, i) => (
      <Skeleton key={i} className="h-48 w-full rounded-xl" />
     ))
    ) : (
     orders.map((order) => {
      const StatusIcon = statusConfig[order.status]?.icon || Package;
      const isSelected = selectedOrders.includes(order.id);

      return (
       <Card key={order.id} className={`p-4 rounded-2xl shadow-sm border ${isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'}`}>
        {/* Top bar: checkbox + order number + amount */}
        <div className="flex items-start justify-between mb-3">
         <div className="flex items-center gap-2">
          <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} className="w-4 h-4 cursor-pointer" />
          <div>
           <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
           <p className="text-xs text-gray-400">{format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}</p>
          </div>
         </div>
         <div className="text-right">
          <p className="text-sm font-bold text-gray-900">₵{order.total_amount?.toFixed(2)}</p>
          <Badge className={`text-[10px] px-2 py-0.5 ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-700'}`}>
           {statusConfig[order.status]?.label || order.status}
          </Badge>
          {order.payment_status && (
           <Badge className={`text-[10px] px-2 py-0.5 ml-1 ${paymentStatusConfig[order.payment_status]?.color || 'bg-gray-100'}`}>
            {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
           </Badge>
          )}
         </div>
        </div>

        {/* Product(s) with images */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
         <div className="space-y-2">
          {order.items?.map((item, idx) => (
           <div key={idx} className="flex items-center gap-3">
            {item.product_image && (
             <img src={item.product_image} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
             <p className="text-xs text-gray-500">x{item.quantity} · ₵{(item.price * item.quantity).toFixed(2)}</p>
            </div>
           </div>
          ))}
         </div>
        </div>

        {/* Tracking checklist - matches OrderTracking page */}
        <div className="mb-3">
         <p className="text-xs font-semibold text-gray-600 mb-2">Order Progress</p>
         {(() => {
          const s = order.status;
          const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
          const rank = ORDER_RANK[s] || 0;
          const isPaid = order.payment_status === 'paid';
          const steps = [
           { label: 'Payment Confirmed', done: isPaid },
           { label: 'Order Placed', done: true },
           { label: 'Processing', done: isPaid && rank >= 2 },
           { label: 'Packed', done: isPaid && rank >= 3 },
           { label: 'Shipped', done: isPaid && rank >= 4 },
           { label: 'Delivered', done: isPaid && rank >= 6 },
          ];
          return (
           <div className="flex flex-wrap gap-2">
            {steps.map((step, i) => (
             <div key={i} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? 'bg-green-500' : 'bg-gray-200'}`}>
               {step.done && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className={`text-[10px] ${step.done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>{step.label}</span>
             </div>
            ))}
           </div>
          );
         })()}
        </div>

        {/* Delivery info + actions */}
        <div className="text-xs text-gray-500 mb-3">
         <p>📍 {order.delivery_address}{order.city ? `, ${order.city}` : ''}</p>
         {order.estimated_delivery && (
          <p>🗓 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>
         )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
         <Link to={`${createPageUrl('OrderTracking')}?id=${order.id}`}>
          <Button variant="outline" size="sm" className="rounded-lg text-xs">
           <ChevronRight className="w-3 h-3 mr-1" />
           Track Order
          </Button>
         </Link>
         {/* Cancel button ONLY shows for cancellable statuses */}
         {CANCELLABLE_STATUSES.includes(order.status) && (
          <Button variant="ghost" size="sm" className="rounded-lg text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setCancellingOrder(order); setCancelReason(''); }}>
           <XCircle className="w-3 h-3 mr-1" />
           Cancel Order
          </Button>
         )}
        </div>
       </Card>
      );
     })
    )}
   </div>

   {/* Cancel Order Modal */}
   {cancellingOrder && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
     <Card className="max-w-sm w-full p-6 rounded-2xl shadow-xl bg-white">
      <div className="flex items-start gap-3 mb-4">
       <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-600" />
       </div>
       <div>
        <h3 className="font-bold text-gray-900">Cancel Order</h3>
        <p className="text-xs text-gray-500">#{cancellingOrder.order_number}</p>
       </div>
      </div>

      {/* Cancellation Policy */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-xs text-yellow-800">
       <p className="font-semibold mb-1">📋 Cancellation Policy</p><ul className="list-disc pl-4 space-y-1">
        <li>Orders can only be cancelled while in Pending or Confirmed status.</li>
        <li>Once an order is Packed, Shipped or In Transit, it cannot be cancelled.</li>
        <li>If you have already paid, contact us on WhatsApp 0509 896 035 to arrange a refund.</li>
        <li>Refunds are processed within 1–3 business days via Mobile Money.</li>
        <li>Custom or special orders may not be eligible for cancellation.</li>
       </ul>
      </div>

      <div className="mb-4">
       <label className="text-sm font-medium text-gray-700">Reason for cancellation (optional)</label>
       <textarea className="w-full mt-1 border rounded-xl p-2 text-sm" rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
      </div>

      <div className="flex gap-2">
       <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setCancellingOrder(null); setCancelReason(''); }}>
        Keep Order
       </Button>
       <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => cancelOrderMutation.mutate({ order: cancellingOrder, reason: cancelReason })} disabled={cancelOrderMutation.isPending}>
        <XCircle className="w-4 h-4 mr-1" />
        {cancelOrderMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
       </Button>
      </div>
     </Card>
    </div>
   )}
  </div>
 );
}
