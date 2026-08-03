import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { createInitialPaymentReference, createBalancePaymentReference, initiatePayment } from '@/api/hubtelClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, CreditCard, Loader2, Info, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import InlineNotice from '@/components/ui/InlineNotice';
import {
  getAllowedDeliveryZoneIds,
  isTwoStagePaymentEligibleForZone,
  validateGhanaLocationPair,
} from '@/lib/ghanaLocations';

const DELIVERY_ZONES = [
  { id: 'accra', label: 'Within Accra Delivery', fee: 30 },
  { id: 'kumasi', label: 'Within Kumasi Delivery', fee: 30 },
  { id: 'umat_doorstep', label: 'UMaT Main Campus – Doorstep Delivery', fee: 10 },
  { id: 'tarkwa', label: 'Approved Tarkwa In-Town Delivery', fee: 25 },
  { id: 'outside', label: 'Outside Kumasi, Accra & Tarkwa', fee: 50 },
  { id: 'bus_station', label: 'Delivery to Bus Stations', fee: 25 },
];

const TWO_STAGE_ZONE_IDS = ['accra', 'kumasi', 'umat_doorstep', 'tarkwa'];

const HUBTEL_CALLBACK_URL = 'https://kptlejtauwqvaapsrjfx.supabase.co/functions/v1/hubtel-callback';

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
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
  const [feedback, setFeedback] = useState(null);
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
    delivery_landmark: '',
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

  const safeCartItems = ensureArray(cartItems);
  const subtotal = useMemo(() => safeCartItems.reduce((sum, item) => sum + (toNumber(item.product_price) * toNumber(item.quantity, 1)), 0), [safeCartItems]);
  const locationValidation = useMemo(() => validateGhanaLocationPair({
    regionInput: formData.region,
    cityInput: formData.city,
  }), [formData.region, formData.city]);

  const allowedZoneIds = useMemo(() => getAllowedDeliveryZoneIds({
    regionInput: formData.region,
    cityInput: formData.city,
    addressInput: formData.delivery_address,
    landmarkInput: formData.delivery_landmark,
  }), [formData.region, formData.city, formData.delivery_address, formData.delivery_landmark]);

  const availableDeliveryZones = useMemo(() => DELIVERY_ZONES.filter((zone) => allowedZoneIds.includes(zone.id)), [allowedZoneIds]);
  const selectedZone = DELIVERY_ZONES.find((zone) => zone.id === selectedZoneId);
  const deliveryFee = selectedZone ? selectedZone.fee : 0;
  const isTwoStageZoneEligible = TWO_STAGE_ZONE_IDS.includes(selectedZoneId);

  const locationMismatch = locationValidation.isReady && !locationValidation.isValid;

  const strictTwoStageLocationMatch = useMemo(() => {
    if (!isTwoStageZoneEligible) return false;
    return isTwoStagePaymentEligibleForZone(selectedZoneId, {
      regionInput: formData.region,
      cityInput: formData.city,
      addressInput: formData.delivery_address,
      landmarkInput: formData.delivery_landmark,
    });
  }, [selectedZoneId, isTwoStageZoneEligible, formData]);

  useEffect(() => {
    if (selectedZoneId && !allowedZoneIds.includes(selectedZoneId)) {
      setSelectedZoneId('');
      setPaymentMethod('');
      setDepositWarningAccepted(false);
      setPodWarningAccepted(false);
    }
  }, [allowedZoneIds, selectedZoneId]);

  const requiresTermsAcceptance = paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery';
  const termsAccepted = paymentMethod === 'deposit_balance'
    ? depositWarningAccepted
    : paymentMethod === 'pay_on_delivery'
      ? podWarningAccepted
      : true;
  const canRevealOrderSummary = selectedZoneId && paymentMethod && (!requiresTermsAcceptance || termsAccepted);

  const orderSummary = useMemo(() => {
    if (!paymentMethod || !selectedZoneId) {
      return { displaySubtotal: subtotal, deliveryFee, grandTotal: subtotal + deliveryFee, totalToPayNow: subtotal + deliveryFee, balanceDue: 0 };
    }
    if (paymentMethod === 'full_payment') {
      return { displaySubtotal: subtotal, deliveryFee, grandTotal: subtotal + deliveryFee, totalToPayNow: subtotal + deliveryFee, balanceDue: 0 };
    }
    if (paymentMethod === 'deposit_balance') {
      const halfSubtotal = Math.ceil((subtotal / 2) * 100) / 100;
      return { displaySubtotal: halfSubtotal, deliveryFee, grandTotal: subtotal + deliveryFee, totalToPayNow: halfSubtotal + deliveryFee, balanceDue: subtotal - halfSubtotal };
    }
    return { displaySubtotal: 0, deliveryFee, grandTotal: subtotal + deliveryFee, totalToPayNow: deliveryFee, balanceDue: subtotal };
  }, [paymentMethod, subtotal, deliveryFee, selectedZoneId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showFeedback = (variant, message, title) => {
    setFeedback({ variant, message, title });
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
        setFormData((prev) => ({
          ...prev,
          map_location: `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}&z=15`,
        }));
        showFeedback('success', 'Your location link was added successfully.', 'Location detected');
      },
      (error) => {
        const msg = error.code === 1 ? 'Location access denied' : error.code === 2 ? 'Location unavailable' : 'Location timed out';
        setLocationError(msg);
        showFeedback('error', msg, 'Location unavailable');
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
      showFeedback('error', 'Please fill in all required delivery fields before continuing.', 'Complete the form');
      return;
    }
    if (!locationValidation.isValid) {
      showFeedback('error', locationValidation.message || 'Please enter a valid Ghana Region and City/Town combination before continuing.', 'Address check');
      return;
    }
    if (!selectedZoneId) {
      showFeedback('error', 'Please select a delivery method before proceeding.', 'Delivery method required');
      return;
    }
    if (!paymentMethod) {
      showFeedback('error', 'Please select a payment method before proceeding.', 'Payment method required');
      return;
    }
    if ((paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery') && !strictTwoStageLocationMatch) {
      showFeedback('warning', 'Deposit and pay-on-delivery are only available for approved Accra, Kumasi and Tarkwa addresses. Use the full online payment option if your address does not qualify.', 'Delivery restriction');
      return;
    }
    if (paymentMethod === 'deposit_balance' && !depositWarningAccepted) {
      showFeedback('warning', 'Please accept the deposit payment terms before continuing.', 'Action needed');
      return;
    }
    if (paymentMethod === 'pay_on_delivery' && !podWarningAccepted) {
      showFeedback('warning', 'Please accept the pay on delivery terms before continuing.', 'Action needed');
      return;
    }
    if (orderSummary.totalToPayNow <= 0 || Number.isNaN(orderSummary.totalToPayNow)) {
      showFeedback('error', 'The order total is invalid. Please review your cart and try again.', 'Unable to continue');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');
    const orderNumber = `FMM${Date.now().toString(36).toUpperCase()}`;

    try {
      const fullAddress = [formData.delivery_address, formData.delivery_landmark, formData.city, formData.region].filter(Boolean).join(', ');
      const payMethodLabel = paymentMethod === 'full_payment'
        ? 'Full Payment'
        : paymentMethod === 'deposit_balance'
          ? 'Deposit Now, Balance on Delivery'
          : 'Delivery Fee Now, Balance on Delivery';

      const orderItems = safeCartItems.map((item) => ({
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
      const initialPaymentReference = createInitialPaymentReference(orderNumber, paymentMethod);
      const balancePaymentReference = paymentMethod === 'full_payment' ? '' : createBalancePaymentReference(orderNumber);
      const createdOrder = await appClient.entities.Order.create({
        order_number: orderNumber,
        items: orderItems,
        product_subtotal: subtotal,
        delivery_fee: deliveryFee,
        grand_total: orderSummary.grandTotal,
        amount_paid_now: orderSummary.totalToPayNow,
        initial_payment_amount: orderSummary.totalToPayNow,
        balance_payment_amount: orderSummary.balanceDue,
        total_amount: orderSummary.grandTotal,
        balance_due: orderSummary.balanceDue,
        remaining_balance_paid: paymentMethod === 'full_payment',
        remaining_balance_paid_at: paymentMethod === 'full_payment' ? nowIso : null,
        payment_method: paymentMethod,
        delivery_zone: selectedZoneId,
        payment_status: 'pending_payment',
        initial_payment_status: 'pending',
        balance_payment_status: paymentMethod === 'full_payment' ? 'not_required' : 'pending',
        payment_stage: 'awaiting_initial_payment',
        is_fully_paid: false,
        balance_payment_enabled: paymentMethod === 'full_payment',
        initial_payment_reference: initialPaymentReference,
        balance_payment_reference: balancePaymentReference,
        payment_reference: initialPaymentReference,
        hubtel_status: 'pending',
        status: 'confirmed',
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        delivery_address: fullAddress,
        delivery_landmark: formData.delivery_landmark,
        city: formData.city,
        map_location: formData.map_location || '',
        notes: 'Pending Hubtel verification. Keep hidden until the initial payment is confirmed.',
        tracking_updates: [{
          status: 'Awaiting Payment Confirmation',
          message: `Hubtel checkout started for ${payMethodLabel}. Amount to verify now: GHS ${orderSummary.totalToPayNow.toFixed(2)}. This order must stay hidden until payment is confirmed.`,
          timestamp: nowIso,
        }],
      });

      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      const returnUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&orderId=${createdOrder.id}`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=cancelled&orderId=${createdOrder.id}`;
      const payDescription = paymentMethod === 'deposit_balance'
        ? `Deposit and delivery for order ${orderNumber}`
        : paymentMethod === 'pay_on_delivery'
          ? `Delivery fee for order ${orderNumber}`
          : `Full payment for order ${orderNumber}`;

      const initRes = await initiatePayment({
        totalAmount: orderSummary.totalToPayNow,
        description: payDescription,
        callbackUrl: HUBTEL_CALLBACK_URL,
        returnUrl,
        cancellationUrl,
        clientReference: initialPaymentReference,
      });

      if (initRes?.data?.checkoutUrl) {
        showFeedback('info', 'Redirecting you to Hubtel for secure payment...', 'Opening payment');
        window.location.href = initRes.data.checkoutUrl;
        return;
      }

      try {
        await appClient.entities.Order.update(createdOrder.id, {
          payment_status: 'failed',
          initial_payment_status: 'failed',
          hubtel_status: 'failed',
          tracking_updates: (createdOrder.tracking_updates || []).concat([{
            status: 'Checkout Initiation Failed',
            message: 'Hubtel checkout could not be started. The cart remains intact and the order stays hidden.',
            timestamp: new Date().toISOString(),
          }]),
        });
      } catch (updateError) {
        console.warn('Unable to mark pending checkout as failed after initiate error:', updateError);
      }

      setOrderError('Unable to start Hubtel payment. Your cart is still available and no visible order was placed.');
      showFeedback('error', 'Hubtel payment could not be started. Your cart is still available and no visible order was placed.', 'Payment initiation failed');
    } catch (error) {
      console.error('Checkout error:', error);
      setOrderError('Unable to start checkout right now. Your cart was not cleared.');
      showFeedback('error', 'Unable to start checkout right now. Your cart was not cleared.', 'Checkout unavailable');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (safeCartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <Button onClick={() => navigate(createPageUrl('Cart'))} variant="link" className="text-blue-600">
          Back to Cart
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
        <InlineNotice
          variant={feedback?.variant}
          title={feedback?.title}
          message={feedback?.message}
          onDismiss={() => setFeedback(null)}
          className="mb-4"
        />

        <Card className="p-4 mb-6 bg-white">
          <h2 className="font-semibold text-gray-800 mb-3">Your Items ({safeCartItems.length})</h2>
          <div className="space-y-2">
            {safeCartItems.map((item) => {
              const variantSummary = formatVariantSummary(item);
              return (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200" />
                  )}
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
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" /> Delivery Information
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Full Name *</Label>
                <Input name="customer_name" value={formData.customer_name} onChange={handleInputChange} required className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Phone Number *</Label>
                <Input name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} required className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Delivery Address *</Label>
                <Input name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} placeholder="House number, street name, area" required className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Nearest Landmark <span className="text-gray-400">(Optional)</span></Label>
                <Input name="delivery_landmark" value={formData.delivery_landmark} onChange={handleInputChange} placeholder="Nearest landmark or reference point" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Region *</Label>
                  <Input name="region" value={formData.region} onChange={handleInputChange} placeholder="e.g. Greater Accra, Accra, Ashanti or Kumasi" required className={`mt-1 ${locationMismatch ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
                <div>
                  <Label className="text-sm font-medium">City/Town *</Label>
                  <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. East Legon, Madina, Manhyia or Abuakwa" required className={`mt-1 ${locationMismatch ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
              </div>
              {locationValidation.isReady && (
                <p className={`text-xs flex items-center gap-1 font-medium ${locationValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  <AlertTriangle className="h-3 w-3" /> {locationValidation.message}
                </p>
              )}
              <div>
                <Label className="text-sm font-medium">Map Location</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input name="map_location" value={formData.map_location} onChange={handleInputChange} className="flex-1" readOnly />
                  <Button type="button" onClick={getCurrentLocation} variant="outline" className="shrink-0 border-blue-300 text-blue-700">
                    Get Location
                  </Button>
                </div>
                {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" /> Delivery Method
            </h2>
            <Select value={selectedZoneId} onValueChange={(value) => { setSelectedZoneId(value); setPaymentMethod(''); setDepositWarningAccepted(false); setPodWarningAccepted(false); }} disabled={!locationValidation.isValid}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={locationValidation.isValid ? 'Select delivery method' : 'Enter a valid Ghana location first'} />
              </SelectTrigger>
              <SelectContent>
                {availableDeliveryZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.label} — ₵{zone.fee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!locationValidation.isValid && <p className="text-xs text-gray-500 mt-2">Available delivery methods will appear automatically after the Region and City/Town are validated.</p>}
            {locationValidation.isValid && selectedZone && <p className="text-xs text-blue-600 mt-2 font-medium">Delivery fee: ₵{deliveryFee.toFixed(2)}</p>}
            {locationValidation.isValid && availableDeliveryZones.length > 0 && availableDeliveryZones.every((zone) => zone.id === 'outside' || zone.id === 'bus_station') && (
              <p className="text-xs text-amber-700 mt-2">This validated address is outside the local Accra, Kumasi and Tarkwa delivery areas, so only outside-area and bus-station delivery options are available.</p>
            )}
          </Card>

          {selectedZoneId && (
            <Card className="p-5 bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" /> Payment Method
              </h2>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_payment">Pay Full Amount Online — ₵{(subtotal + deliveryFee).toFixed(2)}</SelectItem>
                  <SelectItem value="deposit_balance" disabled={!isTwoStageZoneEligible}>Pay Deposit Now, Balance on Delivery — ₵{(Math.ceil((subtotal / 2) * 100) / 100 + deliveryFee).toFixed(2)}</SelectItem>
                  <SelectItem value="pay_on_delivery" disabled={!isTwoStageZoneEligible}>Pay Delivery Fee Now, Balance on Delivery — ₵{deliveryFee.toFixed(2)}</SelectItem>
                </SelectContent>
              </Select>

              {!isTwoStageZoneEligible && (
                <p className="text-xs text-gray-500 mt-2">
                  Deposit and Pay on Delivery are only available in approved Accra, Kumasi and Tarkwa service areas. Please use the first option.
                </p>
              )}

              {isTwoStageZoneEligible && !strictTwoStageLocationMatch && paymentMethod !== 'full_payment' && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Deposit and Pay on Delivery are only available in approved Accra, Kumasi and Tarkwa service areas. Please use the first option if your address does not qualify.
                </p>
              )}

              {paymentMethod === 'deposit_balance' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Deposit Payment Terms</p><ul className="text-xs text-amber-700 leading-relaxed list-disc pl-4 space-y-2">
                    <li><strong>Pay the remaining balance in full before the product is handed over</strong> at the time of delivery.</li>
                    <li><strong>Once the product arrives, customers must complete payment of the remaining balance through their Order page before the product is handed over.</strong></li>
                    <li><strong>If full payment is not made, the product will be returned.</strong> Customers may receive a <strong>50% refund of their deposit</strong> after verification or arrange pickup/redelivery at their own expense after paying the outstanding balance.</li>
                    <li><strong>Delivery fees are non-refundable</strong> under all circumstances.</li>
                  </ul>
                  <Button type="button" onClick={() => setDepositWarningAccepted(true)} className="mt-3 text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white" disabled={depositWarningAccepted}>
                    {depositWarningAccepted ? 'Agreed' : 'I agree'}
                  </Button>
                </div>
              )}

              {paymentMethod === 'pay_on_delivery' && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-sm font-semibold text-purple-800 mb-2">Pay on Delivery Terms</p><ul className="text-xs text-purple-700 leading-relaxed list-disc pl-4 space-y-2">
                    <li><strong>The delivery fee is paid first online.</strong></li>
                    <li><strong>Once the product arrives, customers must complete payment of the remaining balance through their Order page before the product is handed over.</strong></li>
                    <li><strong>If full payment is not made, the product will be returned.</strong></li>
                    <li><strong>Delivery fees are non-refundable</strong> under all circumstances.</li>
                  </ul>
                  <Button type="button" onClick={() => setPodWarningAccepted(true)} className="mt-3 text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white" disabled={podWarningAccepted}>
                    {podWarningAccepted ? 'Agreed' : 'I agree'}
                  </Button>
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
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Order Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    {paymentMethod === 'pay_on_delivery'
                      ? 'Product Amount'
                      : paymentMethod === 'deposit_balance'
                        ? `Initial Product Portion (₵${(Math.ceil((subtotal / 2) * 100) / 100).toFixed(2)})`
                        : 'Product Amount'}
                  </span>
                  <span className="text-sm font-semibold">
                    {paymentMethod === 'pay_on_delivery' ? 'Pay later' : `₵${orderSummary.displaySubtotal.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivery Fee</span>
                  <span className="text-sm font-semibold">₵{deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-base font-bold">Total Order Value</span>
                  <span className="text-base font-bold text-gray-900">₵{orderSummary.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base font-bold">Total to Pay Now</span>
                  <span className="text-xl font-bold text-blue-700">₵{orderSummary.totalToPayNow.toFixed(2)}</span>
                </div>
                {orderSummary.balanceDue > 0 && (
                  <div className="flex justify-between bg-amber-50 p-3 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">Remaining Balance (paid later through Order page)</span>
                    <span className="text-sm font-bold text-amber-800">₵{orderSummary.balanceDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {canRevealOrderSummary && (
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting || locationMismatch || ((paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery') && !strictTwoStageLocationMatch) || (paymentMethod === 'deposit_balance' && !depositWarningAccepted) || (paymentMethod === 'pay_on_delivery' && !podWarningAccepted)}
                className="w-full rounded-xl bg-blue-800 px-4 py-4 text-white font-bold text-base hover:bg-blue-900 disabled:opacity-50 h-14"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Redirecting to secure payment...
                  </span>
                ) : (
                  `Pay ₵${orderSummary.totalToPayNow.toFixed(2)} with Hubtel`
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                <ShieldCheck className="h-3 w-3 inline" /> Secured by Hubtel
              </p>
              {orderError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg text-center">{orderError}</p>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

