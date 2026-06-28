import { useAuth } from "@/lib/AuthContext";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { supabaseNotifications } from '@/lib/supabaseNotifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Bell, Package, CheckCircle2, Clock, Truck, ChevronRight, Check, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const typeConfig = {
  order_placed: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Order Placed' },
  payment_confirmed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Payment Confirmed' },
  payment_pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Awaiting Verification' },
  order_processing: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Processing' },
  order_shipped: { icon: Truck, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Shipped' },
  order_delivered: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Delivered' },
  order_cancelled: { icon: Clock, color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' },
  delivery_update: { icon: Truck, color: 'text-blue-700', bg: 'bg-blue-50', label: 'Delivery Update' },
  general: { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Notice' },
};

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const [selectedNotifs, setSelectedNotifs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated && !user) {
      base44.auth.redirectToLogin(createPageUrl('Home'));
    }
  }, [isAuthenticated, user]);

  // Fetch notifications from SUPABASE
  const { data: notifications = [], is= useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => supabaseNotifications.filter(user.email, 50),
    enabled: !!user?.email,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = supabaseNotifications.subscribe(user.email, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });
    });
    return unsubscribe;
  }, [user?.email, queryClient]);

  const refreshNotifs = () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });

  const handleMarkOneRead = async (notif) => {
    if (notif.is_read) return;
    await supabaseNotifications.update(notif.id, { is_read: true });
    refreshNotifs();
  };

  const handleMarkAllRead = async () => {
    if (!user?.email) return;
    setIsProcessing(true);
    await supabaseNotifications.markAllRead(user.email);
    setIsProcessing(false);
    refreshNotifs();
  };

  const handleMarkSelectedRead = async () => {
    if (selectedNotifs.length === 0) return;
    setIsProcessing(true);
    for (const id of selectedNotifs) {
      const notif = notifications.find(n => n.id === id);
      if (notif && !notif.is_read) {
        await supabaseNotifications.update(id, { is_read: true });
      }
    }
    setSelectedNotifs([]);
    setIsProcessing(false);
    refreshNotifs();
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifs.length === 0) return;
    setIsProcessing(true);
    const success = await supabaseNotifications.deleteMany(selectedNotifs);
    if (success) {
      toast.success('Notifications deleted');
    } else {
      toast.error('Failed to delete some notifications');
    }
    setSelectedNotifs([]);
    setIsProcessing(false);
    refreshNotifs();
  };

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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return <div className="p-6 text-center text-gray-500"></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-6 w-6 text-gray-800" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-500">
              {selectedNotifs.length > 0
                ? `${selectedNotifs.length} selected`
                : unreadCount > 0
                ? `${unreadCount} unread`
                : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {selectedNotifs.length > 0 && (
          <>
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={isProcessing}>
              <Trash2 className="h-3 w-3 mr-1" />
              {isProcessing ? 'Deleting...' : `Delete (${selectedNotifs.length})`}
            </Button>
            <Button size="sm" variant="outline" onClick={handleMarkSelectedRead} disabled={isProcessing}>
              {isProcessing ? 'Updating...' : 'Mark Read'}
            </Button>
          </>
        )}
        {unreadCount > 0 && selectedNotifs.length === 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={isProcessing}>
            <Check className="h-3 w-3 mr-1" />
            {isProcessing ? 'Updating...' : 'Mark all read'}
          </Button>
        )}
      </div>

      {/* Select All */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <input
            type="checkbox"
            checked={selectedNotifs.length > 0 && selectedNotifs.length === notifications.length}
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-xs text-gray-600">
            Select All ({selectedNotifs.length}/{notifications.length})
          </span>
        </div>
      )}

      {/* Notifications List */}
      {is(
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No notifications yet</p>
          <p className="text-gray-400 text-sm">Order updates will appear here</p>
          <Link to={createPageUrl('Shop')} className="text-blue-600 text-sm font-medium mt-3 inline-block">
            Start Shopping →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
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
                <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  !notif.is_read ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100'
                } ${isSelected ? 'ring-2 ring-blue-300' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(notif.id)}
                    className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => handleMarkOneRead(notif)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${config.bg}`}>
                        <Icon className={`h-3 w-3 ${config.color}`} />
                      </div>
                      <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                      {!notif.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_date).toLocaleString()}</p>
                  </div>
                  {notif.order_number && (
                    <Link
                      to={createPageUrl(`Orders?order=${notif.order_number}`)}
                      className="text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronRight className="h-4 w-4" />
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
