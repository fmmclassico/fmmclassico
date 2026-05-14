import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import { 
  Truck,
  CreditCard,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import DeliveryInfoModal from '../components/delivery/DeliveryInfoModal';

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Read delivery selection passed from Cart via URL params
  const urlParams = new URLSearchParams(window.location.search);
  const cartZoneId = urlParams.get('zone') || '';
  const cartZoneName = urlParams.get('zoneName') ? decodeURIComponent(urlParams.get('zoneName')) : '';
  const cartZoneFee = urlParams.get('fee') !== null ? Number(urlParams.get('fee')) : null;

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    city: '',
    delivery_location: cartZoneId,
    notes: '',
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
        base44.auth.redirectToLogin(createPageUrl('Home'));
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

  // If cart passed a delivery zone, use that fee directly; otherwise auto-detect from city
  const getDeliveryFee = () => {
    if (cartZoneFee !== null && cartZoneId) return cartZoneFee;
    const city = formData.city?.toLowerCase().trim() || '';
    if (!city) return 0;
    if (city.includes('umat')) return 10;
    if (city.includes('tarkwa')) return subtotal >= 300 ? 0 : 25;
    const accraAreaFees = [
      { keywords: ['ashongman'], fee: 0 },
      { keywords: ['airport residential','airport'], fee: 22 },
      { keywords: ['east legon'], fee: 30 },
      { keywords: ['madina'], fee: 30 },
      { keywords: ['adenta'], fee: 35 },
      { keywords: ['accra mall'], fee: 25 },
      { keywords: ['osu'], fee: 30 },
      { keywords: ['circle'], fee: 30 },
      { keywords: ['accra station','station'], fee: 35 },
      { keywords: ['makola'], fee: 35 },
      { keywords: ['spintex'], fee: 40 },
      { keywords: ['accra','tema','lapaz','kasoa','teshie','nungua','labone','cantonments','dansoman','dome','pokuase','abeka','weija'], fee: 50 },
    ];
    for (const entry of accraAreaFees) {
      if (entry.keywords.some(k => city.includes(k))) return entry.fee;
    }
    return subtotal >= 500 ? 0 : 50;
  };

  const shipping = getDeliveryFee();
  const total = subtotal + shipping;

  const getShippingDisplayLabel = () => {
    if (cartZoneId && cartZoneName) {
      return `${cartZoneName} – ${shipping === 0 ? 'FREE' : `₵${shipping}`}`;
    }
    if (!formData.city) return 'Enter city/town to calculate';
    return shipping === 0 ? 'FREE' : `₵${shipping}`;
  };

  const getShippingLabel = () => getShippingDisplayLabel();

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

    // Verify total makes sense: subtotal must match cart
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

    const builtOrderData = {
      order_number: orderNumber,
      items: cartItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        price: item.product_price,
        quantity: item.quantity
      })),
      total_amount: total,
      status: 'pending',
      customer_name: formData.customer_name,
      customer_email: user.email,
      customer_phone: formData.customer_phone,
      delivery_address: formData.delivery_address,
      city: formData.city,
      notes: formData.notes,
      estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
      tracking_updates: [{
        status: 'Awaiting Payment',
        message: 'Order created - awaiting payment confirmation',
        timestamp: new Date().toISOString()
      }]
    };

    // Create order with error handling
    let newOrder;
    try {
      newOrder = await base44.entities.Order.create(builtOrderData);
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Failed to create order. Please try again.');
      setIsSubmitting(false);
      return;
    }
    
    // Save extra info to sessionStorage so PaymentConfirmed can notify immediately
    sessionStorage.setItem('fmm_pending_order', JSON.stringify({
      orderId: newOrder.id,
      orderNumber,
      amount: total,
      customerName: formData.customer_name,
      customerPhone: formData.customer_phone,
      deliveryAddress: formData.delivery_address,
      city: formData.city,
    }));

    // Clear the cart immediately when customer proceeds to payment
    base44.entities.CartItem.filter({ user_email: user.email })
      .then(items => Promise.all(items.map(item => base44.entities.CartItem.delete(item.id).catch(() => {}))))
      .then(() => queryClient.invalidateQueries({ queryKey: ['cartItems'] }))
      .catch(() => {});

    setOrderSubmitted(true);
    setIsSubmitting(false);
    navigate(createPageUrl(`Payment?orderId=${newOrder.id}&orderNumber=${orderNumber}&amount=${total.toFixed(2)}&email=${encodeURIComponent(user.email)}`));
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
        <Link to={createPageUrl('Shop')}>
          <Button>Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Delivery Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
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
                  <Label htmlFor="customer_phone">Active Phone Number * <span className="text-xs text-[#1B3A6B] font-normal">(must be reachable)</span></Label>
                  <Input
                    id="customer_phone"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 0244123456 – must be active"
                    required
                  />
                  <p className="text-xs text-gray-400">We'll call/SMS this number for delivery. Make sure it's switched on and reachable.</p>
                </div>
                
                {/* Cart delivery selection banner */}
                {cartZoneId && cartZoneName && (
                  <div className="md:col-span-2 p-3 bg-green-50 border border-green-300 rounded-lg flex items-center gap-3">
                    <span className="text-2xl">🚚</span>
                    <div>
                      <p className="text-sm font-bold text-green-800">Delivery selected from cart:</p>
                      <p className="text-sm text-green-700">{cartZoneName} — <strong>{cartZoneFee === 0 ? 'FREE' : `₵${cartZoneFee}`}</strong></p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="delivery_address">Delivery Address / Landmark *</Label>
                  <Textarea
                    id="delivery_address"
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleInputChange}
                    placeholder="Enter your full delivery address or landmark"
                    rows={2}
                    required
                  />
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-lg">📍</span>
                    <div className="flex-1 text-xs text-blue-700">
                      <span className="font-semibold">Share your exact location</span> so we can find you easily.
                    </div>
                    <a
                      href="https://maps.google.com?action=mylocation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Pin Location
                    </a>
                  </div>
                  <p className="text-xs text-gray-400">Open Google Maps, copy your location link and paste it in the address field or send to <strong>0509896035</strong> on WhatsApp.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City / Town *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Tarkwa, Accra, Tema, Madina..."
                    required
                  />
                  {formData.city && (
                    <p className={`text-xs font-medium mt-1 ${shipping === 0 ? 'text-green-600' : 'text-[#1B3A6B]'}`}>
                      📍 Delivery: {getShippingLabel()}
                    </p>
                  )}
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

            <Card className="p-4 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-[#1B3A6B]" />
                <h2 className="text-base font-bold text-gray-800">Payment Method</h2>
              </div>
              
              <div className="p-3 border-2 border-green-500 rounded-lg bg-green-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-base">💳</span>
                </div>
                <div>
                  <span className="font-bold text-gray-800 text-sm block">Pay with Paystack</span>
                  <span className="text-xs text-gray-600">Mobile Money, Card & Bank Transfer – secure checkout</span>
                </div>
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
                      <p className="font-semibold text-[#1B3A6B]">₵{(item.product_price * item.quantity).toFixed(2)}</p>
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
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className={shipping === 0 ? 'text-green-600 font-semibold' : 'font-semibold text-[#1B3A6B]'}>
                      {shipping === 0 ? 'FREE' : `₵${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  {cartZoneName && (
                    <p className="text-xs text-gray-400 text-right">{cartZoneName}</p>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-[#1B3A6B]">₵{total.toFixed(2)}</span>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  '💳 Place Order & Pay with Paystack'
                )}
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}