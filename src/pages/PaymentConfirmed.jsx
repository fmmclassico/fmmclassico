import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Package, Bell, Loader2, CheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PaymentConfirmed() {
  const [user, setUser] = useState(null);
  const [notified, setNotified] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [paymentConfirmedByAdmin, setPaymentConfirmedByAdmin] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  // Try URL params first; fall back to sessionStorage (used when Paystack redirects back)
  let orderId = urlParams.get('orderId');
  let orderNumber = urlParams.get('orderNumber');
  let amountRaw = urlParams.get('amount');

  if (!orderId) {
    try {
      const stored = JSON.parse(sessionStorage.getItem('fmm_pending_order') || '{}');
      orderId = stored.orderId || null;
      orderNumber = stored.orderNumber || null;
      amountRaw = stored.amount ? String(stored.amount) : null;
    } catch (e) {}
  }

  const amount = amountRaw ? parseFloat(amountRaw) : 0;

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

  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => base44.entities.Order.filter({ id: orderId }),
    enabled: !!orderId && !!user,
    select: (data) => data?.[0],
  });

  const { data: userNotifications = [] } = useQuery({
    queryKey: ['notifications', user?.email, notified],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 10),
    enabled: !!user?.email && notified,
    refetchInterval: 3000,
  });

  // Listen for admin payment confirmation in real-time
  useEffect(() => {
    if (!orderId || !notified) return;
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.id === orderId && event.data?.status === 'confirmed') {
        setPaymentConfirmedByAdmin(true);
      }
    });
    return unsubscribe;
  }, [orderId, notified]);

  // Auto-notify on page load (Paystack redirected here = payment done)
  useEffect(() => {
    const autoNotify = async () => {
      if (!user || !orderId || !orderData || notified || isNotifying) return;

      // Check if already claimed to avoid duplicate
      const alreadyClaimed = orderData.tracking_updates?.some(t => t.status === 'Payment Claimed');
      if (alreadyClaimed) {
        setNotified(true);
        return;
      }

      setIsNotifying(true);
      const existingTracking = orderData.tracking_updates || [];

      // Clear the user's cart now that payment was completed
      const cartItems = await base44.entities.CartItem.filter({ user_email: user.email }).catch(() => []);

      await Promise.all([
        base44.entities.Order.update(orderId, {
          tracking_updates: [
            ...existingTracking,
            {
              status: 'Payment Claimed',
              message: 'Customer completed payment via Paystack – awaiting FMM CLASSICO verification',
              timestamp: new Date().toISOString()
            }
          ]
        }),
        base44.entities.Notification.create({
          user_email: user.email,
          title: '🛍️ Order Placed & Payment Received!',
          message: `Your order #${orderNumber} has been placed and payment received! FMM CLASSICO will verify and confirm within 2–5 minutes. Total: ₵${amount > 0 ? amount.toFixed(2) : orderData.total_amount?.toFixed(2) || ''}.`,
          type: 'order_placed',
          order_id: orderId,
          order_number: orderNumber,
          is_read: false
        }),
        base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `🛍️ Order Placed – FMM CLASSICO #${orderNumber}`,
          body: `Hi ${orderData.customer_name},\n\nYour order #${orderNumber} has been placed and payment received!\n\nOrder Total: ₵${orderData.total_amount?.toFixed(2)}\nDelivery Address: ${orderData.delivery_address}, ${orderData.city}\n\nWe will verify within 2-5 minutes and notify you.\n\nThank you!\n📞 FMM CLASSICO: 0509896035`
        }).catch(() => {}),
        base44.integrations.Core.SendEmail({
          to: 'fmmclassico@gmail.com',
          subject: `🆕 NEW ORDER – ${orderData.customer_name} | ₵${orderData.total_amount?.toFixed(2)}`,
          body: `New order on FMM CLASSICO!\n\n📦 Order: ${orderNumber}\n👤 Customer: ${orderData.customer_name}\n📧 Email: ${user.email}\n📞 Phone: ${orderData.customer_phone}\n💰 Total: ₵${orderData.total_amount?.toFixed(2)}\n📍 Address: ${orderData.delivery_address}, ${orderData.city}\n\nItems:\n${(orderData.items || []).map(i => `• ${i.product_name} x${i.quantity} – ₵${(i.price * i.quantity).toFixed(2)}`).join('\n')}`
        }).catch(() => {}),
        ...cartItems.map(item => base44.entities.CartItem.delete(item.id).catch(() => {}))
      ]);

      setIsNotifying(false);
      setNotified(true);
      sessionStorage.removeItem('fmm_pending_order');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success("Payment received! We'll verify shortly.");
    };

    if (user && orderData) {
      autoNotify();
    }
  }, [user, orderData, orderId, orderNumber, notified, isNotifying, queryClient]);

  if (!user || !orderId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
        <p className="text-gray-500 mt-3">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-2xl font-bold text-gray-800">Payment Submitted!</h1>
        </div>

        {/* Status Card */}
        {isNotifying ? (
          <Card className="p-6 bg-orange-50 border-orange-200 text-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-orange-800">Notifying FMM CLASSICO...</p>
          </Card>
        ) : (
          <Card className="p-6 bg-blue-50 border-blue-200 text-center mb-4">
            <Bell className="h-10 w-10 text-blue-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-blue-900 mb-1">✅ FMM CLASSICO Notified</h2>
            <p className="text-sm text-blue-700">
              Your payment notification has been sent. We will verify within <strong>2–5 minutes</strong> and update your order.
            </p>
          </Card>
        )}

        {/* Admin confirmed banner */}
        {paymentConfirmedByAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-6 bg-green-50 border-green-300 text-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-green-900 mb-1">🎉 Order Confirmed!</h2>
              <p className="text-sm text-green-700 mb-4">
                Your payment has been verified. Your order is now being prepared for delivery!
              </p>
              <Link to={createPageUrl('Orders')}>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Package className="mr-2 h-4 w-4" />
                  View My Orders
                </Button>
              </Link>
            </Card>
          </motion.div>
        )}

        {/* Live Notifications */}
        {notified && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-blue-600" />
                Your Notifications
              </p>
              {!paymentConfirmedByAdmin && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="text-xs text-gray-400 ml-1">Waiting for confirmation...</span>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {userNotifications.length > 0 ? (
                userNotifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg border text-sm ${notif.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                  >
                    <div className="flex items-start gap-2">
                      <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-800">{notif.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Bell className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Checking for updates...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Summary */}
        {amount > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-500 font-semibold mb-2">Order Summary</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Order Number</span>
                <span className="font-semibold text-gray-800">#{orderNumber}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Amount Paid</span>
                <span className="font-bold text-orange-600">₵{amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment Method</span>
                <span className="font-semibold text-gray-800">Paystack</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <Link to={createPageUrl('Orders')} className="block">
            <Button variant="outline" className="w-full gap-2">
              <Package className="h-4 w-4" />
              View My Orders
            </Button>
          </Link>
          <a href="https://wa.me/233599676419" target="_blank" rel="noopener noreferrer">
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