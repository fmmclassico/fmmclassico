import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  XCircle,
  FileText,
  CreditCard,
  Trash2,
  Send
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
  const [selectedOrders, setSelectedOrders] = useState([]);
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
    enabled: isAdmin,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  // New payment alerts = pending orders where customer clicked "Payment Completed"
  const paymentAlerts = orders.filter(o => 
    o.status === 'pending' && 
    o.tracking_updates?.some(t => t.status === 'Payment Claimed')
  );

  const [adminMessages, setAdminMessages] = useState({});

  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ order, message }) => {
      await Promise.all([
        base44.entities.Notification.create({
          user_email: order.customer_email,
          title: '💬 Message from FMM CLASSICO',
          message: message,
          type: 'general',
          order_id: order.id,
          order_number: order.order_number,
          is_read: false
        }),
        base44.integrations.Core.SendEmail({
          to: order.customer_email,
          from_name: 'FMM CLASSICO',
          subject: `Message about your order #${order.order_number}`,
          body: `Hi ${order.customer_name},\n\n${message}\n\nFor help: 0509896035\n\nFMM CLASSICO Team`
        })
      ]);
    },
    onSuccess: (_, variables) => {
      setAdminMessages(prev => ({ ...prev, [variables.order.id]: '' }));
      toast.success('Message sent to customer!');
    }
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
      
      const cityLower = (order.city || '').toLowerCase();
      let deliveryDays = '3–7 business days';
      if (cityLower.includes('umat') || cityLower.includes('tarkwa')) {
        deliveryDays = '1–2 days (same or next day for UMAT Campus)';
      } else if (cityLower.includes('ashongman') || cityLower.includes('accra') || cityLower.includes('tema') || cityLower.includes('madina') || cityLower.includes('adenta') || cityLower.includes('spintex') || cityLower.includes('east legon') || cityLower.includes('osu') || cityLower.includes('lapaz') || cityLower.includes('kasoa') || cityLower.includes('dome') || cityLower.includes('dansoman') || cityLower.includes('labone') || cityLower.includes('cantonments') || cityLower.includes('teshie') || cityLower.includes('nungua')) {
        deliveryDays = '1–3 days';
      } else if (cityLower.includes('kumasi') || cityLower.includes('takoradi')) {
        deliveryDays = '2–4 days';
      }

      await Promise.all([
        base44.entities.Order.update(order.id, {
          status: 'confirmed',
          tracking_updates: newTrackingUpdates
        }),
        base44.entities.Notification.create({
          user_email: order.customer_email,
          title: '✅ Payment Confirmed – Order Processing!',
          message: `🎉 Payment confirmed for order #${order.order_number}! Total: ₵${order.total_amount?.toFixed(2)}. Your order is now being prepared. Estimated delivery: ${deliveryDays}. We'll notify you when it ships! For help: 0509896035`,
          type: 'payment_confirmed',
          order_id: order.id,
          order_number: order.order_number,
          is_read: false
        })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Payment confirmed!');
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

      // Notification messages per status
      const notifMap = {
        processing: { title: '📦 Order Being Prepared', msg: `Your order #${order.order_number} is being prepared for dispatch.`, type: 'order_processing' },
        shipped: { title: '🚚 Order Shipped!', msg: `Your order #${order.order_number} has been shipped and is on its way to you!`, type: 'order_shipped' },
        in_transit: { title: '🛵 Out for Delivery!', msg: `Your order #${order.order_number} is out for delivery. Expect it very soon!`, type: 'order_shipped' },
        delivered: { title: '🎉 Order Delivered!', msg: `Your order #${order.order_number} has been delivered. Enjoy your purchase! Thank you for shopping with FMM CLASSICO.`, type: 'order_delivered' },
        cancelled: { title: '❌ Order Cancelled', msg: `Your order #${order.order_number} has been cancelled. Contact us at 0509896035 for assistance.`, type: 'order_cancelled' },
      };
      const notif = notifMap[newStatus];
      if (notif) {
        await Promise.all([
          base44.entities.Notification.create({
            user_email: order.customer_email,
            title: notif.title,
            message: notif.msg,
            type: notif.type,
            order_id: order.id,
            order_number: order.order_number,
            is_read: false
          }),
          base44.integrations.Core.SendEmail({
            to: order.customer_email,
            from_name: 'FMM CLASSICO',
            subject: `${notif.title} – FMM CLASSICO Order #${order.order_number}`,
            body: `Hi ${order.customer_name},\n\n${notif.msg}\n\n📦 Order: #${order.order_number}\n💰 Total: ₵${order.total_amount?.toFixed(2)}\n📍 Delivery: ${order.delivery_address}, ${order.city}\n\nTrack your order on the FMM CLASSICO website.\n\nFor help: call/WhatsApp 0509896035\n\nFMM CLASSICO Team`
          })
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      toast.success('Order status updated! Customer notified.');
    }
  });

  const deleteOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      await Promise.all(orderIds.map(id => base44.entities.Order.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setSelectedOrders([]);
      toast.success('Orders deleted successfully');
    }
  });

  const handleToggleSelect = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = (orderList) => {
    const ids = orderList.map(o => o.id);
    const allSelected = ids.every(id => selectedOrders.includes(id));
    if (allSelected) {
      setSelectedOrders(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedOrders(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    if (confirm(`Delete ${selectedOrders.length} order(s)? This cannot be undone.`)) {
      deleteOrdersMutation.mutate(selectedOrders);
    }
  };

  if (!isAdmin && user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const otherOrders = orders.filter(o => o.status !== 'pending');

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin – Manage Orders</h1>
        {selectedOrders.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDeleteSelected}
            disabled={deleteOrdersMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Delete {selectedOrders.length} Selected
          </Button>
        )}
      </div>

      {/* 🔔 Payment Alert Banner */}
      {paymentAlerts.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-xl flex items-start gap-3 animate-pulse">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-bold text-red-700 text-base">Payment Alert! {paymentAlerts.length} customer{paymentAlerts.length > 1 ? 's' : ''} clicked "Payment Completed"</p>
            <p className="text-sm text-red-600 mt-1">Please check Paystack and confirm below. Customer names: <strong>{paymentAlerts.map(o => o.customer_name).join(', ')}</strong></p>
          </div>
        </div>
      )}

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
            {pendingOrders.length > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <input type="checkbox"
                  checked={pendingOrders.every(o => selectedOrders.includes(o.id))}
                  onChange={() => handleSelectAll(pendingOrders)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-gray-500">Select all pending</span>
              </div>
            )}
            {pendingOrders.map((order) => (
              <Card key={order.id} className="p-4 shadow-md border-l-4 border-yellow-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleToggleSelect(order.id)}
                      className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    />
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
                    <Link to={createPageUrl(`AdminInvoice?orderId=${order.id}`)}>
                      <Button size="sm" variant="outline" className="w-full gap-1 border-orange-400 text-orange-600 hover:bg-orange-50">
                        <FileText className="h-4 w-4" />
                        Invoice
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Admin message box */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">💬 Send message to customer (e.g. partial payment, wrong amount):</p>
                  <div className="flex gap-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Your payment amount is incorrect. Please pay ₵X to complete your order..."
                      className="text-xs flex-1 resize-none"
                      value={adminMessages[order.id] || ''}
                      onChange={(e) => setAdminMessages(prev => ({ ...prev, [order.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 self-end"
                      disabled={!adminMessages[order.id]?.trim() || sendAdminMessageMutation.isPending}
                      onClick={() => sendAdminMessageMutation.mutate({ order, message: adminMessages[order.id] })}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* spacer - items moved below */}
                <div className="hidden">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">All Orders ({otherOrders.length})</h2>
          {otherOrders.length > 0 && (
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={otherOrders.length > 0 && otherOrders.every(o => selectedOrders.includes(o.id))}
                onChange={() => handleSelectAll(otherOrders)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-gray-500">Select all</span>
            </div>
          )}
        </div>
        
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
                    <div className="flex items-start gap-3 flex-1">
                      <input type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleToggleSelect(order.id)}
                        className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                      />
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
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Link to={createPageUrl(`AdminInvoice?orderId=${order.id}`)}>
                        <Button size="sm" variant="outline" className="gap-1 border-orange-400 text-orange-600 hover:bg-orange-50">
                          <FileText className="h-4 w-4" />
                          Invoice
                        </Button>
                      </Link>
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