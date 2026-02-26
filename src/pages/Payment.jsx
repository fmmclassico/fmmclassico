import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Package, Loader2, Bell, CheckIcon, Upload, ImageIcon } from 'lucide-react';
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
  const [proofUrl, setProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef(null);
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

  // Pass exact amount in GHS — Paystack shop pages accept amount in cedis directly
  const paystackUrl = `${PAYSTACK_BASE}?amount=${amount.toFixed(2)}`;

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



  const handleUploadProof = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProof(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProofUrl(file_url);
    setIsUploadingProof(false);
    toast.success('Screenshot uploaded!');
  };

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
            message: `Customer confirmed payment – awaiting FMM CLASSICO verification${proofUrl ? ' (proof attached)' : ''}`,
            timestamp: new Date().toISOString()
          }
        ],
        ...(proofUrl ? { notes: `Payment proof: ${proofUrl}` } : {})
      }),
      base44.entities.Notification.create({
        user_email: user.email,
        title: '✅ Payment Notification Sent',
        message: `Your payment for order #${orderNumber} has been received. FMM CLASSICO will verify and confirm within 2–5 minutes.`,
        type: 'payment_pending',
        order_id: orderId,
        order_number: orderNumber,
        is_read: false
      }),
      // Notify admin with proof if uploaded
      proofUrl ? base44.integrations.Core.SendEmail({
        to: 'fmmclassico@gmail.com',
        subject: `💳 Payment Proof – Order #${orderNumber}`,
        body: `Customer ${user.email} submitted payment proof for Order #${orderNumber} (₵${amount.toFixed(2)}).\n\nProof screenshot: ${proofUrl}\n\nPlease verify and confirm.`
      }).catch(() => {}) : Promise.resolve()
    ]);

    setIsSubmitting(false);
    setPaymentClicked(true);
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    toast.success('Payment notification sent! We\'ll verify shortly.');
  };

  // Override Paystack branding via CSS injected into the page
  // (The iframe content is cross-origin and cannot be styled directly)

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
            className="fixed inset-0 flex flex-col bg-white"
            style={{ zIndex: 10 }}
          >
            {/* Fixed Header bar */}
            <div className="flex-shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
              <p className="text-sm font-semibold text-gray-700">Order #{orderNumber}</p>
              <p className="font-black text-orange-600 text-lg">₵{Number.isInteger(amount) ? amount : amount.toFixed(2).replace(/\.00$/, '')}</p>
            </div>

            {/* Scrollable Iframe area */}
            <div className="flex-1 relative overflow-y-auto">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500">Opening Paystack securely...</p>
                </div>
              )}
              <iframe
                src={paystackUrl}
                title="Paystack Payment"
                className="w-full border-0"
                style={{ minHeight: '100%', height: '100%' }}
                onLoad={() => {
                  setIframeLoaded(true);
                  // After iframe loads, listen for Paystack success via postMessage
                }}
                allow="payment *"
                loading="eager"
              />
            </div>

            {/* Fixed Bottom bar — above taskbar */}
            <div className="flex-shrink-0 bg-white border-t px-4 pt-3 pb-4 shadow-lg">
              {/* Confirmation checkbox */}
              <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={paystackConfirmed}
                  onChange={(e) => setPaystackConfirmed(e.target.checked)}
                  className="w-4 h-4 accent-green-600 rounded"
                />
                <span className="text-xs text-gray-700 font-medium">
                  I confirm I have completed payment on Paystack
                </span>
              </label>
              <Button
                className={`w-full font-bold py-4 text-base ${paystackConfirmed ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                disabled={!paystackConfirmed}
                onClick={async () => {
                  if (!paystackConfirmed) return;
                  // Create order placed notification immediately
                  if (user) {
                    await base44.entities.Notification.create({
                      user_email: user.email,
                      title: '🛍️ Order Placed!',
                      message: `Your order #${orderNumber} has been placed and payment is being processed. Amount: ₵${amount.toFixed(2)}.`,
                      type: 'order_placed',
                      order_id: orderId,
                      order_number: orderNumber,
                      is_read: false
                    }).catch(() => {});
                  }
                  window.location.href = createPageUrl(`PaymentConfirmed?orderId=${orderId}&orderNumber=${orderNumber}&amount=${amount.toFixed(2)}`);
                }}
              >
                ✅ I've Completed Payment – Continue
              </Button>
              <p className="text-xs text-center text-gray-400 mt-1">
                Tap after your Paystack payment is done
              </p>
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
                <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
                  <p className="text-sm text-gray-700 font-medium mb-1">✅ Done paying on Paystack?</p>
                  <p className="text-xs text-gray-500">
                    Tap below to notify FMM CLASSICO. We'll verify and confirm within <strong>2–5 minutes</strong>.
                  </p>
                </Card>

                {/* Upload payment proof */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600 font-semibold mb-2 flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5 text-orange-500" />
                    Upload payment screenshot (optional but speeds up verification)
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadProof} />
                  {proofUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-300 rounded-lg">
                      <img src={proofUrl} alt="proof" className="h-12 w-12 object-cover rounded" />
                      <div className="flex-1">
                        <p className="text-xs text-green-700 font-semibold">Screenshot uploaded ✅</p>
                        <button onClick={() => setProofUrl('')} className="text-xs text-red-500 underline">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-orange-300 rounded-xl hover:bg-orange-50 transition-colors text-sm text-orange-600 font-medium">
                      {isUploadingProof ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploadingProof ? 'Uploading...' : 'Tap to upload payment screenshot / invoice'}
                    </button>
                  )}
                </div>

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

                <p className="text-xs text-center text-gray-400 mb-4">
                  Only tap after your Paystack payment was successful
                </p>

                <div className="space-y-2">
                  <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer">
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
                  <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer">
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