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
            if (confirm('Location permission is needed to auto-detect your location.\n\nTap OK to open your phone\'s location settings.')) {
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

    if (isSubmitting) return;

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
        status: 'processing',
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: formData.delivery_address,
        notes: formData.notes,
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

      // NO notifications here. Notifications only after Hubtel confirms payment.

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
          toast.success('Redirecting to Hubtel payment page...');
          window.location.href = initRes.data.checkoutUrl;
          return;
        }

        const errorMsg = initRes?.error || 'Unable to connect to payment gateway. Please try again.';
        setOrderError(`Payment Error: ${errorMsg}. Your order #${orderNumber} has been created. Please try the payment again or contact support.`);
        toast.error('Payment initiation failed. Please try again.');
      } catch (err) {
        console.error('[Checkout] Payment initiation error:', err);
        setOrderError(`Payment Error: ${err.message || 'Unknown error'}. Your order #${orderNumber} has been created. Please try again or contact support.`);
        toast.error('Payment initiation failed. Please try again.');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      setOrderError('Unable to place your order right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Order Submitted</h2>
          <p className="text-gray-600">Thank you! Your order #{createdOrderNumber} has been placed successfully.</p>
          <p className="text-gray-500 text-sm">We will review your order and follow up with payment instructions shortly.</p>
          <Button onClick={() => navigate(createPageUrl('Orders'))} className="w-full rounded-xl bg-blue-800 px-4 py-3 text-white font-semibold hover:bg-blue-900">
            View My Orders
          </Button>
          <Button onClick={() => navigate(createPageUrl('Home'))} className="w-full rounded-xl border border-blue-200 px-4 py-3 text-blue-800 font-semibold hover:bg-blue-50">
            Continue Shopping
          </Button>
        </Card>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button onClick={() => navigate(createPageUrl('Cart'))} className="text-blue-600 font-semibold hover:underline">
          ← Back to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-lg mx-auto p-4 space-y-4">

        <h1 className="text-xl font-bold text-center">Checkout</h1>

        <Card className="p-4">
          <h2 className="font-semibold text-base mb-3">Order Summary</h2>

          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product_image
                    ? <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs text-gray-400 flex items-center justify-center h-full">No img</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold">₵{(item.product_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₵{subtotal.toFixed(2)}</span>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Delivery
                </span>
                <span className="font-medium">
                  {selectedZoneId ? (shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`) : '—'}
                </span>
              </div>

              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select delivery option" />
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
                <p className="text-xs text-gray-500 mt-1">{selectedZone.note}</p>
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

        <form onSubmit={handleSubmit}>
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Delivery Information</h2>
              <DeliveryInfoModal
                trigger={
                  <Button variant="ghost" size="sm" className="text-blue-600 text-xs">
                    <Info className="w-4 h-4 mr-1" />
                    Delivery Rates
                  </Button>
                }
              />
            </div>

            <div>
              <Label>Full Name *</Label>
              <Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} required />
            </div>

            <div>
              <Label>Active Phone Number * (must be reachable)</Label>
              <Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} type="tel" required />
              <p className="text-xs text-gray-500 mt-1">We'll call/SMS this number for delivery. Make sure it's switched on and reachable.</p>
            </div>

            <div>
              <Label>Delivery Address / Landmark *</Label>
              <Textarea name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} required />

              <div className="mt-2 flex items-start gap-2">
                <span className="text-lg">📍</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-medium">Auto-detect your current location</p>
                  <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} className="mt-1 text-xs">
                    Get Location
                  </Button>
                  <p className="text-xs text-gray-400 mt-1">
                    Click to automatically detect and add your GPS location to the address field. If permission is denied, you'll be guided to enable location services.
                  </p>
                  {locationError && (
                    <div className="mt-1">
                      <p className="text-xs text-red-500">⚠️ {locationError}</p>
                      <button
                        type="button"
                        onClick={() => { window.open('https://support.google.com/android/answer/3457478?hl=en', '_blank'); }}
                        className="text-xs text-blue-600 underline font-medium hover:text-blue-800"
                      >
                        📱 Tap here to open Location Settings guide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Order Notes (Optional)</Label>
              <Textarea name="notes" value={formData.notes} onChange={handleInputChange} />
            </div>
          </Card>

          <Card className="p-4 mt-4">
            <h2 className="font-semibold text-base mb-3">Payment Method</h2>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-2xl">🏦</span>
              <div>
                <p className="font-semibold text-sm">Hubtel Secure Payment</p>
                <p className="text-xs text-gray-500">Mobile Money • Debit Card • Bank Transfer • Wallet</p>
              </div>
            </div>
          </Card>

          <div className="mt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-blue-800 text-white py-3 font-semibold hover:bg-blue-900">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                '💳 Pay with Hubtel'
              )}
            </Button>
            {orderError && (
              <p className="text-sm text-red-600 mt-2 text-center">{orderError}</p>
            )}
          </div>
        </form>

      </div>
    </div>
  );
}
