import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Truck, MapPin, XCircle, Home, Phone, Mail, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderTracking() {
  var [user, setUser] = useState(null);
  var urlParams = new URLSearchParams(window.location.search);
  var orderId = urlParams.get('id');

  useEffect(function() {
    base44.auth.me().then(setUser).catch(function() { base44.auth.redirectToLogin(createPageUrl('Orders')); });
  }, []);

  var { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: function() { return base44.entities.Order.filter({ customer_email: user?.email }); },
    enabled: !!user?.email
  });

  var order = orders.find(function(o) { return o.id === orderId; });

  if (isLoading || !user) {
    return <div className="p-4 space-y-4"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>;
  }

  if (!order) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6"><p className="text-gray-500 mb-4">Order not found</p><Link to={createPageUrl('Orders')}><Button>View All Orders</Button></Link></div>;
  }

  var method = order.payment_method || 'full_payment';
  var isPaid = order.payment_status === 'paid';
  var s = order.status;
  var ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
  var rank = ORDER_RANK[s] || 0;
  var isCancelled = s === 'cancelled';

  // Build progress steps based on payment method
  var steps;
  if (method === 'full_payment') {
    steps = [
      { label: 'Order Placed', desc: 'Your order has been placed.', done: true },
      { label: 'Delivery Payment Confirmed', desc: 'Payment verified by Hubtel.', done: isPaid },
      { label: 'Product Payment', desc: 'Full product payment confirmed.', done: isPaid, color: isPaid ? 'text-green-600' : '' },
      { label: 'Processing', desc: 'Order is being prepared.', done: isPaid && rank >= 2 },
      { label: 'Packed', desc: 'Order has been packed.', done: isPaid && rank >= 3 },
      { label: 'Shipped', desc: 'Order has been dispatched.', done: isPaid && rank >= 4 },
      { label: 'Delivered', desc: 'Order delivered successfully.', done: rank >= 6 },
    ];
  } else if (method === 'deposit_balance') {
    steps = [
      { label: 'Order Placed', desc: 'Your order has been placed.', done: true },
      { label: 'Delivery Payment Confirmed', desc: 'Deposit + delivery fee paid.', done: isPaid },
      { label: 'Product Payment', desc: 'Balance of ₵' + (order.balance_due || 0).toFixed(2) + ' to be paid on delivery.', done: rank >= 5, color: rank >= 5 ? 'text-green-600' : 'text-orange-600' },
      { label: 'Processing', desc: 'Order is being prepared.', done: isPaid && rank >= 2 },
      { label: 'Packed', desc: 'Order has been packed.', done: isPaid && rank >= 3 },
      { label: 'Shipped', desc: 'Order dispatched.', done: isPaid && rank >= 4 },
      { label: 'Delivered', desc: 'Order delivered.', done: rank >= 6 },
    ];
  } else {
    steps = [
      { label: 'Order Placed', desc: 'Your order has been placed.', done: true },
      { label: 'Delivery Payment Confirmed', desc: 'Delivery fee paid.', done: true },
      { label: 'Product Payment', desc: '₵' + (order.balance_due || 0).toFixed(2) + ' to be paid on delivery.', done: rank >= 5, color: rank >= 5 ? 'text-green-600' : 'text-red-600' },
      { label: 'Processing', desc: 'Order is being prepared.', done: rank >= 2 },
      { label: 'Packed', desc: 'Order has been packed.', done: rank >= 3 },
      { label: 'Shipped', desc: 'Order dispatched.', done: rank >= 4 },
      { label: 'Delivered', desc: 'Order delivered.', done: rank >= 6 },
    ];
  }

  // Payment badge
  var payLabel = '';
  if (method === 'full_payment' && isPaid) payLabel = 'Confirmed, Paid';
  else if (method === 'deposit_balance' && isPaid) payLabel = 'Delivery Paid, ₵' + (order.balance_due || 0).toFixed(2) + ' left';
  else if (method === 'pay_on_delivery') payLabel = 'Delivery Paid, Product payment on delivery';
  else payLabel = 'Pending Payment';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Header */}
        <Card className="p-5 bg-white mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-900">Order #{order.order_number}</h1>
            <span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + (isCancelled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{isCancelled ? 'Cancelled' : (statusConfig[s] || s)}</span>
          </div>
          <p className="text-xs text-gray-500">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : ''}</p>
          <div className="mt-2"><span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + (method === 'full_payment' && isPaid ? 'bg-green-100 text-green-700' : method === 'deposit_balance' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700')}>{payLabel}</span></div>
        </Card>

        {/* Progress Steps */}
        {!isCancelled && (
          <Card className="p-5 bg-white mb-4">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Order Progress</h2>
            <div className="space-y-4">
              {steps.map(function(step, i) {
                var isLast = i === steps.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={'w-6 h-6 rounded-full border-2 flex items-center justify-center ' + (step.done ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                        {step.done && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      {!isLast && <div className={'w-0.5 flex-1 mt-1 ' + (step.done ? 'bg-green-500' : 'bg-gray-200')}></div>}
                    </div>
                    <div className="pb-4">
                      <p className={'text-sm font-semibold ' + (step.done ? (step.color || 'text-gray-900') : 'text-gray-400')}>{step.label}</p>
                      <p className="text-xs text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Tracking History */}
        {order.tracking_updates && order.tracking_updates.length > 0 && (
          <Card className="p-5 bg-white mb-4">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Tracking History</h2>
            <div className="space-y-3">
              {order.tracking_updates.slice().reverse().map(function(update, idx) {
                return (
                  <div key={idx} className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{update.status}</p>
                      <p className="text-[10px] text-gray-500">{update.message}</p>
                      {update.timestamp && <p className="text-[10px] text-gray-400">{format(new Date(update.timestamp), 'MMM d, yyyy h:mm a')}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Order Items */}
        <Card className="p-5 bg-white mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Order Items</h2>
          {order.items?.map(function(item, idx) {
            return (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                {item.product_image && <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1"><p className="text-sm font-medium text-gray-800">{item.product_name}</p><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div>
                <p className="text-sm font-bold">₵{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            );
          })}
          <div className="mt-3 pt-3 border-t border-gray-100">
            {order.delivery_fee > 0 && <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Delivery Fee</span><span>₵{order.delivery_fee?.toFixed(2)}</span></div>}
            {order.balance_due > 0 && <div className="flex justify-between text-xs text-orange-700 mb-1"><span>Balance Due on Delivery</span><span>₵{order.balance_due?.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-sm"><span>Total Charged</span><span>₵{order.total_amount?.toFixed(2)}</span></div>
          </div>
        </Card>

        {/* Delivery Info */}
        <Card className="p-5 bg-white mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Delivery Information</h2>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p className="font-medium text-gray-800">{order.customer_name}</p>
            <p>📍 {order.delivery_address}</p>
            {order.city && <p>{order.city}</p>}
            <p>📞 {order.customer_phone}</p>
            <p>✉️ {order.customer_email}</p>
            <p>📅 Est. delivery: {order.estimated_delivery && order.estimated_delivery.length > 4 && !order.estimated_delivery.startsWith('1970') ? format(new Date(order.estimated_delivery), 'MMM d, yyyy') : '—'}</p>
          </div>
        </Card>

        <Link to={createPageUrl('Orders')}><Button variant="outline" className="w-full">← Back to Orders</Button></Link>
      </div>
    </div>
  );
}

var statusConfig = {
  confirmed: 'Confirmed', processing: 'Processing', packed: 'Packed',
  shipped: 'Shipped', out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
};
