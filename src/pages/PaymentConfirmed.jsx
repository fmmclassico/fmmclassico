import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Package, Loader2, Truck, Home as HomeIcon, AlertTriangle } from 'lucide-react';

export default function PaymentConfirmed() {
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [orderCreated, setOrderCreated] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'cancelled' | 'failed'
  const processCalledRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Read stored order data from sessionStorage (set by Checkout before payment)
  const stored = (() => {
    try { return JSON.parse(sessionStorage.getItem('fmm_pending_order') || '{}'); } catch { return {}; }
  })();

  const urlParams = new URLSearchParams(window.location.search);
  const orderNumber = urlParams.get('orderNumber') || stored.orderNumber || '';
  const amountRaw = urlParams.get('amount') || stored.amount;
  const amount = amountRaw ? parseFloat(amountRaw) : (stored.amount || 0);

  // Hubtel appends these params to the returnUrl after payment
  const hubtelStatus = urlParams.get('status') || '';           // "success", "cancelled", "failed"
  const hubtelClientRef = urlParams.get('clientReference') || '';
  const hubtelTxRef = urlParams.get('transactionId') || urlParams.get('externalTransactionId') || '';

  // Determine payment outcome from Hubtel params
  useEffect(() => {
    const status = hubtelStatus?.toLowerCase();
    if (status === 'success' || status === 'completed') {
      setPaymentStatus('success');
    } else if (status === 'cancelled' || status === 'cancel') {
      setPaymentStatus('cancelled');
      setIsProcessing(false);
    } else if (status === 'failed' || status === 'failure') {
      setPaymentStatus('failed');
      setIsProcessing(false);
    } else {
      // No status param = could be direct visit or old redirect — try to process anyway
      setPaymentStatus('success');
    }
  }, [hubtelStatus]);

  // Get user — and immediately clear the cart so it shows empty right away
  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Clear cart immediately on landing here (payment was initiated)
      if (u?.email) {
        base44.entities.CartItem.filter({ user_email: u.email })
          .then(items => Promise.all(items.map(i => base44.entities.CartItem.delete(i.id).catch(() => {}))))
          .catch(() => {});
        queryClient.removeQueries({ queryKey: ['cartItems', u.email] });
        queryClient.setQueryData(['cartItems', u.email], []);
      }
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  // Once user + payment status loaded, create the order if payment succeeded
  useEffect(() => {
    if (!user || processCalledRef.current) return;
    if (paymentStatus === null) return; // still determining
    if (paymentStatus !== 'success') return; // don't create order for cancelled/failed

    if (!stored.items || stored.items.length === 0) {
      setIsProcessing(false);
      setError('session_expired');
      return;
    }

    processCalledRef.current = true;
    processOrder();
  }, [user, paymentStatus]);

  const processOrder = async () => {
    setIsProcessing(true);
    try {
      const estimatedDelivery = stored.estimatedDelivery || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return d.toISOString().split('T')[0];
      })();

      const newOrder = await base44.entities.Order.create({
        order_number: stored.orderNumber || orderNumber,
        items: stored.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          price: item.price,
          quantity: item.quantity,
        })),
        total_amount: stored.amount || amount,
        payment_status: 'paid',
        status: 'confirmed',
        customer_name: stored.customerName || user.full_name || '',
        customer_email: stored.customerEmail || user.email,
        customer_phone: stored.customerPhone || '',
        delivery_address: stored.deliveryAddress || '',
        city: stored.city || '',
        notes: stored.notes || '',
        estimated_delivery: estimatedDelivery,
        tracking_updates: [
          {
            status: 'Payment Confirmed',
            message: `Payment completed via Hubtel. Order confirmed.${hubtelTxRef ? ` Ref: ${hubtelTxRef}` : ''}`,
            timestamp: new Date().toISOString(),
          }
        ],
      });

      setCreatedOrderId(newOrder.id);

      const totalDisplay = (stored.amount || amount).toFixed(2);
      const custName = stored.customerName || user.full_name || 'Customer';
      const itemsList = (stored.items || []).map(i => `${i.product_name} x${i.quantity}`).join(', ');

      // Notify customer
      await base44.entities.Notification.create({
        user_email: user.email,
        title: '🛍️ Order Placed & Payment Received!',
        message: `Your order #${stored.orderNumber || orderNumber} has been placed and payment confirmed. Total: ₵${totalDisplay}.`,
        type: 'order_placed',
        order_id: newOrder.id,
        order_number: stored.orderNumber || orderNumber,
        is_read: false,
      });

      // Notify admin (non-blocking)
      base44.entities.Notification.create({
        user_email: 'fmmclassico@gmail.com',
        title: `🆕 New Order – ${custName} | ₵${totalDisplay}`,
        message: `Order #${stored.orderNumber || orderNumber} by ${custName} (${user.email}). Phone: ${stored.customerPhone}. Address: ${stored.deliveryAddress}, ${stored.city}. Items: ${itemsList}`,
        type: 'order_placed',
        order_id: newOrder.id,
        order_number: stored.orderNumber || orderNumber,
        is_read: false,
      }).catch(() => {});

      // Send confirmation emails (non-blocking)
      base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `🛍️ Order Confirmed – FMM CLASSICO #${stored.orderNumber || orderNumber}`,
        body: `Hi ${custName},\n\nThank you! Your order #${stored.orderNumber || orderNumber} has been placed and payment confirmed.\n\nOrder Total: ₵${totalDisplay}\nDelivery: ${stored.deliveryAddress}, ${stored.city}\n\nTrack your order in the app.\n\n📞 FMM CLASSICO: 0509896035\n📧 fmmclassico@gmail.com`,
      }).catch(() => {});

      base44.integrations.Core.SendEmail({
        to: 'fmmclassico@gmail.com',
        subject: `🆕 NEW ORDER – ${custName} | ₵${totalDisplay}`,
        body: `New order!\n\n📦 Order: #${stored.orderNumber || orderNumber}\n👤 Customer: ${custName}\n📧 Email: ${user.email}\n📞 Phone: ${stored.customerPhone}\n💰 Total: ₵${totalDisplay}\n📍 Address: ${stored.deliveryAddress}, ${stored.city}\n\nItems: ${itemsList}`,
      }).catch(() => {});

      // Invalidate caches (cart already cleared on page mount)
      queryClient.invalidateQueries({ queryKey: ['cartItems', user.email] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });
      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      // Clear sessionStorage
      setTimeout(() => sessionStorage.removeItem('fmm_pending_order'), 5000);

      setOrderCreated(true);
    } catch (err) {
      console.error('Order creation error:', err);
      setError('save_failed');
    }
    setIsProcessing(false);
  };

  // ── CANCELLED ──
  if (paymentStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-24 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
            <AlertTriangle className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Payment Cancelled</h1>
          <p className="text-gray-500 mb-6">Your payment was cancelled. No money has been deducted. Your cart items are still saved.</p>
          <div className="space-y-2">
            <Link to={createPageUrl('Cart')} className="block">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3">Return to Cart & Try Again</Button>
            </Link>
            <Link to={createPageUrl('Home')} className="block">
              <Button variant="ghost" className="w-full text-gray-500">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── FAILED ──
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-24 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
          <p className="text-gray-500 mb-2">Your payment could not be processed. No money has been deducted.</p>
          <p className="text-sm text-gray-400 mb-6">Please try again or contact us if the issue persists.</p>
          <div className="space-y-2">
            <Link to={createPageUrl('Cart')} className="block">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3">Try Again</Button>
            </Link>
            <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full gap-2 border-green-400 text-green-700 hover:bg-green-50">
                Contact us on WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS / PROCESSING ──
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${
            isProcessing ? 'bg-blue-100' : orderCreated ? 'bg-green-100' : error ? 'bg-amber-100' : 'bg-green-100'
          }`}>
            {isProcessing
              ? <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              : error === 'session_expired'
                ? <AlertTriangle className="h-10 w-10 text-amber-500" />
                : <CheckCircle2 className={`h-10 w-10 ${orderCreated ? 'text-green-600' : 'text-amber-500'}`} />
            }
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isProcessing
              ? 'Confirming your order...'
              : orderCreated
                ? '🎉 Order Confirmed!'
                : error === 'session_expired'
                  ? 'Payment Received'
                  : 'Payment Received'}
          </h1>
          {!isProcessing && orderNumber && (
            <p className="text-sm text-gray-500 mt-1">Order #{orderNumber}</p>
          )}
          {orderCreated && (
            <p className="text-sm text-green-600 font-medium mt-1">Your order has been placed successfully!</p>
          )}
        </div>

        {/* Session expired / already placed */}
        {error === 'session_expired' && (
          <Card className="p-4 bg-blue-50 border-blue-200 mb-4 text-center">
            <p className="text-sm text-blue-800 font-medium mb-1">✅ Payment was received!</p>
            <p className="text-sm text-blue-700">If your order was already placed, you can find it in <strong>My Orders</strong>. If not, please contact us and we'll sort it out immediately.</p>
          </Card>
        )}



        {/* Order tracking steps */}
        {orderCreated && (
          <Card className="p-5 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-4 text-xs uppercase tracking-wider">Order Progress</h3>
            <div className="space-y-0">
              {[
                { label: 'Payment Confirmed', icon: CheckCircle2, done: true },
                { label: 'Order Confirmed', icon: Package, done: true },
                { label: 'Processing', icon: Loader2, done: false },
                { label: 'Shipped', icon: Truck, done: false },
                { label: 'Delivered', icon: HomeIcon, done: false },
              ].map((step, i, arr) => {
                const Icon = step.icon;
                const isActive = !step.done && arr.slice(0, i).every(s => s.done);
                const isLast = i === arr.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        step.done ? 'bg-green-500 border-green-500' : isActive ? 'bg-blue-100 border-blue-400 animate-pulse' : 'bg-white border-gray-200'
                      }`}>
                        <Icon className={`h-4 w-4 ${step.done ? 'text-white' : isActive ? 'text-blue-500' : 'text-gray-300'}`} />
                      </div>
                      {!isLast && <div className={`w-0.5 h-6 my-1 ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="flex-1 pb-2 pt-1">
                      <p className={`text-sm font-semibold ${step.done ? 'text-green-700' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-2 mt-4">
          {createdOrderId && (
            <Link to={createPageUrl(`OrderTracking?id=${createdOrderId}`)} className="block">
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3">
                <Package className="h-4 w-4" />
                Track My Order
              </Button>
            </Link>
          )}
          <Link to={createPageUrl('Home')} className="block">
            <Button variant="ghost" className="w-full text-gray-500">Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}