import React, { useState, useEffect, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Truck, CreditCard, Loader2, Info, MapPin, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

// ========== DELIVERY ZONES ==========
const DELIVERY_ZONES = [
  { id: 'accra', label: 'Within Accra Delivery', fee: 30, area: 'accra' },
  { id: 'kumasi', label: 'Within Kumasi Delivery', fee: 30, area: 'kumasi' },
  { id: 'umat_doorstep', label: 'UMaT Main Campus – Doorstep Delivery', fee: 10, area: 'tarkwa' },
  { id: 'tarkwa', label: 'Within Tarkwa (Outside UMAT Campus)', fee: 25, area: 'tarkwa' },
  { id: 'outside', label: 'Outside Accra, Tarkwa & Kumasi', fee: 50, area: 'other' },
  { id: 'bus_station', label: 'Delivery to Bus Stations', fee: 25, area: 'station' },
];

// Areas that qualify for Pay on Delivery
const PAY_ON_DELIVERY_AREAS = ['accra', 'kumasi', 'tarkwa'];

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [showDepositWarning, setShowDepositWarning] = useState(false);
  const [depositWarningAccepted, setDepositWarningAccepted] = useState(false);
  const [showPodWarning, setShowPodWarning] = useState(false);
  const [podWarningAccepted, setPodWarningAccepted] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    landmark: '',
    region: '',
    city: '',
    map_location: '',
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

  // ========== CALCULATIONS ==========
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  const selectedZone = DELIVERY_ZONES.find(z => z.id === selectedZoneId);
  const deliveryFee = selectedZone ? selectedZone.fee : 0;

  // Check if selected zone qualifies for pay on delivery
  const isPayOnDeliveryArea = selectedZone ? PAY_ON_DELIVERY_AREAS.includes(selectedZone.area) : false;

  // Check if city/region also matches (double validation)
  const cityMatchesPodArea = useMemo(() => {
    const cityLower = (formData.city || '').toLowerCase().trim();
    const regionLower = (formData.region || '').toLowerCase().trim();
    const combined = cityLower + ' ' + regionLower;
    return combined.includes('accra') || combined.includes('kumasi') || combined.includes('tarkwa');
  }, [formData.city, formData.region]);

  // Final POD eligibility: delivery zone must be in POD area AND city/region must match
  const canUsePayOnDelivery = isPayOnDeliveryArea && cityMatchesPodArea;

  // Calculate order summary based on payment method
  const orderSummary = useMemo(() => {
    if (!paymentMethod || !selectedZoneId) {
      return { displaySubtotal: subtotal, deliveryFee, total: subtotal + deliveryFee, balanceDue: 0 };
    }

    if (paymentMethod === 'full_payment') {
      return {
        displaySubtotal: subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        balanceDue: 0,
        label: 'Full Amount',
      };
    }

    if (paymentMethod === 'deposit_balance') {
      const halfSubtotal = Math.ceil(subtotal / 2 * 100) / 100;
      return {
        displaySubtotal: halfSubtotal,
        deliveryFee,
        total: halfSubtotal + deliveryFee,
        balanceDue: subtotal - halfSubtotal,
        label: 'Deposit (half paid, balance on delivery)',
      };
    }

    if (paymentMethod === 'pay_on_delivery') {
      return {
        displaySubtotal: 0,
        deliveryFee,
        total: deliveryFee,
        balanceDue: subtotal,
        label: 'Payment on Delivery',
      };
    }

    return { displaySubtotal: subtotal, deliveryFee, total: subtotal + deliveryFee, balanceDue: 0 };
  }, [paymentMethod, subtotal, deliveryFee, selectedZoneId]);

  // ========== HANDLERS ==========
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
        setFormData(prev => ({ ...prev, map_location: googleMapsLink }));
        toast.success('📍 Location detected! Google Maps link added.');
      },
      (error) => {
        let errorMsg = 'Unable to get your location';
        if (error.code === 1) errorMsg = 'Location access denied. Please enable location in your settings.';
        else if (error.code === 2) errorMsg = 'Location service unavailable';
        else if (error.code === 3) errorMsg = 'Location request timed out';
        setLocationError(errorMsg);
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);
    setDepositWarningAccepted(false);
    setShowDepositWarning(false);
    setPodWarningAccepted(false);
    setShowPodWarning(false);

    if (value === 'deposit_balance') {
      setShowDepositWarning(true);
    }
    if (value === 'pay_on_delivery') {
      setShowPodWarning(true);
    }
  };

  // ========== SUBMIT ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !formData.region || !formData.city) {
      toast.error('Please fill in all required delivery information fields.');
      return;
    }
    if (!selectedZoneId) {
      toast.error('Please select a delivery method.');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method.');
      return;
    }
    if (paymentMethod === 'deposit_balance' && !depositWarningAccepted) {
      toast.error('Please read and accept the deposit payment terms before continuing.');
      return;
    }
    if (paymentMethod === 'pay_on_delivery' && !podWarningAccepted) {
      toast.error('Please read and accept the pay on delivery terms before continuing.');
      return;
    }
    if (paymentMethod === 'pay_on_delivery' && !canUsePayOnDelivery) {
      toast.error('Pay on Delivery is only available within Accra, Kumasi & Tarkwa. Please choose another payment method.');
      return;
    }

    if (orderSummary.total <= 0 || isNaN(orderSummary.total)) {
      toast.error('Order total is invalid. Please check your selections.');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    const orderNumber = 'FMM' + Date.now().toString(36).toUpperCase();
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

    try {
      const fullAddress = [formData.delivery_address, formData.landmark, formData.city, formData.region].filter(Boolean).join(', ');

      const orderPayload = {
        order_number: orderNumber,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          price: item.product_price,
          quantity: item.quantity,
        })),
        total_amount: orderSummary.total,
        subtotal_amount: subtotal,
        delivery_fee: deliveryFee,
        balance_due: orderSummary.balanceDue,
        payment_method: paymentMethod,
        payment_status: 'pending_payment',
        status: 'processing',
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: fullAddress,
        city: formData.city,
        map_location: formData.map_location || '',
        notes: formData.landmark ? `Landmark: ${formData.landmark}` : '',
        delivery_zone: selectedZoneId,
        estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
        tracking_updates: [
          {
            status: 'Order Placed',
            message: `Order created. Payment method: ${paymentMethod === 'full_payment' ? 'Full Payment' : paymentMethod === 'deposit_balance' ? 'Deposit + Balance on Delivery' : 'Pay on Delivery'}. Amount to pay now: GHS ${orderSummary.total.toFixed(2)}${orderSummary.balanceDue > 0 ? '. Balance due on delivery: GHS ' + orderSummary.balanceDue.toFixed(2) : ''}.`,
            timestamp: new Date().toISOString(),
          }
        ],
      };

      await base44.entities.Order.create(orderPayload);
      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      // Initiate Hubtel payment
      try {
        const callbackUrl = 'https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback';
        const returnUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${orderNumber}&status=success`;
        const cancellationUrl = `${window.location.origin}${createPageUrl('Orders')}?order=${orderNumber}&status=cancelled`;

        let payDescription = `Order ${orderNumber}`;
        if (paymentMethod === 'deposit_balance') payDescription = `Deposit for Order ${orderNumber}`;
        if (paymentMethod === 'pay_on_delivery') payDescription = `Delivery fee for Order ${orderNumber}`;

        const initRes = await initiatePayment({
          totalAmount: orderSummary.total,
          description: payDescription,
          callbackUrl,
          returnUrl,
          cancellationUrl,
          clientReference: orderNumber,
        });

        if (initRes && initRes.data && initRes.data.checkoutUrl) {
          toast.success('Redirecting to Hubtel payment...');
          window.location.href = initRes.data.checkoutUrl;
          return;
        }

        const errorMsg = initRes?.error || 'Unable to connect to payment gateway.';
        setOrderError(`Payment Error: ${errorMsg}. Your order #${orderNumber} has been created. Please try again from your Orders page.`);
        toast.error('Payment initiation failed. Please try again.');
      } catch (err) {
        console.error('[Checkout] Payment error:', err);
        setOrderError(`Payment Error: ${err.message || 'Unknown error'}. Order #${orderNumber} created. Try again from Orders page.`);
        toast.error('Payment initiation failed.');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      setOrderError('Unable to place your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== LOADING STATES ==========
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Button onClick={() => navigate(createPageUrl('Cart'))} variant="link" className="text-blue-600 font-semibold">
          ← Back to Cart
        </Button>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        {/* ORDER ITEMS PREVIEW */}
        <Card className="p-4 mb-6 bg-white">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>🛒</span> Your Items ({cartItems.length})
          </h2>
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                {item.product_image ? (
                  <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-400">No img</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">₵{(item.product_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ============ SECTION 1: CUSTOMER INFORMATION ============ */}
          <Card className="p-5 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Delivery Information
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Full Name *</Label>
                <Input
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Phone Number *</Label>
                <Input
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 0241234567"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">We will call/SMS this number for delivery. Must be reachable.</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Delivery Address *</Label>
                <Input
                  name="delivery_address"
                  value={formData.delivery_address}
                  onChange={handleInputChange}
                  placeholder="House number, street name, area"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Landmark</Label>
                <Input
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  placeholder="Near a school, church, market, etc."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Region *</Label>
                  <Input
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="e.g. Greater Accra"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">City *</Label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Accra"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* MAP LOCATION - GPS Auto-detect */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Map Location</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    name="map_location"
                    value={formData.map_location}
                    onChange={handleInputChange}
                    placeholder="GPS location will appear here"
                    className="flex-1"
                    readOnly
                  />
                  <Button
                    type="button"
                    onClick={getCurrentLocation}
                    variant="outline"
                    className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    📍 Get Location
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Click to auto-detect your GPS location for precise delivery.</p>
                {locationError && (
                  <p className="text-xs text-red-600 mt-1">⚠️ {locationError}</p>
                )}
              </div>
            </div>
          </Card>

          {/* ============ SECTION 2: DELIVERY METHOD ============ */}
          <Card className="p-5 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Delivery Method
            </h2>

            <RadioGroup value={selectedZoneId} onValueChange={(val) => { setSelectedZoneId(val); setPaymentMethod(''); setDepositWarningAccepted(false); setPodWarningAccepted(false); }}>
              <div className="space-y-2">
                {DELIVERY_ZONES.map(zone => (
                  <label
                    key={zone.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedZoneId === zone.id
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <RadioGroupItem value={zone.id} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{zone.label}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-700">₵{zone.fee}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>

            {!selectedZoneId && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <Info className="h-3 w-3" /> Please select a delivery method to continue.
              </p>
            )}
          </Card>

          {/* ============ SECTION 3: PAYMENT METHOD ============ */}
          {selectedZoneId && (
            <Card className="p-5 bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Payment Method
              </h2>

              <RadioGroup value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <div className="space-y-3">

                  {/* OPTION 1: Pay Full Amount Online */}
                  <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'full_payment'
                      ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                      : 'border-gray-200 hover:border-green-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="full_payment" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Pay Full Amount Online</p>
                        <p className="text-xs text-gray-500 mt-0.5">Pay product price + delivery fee in full now</p>
                      </div>
                      <span className="text-sm font-bold text-green-700">₵{(subtotal + deliveryFee).toFixed(2)}</span>
                    </div>
                  </label>

                  {/* OPTION 2: Pay Deposit, Balance on Delivery */}
                  <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'deposit_balance'
                      ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="deposit_balance" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Pay Deposit, Balance on Delivery</p>
                        <p className="text-xs text-gray-500 mt-0.5">Pay half of product price + delivery fee now. Pay remaining on delivery.</p>
                      </div>
                      <span className="text-sm font-bold text-orange-700">₵{(Math.ceil(subtotal / 2 * 100) / 100 + deliveryFee).toFixed(2)}</span>
                    </div>
                  </label>

                  {/* DEPOSIT WARNING */}
                  {showDepositWarning && paymentMethod === 'deposit_balance' && (
                    <div className="ml-7 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 mb-2">Important: Deposit Payment Terms</p>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            When the product is delivered and the customer does not pay immediately and in full cash the rest of the amount and we have to return the product, only half of the product deposit price he/she paid for will be refunded into their mobile money, or customer would have to come for pickup at our store (which delivery fee will not be refunded). Our customer service personnel will make sure customer is available before product is delivered. If not, product delivery date will be communicated. Hence, they must make sure the delivery details and contact numbers are correct before choosing this option.
                          </p>
                          <Button
                            type="button"
                            onClick={() => setDepositWarningAccepted(true)}
                            className={`mt-3 text-xs px-4 py-2 rounded-lg ${
                              depositWarningAccepted
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                            disabled={depositWarningAccepted}
                          >
                            {depositWarningAccepted ? '✓ Terms Accepted' : 'I Understand, Continue'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OPTION 3: Pay on Delivery */}
                  <div className={`rounded-xl border transition-all ${
                    !canUsePayOnDelivery && selectedZoneId
                      ? 'opacity-60 border-gray-200 bg-gray-50'
                      : paymentMethod === 'pay_on_delivery'
                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                        : 'border-gray-200 hover:border-purple-300'
                  }`}>
                    <label className={`block p-4 ${!canUsePayOnDelivery ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="pay_on_delivery" disabled={!canUsePayOnDelivery} />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">Pay on Delivery (within Accra, Kumasi & Tarkwa)</p>
                          <p className="text-xs text-gray-500 mt-0.5">Only pay delivery fee now. Pay for product when it arrives.</p>
                        </div>
                        {canUsePayOnDelivery && (
                          <span className="text-sm font-bold text-purple-700">₵{deliveryFee.toFixed(2)}</span>
                        )}
                      </div>
                    </label>

                    {/* NOT ELIGIBLE WARNING */}
                    {!canUsePayOnDelivery && selectedZoneId && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Not available: Your delivery location is not within Accra, Kumasi, or Tarkwa.
                        </p>
                      </div>
                    )}

                    {/* PRODUCT OVER 200 CEDIS RECOMMENDATION */}
                    {canUsePayOnDelivery && subtotal > 200 && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-amber-700 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
                          <Info className="h-3 w-3 shrink-0" />
                          Your product total is above ₵200. We recommend choosing "Pay Deposit, Balance on Delivery" for orders above ₵200.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PAY ON DELIVERY WARNING */}
                  {showPodWarning && paymentMethod === 'pay_on_delivery' && canUsePayOnDelivery && (
                    <div className="ml-7 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-purple-800 mb-2">Important: Pay on Delivery Terms</p>
                          <p className="text-xs text-purple-700 leading-relaxed">
                            If product is delivered and upon delivery customer does not pay the product amount in full, product will not be given to them, and their delivery fee will not be refunded. If product is returned, customer must place another order on our website or come for pickup at our store (which delivery fee will not be refunded). Customer must be available before product is delivered. If not, product delivery date will be communicated.
                          </p>
                          <Button
                            type="button"
                            onClick={() => setPodWarningAccepted(true)}
                            className={`mt-3 text-xs px-4 py-2 rounded-lg ${
                              podWarningAccepted
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                            disabled={podWarningAccepted}
                          >
                            {podWarningAccepted ? '✓ Terms Accepted' : 'I Understand, Continue'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </RadioGroup>
            </Card>
          )}

          {/* ============ ORDER SUMMARY ============ */}
          {selectedZoneId && paymentMethod && (
            <Card className="p-5 bg-white border-2 border-blue-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Order Summary
              </h2>

              <div className="space-y-3">
                {/* Subtotal line */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {paymentMethod === 'pay_on_delivery'
                      ? 'Subtotal (Payment on Delivery)'
                      : paymentMethod === 'deposit_balance'
                        ? `Subtotal (₵${(Math.ceil(subtotal / 2 * 100) / 100).toFixed(2)} – half will be paid upon delivery)`
                        : 'Subtotal'
                    }
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {paymentMethod === 'pay_on_delivery'
                      ? 'On Delivery'
                      : paymentMethod === 'deposit_balance'
                        ? `₵${(Math.ceil(subtotal / 2 * 100) / 100).toFixed(2)}`
                        : `₵${subtotal.toFixed(2)}`
                    }
                  </span>
                </div>

                {/* Delivery fee line */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Delivery Fee ({selectedZone?.label})</span>
                  <span className="text-sm font-semibold text-gray-900">₵{deliveryFee.toFixed(2)}</span>
                </div>

                <Separator />

                {/* Total to pay now */}
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total to Pay Now</span>
                  <span className="text-xl font-bold text-blue-700">₵{orderSummary.total.toFixed(2)}</span>
                </div>

                {/* Balance due on delivery */}
                {orderSummary.balanceDue > 0 && (
                  <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">
                      {paymentMethod === 'pay_on_delivery' ? 'Product Payment Due on Delivery' : 'Balance Due on Delivery'}
                    </span>
                    <span className="text-sm font-bold text-amber-800">₵{orderSummary.balanceDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ============ PAY BUTTON ============ */}
          {selectedZoneId && paymentMethod && (
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting || (paymentMethod === 'deposit_balance' && !depositWarningAccepted) || (paymentMethod === 'pay_on_delivery' && !podWarningAccepted)}
                className="w-full rounded-xl bg-blue-800 px-4 py-4 text-white font-bold text-base hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed h-14"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `💳 Pay ₵${orderSummary.total.toFixed(2)} with Hubtel`
                )}
              </Button>

              {/* Hubtel trust badge */}
              <div className="text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Secured by Hubtel • Mobile Money • Debit Card • Bank Transfer
                </p>
              </div>

              {orderError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">{orderError}</p>
              )}
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
