import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { initiatePayment } from '@/api/hubtelClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, CreditCard, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import DeliveryInfoModal from '../components/delivery/DeliveryInfoModal';

const DELIVERY_ZONES = [
 { id: 'umat_pickup', label: '🏫 UMAT Campus – Pickup / Meeting Point', fee: 0, note: 'FREE – collect on campus' },
 { id: 'umat_doorstep', label: '🏠 UMAT Campus – Doorstep Delivery', fee: 10, note: '₵10 to your door' },
 { id: 'tarkwa_station', label: '🚌 Tarkwa – Delivery to a Station / Car', fee: 20, note: '₵20 to a station or car' },
 { id: 'tarkwa', label: '🏘️ Tarkwa (Outside UMAT) – Doorstep', fee: 25, note: '₵25 delivery fee' },
 { id: 'ashongman', label: '🏠 Ashongman Estate – Pickup Point (Close to Awo Dede – Purewater)', fee: 0, note: 'FREE – pickup from our location' },
 { id: 'airport', label: '🏠 Airport Residential Area – Pickup Point (Libi Kraal)', fee: 0, note: 'FREE – pickup from our location' },
 { id: 'accra_station', label: '🚌 Accra – Delivery to a Station / Car', fee: 25, note: '₵25 to a station or car' },
 { id: 'accra_delivery', label: '🚗 Delivery Within Accra', fee: 25, note: '₵25 delivery fee' },
 { id: 'yango', label: '🛵 Yango Delivery – Pay on Delivery', fee: 0, note: 'Yango rider fee paid when product arrives' },
 { id: 'uber', label: '🚗 Uber Delivery – Pay on Delivery', fee: 0, note: 'Uber rider fee paid when product arrives' },
 { id: 'bolt', label: '⚡ Bolt Delivery – Pay on Delivery', fee: 0, note: 'Bolt rider fee paid when product arrives' },
 { id: 'other', label: '📦 Outside Accra & Tarkwa', fee: 50, note: '₵50 flat rate' },
];

export default function Checkout() {
 const [user, setUser] = useState(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isRedirecting, setIsRedirecting] = useState(false);
 const [orderSubmitted, setOrderSubmitted] = useState(false);
 const [createdOrderNumber, setCreatedOrderNumber] = useState('');
 const [orderError, setOrderError] = useState('');
 const [locationError, setLocationError] = useState('');
 const navigate = useNavigate();
 const queryClient = useQueryClient();

 const urlParams = new URLSearchParams(window.location.search);
 const initialZoneId = urlParams.get('zone') || '';

 const [selectedZoneId, setSelectedZoneId] = useState(initialZoneId);

 const [formData, setFormData] = useState({
  customer_name: '',
  customer_phone: '',
  delivery_address: '',
  notes: '',
 });

 useEffect(() => {
  setIsSubmitting(false);
  setOrderSubmitted(false);
  base44.auth.me()
   .then(userData => {
    setUser(userData);
    setFormData(prev => ({ ...prev, customer_name: userData.full_name || '' }));
   })
   .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
 }, []);

 const { data: cartItems = [] } = useQuery({
  queryKey: ['cartItems', user?.email],
  queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
  enabled: !!user?.email,
  staleTime: 30000,
 });

 const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);

 const selectedZone = DELIVERY_ZONES.find(z => z.id === selectedZoneId);
 const shipping = selectedZone ? selectedZone.fee : 0;
 const total = subtotal + shipping;

 const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
 };

 const getCurrentLocation = () => {
  if (!navigator.geolocation) {
   setLocationError('Geolocation is not supported by your browser');
   return;
  }

  setLocationError('');
  navigator.geolocation.getCurrentPosition(
   (position) => {
    const { latitude, longitude } = position.coords;
    const googleMapsLink = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}&z=15`;
    setFormData(prev => ({ ...prev, delivery_address: googleMapsLink }));
    toast.success('📍 Location detected! Google Maps link added to address field.');
   },
   (error) => {
    let errorMsg = 'Unable to get your location';
    if (error.code === 1) {
     errorMsg = 'Location access denied';
     setLocationError(errorMsg);
     setTimeout(() => {
      if (confirm('Location permission is needed to auto-detect your location.

Tap OK to open your phone\'s location settings.')) {
       window.open('https://support.google.com/android/answer/3457478?hl=en', '_blank');
      }
     }, 500);
    } else if (error.code === 2) {
     errorMsg = 'Location service unavailable';
     setLocationError(errorMsg);
    } else if (error.code === 3) {
     errorMsg = 'Location request timed out';
     setLocationError(errorMsg);
    }
    toast.error(errorMsg);
   },
   { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
 };

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (isSubmitting || isRedirecting) return;

  if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !selectedZoneId) {
   toast.error('Please fill in all required fields, including your delivery option.');
   return;
  }

  const expectedSubtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  if (Math.abs(expectedSubtotal - subtotal) > 0.01) {
   toast.error('Cart total mismatch detected. Please go back to your cart and try again.');
   return;
  }
  if (total <= 0 || isNaN(total)) {
   toast.error('Order total is invalid. Please check your cart and delivery details.');
   return;
  }

  setIsSubmitting(true);

  const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  setOrderError('');

  try {
   const orderPayload = {
    order_number: orderNumber,
    items: cartItems.map(item => ({
     product_id: item.product_id,
     product_name: item.product_name,
     product_image: item.product_image,
     price: item.product_price,
     quantity: item.quantity,
    })),
    total_amount: total,
    payment_status: 'pending_payment',
    status: 'pending',
    customer_name: formData.customer_name,
    customer_email: user.email,
    customer_phone: formData.customer_phone,
    delivery_address: formData.delivery_address,
    notes: formData.notes,
    estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
    tracking_updates: [
     {
      status: 'Order Placed',
      message: 'Order created and waiting for payment confirmation.',
      timestamp: new Date().toISOString(),
     }
    ],
   };

   await base44.entities.Order.create(orderPayload);
   queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

   setCreatedOrderNumber(orderNumber);

   // NOW initiate payment - show redirecting overlay IMMEDIATELY
   setIsRedirecting(true);

   try {
    const callbackUrl = `https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback`;
    const returnUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${orderNumber}&status=success`;
    const cancellationUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${orderNumber}&status=cancelled`;

    const initRes = await initiatePayment({
     totalAmount: total,
     description: `Order ${orderNumber}`,
     callbackUrl,
     returnUrl,
     cancellationUrl,
     clientReference: orderNumber,
    });

    if (initRes && initRes.data && initRes.data.checkoutUrl) {
     // Redirect to Hubtel - keep overlay showing
     window.location.href = initRes.data.checkoutUrl;
     return; // Don't setIsRedirecting(false) - keep overlay until page unloads
    }

    // Payment initiation failed
    setIsRedirecting(false);
    const errorMsg = initRes?.error || 'Unable to connect to payment gateway. Please try again.';
    setOrderError(`Payment Error: ${errorMsg}. Your order #${orderNumber} has been created. Please try the payment again or contact support.`);
    toast.error('Payment initiation failed. Please try again.');
   } catch (err) {
    setIsRedirecting(false);
    console.error('[Checkout] Payment initiation error:', err);
    setOrderError(`Payment Error: ${err.message || 'Unknown error'}. Your order #${orderNumber} has been created. Please try again or contact support.`);
    toast.error('Payment initiation failed. Please try again.');
   }
  } catch (error) {
   setIsRedirecting(false);
   console.error('Order creation error:', error);
   setOrderError('Unable to place your order right now. Please try again.');
  } finally {
   setIsSubmitting(false);
  }
 };

 // ============ REDIRECTING OVERLAY (fixes flash issue) ============
 if (isRedirecting) {
  return (
   <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
    <div className="text-center px-6">
     <div className="relative mx-auto w-16 h-16 mb-6">
      <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
      <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
     </div>
     <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting to Hubtel...</h2>
     <p className="text-gray-500 text-sm">You'll be redirected to complete your payment securely.</p>
     <p className="text-gray-400 text-xs mt-4">Please do not close this page.</p>
    </div>
   </div>
  );
 }

 if (!user) {
  return (
   <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="w-6 h-6 animate-spin" /> Loading...
   </div>
  );
 }

 if (orderSubmitted) {
  return (
   <div className="max-w-md mx-auto px-4 py-10 text-center">
    <Card className="p-8 rounded-2xl shadow">
     <div className="text-5xl mb-4">✅</div>
     <h2 className="text-xl font-bold text-gray-900">Order Submitted</h2>
     <p className="text-gray-600 mt-2">Thank you! Your order #{createdOrderNumber} has been placed successfully.</p>
     <p className="text-gray-500 text-sm mt-1">We will review your order and follow up with payment instructions shortly.</p>
     <Button onClick={() => navigate(createPageUrl('Orders'))} className="w-full rounded-xl bg-blue-800 px-4 py-3 text-white font-semibold hover:bg-blue-900 mt-6">
      View My Orders
     </Button>
     <Button onClick={() => navigate(createPageUrl('Home'))} className="w-full rounded-xl border border-blue-200 px-4 py-3 text-blue-800 font-semibold hover:bg-blue-50 mt-2">
      Continue Shopping
     </Button>
    </Card>
   </div>
  );
 }

 if (cartItems.length === 0) {
  return (
   <div className="max-w-md mx-auto px-4 py-10 text-center">
    <p className="text-gray-500">Your cart is empty</p>
    <button onClick={() => navigate(createPageUrl('Cart'))} className="text-blue-600 font-semibold hover:underline mt-2">
     ← Back to Cart
    </button>
   </div>
  );
 }

 return (
  <div className="max-w-lg mx-auto px-4 py-6 pb-32">
   <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
   </div>

   <form onSubmit={handleSubmit} className="space-y-6">
    {/* Order Summary */}
    <Card className="p-4 rounded-2xl">
     <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>

     <div className="space-y-3">
      {cartItems.map((item) => (
       <div key={item.id} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
         {item.product_image
          ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
          : <span className="flex items-center justify-center w-full h-full text-xs text-gray-400">No img</span>
         }
        </div>
        <div className="flex-1 min-w-0">
         <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
         <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
        </div>
        <p className="text-sm font-semibold text-gray-900">₵{(item.product_price * item.quantity).toFixed(2)}</p>
       </div>
      ))}
     </div>

     <Separator className="my-4" />

     <div className="space-y-2 text-sm">
      <div className="flex justify-between">
       <span className="text-gray-500">Subtotal</span>
       <span className="font-medium">₵{subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between items-start">
       <div className="flex items-center gap-1">
        <Truck className="w-4 h-4 text-gray-400" />
        <span className="text-gray-500">Delivery</span>
       </div>
       <span className="font-medium">
        {selectedZoneId ? (shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`) : '—'}
       </span>
      </div>

      {/* Delivery Zone Selector */}
      <div className="pt-2">
       <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
        <SelectTrigger className="w-full rounded-xl">
         <SelectValue placeholder="Select delivery option..." />
        </SelectTrigger>
        <SelectContent>
         {DELIVERY_ZONES.map(zone => (
          <SelectItem key={zone.id} value={zone.id}>
           {zone.label} — {zone.fee === 0 ? 'FREE' : `₵${zone.fee}`}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
       {selectedZone?.note && (
        <p className="text-xs text-green-600 mt-1">{selectedZone.note}</p>
       )}
       {!selectedZoneId && (
        <p className="text-xs text-orange-500 mt-1">Please choose a delivery option to see your total.</p>
       )}
      </div>

      <Separator className="my-2" />
      <div className="flex justify-between text-base font-bold">
       <span>Total</span>
       <span>₵{total.toFixed(2)}</span>
      </div>
     </div>
    </Card>

    {/* Delivery Information */}
    <Card className="p-4 rounded-2xl">
     <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-gray-900">Delivery Information</h2>
      <DeliveryInfoModal
       trigger={
        <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-800">
         <Info className="w-3 h-3 mr-1" /> Delivery Rates
        </Button>
       }
      />
     </div>

     <div className="space-y-4">
      <div>
       <Label className="text-sm font-medium">Full Name *</Label>
       <Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} placeholder="Your full name" className="rounded-xl mt-1" required />
      </div>

      <div>
       <Label className="text-sm font-medium">Active Phone Number * (must be reachable)</Label>
       <Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} placeholder="0XX XXX XXXX" className="rounded-xl mt-1" required />
       <p className="text-xs text-gray-400 mt-1">We'll call/SMS this number for delivery. Make sure it's switched on and reachable.</p>
      </div>

      <div>
       <Label className="text-sm font-medium">Delivery Address / Landmark *</Label>
       <Textarea name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} placeholder="e.g. Hostel D, Room 12, UMAT Campus" className="rounded-xl mt-1" rows={2} required />

       <div className="mt-2 flex items-start gap-2 bg-blue-50 rounded-xl p-3">
        <span className="text-lg">📍</span>
        <div className="flex-1">
         <p className="text-xs text-gray-600">Auto-detect your current location</p>
         <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} className="mt-1 text-xs rounded-lg">
          Get Location
         </Button>
         <p className="text-[10px] text-gray-400 mt-1">Click to automatically detect and add your GPS location to the address field.</p>
        </div>
       </div>
       {locationError && (
        <div className="mt-2">
         <p className="text-xs text-red-500">⚠️ {locationError}</p>
         <button type="button" onClick={() => window.open('https://support.google.com/android/answer/3457478?hl=en', '_blank')} className="text-xs text-blue-600 underline font-medium hover:text-blue-800">📱 Tap here to open Location Settings guide</button>
        </div>
       )}
      </div>

      <div>
       <Label className="text-sm font-medium">Order Notes (Optional)</Label>
       <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Any special instructions..." className="rounded-xl mt-1" rows={2} />
      </div>
     </div>
    </Card>

    {/* Payment Method */}
    <Card className="p-4 rounded-2xl">
     <h2 className="font-bold text-gray-900 mb-3">Payment Method</h2>

     <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4">
      <div className="flex items-center gap-3">
       <span className="text-2xl">🏦</span>
       <div>
        <p className="font-semibold text-gray-900">Hubtel Secure Payment</p>
        <p className="text-xs text-gray-500">Mobile Money • Debit Card • Bank Transfer • Wallet</p>
       </div>
      </div>
     </div>
    </Card>

    {/* Submit */}
    <Button type="submit" disabled={isSubmitting || !selectedZoneId} className="w-full rounded-xl bg-blue-800 text-white py-4 text-lg font-bold hover:bg-blue-900 disabled:opacity-50">
     {isSubmitting ? (
      <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing Payment...</>
     ) : (
      '💳 Pay with Hubtel'
     )}
    </Button>
    {orderError && (
     <p className="text-sm text-red-600 text-center mt-2">{orderError}</p>
    )}
   </form>
  </div>
 );
}
