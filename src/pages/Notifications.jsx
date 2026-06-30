import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Package, CheckCircle2, Clock, Truck, ChevronRight, Check, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

var typeConfig = {
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
  var [user, setUser] = useState(null);
  var [selectedNotifs, setSelectedNotifs] = useState([]);
  var [isProcessing, setIsProcessing] = useState(false);
  var queryClient = useQueryClient();

  useEffect(function() {
    supabase.auth.getUser().then(function(result) {
      if (result.data && result.data.user) { setUser(result.data.user); }
      else { window.location.href = '/'; }
    });
  }, []);

  useEffect(function() {
    var channel = supabase.channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, function() {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }).subscribe();
    return function() { supabase.removeChannel(channel); };
  }, [queryClient]);

  var notificationsQuery = useQuery({
    queryKey: ['notifications', user ? user.email : null],
    queryFn: function() { return supabase.from('notifications').select('*').eq('user_email', user.email).order('created_date', { ascending: false }).limit(50).then(function(r) { return r.data || []; }); },
    enabled: !!(user && user.email),
    staleTime: 5000,
    refetchInterval: 10000,
  });
  var notifications = notificationsQuery.data || [];
  var isLoading = notificationsQuery.isLoading;
  var refreshNotifs = function() { queryClient.invalidateQueries({ queryKey: ['notifications'] }); };
  var handleMarkOneRead = function(notif) { if (notif.is_read) return; supabase.from('notifications').update({ is_read: true }).eq('id', notif.id).then(refreshNotifs); };
  var handleMarkAllRead = function() { var unread = notifications.filter(function(n) { return !n.is_read; }); if (unread.length === 0) return; setIsProcessing(true); var ids = unread.map(function(n) { return n.id; }); supabase.from('notifications').update({ is_read: true }).in('id', ids).then(function() { setIsProcessing(false); refreshNotifs(); }); };
  var handleMarkSelectedRead = function() { if (selectedNotifs.length === 0) return; setIsProcessing(true); supabase.from('notifications').update({ is_read: true }).in('id', selectedNotifs).then(function() { setSelectedNotifs([]); setIsProcessing(false); refreshNotifs(); }); };
  var handleDeleteSelected = function() { if (selectedNotifs.length === 0) return; setIsProcessing(true); supabase.from('notifications').delete().in('id', selectedNotifs).then(function() { setSelectedNotifs([]); setIsProcessing(false); refreshNotifs(); }); };
  var handleToggleSelect = function(notifId) { setSelectedNotifs(function(prev) { return prev.includes(notifId) ? prev.filter(function(id) { return id !== notifId; }) : prev.concat([notifId]); }); };
  var handleSelectAll = function() { if (selectedNotifs.length === notifications.length) { setSelectedNotifs([]); } else { setSelectedNotifs(notifications.map(function(n) { return n.id; })); } };
  var unreadCount = notifications.filter(function(n) { return !n.is_read; }).length;

  if (!user) { return <div className="p-4"><p className="text-center text-gray-500">Loading...</p></div>; }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative"><Bell className="h-6 w-6 text-blue-800" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}</div>
            <div><h1 className="text-2xl font-bold text-gray-900">Notifications</h1><p className="text-xs text-gray-500">{selectedNotifs.length > 0 ? selectedNotifs.length + ' selected' : unreadCount > 0 ? unreadCount + ' unread' : notifications.length + ' notification' + (notifications.length !== 1 ? 's' : '')}</p></div>
          </div>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {selectedNotifs.length > 0 && <><Button size="sm" variant="destructive" onClick={handleDeleteSelected} className="rounded-lg text-xs" disabled={isProcessing}><Trash2 className="h-3 w-3 mr-1" />{isProcessing ? 'Deleting...' : 'Delete (' + selectedNotifs.length + ')'}</Button><Button size="sm" variant="outline" onClick={handleMarkSelectedRead} className="rounded-lg text-xs" disabled={isProcessing}><Check className="h-3 w-3 mr-1" />{isProcessing ? 'Updating...' : 'Mark Read'}</Button></>}
          {unreadCount > 0 && selectedNotifs.length === 0 && <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="rounded-lg text-xs" disabled={isProcessing}><Check className="h-3 w-3 mr-1" />{isProcessing ? 'Updating...' : 'Mark all read'}</Button>}
        </div>
        {notifications.length > 0 && <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={selectedNotifs.length > 0} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer" /><span className="text-xs text-gray-500">Select All ({selectedNotifs.length}/{notifications.length})</span></div>}
        {isLoading ? <div className="space-y-3">{Array(4).fill(0).map(function(_, i) { return <Skeleton key={i} className="h-20 w-full rounded-xl" />; })}</div> : notifications.length === 0 ? <div className="text-center py-12"><Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-semibold text-gray-600">No notifications yet</h3><p className="text-sm text-gray-400 mt-1">Order updates will appear here</p><Link to={createPageUrl('Shop')}><Button className="mt-4 bg-blue-800 text-white rounded-xl text-sm">Start Shopping</Button></Link></div> : <div className="space-y-2">{notifications.map(function(notif) { var config = typeConfig[notif.type] || typeConfig.general; var Icon = config.icon; var isSelected = selectedNotifs.includes(notif.id); return <div key={notif.id} className={"flex items-start gap-3 p-3 rounded-xl border " + (!notif.is_read ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100') + (isSelected ? ' ring-2 ring-blue-300' : '')}><input type="checkbox" checked={isSelected} onChange={function() { handleToggleSelect(notif.id); }} className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0" /><div className="flex-1 cursor-pointer" onClick={function() { handleMarkOneRead(notif); }}><div className="flex items-center gap-2 mb-1"><div className={"w-7 h-7 rounded-full flex items-center justify-center " + config.bg}><Icon className={"h-4 w-4 " + config.color} /></div><Badge className={config.bg + " " + config.color + " text-[10px]"}>{config.label}</Badge>{!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}</div><p className="text-sm font-semibold text-gray-800">{notif.title}</p><p className="text-xs text-gray-600 mt-0.5">{notif.message}</p><p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_date).toLocaleString()}</p></div>{notif.order_number && <Link to={createPageUrl('Orders')} onClick={function(e) { e.stopPropagation(); }}><ChevronRight className="h-5 w-5 text-gray-400" /></Link>}</div>; })}</div>}
      </div>
    </div>
  );
}
