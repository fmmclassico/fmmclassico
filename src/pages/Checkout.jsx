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
import { Truck, Loader2, Info } from 'lucide-react';
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
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({ ...prev, delivery_address: `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}&z=15` }));
      },
      (err) => {
        if (err.code === 1) setLocationError('Location access denied');
        else if (err.code === 2) setLocationError('Location unavailable');
        else setLocationError('Location timed out');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !selectedZoneId) {
      setOrderError('Please fill in all required fields including delivery option.');
      return;
    }
    if (total <= 0 || isNaN(total)) {
      setOrderError('Order total is invalid.');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();

    try {
      // Save order data to localStorage (NOT to DB yet)
      // Order only gets created in DB after payment is confirmed
      const pendingOrder = {
        order_number: orderNumber,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          price: item.product_price,
          quantity: item.quantity,
        })),
        total_amount: total,
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: formData.delivery_address,
        notes: formData.notes,
      };
      localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));

      // Initiate payment
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

      if (initRes?.data?.checkoutUrl) {
        window.location.href = initRes.data.checkoutUrl;
        return;
      }

      // Payment initiation failed - remove pending order
      localStorage.removeItem('pendingOrder');
      setOrderError(initRes?.error || 'Payment could not be initiated. Please try again.');
    } catch (error) {
      localStorage.removeItem('pendingOrder');
      setOrderError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button onClick={() => navigate(createPageUrl('Cart'))} className="text-blue-600 font-semibold hover:underline">← Back to Cart</button>
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
                  {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 flex items-center justify-center h-full">No img</span>}
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
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">₵{subtotal.toFixed(2)}</span></div>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center gap-1"><Truck className="w-4 h-4" />Delivery</span>
                <span className="font-medium">{selectedZoneId ? (shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`) : '—'}</span>
              </div>
              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select delivery option" /></SelectTrigger>
                <SelectContent>{DELIVERY_ZONES.map(zone => (<SelectItem key={zone.id} value={zone.id}>{zone.label} — {zone.fee === 0 ? 'FREE' : `₵${zone.fee}`}</SelectItem>))}</SelectContent>
              </Select>
              {selectedZone?.note && <p className="text-xs text-gray-500 mt-1">{selectedZone.note}</p>}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>₵{total.toFixed(2)}</span></div>
          </div>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Delivery Information</h2>
              <DeliveryInfoModal trigger={<Button variant="ghost" size="sm" className="text-blue-600 text-xs"><Info className="w-4 h-4 mr-1" />Delivery Rates</Button>} />
            </div>
            <div><Label>Full Name *</Label><Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} required /></div>
            <div><Label>Phone Number *</Label><Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} type="tel" required /></div>
            <div>
              <Label>Delivery Address *</Label>
              <Textarea name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} required />
              <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} className="mt-2 text-xs">📍 Get My Location</Button>
              {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
            </div>
            <div><Label>Notes (Optional)</Label><Textarea name="notes" value={formData.notes} onChange={handleInputChange} /></div>
          </Card>

          <Card className="p-4 mt-4">
            <h2 className="font-semibold text-base mb-3">Payment</h2>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-2xl">🏦</span>
              <div><p className="font-semibold text-sm">Hubtel Secure Payment</p><p className="text-xs text-gray-500">Mobile Money • Card • Bank Transfer</p></div>
            </div>
          </Card>

          <div className="mt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-blue-800 text-white py-3 font-semibold hover:bg-blue-900">
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : '💳 Pay with Hubtel'}
            </Button>
            {orderError && <p className="text-sm text-red-600 mt-2 text-center">{orderError}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
