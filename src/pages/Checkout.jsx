import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { initiatePayment } from '@/api/hubtelClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, CreditCard, Loader2, Info, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const DELIVERY_ZONES = [
  { id: 'accra', label: 'Within Accra Delivery', fee: 30, area: 'accra' },
  { id: 'kumasi', label: 'Within Kumasi Delivery', fee: 30, area: 'kumasi' },
  { id: 'umat_doorstep', label: 'UMaT Main Campus – Doorstep Delivery', fee: 0.5, area: 'tarkwa' },
  { id: 'tarkwa', label: 'Within Tarkwa (Outside UMAT Campus)', fee: 25, area: 'tarkwa' },
  { id: 'outside', label: 'Outside Accra, Tarkwa & Kumasi', fee: 50, area: 'other' },
  { id: 'bus_station', label: 'Delivery to Bus Stations', fee: 25, area: 'station' },
];

const PAY_ON_DELIVERY_AREAS = ['accra', 'kumasi', 'tarkwa'];

const REGION_AREAS = {
  accra: ['accra', 'tema', 'madina', 'east legon', 'spintex', 'adenta', 'ashongman', 'kasoa', 'osu', 'labone', 'cantonments', 'airport', 'circle', 'makola', 'dansoman', 'kaneshie', 'achimota', 'legon', 'teshie', 'nungua', 'labadi', 'korle bu', 'weija', 'gbawe', 'mallam', 'lapaz', 'tesano', 'north kaneshie', 'abeka'],
  kumasi: ['kumasi', 'adum', 'kejetia', 'bantama', 'suame', 'manhyia', 'asafo', 'atonsu', 'tafo', 'bomso', 'ayigya', 'kotei', 'knust', 'oforikrom', 'kentinkrono', 'ahinsan', 'sokoban', 'daban', 'emena', 'ejisu'],
  tarkwa: ['tarkwa', 'umat', 'aboso', 'nsuta', 'bogoso', 'prestea', 'huni valley'],
};

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatVariantSummary(item) {
  if (item?.variant_summary) return item.variant_summary;

  const parts = [];
  if (item?.selected_color) parts.push(`Color: ${item.selected_color}`);
  if (item?.selected_wattage) parts.push(`Wattage: ${item.selected_wattage}`);
  if (item?.selected_type) parts.push(`Type: ${item.selected_type}`);
  return parts.join(' • ');
}

export default function Checkout() {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [depositWarningAccepted, setDepositWarningAccepted] = useState(false);
  const [podWarningAccepted, setPodWarningAccepted] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    region: '',
    city: '',
    map_location: '',
  });

  useEffect(() => {
    setIsSubmitting(false);
    appClient.auth.me()
      .then((userData) => {
        setUser(userData);
        setFormData((prev) => ({ ...prev, customer_name: userData.full_name || '' }));
      })
      .catch(() => appClient.auth.redirectToLogin(createPageUrl('Home')));
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => appClient.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (toNumber(item.product_price) * toNumber(item.quantity, 1)), 0);
  }, [cartItems]);

  const selectedZone = DELIVERY_ZONES.find((zone) => zone.id === selectedZoneId);
  const deliveryFee = selectedZone ? selectedZone.fee : 0;
  const payOnDeliveryZoneEligible = selectedZone ? PAY_ON_DELIVERY_AREAS.includes(selectedZone.area) : false;

  const cityMatchesPodArea = useMemo(() => {
    const combined = `${formData.city || ''} ${formData.region || ''}`.toLowerCase();
    return combined.includes('accra') || combined.includes('kumasi') || combined.includes('tarkwa');
  }, [formData.city, formData.region]);

  const canUsePayOnDelivery = payOnDeliveryZoneEligible;
  const isPayOnDeliveryAddressConfirmed = canUsePayOnDelivery && cityMatchesPodArea;
  const requiresTermsAcceptance = paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery';
  const termsAccepted = paymentMethod === 'deposit_balance'
    ? depositWarningAccepted
    : paymentMethod === 'pay_on_delivery'
      ? podWarningAccepted
      : true;
  const canRevealOrderSummary = selectedZoneId && paymentMethod && (!requiresTermsAcceptance || termsAccepted);

  const locationMismatch = useMemo(() => {
    const region = (formData.region || '').toLowerCase().trim();
    const city = (formData.city || '').toLowerCase().trim();
    if (!region || !city) return false;

    let regionGroup = null;
    if (region.includes('accra') || region.includes('greater accra')) regionGroup = 'accra';
    else if (region.includes('kumasi') || region.includes('ashanti')) regionGroup = 'kumasi';
    else if (region.includes('tarkwa') || region.includes('western')) regionGroup = 'tarkwa';

    if (!regionGroup) return false;

    for (const [group, towns] of Object.entries(REGION_AREAS)) {
      if (group === regionGroup) continue;
      if (towns.some((town) => city.includes(town) || town.includes(city))) {
        return true;
      }
    }

    return false;
  }, [formData.region, formData.city]);

  const orderSummary = useMemo(() => {
    if (!paymentMethod || !selectedZoneId) {
      return {
        displaySubtotal: subtotal,
        deliveryFee,
        grandTotal: subtotal + deliveryFee,
        totalToPayNow: subtotal + deliveryFee,
        balanceDue: 0,
      };
    }

    if (paymentMethod === 'full_payment') {
      return {
        displaySubtotal: subtotal,
        deliveryFee,
        grandTotal: subtotal + deliveryFee,
        totalToPayNow: subtotal + deliveryFee,
        balanceDue: 0,
      };
    }

    if (paymentMethod === 'deposit_balance') {
      const halfSubtotal = Math.ceil((subtotal / 2) * 100) / 100;
      return {
        displaySubtotal: halfSubtotal,
        deliveryFee,
        grandTotal: subtotal + deliveryFee,
        totalToPayNow: halfSubtotal + deliveryFee,
        balanceDue: subtotal - halfSubtotal,
      };
    }

    if (paymentMethod === 'pay_on_delivery') {
      return {
        displaySubtotal: 0,
        deliveryFee,
        grandTotal: subtotal + deliveryFee,
        totalToPayNow: deliveryFee,
        balanceDue: subtotal,
      };
    }

    return {
      displaySubtotal: subtotal,
      deliveryFee,
      grandTotal: subtotal + deliveryFee,
      totalToPayNow: subtotal + deliveryFee,
      balanceDue: 0,
    };
  }, [paymentMethod, subtotal, deliveryFee, selectedZoneId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const link = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}&z=15`;
        setFormData((prev) => ({ ...prev, map_location: link }));
        toast.success('📍 Location detected!');
      },
      (error) => {
        const msg = error.code === 1 ? 'Location access denied' : error.code === 2 ? 'Location unavailable' : 'Location timed out';
        setLocationError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);
    setDepositWarningAccepted(false);
    setPodWarningAccepted(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address || !formData.region || !formData.city) {
      toast.error('Please fill in all required delivery fields.');
      return;
    }
    if (locationMismatch) {
      toast.error('Your Region and City/Town do not match. Please correct them.');
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
      toast.error('Please accept the deposit payment terms.');
      return;
    }
    if (paymentMethod === 'pay_on_delivery' && !podWarningAccepted) {
      toast.error('Please accept the pay on delivery terms.');
      return;
    }
    if (paymentMethod === 'pay_on_delivery' && (!payOnDeliveryZoneEligible || !cityMatchesPodArea)) {
      toast.error('Pay on Delivery is only available for eligible Accra, Kumasi, and Tarkwa addresses.');
      return;
    }
    if (orderSummary.totalToPayNow <= 0 || Number.isNaN(orderSummary.totalToPayNow)) {
      toast.error('Order total is invalid.');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    const orderNumber = `FMM${Date.now().toString(36).toUpperCase()}`;

    try {
      const fullAddress = [formData.delivery_address, formData.city, formData.region].filter(Boolean).join(', ');
      const payMethodLabel = paymentMethod === 'full_payment'
        ? 'Full Payment'
        : paymentMethod === 'deposit_balance'
          ? 'Deposit + Balance on Delivery'
          : 'Pay on Delivery';

      const orderItems = cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        price: toNumber(item.product_price),
        quantity: toNumber(item.quantity, 1),
        selected_color: item.selected_color || null,
        selected_wattage: item.selected_wattage || null,
        selected_type: item.selected_type || null,
        variant_summary: item.variant_summary || formatVariantSummary(item) || '',
        options_signature: item.options_signature || '',
      }));

      const nowIso = new Date().toISOString();
      const balanceAlreadyPaid = paymentMethod === 'full_payment' || orderSummary.balanceDue <= 0;

      const orderPayload = {
        order_number: orderNumber,
        items: orderItems,
        product_subtotal: subtotal,
        delivery_fee: deliveryFee,
        grand_total: orderSummary.grandTotal,
        amount_paid_now: orderSummary.totalToPayNow,
        total_amount: orderSummary.grandTotal,
        balance_due: orderSummary.balanceDue,
        remaining_balance_paid: balanceAlreadyPaid,
        remaining_balance_paid_at: balanceAlreadyPaid ? nowIso : null,
        payment_method: paymentMethod,
        delivery_zone: selectedZoneId,
        payment_status: 'pending_payment',
        status: 'confirmed',
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: fullAddress,
        city: formData.city,
        map_location: formData.map_location || '',
        notes: '',
        tracking_updates: [
          {
            status: 'Order Placed',
            message: `Payment method: ${payMethodLabel}. Amount charged now: GHS ${orderSummary.totalToPayNow.toFixed(2)}${orderSummary.balanceDue > 0 ? `. Remaining balance: GHS ${orderSummary.balanceDue.toFixed(2)} to be paid on delivery.` : ''}`,
            timestamp: nowIso,
          },
        ],
      };

      await appClient.entities.Order.create(orderPayload);
      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      const callbackUrl = 'https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback';
      const returnUrl = window.location.origin + createPageUrl('Orders');
      const cancellationUrl = window.location.origin + createPageUrl('Orders');

      let payDescription = `Order ${orderNumber}`;
      if (paymentMethod === 'deposit_balance') payDescription = `Deposit for Order ${orderNumber}`;
      if (paymentMethod === 'pay_on_delivery') payDescription = `Delivery fee for Order ${orderNumber}`;

      const initRes = await initiatePayment({
        totalAmount: orderSummary.totalToPayNow,
        description: payDescription,
        callbackUrl,
        returnUrl,
        cancellationUrl,
        clientReference: orderNumber,
      });

      if (initRes && initRes.data && initRes.data.checkoutUrl) {
        toast.success('Redirecting to Hubtel...');
        window.location.href = initRes.data.checkoutUrl;
        return;
      }

      setOrderError(`Payment failed: ${initRes?.error || 'Unknown error'}. Order #${orderNumber} was still created.`);
      toast.error('Payment initiation failed.');
    } catch (error) {
      console.error('Order error:', error);
      setOrderError('Unable to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Button onClick={() => navigate(createPageUrl('Cart'))} variant="link" className="text-blue-600">← Back to Cart</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

        <Card className="p-4 mb-6 bg-white">
          <h2 className="font-semibold text-gray-800 mb-3">🛒 Your Items ({cartItems.length})</h2>
          <div className="space-y-2">
            {cartItems.map((item) => {
              const variantSummary = formatVariantSummary(item);
              return (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  {item.product_image ? <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-gray-200" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    {variantSummary && <p className="text-xs text-blue-700 mt-0.5">{variantSummary}</p>}
                  </div>
                  <p className="text-sm font-semibold">₵{(toNumber(item.product_price) * toNumber(item.quantity, 1)).toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-5 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-600" /> Delivery Information</h2>
            <div className="space-y-4">
              <div><Label className="text-sm font-medium">Full Name *</Label><Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} required className="mt-1" /></div>
              <div><Label className="text-sm font-medium">Phone Number *</Label><Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} required className="mt-1" /><p className="text-xs text-gray-500 mt-1">Must be reachable for delivery.</p></div>
              <div><Label className="text-sm font-medium">Delivery Address *</Label><Input name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} placeholder="House number, street name, area" required className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Region *</Label>
                  <Input name="region" value={formData.region} onChange={handleInputChange} required className={`mt-1 ${locationMismatch ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
                <div>
                  <Label className="text-sm font-medium">City/Town *</Label>
                  <Input name="city" value={formData.city} onChange={handleInputChange} required className={`mt-1 ${locationMismatch ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
              </div>
              {locationMismatch && <p className="text-xs text-red-600 flex items-center gap-1 font-medium"><AlertTriangle className="h-3 w-3" /> Region and City/Town do not match. Please correct.</p>}
              <div>
                <Label className="text-sm font-medium">Map Location</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input name="map_location" value={formData.map_location} onChange={handleInputChange} className="flex-1" readOnly />
                  <Button type="button" onClick={getCurrentLocation} variant="outline" className="shrink-0 border-blue-300 text-blue-700">📍 Get Location</Button>
                </div>
                {locationError && <p className="text-xs text-red-600 mt-1">⚠️ {locationError}</p>}
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Truck className="h-5 w-5 text-blue-600" /> Delivery Method</h2>
            <Select value={selectedZoneId} onValueChange={(value) => { setSelectedZoneId(value); setPaymentMethod(''); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select delivery method" /></SelectTrigger>
              <SelectContent>
                {DELIVERY_ZONES.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.label} — ₵{zone.fee}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedZone && <p className="text-xs text-blue-600 mt-2 font-medium">Delivery fee: ₵{deliveryFee.toFixed(2)}</p>}
          </Card>

          {selectedZoneId && (
            <Card className="p-5 bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-600" /> Payment Method</h2>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_payment">Pay Full Amount Online — ₵{(subtotal + deliveryFee).toFixed(2)}</SelectItem>
                  <SelectItem value="deposit_balance">Pay Deposit, Balance on Delivery — ₵{(Math.ceil((subtotal / 2) * 100) / 100 + deliveryFee).toFixed(2)}</SelectItem>
                  <SelectItem value="pay_on_delivery" disabled={!payOnDeliveryZoneEligible}>Pay on Delivery (Accra, Kumasi & Tarkwa) — ₵{deliveryFee.toFixed(2)}</SelectItem>
                </SelectContent>
              </Select>

              {!payOnDeliveryZoneEligible && selectedZoneId && <p className="text-xs text-gray-500 mt-2">Pay on Delivery only available within Accra, Kumasi & Tarkwa.</p>}
              {canUsePayOnDelivery && !isPayOnDeliveryAddressConfirmed && paymentMethod === 'pay_on_delivery' && <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><Info className="h-3 w-3" /> Complete your city and region with a matching Accra, Kumasi, or Tarkwa address before placing this order.</p>}
              {canUsePayOnDelivery && subtotal > 200 && paymentMethod === 'pay_on_delivery' && <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><Info className="h-3 w-3" /> Product above ₵200. We recommend "Pay Deposit" instead.</p>}

              {paymentMethod === 'deposit_balance' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 mb-2">Deposit Payment Terms</p><ul className="text-xs text-amber-700 leading-relaxed list-disc pl-4 space-y-2">
                        <li><strong>Pay the remaining balance in full before the product is handed over</strong> at the time of delivery.</li>
                        <li><strong>If full payment is not made, the product will be returned.</strong> Customers may either receive a <strong>50% refund of their deposit</strong>, which will be processed <strong>within 2 days after the returned product has been received and verified at our store</strong>, or arrange <strong>store pickup or redelivery at their own expense</strong> after paying the outstanding balance.</li>
                        <li><strong>Delivery fees are non-refundable</strong> under all circumstances.</li>
                        <li><strong>Customers must provide accurate delivery details and contact information.</strong> Our Customer Service team will contact customers before dispatch to confirm their availability.</li>
                      </ul>
                      <Button type="button" onClick={() => setDepositWarningAccepted(true)} className={`mt-3 text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white ${depositWarningAccepted ? 'opacity-90' : ''}`} disabled={depositWarningAccepted}>
                        {depositWarningAccepted ? '✓ I agree' : 'I agree'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'pay_on_delivery' && canUsePayOnDelivery && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-purple-800 mb-2">Pay on Delivery Terms</p><ul className="text-xs text-purple-700 leading-relaxed list-disc pl-4 space-y-2">
                        <li><strong>Pay the full outstanding balance before the product is handed over</strong> at the time of delivery.</li>
                        <li><strong>If full payment is not made, the product will be returned.</strong> Customers may either receive a <strong>50% refund of their deposit</strong>, which will be processed <strong>within 2 days after the returned product has been received and verified at our store</strong>, or pay the outstanding balance and arrange <strong>store pickup or redelivery at their own expense</strong>.</li>
                        <li><strong>Delivery fees are non-refundable</strong> under all circumstances.</li>
                        <li><strong>Customers must provide accurate delivery details and contact information.</strong> Our Customer Service team will contact customers before dispatch to confirm their availability.</li>
                      </ul>
                      <Button type="button" onClick={() => setPodWarningAccepted(true)} className={`mt-3 text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white ${podWarningAccepted ? 'opacity-90' : ''}`} disabled={podWarningAccepted}>
                        {podWarningAccepted ? '✓ I agree' : 'I agree'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {requiresTermsAcceptance && !termsAccepted && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  Review the payment policy above and click <strong>I agree</strong> before the order summary appears.
                </div>
              )}
            </Card>
          )}

          {canRevealOrderSummary && (
            <Card className="p-5 bg-white border-2 border-blue-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" /> Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-gray-600">{paymentMethod === 'pay_on_delivery' ? 'Product Amount' : paymentMethod === 'deposit_balance' ? `Deposit Portion (₵${(Math.ceil((subtotal / 2) * 100) / 100).toFixed(2)})` : 'Product Amount'}</span><span className="text-sm font-semibold">{paymentMethod === 'pay_on_delivery' ? 'On Delivery' : `₵${orderSummary.displaySubtotal.toFixed(2)}`}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-600">Delivery Fee</span><span className="text-sm font-semibold">₵{deliveryFee.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-base font-bold">Total Order Value</span><span className="text-base font-bold text-gray-900">₵{orderSummary.grandTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-base font-bold">Total to Pay Now</span><span className="text-xl font-bold text-blue-700">₵{orderSummary.totalToPayNow.toFixed(2)}</span></div>
                {orderSummary.balanceDue > 0 && <div className="flex justify-between bg-amber-50 p-3 rounded-lg"><span className="text-sm font-medium text-amber-800">Remaining Product Balance</span><span className="text-sm font-bold text-amber-800">₵{orderSummary.balanceDue.toFixed(2)}</span></div>}
              </div>
            </Card>
          )}

          {canRevealOrderSummary && (
            <div className="space-y-3">
              <Button type="submit" disabled={isSubmitting || locationMismatch || (paymentMethod === 'deposit_balance' && !depositWarningAccepted) || (paymentMethod === 'pay_on_delivery' && !podWarningAccepted)} className="w-full rounded-xl bg-blue-800 px-4 py-4 text-white font-bold text-base hover:bg-blue-900 disabled:opacity-50 h-14">
                {isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Processing...</span> : `💳 Pay ₵${orderSummary.totalToPayNow.toFixed(2)} with Hubtel`}
              </Button>
              <p className="text-xs text-gray-500 text-center"><ShieldCheck className="h-3 w-3 inline" /> Secured by Hubtel</p>
              {orderError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">{orderError}</p>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
