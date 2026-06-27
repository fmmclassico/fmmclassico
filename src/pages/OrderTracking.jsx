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
import { 
  Package,
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  Home,
  Phone,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

const statusLabels = {
  confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped',
  in_transit: 'In Transit', delivered: 'Delivered', pending: 'Pending',
};

export default function OrderTracking() {
  const [user, setUser] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  // FIX: Use String() comparison to handle UUID/number type mismatch
  const order = orders.find(o => String(o.id) === String(orderId));
  const isCancelled = order?.status === 'cancelled';

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Card className="p-4">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full mb-2" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <p className="text-gray-500 font-medium">Order not found</p>
        <Link to={createPageUrl('Orders')}>
          <Button>View All Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-lg mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
            <p className="text-xs text-gray-500">Placed on {format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}</p>
          </div>
          {isCancelled ? (
            <Badge className="bg-red-100 text-red-700">
              Cancelled
            </Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-700">
              {statusLabels[order.status] || order.status}
            </Badge>
          )}
        </div>

        {/* Tracking History: 5-step timeline */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Tracking History</h2>
          {(() => {
            const tracking = order.tracking_updates || [];
            const hasStatus = (keywords) => tracking.some(t =>
              keywords.some(k => t.status?.toLowerCase().includes(k.toLowerCase()) || t.message?.toLowerCase().includes(k.toLowerCase()))
            );
            const getTimestamp = (keywords) => {
              const match = tracking.find(t =>
                keywords.some(k => t.status?.toLowerCase().includes(k.toLowerCase()) || t.message?.toLowerCase().includes(k.toLowerCase()))
              );
              return match?.timestamp ? format(new Date(match.timestamp), 'MMM d, yyyy h:mm a') : null;
            };

            const steps = [
              {
                label: 'Payment Confirmed',
                desc: 'Payment has been verified and confirmed.',
                done: hasStatus(['payment confirmed','confirmed','processing','shipped','in_transit','delivered']) || ['confirmed','processing','shipped','in_transit','delivered'].includes(order.status),
                time: getTimestamp(['payment confirmed','confirmed']),
                icon: CheckCircle2,
              },
              {
                label: 'Order Processing',
                desc: 'Your order is being prepared and packed.',
                done: hasStatus(['processing','shipped','in_transit','delivered']) || ['processing','shipped','in_transit','delivered'].includes(order.status),
                time: getTimestamp(['processing']),
                icon: Package,
              },
              {
                label: 'Shipped',
                desc: 'Your order has been dispatched for delivery.',
                done: hasStatus(['shipped','in_transit','delivered']) || ['shipped','in_transit','delivered'].includes(order.status),
                time: getTimestamp(['shipped']),
                icon: Truck,
              },
              {
                label: 'In Transit',
                desc: 'Your order is on its way to you.',
                done: hasStatus(['in_transit','delivered']) || ['in_transit','delivered'].includes(order.status),
                time: getTimestamp(['in_transit','transit']),
                icon: MapPin,
              },
              {
                label: 'Delivered',
                desc: 'Your order has been delivered successfully.',
                done: hasStatus(['delivered']) || order.status === 'delivered',
                time: getTimestamp(['delivered']),
                icon: Home,
              },
            ];

            return (
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  const Icon = step.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {!isLast && <div className={`w-0.5 h-8 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                        <p className="text-xs text-gray-500">{step.desc}</p>
                        {step.done && step.time && (
                          <p className="text-xs text-green-600 mt-0.5">{step.time}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        <Separator />

        {/* Order Items */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Order Items</h2>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold">₵{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-bold text-sm">
            <span>Total</span>
            <span>₵{order.total_amount?.toFixed(2)}</span>
          </div>
        </Card>

        {/* Delivery Info */}
        <Card className="p-4">
          <h2 className="font-semibold text-sm mb-3">Delivery Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-gray-600">{order.delivery_address}</p>
                <p className="text-gray-600">{order.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <p className="text-gray-600">{order.customer_phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <p className="text-gray-600">{order.customer_email}</p>
            </div>
            {order.notes && (
              <div className="mt-2 p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-500">Notes:</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
