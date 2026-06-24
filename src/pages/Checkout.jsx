import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
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

// DELIVERY ZONES
const DELIVERY_ZONES = [
  { id: 'umat_pickup', label: '🏫 UMAT Campus – Pickup / Meeting Point', fee: 0, note: 'FREE – collect on campus' },
  { id: 'umat_doorstep', label: '🏠 UMAT Campus – Doorstep Delivery', fee: 10, note: '₵10 to your door' },
  { id: 'tarkwa_station', label: '🚌 Tarkwa – Delivery to a Station / Car', fee: 20, note: '₵20 to a station or car' },
  { id: 'tarkwa', label: '🏘️ Tarkwa (Outside UMAT) – Doorstep', fee: 25, note: '₵25 delivery fee' },
  { id: 'ashongman', label: '🏠 Ashongman Estate – Pickup Point', fee: 0, note: 'FREE pickup' },
  { id: 'airport', label: '🏠 Airport Residential Area – Pickup Point', fee: 0, note: 'FREE pickup' },
  { id: 'accra_station', label: '🚌 Accra – Station Delivery', fee: 25, note: '₵25 to station' },
  { id: 'accra_delivery', label: '🚗 Accra Doorstep Delivery', fee: 25, note: '₵25 delivery' },
  { id: 'yango', label: '🛵 Yango Delivery', fee: 0, note: 'Pay rider on delivery' },
  { id: 'uber', label: '🚗 Uber Delivery', fee: 0, note: 'Pay rider on delivery' },
  { id: 'bolt', label: '⚡ Bolt Delivery', fee: 0, note: 'Pay rider on delivery' },
  { id: 'other', label: '📦 Outside Accra & Tarkwa', fee: 50, note: '₵50 flat rate' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customer_name: user.email || '',
      }));
    }
  }, [user]);

  // CART (Supabase)
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_email', user.email);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product_price * item.quantity,
    0
  );

  const selectedZone = DELIVERY_ZONES.find(z => z.id === selectedZoneId);
  const shipping = selectedZone ? selectedZone.fee : 0;
  const total = subtotal + shipping;

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // LOCATION
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setFormData(prev => ({ ...prev, delivery_address: link }));
        toast.success("Location captured");
      },
      () => toast.error("Unable to get location")
    );
  };

  // SUBMIT ORDER
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      window.location.href = "/";
      return;
    }

    if (!selectedZoneId) {
      toast.error("Select delivery option");
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    try {
      const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();

      const orderPayload = {
        order_number: orderNumber,
        items: cartItems,
        total_amount: total,
        payment_status: 'pending_payment',
        status: 'confirmed',
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: formData.delivery_address,
        notes: formData.notes,
      };

      // SAVE ORDER
      const { error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload]);

      if (orderError) throw orderError;

      // CLEAR CART
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_email", user.email);

      queryClient.invalidateQueries(['cart']);

      // HUBTEL PAYMENT
      const callbackUrl = `${window.location.origin}/api/hubtel/callback`;
      const returnUrl = `${window.location.origin}${createPageUrl('Orders')}?status=success`;

      const payment = await initiatePayment({
        totalAmount: total,
        description: `Order ${orderNumber}`,
        callbackUrl,
        returnUrl,
        clientReference: orderNumber,
      });

      if (payment?.data?.checkoutUrl) {
        window.location.href = payment.data.checkoutUrl;
      } else {
        toast.error("Payment failed to start");
      }

    } catch (err) {
      console.error(err);
      setOrderError("Order failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // LOADING / AUTH CHECK
  if (isLoadingAuth) {
    return <p className="p-10 text-center">Loading...</p>;
  }

  if (!isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center p-10">
        Cart is empty
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      <Card className="p-4 mb-4">
        <h2 className="font-bold mb-2">Order Summary</h2>

        {cartItems.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.product_name} x {item.quantity}</span>
            <span>₵{item.product_price * item.quantity}</span>
          </div>
        ))}

        <hr className="my-2" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₵{subtotal}</span>
        </div>

        <div className="mt-3">
          <Select onValueChange={setSelectedZoneId}>
            <SelectTrigger>
              <SelectValue placeholder="Select delivery" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_ZONES.map(z => (
                <SelectItem key={z.id} value={z.id}>
                  {z.label} - ₵{z.fee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2 font-bold">
          Total: ₵{total}
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          name="customer_name"
          placeholder="Full name"
          value={formData.customer_name}
          onChange={handleChange}
          required
        />

        <Input
          name="customer_phone"
          placeholder="Phone"
          value={formData.customer_phone}
          onChange={handleChange}
          required
        />

        <Textarea
          name="delivery_address"
          placeholder="Address"
          value={formData.delivery_address}
          onChange={handleChange}
          required
        />

        <Button type="button" onClick={getCurrentLocation}>
          Get Location
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Pay with Hubtel"}
        </Button>

        {orderError && (
          <p className="text-red-500">{orderError}</p>
        )}
      </form>
    </div>
  );
}