import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Package, CheckCircle2, Clock, Truck, ChevronRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Awaiting Payment' },
  confirmed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Payment Confirmed' },
  processing: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Processing' },
  shipped: { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Shipped' },
  in_transit: { icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50', label: 'On the Way' },
  delivered: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Delivered' },
  cancelled: { icon: Clock, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
};

const getStatusMessage = (status, orderNumber) => {
  switch (status) {
    case 'pending': return `Order ${orderNumber} is awaiting payment confirmation from FMM CLASSICO.`;
    case 'confirmed': return `✅ Payment confirmed for order ${orderNumber}! Your order is now placed.`;
    case 'processing': return `📦 Order ${orderNumber} is being prepared for dispatch.`;
    case 'shipped': return `🚚 Order ${orderNumber} has been shipped and is on its way!`;
    case 'in_transit': return `🛵 Order ${orderNumber} is out for delivery. Expect it soon!`;
    case 'delivered': return `🎉 Order ${orderNumber} has been delivered. Enjoy your purchase!`;
    case 'cancelled': return `Order ${orderNumber} has been cancelled.`;
    default: return `Order ${orderNumber} status updated.`;
  }
};

export default function Notifications() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      } else {
        base44.auth.redirectToLogin(createPageUrl('Notifications'));
      }
    };
    getUser();
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders-notifications', user?.email, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.Order.list('-updated_date', 50)
      : base44.entities.Order.filter({ customer_email: user.email }, '-updated_date', 20),
    enabled: !!user?.email,
    refetchInterval: 20000, // Auto-refresh every 20s
  });

  const notifications = orders.flatMap(order => {
    const events = [];
    // Latest status always shown
    events.push({
      id: order.id + '-status',
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      message: getStatusMessage(order.status, order.order_number),
      time: order.updated_date,
      isNew: order.status === 'confirmed' || order.status === 'in_transit' || order.status === 'delivered',
    });
    return events;
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-full">
          <Bell className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500">Order updates & payment confirmations</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium">No notifications yet</h3>
          <p className="text-sm text-gray-400 mt-1">Order updates will appear here</p>
          <Link to={createPageUrl('Shop')} className="inline-block mt-4">
            <button className="text-orange-600 font-medium text-sm">Start Shopping →</button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, i) => {
            const config = statusConfig[notif.status] || statusConfig.pending;
            const Icon = config.icon;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl(`OrderTracking?id=${notif.orderId}`)}>
                  <div className={`flex items-start gap-4 p-4 rounded-xl border ${notif.isNew ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'} hover:shadow-md transition-all`}>
                    <div className={`p-2 rounded-full ${config.bg} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${notif.isNew ? 'bg-orange-500' : 'bg-gray-400'}`}>
                          {config.label}
                        </Badge>
                        {notif.isNew && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                      </div>
                      <p className="text-sm text-gray-700">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.time).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>💡 Tip:</strong> When FMM CLASSICO confirms your payment, your order status will update here and you'll also receive an SMS on the phone number you used for checkout.
      </div>
    </div>
  );
}