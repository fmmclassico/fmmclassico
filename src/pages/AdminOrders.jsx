import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  XCircle,
  Eye,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusConfig = {
  pending: { label: 'Awaiting Payment', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Order Placed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function AdminOrders() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAdmin(userData.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
    enabled: isAdmin
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (order) => {
      const newTrackingUpdates = [
        ...(order.tracking_updates || []),
        {
          status: 'Order Placed',
          message: 'Payment confirmed - Order is now placed',
          timestamp: new Date().toISOString()
        }
      ];
      
      await base44.entities.Order.update(order.id, {
        status: 'confirmed',
        tracking_updates: newTrackingUpdates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Payment confirmed! Customer can now see "Order Placed"');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, newStatus, message }) => {
      const newTrackingUpdates = [
        ...(order.tracking_updates || []),
        {
          status: statusConfig[newStatus]?.label || newStatus,
          message: message,
          timestamp: new Date().toISOString()
        }
      ];
      
      await base44.entities.Order.update(order.id, {
        status: newStatus,
        tracking_updates: newTrackingUpdates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Order status updated!');
    }
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const otherOrders = orders.filter(o => o.status !== 'pending');

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Admin - Manage Orders</h1>

      {/* Pending Payment Orders */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Awaiting Payment Confirmation ({pendingOrders.length})
        </h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : pendingOrders.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No orders awaiting payment confirmation
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="p-4 shadow-md border-l-4 border-yellow-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-800">{order.order_number}</span>
                      <Badge className={statusConfig[order.status]?.color}>
                        {statusConfig[order.status]?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Customer:</strong> {order.customer_name} ({order.customer_email})
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Phone:</strong> {order.customer_phone}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Total:</strong> ₵{order.total_amount?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {order.created_date && format(new Date(order.created_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => confirmPaymentMutation.mutate(order)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={confirmPaymentMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm Payment
                    </Button>
                  </div>
                </div>
                
                {/* Order Items Preview */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Items:</p>
                  <div className="flex flex-wrap gap-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                        <img src={item.product_image} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="text-xs">{item.product_name} x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Other Orders */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">All Orders ({otherOrders.length})</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : otherOrders.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No confirmed orders yet
          </Card>
        ) : (
          <div className="space-y-3">
            {otherOrders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Package;
              return (
                <Card key={order.id} className="p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800">{order.order_number}</span>
                        <Badge className={statusConfig[order.status]?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[order.status]?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.customer_name} • ₵{order.total_amount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">
                        {order.created_date && format(new Date(order.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {order.status === 'confirmed' && (
                        <Button 
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ 
                            order, 
                            newStatus: 'processing', 
                            message: 'Order is being processed' 
                          })}
                        >
                          Mark Processing
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button 
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ 
                            order, 
                            newStatus: 'shipped', 
                            message: 'Order has been shipped' 
                          })}
                        >
                          Mark Shipped
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <Button 
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ 
                            order, 
                            newStatus: 'delivered', 
                            message: 'Order delivered successfully' 
                          })}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}