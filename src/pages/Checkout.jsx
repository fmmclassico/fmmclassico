import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft,
  Truck,
  CreditCard,
  CheckCircle2,
  Loader2,
  Smartphone,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    city: '',
    notes: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          customer_name: userData.full_name || ''
        }));
      } else {
        base44.auth.redirectToLogin(createPageUrl('Checkout'));
      }
    };
    getUser();
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + shipping;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !formData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Show payment modal instead of directly placing order
    setShowPaymentModal(true);
    setPaymentPhone(formData.customer_phone);
  };

  const processPayment = async () => {
    if (!paymentPhone || paymentPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!selectedNetwork) {
      toast.error('Please select your mobile money network');
      return;
    }

    setPaymentProcessing(true);

    try {
      // Generate order number
      const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();

      // Initiate Hubtel payment
      const paymentResult = await base44.functions.initiatePayment({
        amount: total,
        customer_phone: paymentPhone,
        network: selectedNetwork,
        customer_name: formData.customer_name,
        customer_email: user.email,
        order_reference: orderNumber
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment initiation failed');
      }

      setCurrentPaymentId(paymentResult.payment_id);
      setPaymentProcessing(false);
      setCheckingPayment(true);

      toast.success('Payment prompt sent! Please approve on your phone');

      // Start checking payment status
      const checkInterval = setInterval(async () => {
        try {
          const payments = await base44.entities.Payment.filter({ 
            transaction_reference: paymentResult.transaction_reference 
          });

          if (payments.length > 0) {
            const payment = payments[0];

            if (payment.status === 'SUCCESS') {
              clearInterval(checkInterval);
              
              // Create order
              const estimatedDelivery = new Date();
              estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

              const orderData = {
                order_number: orderNumber,
                items: cartItems.map(item => ({
                  product_id: item.product_id,
                  product_name: item.product_name,
                  product_image: item.product_image,
                  price: item.product_price,
                  quantity: item.quantity
                })),
                total_amount: total,
                status: 'confirmed',
                customer_name: formData.customer_name,
                customer_email: user.email,
                customer_phone: formData.customer_phone,
                delivery_address: formData.delivery_address,
                city: formData.city,
                notes: formData.notes,
                estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
                tracking_updates: [{
                  status: 'Payment Confirmed',
                  message: `Payment of ₵${total.toFixed(2)} received via ${selectedNetwork} Mobile Money`,
                  timestamp: new Date().toISOString()
                }]
              };

              const newOrder = await base44.entities.Order.create(orderData);

              // Clear cart
              for (const item of cartItems) {
                await base44.entities.CartItem.delete(item.id);
              }

              queryClient.invalidateQueries({ queryKey: ['cartItems'] });

              setOrderId(newOrder.id);
              setCheckingPayment(false);
              setShowPaymentModal(false);
              setOrderSuccess(true);
            } else if (payment.status === 'FAILED') {
              clearInterval(checkInterval);
              setCheckingPayment(false);
              toast.error('Payment failed: ' + (payment.failure_reason || 'Unknown error'));
            }
          }
        } catch (error) {
          console.error('Error checking payment:', error);
        }
      }, 3000);

      // Stop checking after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (checkingPayment) {
          setCheckingPayment(false);
          toast.error('Payment timeout. Please try again.');
        }
      }, 300000);

    } catch (error) {
      setPaymentProcessing(false);
      toast.error(error.message || 'Failed to initiate payment');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 mb-6">
            Your payment has been confirmed. Your order will be delivered within 3-5 business days.
          </p>
          <div className="flex flex-col gap-3">
            <Link to={createPageUrl(`OrderTracking?id=${orderId}`)}>
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                Track Your Order
              </Button>
            </Link>
            <Link to={createPageUrl('Shop')}>
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
        <Link to={createPageUrl('Shop')}>
          <Button>Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Link to={createPageUrl('Cart')} className="inline-flex items-center text-gray-600 hover:text-orange-600 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Cart
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Delivery Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-800">Delivery Information</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Full Name *</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone Number *</Label>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="delivery_address">Delivery Address *</Label>
                  <Textarea
                    id="delivery_address"
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleInputChange}
                    placeholder="Enter your full delivery address"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter your city"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Input
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-800">Payment Method</h2>
              </div>
              
              <div className="p-4 border-2 border-orange-500 rounded-lg bg-orange-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-800 block">Mobile Money Payment</span>
                    <span className="text-sm text-gray-600">Powered by Hubtel</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  You will receive a mobile money prompt to approve payment before delivery.
                </p>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 shadow-md sticky top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={item.product_image || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=100'}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800 line-clamp-1">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="font-semibold text-orange-600">₵{(item.product_price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />
              
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₵{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span>₵{total.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg"
                disabled={isSubmitting}
              >
                Proceed to Payment
              </Button>
            </Card>
          </div>
        </div>
      </form>

      {/* Hubtel Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-2xl relative">
                <button
                  onClick={() => !paymentProcessing && !checkingPayment && setShowPaymentModal(false)}
                  className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1"
                  disabled={paymentProcessing || checkingPayment}
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
                    <Smartphone className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Pay with Mobile Money</h2>
                  <p className="text-orange-100 text-sm">Powered by Hubtel</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {!checkingPayment ? (
                  <>
                    <div className="bg-orange-50 rounded-lg p-4 mb-6 text-center">
                      <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
                      <p className="text-3xl font-bold text-orange-600">₵{total.toFixed(2)}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="network">Select Network *</Label>
                        <Select 
                          value={selectedNetwork} 
                          onValueChange={setSelectedNetwork}
                          disabled={paymentProcessing}
                        >
                          <SelectTrigger className="w-full h-12 text-base">
                            <SelectValue placeholder="Choose your mobile money network" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MTN">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                                  <span className="text-xs font-bold text-black">M</span>
                                </div>
                                MTN Mobile Money
                              </div>
                            </SelectItem>
                            <SelectItem value="VODAFONE">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">V</span>
                                </div>
                                Vodafone Cash
                              </div>
                            </SelectItem>
                            <SelectItem value="AIRTELTIGO">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">A</span>
                                </div>
                                AirtelTigo Money
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payment_phone">Mobile Money Number *</Label>
                        <div className="flex gap-2">
                          <div className="flex items-center justify-center px-3 bg-gray-100 rounded-lg border">
                            <span className="text-gray-600 font-medium">+233</span>
                          </div>
                          <Input
                            id="payment_phone"
                            type="tel"
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="244123456"
                            className="text-lg flex-1"
                            disabled={paymentProcessing}
                            maxLength={10}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Enter the number you want to pay from (without 0)
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          📱 You will receive a payment approval prompt on your phone. Enter your Mobile Money PIN to complete payment.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowPaymentModal(false)}
                          disabled={paymentProcessing}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-orange-500 hover:bg-orange-600 font-bold"
                          onClick={processPayment}
                          disabled={paymentProcessing || !selectedNetwork || !paymentPhone}
                        >
                          {paymentProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Proceed to Pay'
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4 animate-pulse">
                      <Smartphone className="h-10 w-10 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Waiting for Payment Approval</h3>
                    <p className="text-gray-600 mb-4">
                      Check your phone for the Mobile Money payment prompt
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        ⏳ Please approve the payment on your phone
                      </p>
                      <p className="text-xs text-blue-600">
                        Dial *170# or check your notifications
                      </p>
                    </div>
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                    <p className="text-sm text-gray-500 mt-4">
                      Sent to: +233{paymentPhone}
                    </p>
                    <p className="text-sm text-gray-500">
                      Network: {selectedNetwork}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}