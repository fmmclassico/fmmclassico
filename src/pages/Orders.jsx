import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  XCircle,
  CreditCard,
  Trash2,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PAYSTACK_LINK = "https://paystack.shop/pay/1miimvhai8";

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2, label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', icon: Package, label: 'Processing' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Shipped' },
  in_transit: { color: 'bg-cyan-100 text-cyan-800', icon: MapPin, label: 'In Transit' },
  delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
};

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      } else {
        base44.auth.redirectToLogin(createPageUrl('Orders'));
      }
    };
    getUser();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
    enabled: !!user?.email,
    refetchInterval: 20000,
    select: (data) => data.filter(o => o.customer_email === user?.email),
  });

  const claimPaymentMutation = useMutation({
    mutationFn: async (order) => {
      const newTracking = [
        ...(order.tracking_updates || []),
        {
          status: 'Payment Claimed',
          message: 'Customer confirmed payment – awaiting FMM CLASSICO verification',
          timestamp: new Date().toISOString()
        }
      ];
      await base44.entities.Order.update(order.id, { tracking_updates: newTracking });
      await base44.entities.Notification.create({
           user_email: order.customer_email,
           title: '⏳ Payment Being Verified',
           message: `We received your payment claim for order #${order.order_number}. We'll confirm within 2–5 minutes.`,
           type: 'payment_pending',
           order_id: order.id,
           order_number: order.order_number,
           is_read: false
         });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment claim sent! We\'ll verify and confirm shortly.');
    }
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      await Promise.all(orderIds.map(id => base44.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
      toast.success('Orders deleted successfully');
    }
  });

  const handleToggleSelect = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)? This cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
          <Package className="h-8 w-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">No orders yet</h3>
        <p className="text-gray-500 mb-4">Start shopping to see your orders here</p>
        <Link to={createPageUrl('Shop')}>
          <Button className="bg-orange-600 hover:bg-orange-700">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-full">
            <Package className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{selectedOrders.length} selected</span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Selection Controls */}
      {orders.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={selectedOrders.length === orders.length && orders.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />
          <label className="text-sm font-medium text-gray-600 cursor-pointer">
            Select All ({selectedOrders.length}/{orders.length})
          </label>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ))
        ) : (
          orders.map((order) => {
            const StatusIcon = statusConfig[order.status]?.icon || Package;
            const isSelected = selectedOrders.includes(order.id);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(order.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      {/* Header row: number+badge on left, amount+date on right */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3 className="font-bold text-base text-gray-800 truncate">{order.order_number}</h3>
                          <Badge className={`text-xs flex-shrink-0 ${statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-orange-600">₵{order.total_amount?.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-3 space-y-1">
                        {order.items?.map((item, idx) => (
                          <p key={idx} className="text-xs text-gray-600 break-words">
                            • {item.product_name} ×{item.quantity} – ₵{(item.price * item.quantity).toFixed(2)}
                          </p>
                        ))}
                      </div>

                      {/* Delivery Info */}
                      <div className="mb-3 text-xs space-y-1">
                        <p className="text-gray-500">📍 <span className="font-medium text-gray-800 break-words">{order.delivery_address}, {order.city}</span></p>
                        {order.estimated_delivery && (
                          <p className="text-gray-500">🗓 Est. delivery: <span className="font-medium text-gray-800">{format(new Date(order.estimated_delivery), 'MMM d, yyyy')}</span></p>
                        )}
                      </div>

                      {/* Tracking Timeline */}
                      {order.tracking_updates && order.tracking_updates.length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tracking History</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {[...order.tracking_updates].reverse().map((update, idx) => {
                              const isGreen = ['confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'Payment Confirmed'].some(s => update.status?.toLowerCase().includes(s.toLowerCase())) || ['confirmed', 'processing', 'shipped', 'in_transit', 'delivered'].includes(update.status?.toLowerCase());
                              return (
                                <div key={idx} className="flex items-start gap-2">
                                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${isGreen ? 'bg-green-500' : 'bg-orange-400'}`} />
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-xs font-semibold ${isGreen ? 'text-green-700' : 'text-orange-700'}`}>{update.status}</span>
                                    <span className="text-xs text-gray-500 ml-1 break-words">– {update.message}</span>
                                    <p className="text-[10px] text-gray-400">{format(new Date(update.timestamp), 'MMM d, HH:mm')}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Link to={createPageUrl(`OrderTracking?id=${order.id}`)}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <ChevronRight className="h-4 w-4" />
                            Track Order
                          </Button>
                        </Link>

                        {order.status === 'pending' && !order.tracking_updates?.some(t => t.status === 'Payment Claimed') && (
                          <Button 
                            size="sm" 
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => claimPaymentMutation.mutate(order)}
                            disabled={claimPaymentMutation.isPending}
                          >
                            <CreditCard className="h-4 w-4" />
                            {claimPaymentMutation.isPending ? 'Sending...' : 'Payment Completed'}
                          </Button>
                        )}

                        {order.status === 'pending' && order.tracking_updates?.some(t => t.status === 'Payment Claimed') && (
                          <Button variant="outline" size="sm" disabled className="gap-1 text-orange-600">
                            <Clock className="h-4 w-4" />
                            Awaiting Verification
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}