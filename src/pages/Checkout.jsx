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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ChevronLeft,
  Truck,
  CreditCard,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import DeliveryInfoModal from '../components/delivery/DeliveryInfoModal';

const WHATSAPP_LINK = "https://wa.me/233599676419";
const PAYSTACK_LINK = "https://paystack.shop/pay/1miimvhai8";

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    city: '',
    delivery_location: '',
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

  // Auto-detect location from city/town field
  const detectLocation = () => {
    const city = formData.city?.toLowerCase().trim() || '';
    if (!city) return formData.delivery_location || '';
    if (city.includes('umat')) return 'umat';
    if (city.includes('tarkwa')) return 'tarkwa';
    const accraKeywords = ['accra','ashongman','airport','east legon','legon','adenta','madina','tema','spintex','achimota','lapaz','kasoa','teshie','nungua','osu','labone','cantonments','dansoman','circle','community','weija','dome','pokuase','abeka','greater accra'];
    if (accraKeywords.some(k => city.includes(k))) return 'accra';
    if (city.length > 0) return 'other';
    return formData.delivery_location || '';
  };

  // Delivery fee logic based on auto-detected location from city
  const getDeliveryFee = () => {
    const loc = detectLocation();
    const city = formData.city?.toLowerCase() || '';
    if (loc === 'umat') return 0;
    if (loc === 'tarkwa') {
      return subtotal >= 300 ? 0 : 25;
    }
    if (loc === 'accra') {
      const accraAreaFees = [
        { keywords: ['ashongman'], fee: 0 },
        { keywords: ['airport residential','airport'], fee: 10 },
        { keywords: ['east legon'], fee: 25 },
        { keywords: ['legon'], fee: 20 },
        { keywords: ['adenta'], fee: 30 },
        { keywords: ['madina'], fee: 25 },
        { keywords: ['tema'], fee: 40 },
        { keywords: ['spintex'], fee: 30 },
        { keywords: ['achimota'], fee: 20 },
        { keywords: ['lapaz','la paz'], fee: 20 },
        { keywords: ['kasoa'], fee: 45 },
        { keywords: ['teshie'], fee: 35 },
        { keywords: ['nungua'], fee: 35 },
        { keywords: ['osu'], fee: 25 },
        { keywords: ['labone'], fee: 25 },
        { keywords: ['cantonments'], fee: 25 },
        { keywords: ['dansoman'], fee: 35 },
        { keywords: ['circle'], fee: 20 },
        { keywords: ['community'], fee: 30 },
        { keywords: ['weija'], fee: 40 },
        { keywords: ['dome'], fee: 25 },
        { keywords: ['pokuase'], fee: 35 },
        { keywords: ['abeka'], fee: 25 },
      ];
      for (const entry of accraAreaFees) {
        if (entry.keywords.some(k => city.includes(k))) return entry.fee;
      }
      return 30;
    }
    if (loc === 'other') {
      return subtotal >= 500 ? 0 : 50;
    }
    return 0;
  };

  const detectedLoc = detectLocation();
  const shipping = getDeliveryFee();
  const total = subtotal + shipping;

  const getShippingLabel = () => {
    if (!formData.city) return 'Enter city/town to calculate';
    if (detectedLoc === 'umat') return 'FREE (UMAT Campus)';
    if (detectedLoc === 'tarkwa' && subtotal >= 300) return 'FREE (order over ₵300)';
    if (detectedLoc === 'other' && subtotal >= 500) return 'FREE (order over ₵500)';
    if (detectedLoc === 'accra') return `₵${shipping} (Yango estimate to ${formData.city})`;
    if (detectedLoc === 'tarkwa') return `₵${shipping} (Tarkwa – free over ₵300)`;
    if (detectedLoc === 'other') return `₵${shipping} (Outside Accra/Tarkwa – free over ₵500)`;
    return `₵${shipping}`;
  };

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

    setIsSubmitting(true);

    const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();
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

    const newOrder = await base44.entities.Order.create(orderData);
    
    // Clear cart
    for (const item of cartItems) {
      await base44.entities.CartItem.delete(item.id);
    }
    
    queryClient.invalidateQueries({ queryKey: ['cartItems'] });
    
    setOrderId(newOrder.id);
    setIsSubmitting(false);
    setOrderSuccess(true);

    // Redirect to Paystack payment link
    window.open(PAYSTACK_LINK, '_blank');
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
            <CreditCard className="h-10 w-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Complete Your Payment</h1>
          <p className="text-gray-500 mb-6">
            Please complete your payment via Paystack. Your order will be confirmed once payment is verified.
          </p>
          <div className="flex flex-col gap-3">
            <a href={PAYSTACK_LINK} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                💳 Pay Now with Paystack
              </Button>
            </a>
            <Link to={createPageUrl(`OrderTracking?id=${orderId}`)}>
              <Button variant="outline" className="w-full">
                Track Your Order
              </Button>
            </Link>
            <Link to={createPageUrl('Shop')}>
              <Button variant="ghost" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Your order status will show as "Order Placed" once we verify your payment.
          </p>
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-800">Delivery Information</h2>
                </div>
                <DeliveryInfoModal 
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50">
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
                
                {/* Delivery fee note */}
                <div className="md:col-span-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                  <strong>📦 Delivery Rates:</strong> Free delivery on UMAT Campus only. Tarkwa: ₵25 (FREE on orders over ₵300). Within Accra: ₵10–₵45 via Yango. Outside Accra/Tarkwa: ₵50 (FREE on orders over ₵500).
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="delivery_address">Delivery Address / Landmark *</Label>
                  <Textarea
                    id="delivery_address"
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleInputChange}
                    placeholder="Enter your full delivery address or meeting point"
                    rows={3}
                    required
                  />
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
                    <p className={`text-xs font-medium mt-1 ${shipping === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      📍 {detectedLoc === 'umat' ? 'UMAT Campus' : detectedLoc === 'tarkwa' ? 'Tarkwa' : detectedLoc === 'accra' ? `Within Accra` : 'Outside Accra/Tarkwa'} → Delivery: {getShippingLabel()}
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

            <Card className="p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-800">Payment Method</h2>
              </div>
              
              <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                        <span className="text-white text-xl">💳</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 block">Pay with Paystack</span>
                        <span className="text-sm text-gray-600">Mobile Money, Card & Bank Transfer</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      After placing your order, you'll be redirected to Paystack to complete your payment securely.
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
                  <span>Delivery</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                    {getShippingLabel()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span>₵{total.toFixed(2)}</span>
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