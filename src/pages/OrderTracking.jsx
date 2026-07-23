import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Check } from 'lucide-react';
import { format } from 'date-fns';

const statusLabels = {
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
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

export default function OrderTracking() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => {
    appClient.auth.me().then(setUser).catch(() => {
      appClient.auth.redirectToLogin(createPageUrl('Orders'));
    });
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => appClient.entities.Order.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const order = orders.find((item) => item.id === orderId);

  if (isLoading || !user) {
    return <div className="p-4 space-y-4"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>;
  }

  if (!order) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-6"><p className="text-gray-500 mb-4">Order not found</p><Link to={createPageUrl('Orders')}><Button>View All Orders</Button></Link></div>;
  }

  const method = order.payment_method || 'full_payment';
  const initialPaid = order.payment_status === 'paid';
  const remainingPaid = isRemainingBalancePaid(order);
  const status = order.status;
  const orderRank = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
  const rank = orderRank[status] || 0;
  const isCancelled = status === 'cancelled';
  const balanceDue = getBalanceDue(order);
  const grandTotal = getGrandTotal(order);
  const amountPaidNow = getAmountPaidNow(order);
  const hasEstDelivery = !!order.estimated_delivery;

  let steps;
  if (method === 'full_payment') {
    steps = [
      { label: 'Order Placed', desc: 'Your order has been placed.', done: true },
      { label: 'Payment Confirmed', desc: 'Full payment has been confirmed.', done: initialPaid },
      { label: 'Processing', desc: 'Order is being prepared.', done: initialPaid && rank >= 2 },
      { label: 'Packed', desc: 'Order has been packed.', done: initialPaid && rank >= 3 },
      { label: 'Shipped', desc: 'Order has been dispatched.', done: initialPaid && rank >= 4 },
      { label: 'Delivered', desc: 'Order delivered successfully.', done: rank >= 6 },
    ];
  } else {
    steps = [
      { label: 'Order Placed', desc: 'Your order has been placed.', done: true },
      { label: 'Initial Payment Confirmed', desc: 'Your checkout payment has been confirmed.', done: initialPaid },
      { label: 'Processing', desc: 'Order is being prepared.', done: initialPaid && rank >= 2 },
      { label: 'Packed', desc: 'Order has been packed.', done: initialPaid && rank >= 3 },
      { label: 'Shipped', desc: 'Order has been dispatched.', done: initialPaid && rank >= 4 },
      { label: 'Out for Delivery', desc: 'Your order is on the way.', done: rank >= 5 },
      { label: 'Remaining Balance Paid', desc: `Balance of ₵${balanceDue.toFixed(2)} confirmed by admin.`, done: remainingPaid },
      { label: 'Delivered', desc: 'Order delivered successfully.', done: rank >= 6 },
    ];
  }

  let payLabel = 'Pending Payment';
  let payColor = 'bg-yellow-100 text-yellow-700';
  if (method === 'full_payment' && initialPaid) {
    payLabel = 'Fully Paid';
    payColor = 'bg-green-100 text-green-700';
  } else if (method !== 'full_payment' && initialPaid && !remainingPaid) {
    payLabel = `Initial Payment Received, ₵${balanceDue.toFixed(2)} left`;
    payColor = 'bg-orange-100 text-orange-700';
  } else if (method !== 'full_payment' && initialPaid && remainingPaid) {
    payLabel = 'Fully Paid';
    payColor = 'bg-emerald-100 text-emerald-700';
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Card className="p-5 bg-white mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-900">Order #{order.order_number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isCancelled ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{isCancelled ? 'Cancelled' : (statusLabels[status] || status)}</span>
          </div>
          <p className="text-xs text-gray-500">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy h:mm a') : ''}</p>
          <div className="mt-2"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${payColor}`}>{payLabel}</span></div>
        </Card>

        {!isCancelled && (
          <Card className="p-5 bg-white mb-4">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Order Progress</h2>
            <div className="space-y-4">
              {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                return (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${step.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {step.done && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 mt-1 ${step.done ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-semibold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                      <p className="text-xs text-gray-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {order.tracking_updates && order.tracking_updates.length > 0 && (
          <Card className="p-5 bg-white mb-4">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Tracking History</h2>
            <div className="space-y-3">
              {order.tracking_updates.slice().reverse().map((update, index) => (
                <div key={index} className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{update.status}</p>
                    <p className="text-[10px] text-gray-500">{update.message}</p>
                    {update.timestamp && <p className="text-[10px] text-gray-400">{format(new Date(update.timestamp), 'MMM d, yyyy h:mm a')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5 bg-white mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Order Items</h2>
          {(order.items || []).map((item, index) => {
            const variantSummary = formatVariantSummary(item);
            return (
              <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                {item.product_image && <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  {variantSummary && <p className="text-xs text-blue-700 mt-0.5">{variantSummary}</p>}
                </div>
                <p className="text-sm font-bold">₵{(toNumber(item.price) * toNumber(item.quantity, 1)).toFixed(2)}</p>
              </div>
            );
          })}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Total order value</span><span>₵{grandTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Paid now</span><span>₵{amountPaidNow.toFixed(2)}</span></div>
            {balanceDue > 0 && !remainingPaid && <div className="flex justify-between text-xs text-orange-700 mb-1"><span>Balance Due on Delivery</span><span>₵{balanceDue.toFixed(2)}</span></div>}
          </div>
        </Card>

        <Card className="p-5 bg-white mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Delivery Information</h2>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p className="font-medium text-gray-800">{order.customer_name}</p>
            <p>📍 {order.delivery_address}</p>
            {order.city && <p>{order.city}</p>}
            <p>📞 {order.customer_phone}</p>
            <p>✉️ {order.customer_email}</p>
            {hasEstDelivery && <p>📅 Est. delivery: {format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</p>}
          </div>
        </Card>

        <Link to={createPageUrl('Orders')}><Button variant="outline" className="w-full">← Back to Orders</Button></Link>
      </div>
    </div>
  );
}
