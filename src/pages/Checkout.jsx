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
  { id: 'umat_pickup', label: 'UMAT Campus - Pickup / Meeting Point', fee: 0, note: 'FREE - collect on campus' },
  { id: 'umat_doorstep', label: 'UMAT Campus - Doorstep Delivery', fee: 10, note: 'GHS 10 to your door' },
  { id: 'tarkwa_station', label: 'Tarkwa - Delivery to a Station / Car', fee: 20, note: 'GHS 20 to a station or car' },
  { id: 'tarkwa', label: 'Tarkwa (Outside UMAT) - Doorstep', fee: 25, note: 'GHS 25 delivery fee' },
  { id: 'ashongman', label: 'Ashongman Estate - Pickup Point (Close to Awo Dede - Purewater)', fee: 0, note: 'FREE - pickup from our location' },
  { id: 'airport', label: 'Airport Residential Area - Pickup Point (Libi Kraal)', fee: 0, note: 'FREE - pickup from our location' },
  { id: 'accra_station', label: 'Accra - Delivery to a Station / Car', fee: 25, note: 'GHS 25 to a station or car' },
  { id: 'accra_delivery', label: 'Delivery Within Accra', fee: 25, note: 'GHS 25 delivery fee' },
  { id: 'yango', label: 'Yango Delivery - Pay on Delivery', fee: 0, note: 'Yango rider fee paid when product arrives' },
  { id: 'uber', label: 'Uber Delivery - Pay on Delivery', fee: 0, note: 'Uber rider fee paid when product arrives' },
  { id: 'bolt', label: 'Bolt Delivery - Pay on Delivery', fee: 0, note: 'Bolt rider fee paid when product arrives' },
  { id: 'other', label: 'Outside Accra and Tarkwa', fee: 50, note: 'GHS 50 flat rate' },
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

  useEffect(function() {
    setIsSubmitting(false);
    setOrderSubmitted(false);
    base44.auth.me()
      .then(function(userData) {
        setUser(userData);
        setFormData(function(prev) { return Object.assign({}, prev, { customer_name: userData.full_name || '' }); });
      })
      .catch(function() { base44.auth.redirectToLogin(createPageUrl('Home')); });
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: function() { return base44.entities.CartItem.filter({ user_email: user?.email }); },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  var subtotal = cartItems.reduce(function(sum, item) { return sum + (item.product_price * item.quantity); }, 0);
  var selectedZone = DELIVERY_ZONES.find(function(z) { return z.id === selectedZoneId; });
  var shipping = selectedZone ? selectedZone.fee : 0;
  var total = subtotal + shipping;

  var handleInputChange = function(e) {
    var name = e.target.name;
    var value = e.target.value;
    setFormData(function(prev) { var obj = {}; obj[name] = value; return Object.assign({}, prev, obj); });
  };

  var getCurrentLocation = function() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      function(position) {
        var lat = position.coords.latitude.toFixed(6);
        var lng = position.coords.longitude.toFixed(6);
        var googleMapsLink = 'https://www.google.com/maps?q=' + lat + ',' + lng + '&z=15';
        setFormData(function(prev) { return Object.assign({}, prev, { delivery_address: googleMapsLink }); });
        toast.success('Location detected! Google Maps link added.');
      },
      function(error) {
        var errorMsg = 'Unable to get your location';
        if (error.code === 1) {
          errorMsg = 'Location access denied. Please enable location in your phone settings.';
        } else if (error.code === 2) {
          errorMsg = 'Location service unavailable';
        } else if (error.code === 3) {
          errorMsg = 'Location request timed out';
        }
        setLocationError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  var handleSubmit = async function(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !selectedZoneId) {
      toast.error('Please fill in all required fields, including your delivery option.');
      return;
    }

    var expectedSubtotal = cartItems.reduce(function(sum, item) { return sum + (item.product_price * item.quantity); }, 0);
    if (Math.abs(expectedSubtotal - subtotal) > 0.01) {
      toast.error('Cart total mismatch. Go back to cart and try again.');
      return;
    }
    if (total <= 0 || isNaN(total)) {
      toast.error('Order total is invalid. Check your cart and delivery details.');
      return;
    }

    setIsSubmitting(true);

    var orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();
    var estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

    setOrderError('');

    try {
      var orderPayload = {
        order_number: orderNumber,
        items: cartItems.map(function(item) {
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            price: item.product_price,
            quantity: item.quantity,
          };
        }),
        total_amount: total,
        payment_status: 'pending_payment',
        status: 'processing',
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

      try {
        var callbackUrl = 'https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback';
        var returnUrl = window.location.origin + createPageUrl('Orders') + '?order=' + orderNumber + '&status=success';
        var cancellationUrl = window.location.origin + createPageUrl('Orders') + '?order=' + orderNumber + '&status=cancelled';

        var initRes = await initiatePayment({
          totalAmount: total,
          description: 'Order ' + orderNumber,
          callbackUrl: callbackUrl,
          returnUrl: returnUrl,
          cancellationUrl: cancellationUrl,
          clientReference: orderNumber,
        });

        if (initRes && initRes.data && initRes.data.checkoutUrl) {
          window.location.href = initRes.data.checkoutUrl;
          return;
        }

        var errorMsg = (initRes && initRes.error) || 'Unable to connect to payment gateway.';
        setOrderError('Payment Error: ' + errorMsg + '. Your order #' + orderNumber + ' has been created. Please try again or contact support.');
      } catch (err) {
        console.error('[Checkout] Payment error:', err);
        setOrderError('Payment Error: ' + (err.message || 'Unknown error') + '. Order #' + orderNumber + ' created. Try again or contact support.');
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="p-6 text-center">
          <p className="text-xl font-bold mb-2">Order Submitted</p>
          <p className="text-sm text-gray-600 mb-4">Your order #{createdOrderNumber} has been placed successfully.</p>
          <Button onClick={function() { navigate(createPageUrl('Orders')); }} className="w-full rounded-xl bg-blue-800 mb-2">
            View My Orders
          </Button>
          <Button variant="outline" onClick={function() { navigate(createPageUrl('Home')); }} className="w-full rounded-xl">
            Continue Shopping
          </Button>
        </Card>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Your cart is empty</p>
        <button onClick={function() { navigate(createPageUrl('Cart')); }} className="text-blue-600 font-semibold mt-2">
          Back to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Checkout</h1>

      <form onSubmit={handleSubmit}>
        {/* Order Summary */}
        <Card className="p-4 mb-4">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2">
            {cartItems.map(function(item) {
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.product_image
                      ? <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs text-gray-400 flex items-center justify-center h-full">No img</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{'\u20B5'}{(item.product_price * item.quantity).toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          <Separator className="my-3" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{'\u20B5'}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{selectedZoneId ? (shipping === 0 ? 'FREE' : '\u20B5' + shipping.toFixed(2)) : '\u2014'}</span>
            </div>

            {/* Delivery zone selector */}
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select delivery option" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_ZONES.map(function(zone) {
                  return (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.label} {zone.fee === 0 ? '(FREE)' : '(GHS ' + zone.fee + ')'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedZone?.note && <p className="text-xs text-gray-500">{selectedZone.note}</p>}
            {!selectedZoneId && <p className="text-xs text-orange-600">Please choose a delivery option.</p>}

            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{'\u20B5'}{total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Delivery Information */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Delivery Information</h2>
            <DeliveryInfoModal trigger={<Button type="button" variant="ghost" size="sm" className="text-xs"><Info className="w-3 h-3 mr-1" />Delivery Rates</Button>} />
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm">Full Name *</Label>
              <Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} placeholder="Your full name" required />
            </div>

            <div>
              <Label className="text-sm">Active Phone Number * (must be reachable)</Label>
              <Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} placeholder="0XX XXX XXXX" required />
              <p className="text-[10px] text-gray-500 mt-0.5">We will call/SMS this number for delivery.</p>
            </div>

            <div>
              <Label className="text-sm">Delivery Address / Landmark *</Label>
              <Textarea name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} placeholder="Enter your address or use Get Location below" rows={2} required />

              <div className="mt-2 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={getCurrentLocation}>
                  Get Location
                </Button>
                <span className="text-[10px] text-gray-500">Auto-detect your GPS location</span>
              </div>

              {locationError && (
                <p className="text-xs text-red-600 mt-1">{locationError}</p>
              )}
            </div>

            <div>
              <Label className="text-sm">Order Notes (Optional)</Label>
              <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Any special instructions..." rows={2} />
            </div>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-4 mb-4">
          <h2 className="font-semibold mb-3">Payment Method</h2>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <CreditCard className="w-6 h-6 text-blue-700" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Hubtel Secure Payment</p>
              <p className="text-xs text-blue-700">Mobile Money, Debit Card, Bank Transfer, Wallet</p>
            </div>
          </div>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full rounded-xl bg-blue-800 hover:bg-blue-900 h-12 text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Payment...
            </span>
          ) : (
            'Pay with Hubtel'
          )}
        </Button>

        {orderError && (
          <p className="text-sm text-red-600 mt-2 text-center">{orderError}</p>
        )}
      </form>
    </div>
  );
}
