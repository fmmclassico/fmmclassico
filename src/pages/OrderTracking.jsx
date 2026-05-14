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
  ChevronLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  Home,
  Phone,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const statusSteps = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered'];

export default function OrderTracking() {
  const [user, setUser] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      } else {
        base44.auth.redirectToLogin(window.location.href);
      }
    };
    getUser();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user?.email }),
    enabled: !!user?.email
  });

  const order = orders.find(o => o.id === orderId);
  const currentStatusIndex = order ? statusOrder.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="p-6">
          <Skeleton className="h-6 w-full mb-4" />
          <div className="flex justify-between">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Order not found</h2>
        <Link to={createPageUrl('Orders')}>
          <Button>View All Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Link to={createPageUrl('Orders')} className="inline-flex items-center text-gray-600 hover:text-orange-600 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Order #{order.order_number}</h1>
          <p className="text-gray-500">Placed on {format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}</p>
        </div>
        {isCancelled ? (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1 text-lg px-4 py-2">
            <XCircle className="h-4 w-4" /> Cancelled
          </Badge>
        ) : (
          <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-2">
            {statusSteps.find(s => s.key === order.status)?.label || order.status}
          </Badge>
        )}
      </div>

      {/* ── Visual Progress Tracker ── */}
      {!isCancelled && (
        <Card className="p-6 mb-6 shadow-md overflow-x-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Order Progress</h2>
          <div className="flex items-start min-w-max gap-0">
            {statusSteps.map((step, i) => {
              const isDone = currentStatusIndex >= i;
              const isActive = currentStatusIndex === i;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center w-20">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone
                        ? 'bg-green-500 border-green-500'
                        : isActive
                          ? 'bg-orange-100 border-orange-500 animate-pulse'
                          : 'bg-white border-gray-200'
                    }`}>
                      <Icon className={`h-5 w-5 ${isDone ? 'text-white' : isActive ? 'text-orange-500' : 'text-gray-300'}`} />
                    </div>
                    <p className={`text-[10px] font-semibold text-center mt-1.5 leading-tight w-16 ${isDone ? 'text-green-700' : isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`h-1 w-8 rounded flex-shrink-0 mb-5 ${isDone && currentStatusIndex > i ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Tracking History — 5-step timeline ── */}
      <Card className="p-6 mb-6 shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-5">Tracking History</h2>
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
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        step.done ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'bg-white border-gray-200'
                      }`}>
                        <Icon className={`h-4 w-4 ${step.done ? 'text-white' : 'text-gray-300'}`} />
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${step.done ? 'bg-[#1B3A6B]' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="flex-1 pb-5">
                      <p className={`font-bold text-sm ${step.done ? 'text-[#1B3A6B]' : 'text-gray-400'}`}>{step.label}</p>
                      <p className={`text-xs mt-0.5 ${step.done ? 'text-gray-600' : 'text-gray-400'}`}>{step.desc}</p>
                      {step.done && step.time && (
                        <p className="text-[11px] text-gray-400 mt-1">{step.time}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Items */}
        <Card className="p-6 shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={item.product_image || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=100'}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 line-clamp-1">{item.product_name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  <p className="font-semibold text-orange-600">₵{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-orange-600">₵{order.total_amount?.toFixed(2)}</span>
          </div>
        </Card>

        {/* Delivery Info */}
        <Card className="p-6 shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Delivery Information</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">{order.customer_name}</p>
                <p className="text-sm text-gray-600">{order.delivery_address}</p>
                <p className="text-sm text-gray-600">{order.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <p className="text-gray-600">{order.customer_phone}</p>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <p className="text-gray-600">{order.customer_email}</p>
            </div>
            {order.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Notes:</p>
                <p className="text-gray-600">{order.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}