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
  { id: 'ashongman', label: '🏠 Ashongman Estate – Pickup Point', fee: 0, note: 'FREE – pickup from our location' },
  { id: 'airport', label: '🏠 Airport Residential Area – Pickup Point', fee: 0, note: 'FREE – pickup from our location' },
  { id: 'accra_station', label: '🚌 Accra – Delivery to a Station / Car', fee: 25, note: '₵25 to a station or car' },
  { id: 'accra_delivery', label: '🚗 Delivery Within Accra', fee: 25, note: '₵25 delivery fee' },
  { id: 'yango', label: '🛵 Yango Delivery – Pay on Delivery', fee: 0, note: 'Yango rider fee paid on arrival' },
  { id: 'uber', label: '🚗 Uber Delivery – Pay on Delivery', fee: 0, note: 'Uber fee paid on arrival' },
  { id: 'bolt', label: '⚡ Bolt Delivery – Pay on Delivery', fee: 0, note: 'Bolt fee paid on arrival' },
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
  const [selectedZoneId, setSelectedZoneId] = useState(urlParams.get('zone') || '');
  const [formData, setFormData] = useState({ customer_name: '', customer_phone: '', delivery_address: '', notes: '' });

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setFormData(prev => ({ ...prev, customer_name: u.full_name || '' })); })
      .catch(() => base44.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const subtotal = cartItems.reduce((s, i) => s + (i.product_price * i.quantity), 0);
  const selectedZone = DELIVERY_ZONES.find(z => z.id === selectedZoneId);
  const shipping = selectedZone ? selectedZone.fee : 0;
  const total = subtotal + shipping;

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationError('Not supported'); return; }
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setFormData(p => ({ ...p, delivery_address: `https://www.google.com/maps?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}&z=15` })),
      (err) => setLocationError(err.code === 1 ? 'Location denied' : 'Location error'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !selectedZoneId) {
      setOrderError('Please fill all required fields including delivery option.');
      return;
    }
    if (total <= 0 || isNaN(total)) { setOrderError('Invalid total.'); return; }

    setIsSubmitting(true);
    setOrderError('');
    const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();

    try {
      // Save order info to localStorage (order only created in DB after payment)
      localStorage.setItem('pendingOrder', JSON.stringify({
        order_number: orderNumber,
        items: cartItems.map(i => ({ product_id: i.product_id, product_name: i.product_name, product_image: i.product_image, price: i.product_price, quantity: i.quantity })),
        total_amount: total,
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: formData.delivery_address,
        notes: formData.notes,
      }));

      const callbackUrl = 'https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback';
      const returnUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${orderNumber}&status=success`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${orderNumber}&status=cancelled`;

      const res = await initiatePayment({ totalAmount: total, description: `Order ${orderNumber}`, callbackUrl, returnUrl, cancellationUrl, clientReference: orderNumber });

      if (res?.data?.checkoutUrl) {
        // Cart clears NOW — customer is entering Hubtel payment platform
        const items = await base44.entities.CartItem.filter({ user_email: user.email });
        for (const item of items || []) { await base44.entities.CartItem.delete(item.id).catch(() => {}); }
        queryClient.invalidateQueries({ queryKey: ['cartItems'] });

        // Redirect to Hubtel
        window.location.href = res.data.checkoutUrl;
        return;
      }

      // Payment initiation failed — don't clear cart
      localStorage.removeItem('pendingOrder');
      setOrderError(res?.error || 'Payment could not be initiated. Try again.');
    } catch (err) {
      localStorage.removeItem('pendingOrder');
      setOrderError('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-gray-500">Loading...</p></div>;
  if (cartItems.length === 0) return <div className="flex flex-col items-center justify-center min-h-[60vh] p-4"><p className="text-gray-500 mb-4">Your cart is empty</p><button onClick={() => navigate(createPageUrl('Cart'))} className="text-blue-600 font-semibold">← Back to Cart</button></div>;

  return (
    <div className="bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-center">Checkout</h1>

        <Card className="p-4">
          <h2 className="font-semibold text-base mb-3">Order Summary</h2>
          <div className="space-y-3">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 flex items-center justify-center h-full">No img</span>}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.product_name}</p><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div>
                <p className="text-sm font-semibold">₵{(item.product_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₵{subtotal.toFixed(2)}</span></div>
            <div>
              <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1"><Truck className="w-4 h-4" />Delivery</span><span>{selectedZoneId ? (shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`) : '—'}</span></div>
              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}><SelectTrigger className="mt-2"><SelectValue placeholder="Select delivery option" /></SelectTrigger><SelectContent>{DELIVERY_ZONES.map(z => <SelectItem key={z.id} value={z.id}>{z.label} — {z.fee === 0 ? 'FREE' : `₵${z.fee}`}</SelectItem>)}</SelectContent></Select>
              {selectedZone?.note && <p className="text-xs text-gray-500 mt-1">{selectedZone.note}</p>}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>₵{total.toFixed(2)}</span></div>
          </div>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-base">Delivery Information</h2><DeliveryInfoModal trigger={<Button variant="ghost" size="sm" className="text-blue-600 text-xs"><Info className="w-4 h-4 mr-1" />Rates</Button>} /></div>
            <div><Label>Full Name *</Label><Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} required /></div>
            <div><Label>Phone Number *</Label><Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} type="tel" required /></div>
            <div>
              <Label>Delivery Address *</Label>
              <Textarea name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} required />
              <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} className="mt-2 text-xs">📍 Get Location</Button>
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