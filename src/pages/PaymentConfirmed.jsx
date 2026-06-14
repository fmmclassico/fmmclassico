import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Package, Loader2, Clock, Truck, Home as HomeIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PaymentConfirmed() {
  const [user, setUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [orderCreated, setOrderCreated] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [error, setError] = useState(null);
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

  // Get user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.isAuthenticated().then(isAuth => {
        if (!isAuth) base44.auth.redirectToLogin(window.location.href);
      });
    });
  }, []);

  // Once user is loaded, create the order and clear cart
  useEffect(() => {
    if (!user || processCalledRef.current) return;
    if (!stored.items || stored.items.length === 0) {
      // No cart data — payment might be a duplicate visit or session expired
      setIsProcessing(false);
      setError('Order data not found. If you paid, your order has already been placed. Please check My Orders.');
      return;
    }
    processCalledRef.current = true;
    processOrder();
  }, [user]);

  const processOrder = async () => {
    setIsProcessing(true);
    try {
      const estimatedDelivery = stored.estimatedDelivery || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return d.toISOString().split('T')[0];
      })();

      // Create the order NOW (only after Hubtel confirmed payment)
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
        payment_status: 'paid',        // Hubtel confirmed payment
        status: 'confirmed',           // Order confirmed immediately after payment
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
            message: 'Payment completed via Hubtel. Order confirmed.',
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

      // Notify admin
      base44.entities.Notification.create({
        user_email: 'fmmclassico@gmail.com',
        title: `🆕 New Order – ${custName} | ₵${totalDisplay}`,
        message: `Order #${stored.orderNumber || orderNumber} by ${custName} (${user.email}). Phone: ${stored.customerPhone}. Address: ${stored.deliveryAddress}, ${stored.city}. Items: ${itemsList}`,
        type: 'order_placed',
        order_id: newOrder.id,
        order_number: stored.orderNumber || orderNumber,
        is_read: false,
      }).catch(() => {});

      // Send emails (non-blocking)
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

      // Clear the cart immediately
      try {
        const cartItems = await base44.entities.CartItem.filter({ user_email: user.email });
        await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id).catch(() => {})));
      } catch (_) {}

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['cartItems', user.email] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user.email] });
      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      // Clear sessionStorage after 5s
      setTimeout(() => sessionStorage.removeItem('fmm_pending_order'), 5000);

      toast.success('Order placed! Payment confirmed.');
      setOrderCreated(true);
    } catch (err) {
      console.error('Order creation error:', err);
      setError('There was an issue saving your order. Your payment went through — please contact us on WhatsApp with your order number.');
    }
    setIsProcessing(false);
  };

  const trackingSteps = [
    { label: 'Payment Confirmed', icon: CheckCircle2, done: true },
    { label: 'Order Confirmed', icon: Package, done: orderCreated },
    { label: 'Processing', icon: Clock, done: false },
    { label: 'Packed', icon: Package, done: false },
    { label: 'Shipped', icon: Truck, done: false },
    { label: 'Out for Delivery', icon: Truck, done: false },
    { label: 'Delivered', icon: HomeIcon, done: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8 max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${isProcessing ? 'bg-blue-100' : orderCreated ? 'bg-green-100' : 'bg-amber-100'}`}>
            {isProcessing
              ? <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              : <CheckCircle2 className={`h-10 w-10 ${orderCreated ? 'text-green-600' : 'text-amber-500'}`} />}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isProcessing ? 'Placing your order...' : orderCreated ? '🎉 Order Confirmed!' : 'Payment Received'}
          </h1>
          {!isProcessing && orderNumber && (
            <p className="text-sm text-gray-500 mt-1">Order #{orderNumber}</p>
          )}
          {orderCreated && (
            <p className="text-sm text-green-600 font-medium mt-1">Your order has been placed successfully!</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <Card className="p-4 bg-amber-50 border-amber-300 mb-4 text-center">
            <p className="text-sm text-amber-800 font-medium">Your payment was received but there was an issue saving the order. Please contact us with your order number and we'll sort it out.</p>
            <a href={`https://wa.me/233509896035?text=${encodeURIComponent(`Hi FMM CLASSICO, I paid for order #${orderNumber} but my order wasn't saved. Please help!`)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
              Contact us on WhatsApp →
            </a>
          </Card>
        )}

        {/* Order tracking steps — only show on success */}
        {orderCreated && (
          <Card className="p-5 mb-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-4 text-xs uppercase tracking-wider">Order Progress</h3>
            <div className="space-y-0">
              {trackingSteps.map((step, i) => {
                const Icon = step.icon;
                const isActive = !step.done && i === trackingSteps.filter(s => s.done).length;
                const isLast = i === trackingSteps.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        step.done ? 'bg-green-500 border-green-500'
                          : isActive ? 'bg-blue-100 border-blue-400 animate-pulse'
                          : 'bg-white border-gray-200'
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
          <Link to={createPageUrl('Orders')} className="block">
            <Button variant="outline" className="w-full gap-2">
              <Package className="h-4 w-4" />
              View My Orders
            </Button>
          </Link>
          <Link to={createPageUrl('Home')} className="block">
            <Button variant="ghost" className="w-full text-gray-500">Return to Home</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}