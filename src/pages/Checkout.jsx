import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Truck,
  CreditCard,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import DeliveryInfoModal from '../components/delivery/DeliveryInfoModal';

// ── DELIVERY ZONES ──────────────────────────────────────────────────────────
// FIX: This dropdown used to be declared (but never rendered) on the Cart page.
// It is now the single source of truth for delivery selection, and lives
// inside the Order Summary card on the Checkout page.
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
  const [locationError, setLocationError] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const initialZoneId = urlParams.get('zone') || '';

  // FIX: selectedZoneId now lives here — the dropdown is rendered inside the
  // Order Summary card, directly under the "Delivery" line.
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

  // FIX: shipping fee now comes purely from the selected dropdown zone —
  // no more free-text city matching, and no separate "Delivery: ₵X" line
  // under the City/Town field (that field is gone).
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

    // FIX: city field removed from validation — replaced by selectedZoneId requirement
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

    sessionStorage.setItem('fmm_pending_order', JSON.stringify({
      orderNumber,
      amount: total,
      customerName: formData.customer_name,
      customerEmail: user.email,
      customerPhone: formData.customer_phone,
      deliveryAddress: formData.delivery_address,
      deliveryZone: selectedZone?.label || '',
      deliveryFee: shipping,
      notes: formData.notes,
      estimatedDelivery: estimatedDelivery.toISOString().split('T')[0],
      items: cartItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        price: item.product_price,
        quantity: item.quantity,
        cart_item_id: item.id,
      })),
    }));

    setOrderSubmitted(true);
    navigate(createPageUrl(`Payment?orderNumber=${orderNumber}&amount=${total.toFixed(2)}&email=${encodeURIComponent(user.email)}`));
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (cartItems.length === 0 && !orderSubmitted) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
        <button onClick={() => navigate(createPageUrl('Cart'))} className="text-blue-600 font-semibold hover:underline">
          ← Back to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Checkout</h1>
        </div>

        {/* ── ORDER SUMMARY — first thing on the page ── */}
        <div className="mb-6">
          <Card className="p-5 sm:p-6 shadow-md">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Order Summary</h2>

            <div className="space-y-3 mb-3 max-h-56 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.product_image
                      ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-gray-800 line-clamp-2 leading-tight">{item.product_name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    <p className="font-semibold text-[#1B3A6B] text-sm">₵{(item.product_price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex justify-between text-base text-gray-600">
                <span>Subtotal</span>
                <span>₵{subtotal.toFixed(2)}</span>
              </div>

              {/* ── DELIVERY DROPDOWN — moved here, replacing the City/Town free-text field ── */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-base text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#1B3A6B]" />
                    Delivery
                  </span>
                  <span className={shipping === 0 && selectedZoneId ? 'text-green-600 font-semibold' : 'font-semibold text-[#1B3A6B]'}>
                    {selectedZoneId ? (shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`) : '—'}
                  </span>
                </div>
                <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Select delivery / pickup option *" />
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
                  <p className="text-xs text-gray-500 pl-0.5">{selectedZone.note}</p>
                )}
                {!selectedZoneId && (
                  <p className="text-xs text-red-500 pl-0.5">Please choose a delivery option to see your total.</p>
                )}
              </div>

              <Separator />
              <div className="flex justify-between text-lg font-bold text-gray-800">
                <span>Total</span>
                <span className="text-[#1B3A6B]">₵{total.toFixed(2)}</span>
              </div>
            </div>

          </Card>
        </div>

        <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Delivery Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#1B3A6B]" />
                  <h2 className="text-lg font-bold text-gray-800">Delivery Information</h2>
                </div>
                <DeliveryInfoModal
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1 text-[#1B3A6B] border-blue-200 hover:bg-blue-50">
                      <Info className="h-4 w-4" />
                      Delivery Rates
                    </Button>
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-sm">Full Name *</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone" className="text-sm">Active Phone Number * <span className="text-xs text-[#1B3A6B] font-normal">(must be reachable)</span></Label>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 0244123456 – must be active"
                    required
                    className="h-11"
                  />
                  <p className="text-xs text-gray-400">We'll call/SMS this number for delivery. Make sure it's switched on and reachable.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_address" className="text-sm">Delivery Address / Landmark *</Label>
                  <Textarea
                    id="delivery_address"
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleInputChange}
                    placeholder="Enter your full delivery address or landmark"
                    rows={3}
                    required
                    className="resize-y"
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-lg">📍</span>
                      <div className="flex-1 text-xs text-blue-700">
                        <span className="font-semibold">Auto-detect your current location</span>
                      </div>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Get Location
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Click to automatically detect and add your GPS location to the address field. If permission is denied, you'll be guided to enable location services.
                    </p>
                    {locationError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 font-medium mb-1">⚠️ {locationError}</p>
                        <button
                          onClick={() => {
                            window.open('https://support.google.com/android/answer/3457478?hl=en', '_blank');
                          }}
                          className="text-xs text-blue-600 underline font-medium hover:text-blue-800"
                        >
                          📱 Tap here to open Location Settings guide
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* FIX: "City / Town" free-text field REMOVED, along with the
                    "📍 Delivery: ₵X" line that used to appear beneath it.
                    Delivery selection (and its price) now lives exclusively
                    in the Order Summary dropdown above. */}

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm">Order Notes (Optional)</Label>
                  <Input
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions"
                    className="h-11"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-[#1B3A6B]" />
                <h2 className="text-base font-bold text-gray-800">Payment Method</h2>
              </div>

              <div className="p-3 border-2 border-[#1B3A6B] rounded-lg bg-blue-50 flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-base">💳</span>
                </div>
                <div className="text-center">
                  <span className="font-bold text-gray-800 text-sm block">Pay with Hubtel</span>
                  <span className="text-xs text-gray-600">Mobile Money, Card & Bank Transfer – secure checkout</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-2xl">
            <Button
              type="submit"
              className="w-full bg-[#1B3A6B] hover:bg-[#152f5a] text-white font-bold py-4 text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                '💳 Confirm Order & Pay with Hubtel'
              )}
            </Button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}