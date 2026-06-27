import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Truck, MapPin, Home, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderTracking() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => { base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(window.location.href)); }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const order = orders.find(o => String(o.id) === String(orderId));

  if (isLoading || !user) return <div className="p-4"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!order) return <div className="flex flex-col items-center justify-center min-h-[60vh] p-4"><p className="text-gray-500 mb-4">Order not found</p><Link to={createPageUrl('Orders')}><Button>View All Orders</Button></Link></div>;

  const isPaid = order.payment_status === 'paid';
  const ORDER_RANK = { confirmed: 1, processing: 2, packed: 3, shipped: 4, out_for_delivery: 5, in_transit: 5, delivered: 6 };
  const rank = ORDER_RANK[order.status] || 0;

  const steps = [
    { label: 'Payment Confirmed', desc: 'Payment verified.', done: isPaid, icon: CheckCircle2 },
    { label: 'Order Confirmed', desc: 'Order confirmed and being prepared.', done: isPaid && rank >= 1, icon: Package },
    { label: 'Shipped', desc: 'Order dispatched for delivery.', done: isPaid && rank >= 4, icon: Truck },
    { label: 'In Transit', desc: 'On its way to you.', done: isPaid && rank >= 5, icon: MapPin },
    { label: 'Delivered', desc: 'Delivered successfully.', done: order.status === 'delivered', icon: Home },
  ];

  return (
    <div className="bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
            <p className="text-xs text-gray-500">{format(new Date(order.created_date), 'MMM d, yyyy · h:mm a')}</p>
          </div>
          <div className="text-right">
            <Badge className={isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{isPaid ? '✅ Paid' : '⏳ Pending'}</Badge>
          </div>
        </div>

        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Tracking</h2>
          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}><Icon className="w-4 h-4" /></div>
                    {!isLast && <div className={`w-0.5 h-8 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Items</h2>
          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.product_image && <img src={item.product_image} alt="" className="w-12 h-12 rounded object-cover" />}
                <div className="flex-1"><p className="text-sm font-medium">{item.product_name}</p><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div>
                <p className="text-sm font-semibold">₵{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold text-sm"><span>Total</span><span>₵{order.total_amount?.toFixed(2)}</span></div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Delivery</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-gray-400 mt-0.5" /><div><p className="font-medium">{order.customer_name}</p><p className="text-gray-600">{order.delivery_address}</p></div></div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><p className="text-gray-600">{order.customer_phone}</p></div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><p className="text-gray-600">{order.customer_email}</p></div>
            {order.notes && <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">Notes: {order.notes}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
