import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Package, Bell, Loader2, Clock, Truck, Home as HomeIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PaymentConfirmed() {
  const [user, setUser] = useState(null);
  const [notified, setNotified] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [paymentConfirmedByAdmin, setPaymentConfirmedByAdmin] = useState(false);
  const queryClient = useQueryClient();
  const notifyCalledRef = useRef(false);
  const navigate = useNavigate();

  // Read order info from URL params OR sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  let orderId = urlParams.get('orderId');
  let orderNumber = urlParams.get('orderNumber');
  let amountRaw = urlParams.get('amount');

  // Always fall back to sessionStorage (Paystack strips URL params on redirect)
  const stored = (() => {
    try { return JSON.parse(sessionStorage.getItem('fmm_pending_order') || '{}'); } catch { return {}; }
  })();

  if (!orderId) orderId = stored.orderId || null;
  if (!orderNumber) orderNumber = stored.orderNumber || null;
  if (!amountRaw && stored.amount) amountRaw = String(stored.amount);

  const amount = amountRaw ? parseFloat(amountRaw) : 0;

  // Auth
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) {
        base44.auth.me().then(setUser);
      } else {
        base44.auth.redirectToLogin(window.location.href);
      }
    });
  }, []);

  // Fetch order from DB (retry until found)
  const { data: orderData } = useQuery({
  queryKey: ['order', orderId],
  queryFn: async () => {
    const orders = await base44.entities.Order.list('-created_date', 200);
    return orders.find(o => o.id === orderId) || null;
  },
  enabled: !!orderId && !!user,
  retry: 10,
  retryDelay: 1000,
  refetchInterval: (query) => (!query.state.data ? 1500 : 5000),
  });

  // Listen for admin payment confirmation in real-time
  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.id === orderId && event.data?.status === 'confirmed') {
        setPaymentConfirmedByAdmin(true);
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });
    return unsubscribe;
  }, [orderId]);

  // Wait for both user AND orderData before firing notifications
  useEffect(() => {
    const autoNotify = async () => {
      if (!user || !orderId || notifyCalledRef.current) return;
      // Wait until orderData is loaded (retry loop handles this)
      if (!orderData) return;
      notifyCalledRef.current = true;
      setIsNotifying(true);

      const totalDisplay = amount > 0 ? amount.toFixed(2) : (orderData.total_amount?.toFixed(2) || '0.00');
      const custName = stored.customerName || orderData.customer_name || user.full_name || 'Customer';
      const custPhone = stored.customerPhone || orderData.customer_phone || '';
      const address = stored.deliveryAddress || orderData.delivery_address || '';
      const city = stored.city || orderData.city || '';
      const itemsList = (orderData.items || []).map(i => `${i.product_name} x${i.quantity}`).join(', ');

      try {
        // 1. Update order status to confirmed — use existing tracking_updates from the loaded order
        await base44.entities.Order.update(orderId, {
          status: 'confirmed',
          tracking_updates: [
            ...(orderData.tracking_updates || []),
            {
              status: 'Payment Confirmed',
              message: 'Payment completed via Paystack. Order is being processed.',
              timestamp: new Date().toISOString()
            }
          ]
        });

        // 2. Customer notification
        await base44.entities.Notification.create({
          user_email: user.email,
          title: '🛍️ Order Placed & Payment Received!',
          message: `Your order #${orderNumber} has been placed. Payment confirmed and your order is being processed. Total: ₵${totalDisplay}.`,
          type: 'order_placed',
          order_id: orderId,
          order_number: orderNumber,
          is_read: false
        });

        // 3. Admin notification
        await base44.entities.Notification.create({
          user_email: 'fmmclassico@gmail.com',
          title: `🆕 New Order – ${custName} | ₵${totalDisplay}`,
          message: `Order #${orderNumber} placed by ${custName} (${user.email}). Phone: ${custPhone}. Address: ${address}, ${city}. Items: ${itemsList || 'See order details'}`,
          type: 'order_placed',
          order_id: orderId,
          order_number: orderNumber,
          is_read: false
        });

        // 4. Invalidate caches — match the exact query keys used in Orders & Notifications pages
        queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });
        queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });

        // 5. Send emails (non-blocking)
        base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `🛍️ Order Confirmed – FMM CLASSICO #${orderNumber}`,
          body: `Hi ${custName},\n\nThank you! Your order #${orderNumber} has been placed. Payment confirmed and your order is being processed.\n\nOrder Total: ₵${totalDisplay}\nDelivery Address: ${address}, ${city}\n\nYou can track your order in the app.\n\nThank you for shopping with us!\n📞 FMM CLASSICO: 0509896035\n📧 fmmclassico@gmail.com`
        }).catch(() => {});

        base44.integrations.Core.SendEmail({
          to: 'fmmclassico@gmail.com',
          subject: `🆕 NEW ORDER – ${custName} | ₵${totalDisplay}`,
          body: `New order received!\n\n📦 Order: #${orderNumber}\n👤 Customer: ${custName}\n📧 Email: ${user.email}\n📞 Phone: ${custPhone}\n💰 Total: ₵${totalDisplay}\n📍 Address: ${address}, ${city}\n\nItems: ${itemsList || 'See order details'}\n\nPlease verify payment and confirm the order in the Admin panel.`
        }).catch(() => {});

        // 6. Clear cart (non-blocking — in case Checkout didn't fully clear it)
        base44.entities.CartItem.filter({ user_email: user.email })
          .then(cartItems => Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id).catch(() => {}))))
          .catch(() => {});

        setTimeout(() => sessionStorage.removeItem('fmm_pending_order'), 5000);
        toast.success("Order placed! Payment confirmed.");
      } catch (e) {
        console.error('Notify error:', e);
        // Reset so it can retry on next render if orderData becomes available
        notifyCalledRef.current = false;
      }

      setIsNotifying(false);
      setNotified(true);
    };

    if (user && orderData) autoNotify();
  }, [user, orderData]); // Wait for BOTH user and orderData to be available



  const trackingSteps = [
    { label: 'Order Placed', icon: Package, done: true },
    { label: 'Payment Verified', icon: CheckCircle2, done: paymentConfirmedByAdmin || ['confirmed','processing','shipped','in_transit','delivered'].includes(orderData?.status) },
    { label: 'Processing', icon: Clock, done: ['processing','shipped','in_transit','delivered'].includes(orderData?.status) },
    { label: 'Shipped', icon: Truck, done: ['shipped','in_transit','delivered'].includes(orderData?.status) },
    { label: 'Delivered', icon: HomeIcon, done: orderData?.status === 'delivered' },
  ];

  if (!user || !orderId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-700" />
        <p className="text-gray-500 mt-3">Loading your order...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8 max-w-lg"
      >
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-3">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Payment Submitted!</h1>
        </div>

        {/* Notifying status */}
        {isNotifying ? (
          <Card className="p-5 bg-red-50 border-red-200 text-center mb-4">
            <Loader2 className="h-7 w-7 animate-spin text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-800">Processing your order...</p>
          </Card>
        ) : (
          <Card className="p-5 bg-blue-50 border-blue-200 text-center mb-4">
            <Bell className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-700">
              {paymentConfirmedByAdmin
                ? '🎉 Payment verified! Your order is being prepared.'
                : 'Payment confirmed. Your order is being processed and will be verified shortly.'}
            </p>
          </Card>
        )}

        {/* Admin confirmed banner */}
        {paymentConfirmedByAdmin && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-5 bg-green-50 border-green-300 text-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-green-900 mb-1">🎉 Order Confirmed!</h2>
              <p className="text-sm text-green-700">Your payment has been verified and your order is being prepared!</p>
            </Card>
          </motion.div>
        )}

        {/* Order Tracking Steps */}
        <Card className="p-5 mb-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Order Progress</h3>
          <div className="space-y-0">
            {trackingSteps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === trackingSteps.filter(s => s.done).length - 1 + (isNotifying ? 0 : 0);
              const isLast = i === trackingSteps.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      step.done
                        ? 'bg-green-500 border-green-500'
                        : i === trackingSteps.filter(s => s.done).length
                          ? 'bg-orange-100 border-orange-400 animate-pulse'
                          : 'bg-white border-gray-200'
                    }`}>
                      <Icon className={`h-4 w-4 ${step.done ? 'text-white' : i === trackingSteps.filter(s => s.done).length ? 'text-orange-500' : 'text-gray-300'}`} />
                    </div>
                    {!isLast && <div className={`w-0.5 h-6 my-1 ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />}
                  </div>
                  <div className="flex-1 pb-2 pt-1">
                    <p className={`text-sm font-semibold ${step.done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</p>
                    {i === 0 && <p className="text-xs text-gray-400">Payment received from Paystack</p>}
                    {i === 1 && step.done && <p className="text-xs text-green-600">Verified by FMM CLASSICO</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2 mt-4">
          {orderId && (
            <Link to={createPageUrl(`OrderTracking?id=${orderId}`)} className="block">
              <Button className="w-full gap-2 bg-red-700 hover:bg-red-800">
                <Package className="h-4 w-4" />
                Track My Order
              </Button>
            </Link>
          )}
          <Link to={createPageUrl('Orders')} className="block">
            <Button variant="outline" className="w-full gap-2">
              <Package className="h-4 w-4" />
              View All My Orders
            </Button>
          </Link>
          <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full gap-2 text-green-700 border-green-300 hover:bg-green-50">
              <Bell className="h-4 w-4" />
              Contact Support on WhatsApp
            </Button>
          </a>
          <Link to={createPageUrl('Home')} className="block">
            <Button variant="ghost" className="w-full">Return to Home</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}