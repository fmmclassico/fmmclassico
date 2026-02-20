import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Package, MapPin, Loader2, ExternalLink, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PAYSTACK_BASE = "https://paystack.shop/pay/1miimvhai8";

export default function Payment() {
  const [user, setUser] = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentClicked, setPaymentClicked] = useState(false);
  const [paymentConfirmedByAdmin, setPaymentConfirmedByAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw = urlParams.get('amount');
  const amount = amountRaw ? parseFloat(amountRaw) : 0;

  const amountPesewas = Math.round(amount * 100);
  const paystackUrl = `${PAYSTACK_BASE}?amount=${amountPesewas}`;

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
    enabled: !!orderId,
    select: (data) => data?.[0],
  });

  // Auto-detect when admin confirms payment and show success to customer
  useEffect(() => {
    if (!orderId || !paymentClicked) return;
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.id === orderId && event.data?.status === 'confirmed') {
        setPaymentConfirmedByAdmin(true);
      }
    });
    return unsubscribe;
  }, [orderId, paymentClicked]);

  const handlePaymentCompleted = async () => {
    if (!orderId || !user) return;
    setIsSubmitting(true);

    const currentOrder = orderData;
    const existingTracking = currentOrder?.tracking_updates || [];

    await base44.entities.Order.update(orderId, {
      tracking_updates: [
        ...existingTracking,
        {
          status: 'Payment Claimed',
          message: 'Customer confirmed payment – awaiting FMM CLASSICO verification',
          timestamp: new Date().toISOString()
        }
      ]
    });

    await Promise.all([
      base44.integrations.Core.SendEmail({
        to: 'fmmclassico@gmail.com',
        subject: `💳 PAYMENT COMPLETED – Order #${orderNumber} | ₵${amount.toFixed(2)}`,
        body: `A customer has confirmed payment on FMM CLASSICO.\n\n📦 Order: ${orderNumber}\n👤 Customer: ${currentOrder?.customer_name}\n📞 Phone: ${currentOrder?.customer_phone}\n💰 Total: ₵${amount.toFixed(2)}\n📍 Address: ${currentOrder?.delivery_address}, ${currentOrder?.city}\n\nPlease verify payment on Paystack and confirm in Admin Orders.`
      }),
      base44.entities.Notification.create({
        user_email: user.email,
        title: '⏳ Payment Being Verified',
        message: `We received your payment claim for order #${orderNumber}. FMM CLASSICO is verifying your payment. You'll get a confirmation here within 2–5 minutes.`,
        type: 'payment_pending',
        order_id: orderId,
        order_number: orderNumber,
        is_read: false
      })
    ]);

    setIsSubmitting(false);
    setPaymentClicked(true);
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    toast.success('Payment claim sent! We\'ll verify shortly.');
  };

  if (!user || !orderId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {!paymentDone ? (
          /* ── PAYMENT IFRAME VIEW ── */
          <motion.div
            key="payment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            {/* Header bar */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-bold text-gray-800 text-sm">Secure Payment – FMM CLASSICO</p>
                <p className="text-xs text-gray-500">Order #{orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="font-black text-orange-600 text-lg">₵{amount.toFixed(2)}</p>
              </div>
            </div>

            {/* Iframe */}
            <div className="relative" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500">Loading Paystack...</p>
                </div>
              )}
              <iframe
                src={paystackUrl}
                title="Paystack Payment"
                className="w-full h-full border-0"
                onLoad={() => setIframeLoaded(true)}
                allow="payment"
              />
            </div>

            {/* Bottom bar */}
            <div className="bg-white border-t px-4 py-3 space-y-2 shadow-lg">
              <p className="text-xs text-center text-gray-500">
                After completing payment above, tap the button below
              </p>
              <div className="flex gap-2">
                <a href={paystackUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Open in browser
                  </Button>
                </a>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={() => setPaymentDone(true)}
                >
                  ✅ I've Paid – Continue
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── POST-PAYMENT CONFIRMATION VIEW ── */
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 py-8 max-w-lg"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Payment Complete?</h1>
              <p className="text-gray-500 text-sm mt-1">Order #{orderNumber} · ₵{amount.toFixed(2)}</p>
            </div>

            {!paymentClicked ? (
              <>
                <Card className="p-5 mb-4 bg-orange-50 border-orange-200">
                  <p className="text-sm text-gray-700 font-medium mb-1">✅ Done paying on Paystack?</p>
                  <p className="text-xs text-gray-500">
                    Tap below to notify FMM CLASSICO. We'll verify your payment and confirm your order within <strong>2–5 minutes</strong>.
                  </p>
                </Card>

                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg mb-3"
                  onClick={handlePaymentCompleted}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Sending...</>
                  ) : (
                    '✅ Payment Completed – Notify FMM CLASSICO'
                  )}
                </Button>

                <p className="text-xs text-center text-gray-400 mb-6">
                  Only tap this after your payment was successful on Paystack
                </p>
              </>
            ) : paymentConfirmedByAdmin ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center mb-4"
              >
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-bold text-green-700 text-xl mb-2">Payment Confirmed!</h3>
                <p className="text-sm text-gray-700 mb-2">
                  FMM CLASSICO has confirmed your payment for order <strong>#{orderNumber}</strong>.
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Your order is now being processed and will be delivered to you. Track your order below.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-green-700 bg-green-100 rounded-lg p-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Your order is confirmed and being prepared!</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center mb-4"
              >
                <div className="text-4xl mb-3">⏳</div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">FMM CLASSICO is Verifying Your Payment</h3>
                <p className="text-sm text-gray-600 mb-3">
                  This takes <strong>2–5 minutes</strong>. This page will automatically update once confirmed. You'll also get a <strong>🔔 notification</strong> and an <strong>email</strong>.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-yellow-700 bg-yellow-100 rounded-lg p-2">
                  <Bell className="h-3 w-3" />
                  <span>Page updates automatically – no need to refresh</span>
                </div>
              </motion.div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl('Notifications')}>
                <Button variant="outline" className="w-full gap-2 border-orange-200 text-orange-600 hover:bg-orange-50">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Button>
              </Link>
              <Link to={createPageUrl(`OrderTracking?id=${orderId}`)}>
                <Button variant="outline" className="w-full gap-2">
                  <MapPin className="h-4 w-4" />
                  Track Order
                </Button>
              </Link>
              <Link to={createPageUrl('Orders')} className="col-span-2">
                <Button variant="ghost" className="w-full gap-2 text-gray-600">
                  <Package className="h-4 w-4" />
                  My Orders
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}