import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Package, MapPin, Loader2, ExternalLink, Bell, CheckIcon } from 'lucide-react';
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

  // Validate amount > 0 to prevent payment processing issues
  if (amount <= 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

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

  const { data: userNotifications = [] } = useQuery({
    queryKey: ['notifications', user?.email, paymentClicked],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 10),
    enabled: !!user?.email && paymentClicked,
    refetchInterval: 3000,
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

    await Promise.all([
      base44.entities.Order.update(orderId, {
        tracking_updates: [
          ...existingTracking,
          {
            status: 'Payment Claimed',
            message: 'Customer confirmed payment – awaiting FMM CLASSICO verification',
            timestamp: new Date().toISOString()
          }
        ]
      }),
      base44.entities.Notification.create({
        user_email: user.email,
        title: '✅ Next Message Will Be Sent',
        message: `Your payment for order #${orderNumber} has been received. FMM CLASSICO will verify and send you confirmation shortly.`,
        type: 'payment_pending',
        order_id: orderId,
        order_number: orderNumber,
        is_read: false
      })
    ]);

    setIsSubmitting(false);
    setPaymentClicked(true);
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    toast.success('Payment sent! We\'ll verify shortly.');
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

                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">Need help?</p>
                  <a href="https://wa.me/233599676419" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full gap-2 text-sm">
                      <Bell className="h-4 w-4" />
                      WhatsApp Support
                    </Button>
                  </a>
                </div>
              </>
            ) : (
               <>
                 <Card className="p-6 bg-blue-50 border-blue-200 text-center">
                   <Bell className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                   <h2 className="text-lg font-bold text-blue-900 mb-2">✅ Payment Received</h2>
                   <p className="text-sm text-blue-700 mb-4">
                     Your payment notification has been sent. FMM CLASSICO will verify within 2–5 minutes and notify you below.
                   </p>
                 </Card>

                 {/* Notifications List */}
                 <div className="mt-6 space-y-3">
                   <div className="flex items-center justify-between">
                     <p className="text-xs text-gray-600 font-semibold flex items-center gap-1.5">
                       <Bell className="h-4 w-4 text-blue-600" />
                       Your Notifications
                     </p>
                     {userNotifications.length > 0 && (
                       <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">{userNotifications.length}</span>
                     )}
                   </div>

                   <div className="space-y-2 max-h-48 overflow-y-auto">
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
                             <div className="flex-1">
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
                         <p className="text-xs text-gray-500">No notifications yet. Checking...</p>
                       </div>
                     )}
                   </div>
                 </div>

                 {paymentConfirmedByAdmin ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <Card className="p-6 bg-green-50 border-green-300 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                        <h2 className="text-xl font-bold text-green-900 mb-2">🎉 Order Confirmed!</h2>
                        <p className="text-sm text-green-700 mb-4">
                          Your payment has been verified. Your order is now processing and will be prepared for shipment.
                        </p>
                        <Link to={createPageUrl('Orders')}>
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <Package className="mr-2 h-4 w-4" />
                            View My Orders
                          </Button>
                        </Link>
                      </Card>
                    </motion.div>
                  </>
                ) : (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-4">Waiting for FMM CLASSICO to verify...</p>
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs text-gray-600 font-medium mb-3">Order Details:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Order Number</span>
                      <span className="font-semibold text-gray-800">#{orderNumber}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Amount Paid</span>
                      <span className="font-semibold text-orange-600">₵{amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Payment Method</span>
                      <span className="font-semibold text-gray-800">Paystack</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <a href="https://wa.me/233599676419" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full gap-2">
                      <Bell className="h-4 w-4" />
                      Contact Support on WhatsApp
                    </Button>
                  </a>
                  <Link to={createPageUrl('Home')} className="block">
                    <Button variant="ghost" className="w-full">
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}