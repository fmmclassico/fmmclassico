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
  { key: 'pending', label: 'Order Placed', icon: Clock },
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

      {/* Tracking Progress — removed, only tracking history shown */}

      {/* Tracking History */}
      {order.tracking_updates?.length > 0 && (
        <Card className="p-6 mb-6 shadow-md">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tracking History</h2>
          <div className="space-y-0">
            {[...order.tracking_updates].reverse().map((update, index, arr) => {
              const isGreen = ['confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'payment confirmed'].some(s =>
                update.status?.toLowerCase().includes(s)
              );
              const isLast = index === arr.length - 1;
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 ${isGreen ? 'bg-green-500' : 'bg-orange-400'}`} />
                    {!isLast && <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[20px]" />}
                  </div>
                  <div className={`flex-1 pb-4 ${!isLast ? '' : ''}`}>
                    <p className={`font-semibold text-sm ${isGreen ? 'text-green-700' : 'text-orange-600'}`}>{update.status}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{update.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(update.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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