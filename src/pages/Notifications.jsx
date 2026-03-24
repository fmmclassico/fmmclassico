import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Package, CheckCircle2, Clock, Truck, ChevronRight, Check, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';

const typeConfig = {
  order_placed: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Order Placed' },
  payment_confirmed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Payment Confirmed' },
  payment_pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Awaiting Verification' },
  order_processing: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Processing' },
  order_shipped: { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Shipped' },
  order_delivered: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Delivered' },
  order_cancelled: { icon: Clock, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
  delivery_update: { icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Delivery Update' },
  general: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Notice' },
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [selectedNotifs, setSelectedNotifs] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user?.email,
    staleTime: 5000,
    refetchInterval: 8000,
  });

  // Also fetch orders for admin payment alerts
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-admin-alerts', isAdmin],
    queryFn: () => base44.entities.Order.list('-updated_date', 50),
    enabled: !!isAdmin,
    staleTime: 60000,
  });

  const paymentAlerts = isAdmin
    ? orders.filter(o => o.status === 'pending' && o.tracking_updates?.some(t => t.status === 'Payment Claimed'))
    : [];

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const deleteNotificationsMutation = useMutation({
    mutationFn: async (notifIds) => {
      await Promise.all(notifIds.map(id => base44.entities.Notification.delete(id)));
    },
    onMutate: async (notifIds) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.email] });
      const previous = queryClient.getQueryData(['notifications', user?.email]);
      queryClient.setQueryData(['notifications', user?.email], (old = []) =>
        old.filter(n => !notifIds.includes(n.id))
      );
      setSelectedNotifs([]);
      return { previous };
    },
    onError: (_err, _ids, context) => {
      queryClient.setQueryData(['notifications', user?.email], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleToggleSelect = (notifId) => {
    setSelectedNotifs(prev => 
      prev.includes(notifId) 
        ? prev.filter(id => id !== notifId)
        : [...prev, notifId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifs.length === notifications.length) {
      setSelectedNotifs([]);
    } else {
      setSelectedNotifs(notifications.map(n => n.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNotifs.length === 0) return;
    deleteNotificationsMutation.mutate(selectedNotifs);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-full relative">
            <Bell className="h-6 w-6 text-orange-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
            <p className="text-sm text-gray-500">{selectedNotifs.length > 0 ? `${selectedNotifs.length} selected` : (unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedNotifs.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-1 flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedNotifs.length})
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="text-orange-600 border-orange-200 flex-1 sm:flex-none">
              <Check className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={selectedNotifs.length === notifications.length && notifications.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />
          <label className="text-sm font-medium text-gray-600 cursor-pointer">
            Select All ({selectedNotifs.length}/{notifications.length})
          </label>
        </div>
      )}

      {/* Admin Payment Alert Banner */}
      {isAdmin && paymentAlerts.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-xl flex items-start gap-3">
          <span className="text-2xl animate-bounce">🔔</span>
          <div>
            <p className="font-bold text-red-700">Payment Alert! {paymentAlerts.length} customer{paymentAlerts.length > 1 ? 's' : ''} clicked "Payment Completed"</p>
            <p className="text-sm text-red-600 mt-1">Check Paystack and confirm in <Link to={createPageUrl('AdminOrders')} className="underline font-bold">Admin Orders</Link>.</p>
            <div className="mt-2 space-y-1">
              {paymentAlerts.map(o => (
                <p key={o.id} className="text-sm text-red-700">• <strong>{o.customer_name}</strong> – ₵{o.total_amount?.toFixed(2)} – 📞 {o.customer_phone}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
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
            const config = typeConfig[notif.type] || typeConfig.general;
            const Icon = config.icon;
            const isSelected = selectedNotifs.includes(notif.id);
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                    isSelected ? 'bg-blue-50 border-blue-300' : (!notif.is_read ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white')
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(notif.id)}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { if (!notif.is_read && !isSelected) markReadMutation.mutate(notif.id); }}
                  >
                    <div className={`p-2 rounded-full ${config.bg} flex-shrink-0 w-fit mb-2`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-xs ${!notif.is_read ? 'bg-orange-500' : 'bg-gray-400'}`}>
                        {config.label}
                      </Badge>
                      {!notif.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_date).toLocaleString()}</p>
                  </div>
                  {notif.order_id && (
                    <Link
                      to={createPageUrl(isAdmin ? 'AdminOrders' : `OrderTracking?id=${notif.order_id}`)}
                      onClick={e => e.stopPropagation()}
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400 mt-1 hover:text-orange-500" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}