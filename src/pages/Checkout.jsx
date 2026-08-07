import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Info, Loader2, MapPin, ShieldCheck, Truck } from 'lucide-react';

import { appClient } from '@/api/appClient.js';
import { createBalancePaymentReference, createInitialPaymentReference, getHubtelCheckoutUrl, getHubtelErrorMessage, initiatePayment } from '@/api/hubtelClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import InlineNotice from '@/components/ui/InlineNotice';
import {
  detectLocalServiceArea,
  getAllowedDeliveryZoneIds,
  isTwoStagePaymentEligibleForZone,
  validateGhanaLocationPair,
} from '@/lib/ghanaLocations';
import { getHubtelCallbackUrl } from '@/lib/runtime-config';
import { createPageUrl } from '../utils';

const DELIVERY_ZONES = [
  { id: 'accra', label: 'Greater Accra Delivery', fee: 30 },
  { id: 'kumasi', label: 'Kumasi Delivery', fee: 30 },
  { id: 'tarkwa', label: 'Tarkwa / Western Region Delivery', fee: 25 },
  { id: 'outside', label: 'Other Regions Delivery', fee: 50 },
];

const DEFAULT_ZONE_IDS = DELIVERY_ZONES.map((zone) => zone.id);

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

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

function getInitialAmount(subtotal, paymentMethod) {
  if (paymentMethod === 'deposit_balance') {
    return Math.ceil((subtotal / 2) * 100) / 100;
  }

  if (paymentMethod === 'pay_on_delivery') {
    return 0;
  }

  return subtotal;
}

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [depositWarningAccepted, setDepositWarningAccepted] = useState(false);
  const [deliveryStageWarningAccepted, setDeliveryStageWarningAccepted] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    region: '',
    city: '',
    specific_location: '',
    map_location: '',
  });

  useEffect(() => {
    appClient.auth.me()
      .then((userData) => {
        setUser(userData);
        setFormData((current) => ({
          ...current,
          customer_name: userData?.full_name || current.customer_name,
        }));
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
  const subtotal = useMemo(
    () => safeCartItems.reduce((sum, item) => sum + (toNumber(item.product_price) * toNumber(item.quantity, 1)), 0),
    [safeCartItems],
  );

  const locationContext = useMemo(() => ({
    regionInput: formData.region,
    cityInput: formData.city,
    addressInput: formData.specific_location,
  }), [formData.region, formData.city, formData.specific_location]);

  const locationValidation = useMemo(
    () => validateGhanaLocationPair({ regionInput: formData.region, cityInput: formData.city }),
    [formData.region, formData.city],
  );

  const detectedLocation = useMemo(
    () => detectLocalServiceArea(locationContext),
    [locationContext],
  );

  const allowedZoneIds = useMemo(() => {
    if (!locationValidation.isValid) return DEFAULT_ZONE_IDS;

    const resolved = getAllowedDeliveryZoneIds(locationContext).filter((zoneId) => DEFAULT_ZONE_IDS.includes(zoneId));
    return resolved.length > 0 ? resolved : ['outside'];
  }, [locationContext, locationValidation.isValid]);

  const availableZones = useMemo(
    () => DELIVERY_ZONES.filter((zone) => allowedZoneIds.includes(zone.id)),
    [allowedZoneIds],
  );

  const selectedZone = DELIVERY_ZONES.find((zone) => zone.id === selectedZoneId) || null;
  const deliveryFee = selectedZone?.fee || 0;
  const locationMismatch = Boolean(selectedZoneId && locationValidation.isValid && !allowedZoneIds.includes(selectedZoneId));

  const isTwoStageZoneEligible = useMemo(() => (
    selectedZoneId
      ? isTwoStagePaymentEligibleForZone(selectedZoneId, locationContext)
      : false
  ), [selectedZoneId, locationContext]);

  const requiresTermsAcceptance = paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery';
  const termsAccepted = paymentMethod === 'deposit_balance'
    ? depositWarningAccepted
    : paymentMethod === 'pay_on_delivery'
      ? deliveryStageWarningAccepted
      : true;

  const strictTwoStageLocationMatch = Boolean(
    isTwoStageZoneEligible
    && locationValidation.isValid
    && formData.specific_location.trim()
  );

  const orderSummary = useMemo(() => {
    const initialProductAmount = getInitialAmount(subtotal, paymentMethod);
    const totalToPayNow = initialProductAmount + deliveryFee;
    const grandTotal = subtotal + deliveryFee;
    const balanceDue = Math.max(0, grandTotal - totalToPayNow);

    return {
      initialProductAmount,
      deliveryFee,
      totalToPayNow,
      grandTotal,
      balanceDue,
    };
  }, [subtotal, deliveryFee, paymentMethod]);

  const canRevealOrderSummary = Boolean(selectedZoneId && paymentMethod && (!requiresTermsAcceptance || termsAccepted));

  const showFeedback = (variant, message, title) => {
    setFeedback({ variant, message, title });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handlePaymentMethodChange = (value) => {
    setPaymentMethod(value);
    setDepositWarningAccepted(false);
    setDeliveryStageWarningAccepted(false);
  };

  useEffect(() => {
    if (!selectedZoneId || allowedZoneIds.includes(selectedZoneId)) return;

    setSelectedZoneId('');
    setPaymentMethod('');
    setDepositWarningAccepted(false);
    setDeliveryStageWarningAccepted(false);
  }, [allowedZoneIds, selectedZoneId]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Google location capture is not supported on this device.');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((current) => ({
          ...current,
          map_location: `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}&z=16`,
        }));
        showFeedback('success', 'Your Google location link was added successfully.', 'Location added');
      },
      (error) => {
        const message = error.code === 1
          ? 'Location access was denied.'
          : error.code === 2
            ? 'Your location could not be detected.'
            : 'Location detection timed out.';
        setLocationError(message);
        showFeedback('error', message, 'Location unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!formData.customer_name || !formData.customer_phone || !formData.region || !formData.city || !formData.specific_location) {
      showFeedback('error', 'Please complete the delivery details: region, city, and specific location.', 'Complete the form');
      return;
    }

    if (locationValidation.isReady && !locationValidation.isValid) {
      showFeedback('error', locationValidation.message || 'Please enter a valid Ghana region and city before continuing.', 'Invalid location');
      return;
    }

    if (!selectedZoneId) {
      showFeedback('error', 'Please choose a delivery option before continuing.', 'Delivery option required');
      return;
    }

    if (!paymentMethod) {
      showFeedback('error', 'Please choose a payment plan before continuing.', 'Payment plan required');
      return;
    }

    if (locationMismatch) {
      showFeedback('error', 'The selected delivery option does not match the region and city provided.', 'Location mismatch');
      return;
    }

    if ((paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery') && !strictTwoStageLocationMatch) {
      showFeedback('warning', 'This payment plan is only available for approved Accra, Kumasi, and Tarkwa delivery areas.', 'Payment plan restricted');
      return;
    }

    if (requiresTermsAcceptance && !termsAccepted) {
      showFeedback('warning', 'Please review and accept the payment instructions before continuing.', 'Action required');
      return;
    }

    if (orderSummary.totalToPayNow <= 0 || Number.isNaN(orderSummary.totalToPayNow)) {
      showFeedback('error', 'The amount due now is invalid. Please review your cart and try again.', 'Unable to continue');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');

    const orderNumber = `FMM${Date.now().toString(36).toUpperCase()}`;
    const initialPaymentReference = createInitialPaymentReference(orderNumber, paymentMethod);
    const balancePaymentReference = paymentMethod === 'full_payment' ? '' : createBalancePaymentReference(orderNumber);
    const callbackUrl = getHubtelCallbackUrl();

    try {
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

      const deliverySummary = [formData.specific_location, formData.city, formData.region].filter(Boolean).join(', ');
      const nowIso = new Date().toISOString();
      const createdOrder = await appClient.entities.Order.create({
        order_number: orderNumber,
        items: orderItems,
        product_subtotal: subtotal,
        delivery_fee: deliveryFee,
        grand_total: orderSummary.grandTotal,
        amount_paid_now: orderSummary.totalToPayNow,
        initial_payment_amount: orderSummary.totalToPayNow,
        balance_payment_amount: orderSummary.balanceDue,
        initial_payment_verified_amount: 0,
        balance_payment_verified_amount: 0,
        total_amount: orderSummary.grandTotal,
        balance_due: orderSummary.balanceDue,
        remaining_balance_paid: paymentMethod === 'full_payment' && orderSummary.balanceDue <= 0,
        remaining_balance_paid_at: paymentMethod === 'full_payment' && orderSummary.balanceDue <= 0 ? nowIso : null,
        payment_method: paymentMethod,
        delivery_zone: selectedZoneId,
        payment_status: 'pending_payment',
        initial_payment_status: 'pending',
        balance_payment_status: paymentMethod === 'full_payment' ? 'not_required' : 'pending',
        payment_stage: 'awaiting_initial_payment',
        is_fully_paid: false,
        balance_payment_enabled: false,
        initial_payment_reference: initialPaymentReference,
        balance_payment_reference: balancePaymentReference,
        payment_reference: initialPaymentReference,
        hubtel_status: 'pending',
        status: 'confirmed',
        customer_name: formData.customer_name,
        customer_email: user.email,
        customer_phone: formData.customer_phone,
        region: formData.region,
        city: formData.city,
        specific_location: formData.specific_location,
        delivery_address: deliverySummary,
        delivery_landmark: '',
        map_location: formData.map_location || '',
        notes: 'Pending Hubtel verification. Keep hidden until the first payment is confirmed and the paid amount matches the expected amount.',
        tracking_updates: [{
          status: 'Awaiting Payment Confirmation',
          message: `Hubtel checkout started. Expected first payment: GHS ${orderSummary.totalToPayNow.toFixed(2)}. The order remains hidden until payment status and amount are verified.`,
          timestamp: nowIso,
        }],
      });

      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      const returnUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&orderId=${createdOrder.id}`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=cancelled&orderId=${createdOrder.id}`;
      const description = paymentMethod === 'deposit_balance'
        ? `Deposit payment for order ${orderNumber}`
        : paymentMethod === 'pay_on_delivery'
          ? `Delivery payment for order ${orderNumber}`
          : `Full payment for order ${orderNumber}`;

      const initiateResponse = await initiatePayment({
        totalAmount: orderSummary.totalToPayNow,
        description,
        callbackUrl,
        returnUrl,
        cancellationUrl,
        clientReference: initialPaymentReference,
        payeeName: formData.customer_name,
        payeeMobileNumber: formData.customer_phone,
        payeeEmail: user.email,
      });

      const checkoutUrl = getHubtelCheckoutUrl(initiateResponse);
      if (checkoutUrl) {
        showFeedback('info', 'Redirecting you to Hubtel for secure payment.', 'Opening secure checkout');
        window.location.href = checkoutUrl;
        return;
      }

      const hubtelFailureMessage = getHubtelErrorMessage(initiateResponse, 'Hubtel checkout could not be started.');

      await appClient.entities.Order.update(createdOrder.id, {
        payment_status: 'failed',
        initial_payment_status: 'failed',
        hubtel_status: 'failed',
        tracking_updates: (createdOrder.tracking_updates || []).concat([{
          status: 'Checkout Initiation Failed',
          message: `Hubtel checkout could not be started. ${hubtelFailureMessage}`.trim(),
          timestamp: new Date().toISOString(),
        }]),
      });

      setOrderError('Hubtel checkout could not be started. Your cart is still available.');
      showFeedback('error', `Hubtel checkout could not be started. ${hubtelFailureMessage}`, 'Payment could not start');
    } catch (error) {
      console.error('Checkout error:', error);
      setOrderError('Checkout is temporarily unavailable. Your cart was not cleared.');
      showFeedback('error', 'Checkout is temporarily unavailable. Your cart was not cleared.', 'Checkout unavailable');
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
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Region *</Label>
                  <Input name="region" value={formData.region} onChange={handleInputChange} placeholder="e.g. Greater Accra" required className={`mt-1 ${locationMismatch ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
                <div>
                  <Label className="text-sm font-medium">City *</Label>
                  <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. East Legon" required className={`mt-1 ${locationMismatch ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Specific Location *</Label>
                <Input name="specific_location" value={formData.specific_location} onChange={handleInputChange} placeholder="Apartment, estate, office, or delivery point" required className="mt-1" />
              </div>
              {locationValidation.isReady && !locationValidation.isValid && (
                <p className="text-xs text-amber-700 font-medium">
                  {locationValidation.message}
                </p>
              )}
              {locationMismatch && (
                <p className="text-xs text-red-600 font-medium">
                  The selected delivery option does not match this validated location.
                </p>
              )}
              <div>
                <Label className="text-sm font-medium">Google Auto-Detect Location</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input name="map_location" value={formData.map_location} onChange={handleInputChange} className="flex-1" readOnly />
                  <Button type="button" onClick={getCurrentLocation} variant="outline" className="shrink-0 border-blue-300 text-blue-700">
                    Detect Location
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Use the button above to attach a Google Maps location link for accurate delivery confirmation.</p>
                {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" /> Delivery Option
            </h2>
            <Select value={selectedZoneId} onValueChange={(value) => { setSelectedZoneId(value); setPaymentMethod(''); setDepositWarningAccepted(false); setDeliveryStageWarningAccepted(false); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select delivery option" />
              </SelectTrigger>
              <SelectContent>
                {availableZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.label} — ₵{zone.fee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedZone && <p className="text-xs text-blue-600 mt-2 font-medium">Delivery fee: ₵{deliveryFee.toFixed(2)}</p>}
            {locationValidation.isValid && detectedLocation.serviceAreaLabel && (
              <p className="text-xs text-slate-600 mt-2">
                Location validated for {detectedLocation.serviceAreaLabel}. Available delivery options were filtered automatically.
              </p>
            )}
          </Card>

          {selectedZoneId && (
            <Card className="p-5 bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" /> Payment Plan
              </h2>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_payment">1. Pay Full Amount Online — ₵{(subtotal + deliveryFee).toFixed(2)}</SelectItem>
                  <SelectItem value="deposit_balance" disabled={!isTwoStageZoneEligible}>2. Pay Deposit Now, Balance Later — ₵{(getInitialAmount(subtotal, 'deposit_balance') + deliveryFee).toFixed(2)}</SelectItem>
                  <SelectItem value="pay_on_delivery" disabled={!isTwoStageZoneEligible}>3. Pay Delivery Fee Now, Balance Later — ₵{deliveryFee.toFixed(2)}</SelectItem>
                </SelectContent>
              </Select>

              {!isTwoStageZoneEligible && (selectedZoneId === 'accra' || selectedZoneId === 'kumasi' || selectedZoneId === 'tarkwa') && (
                <p className="text-xs text-gray-500 mt-2">
                  The second and third payment plans are only available for approved Accra, Kumasi, and Tarkwa delivery areas.
                </p>
              )}

              {paymentMethod !== 'full_payment' && !strictTwoStageLocationMatch && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Enter a valid Ghana region/city and an eligible delivery area before using the second or third payment plan.
                </p>
              )}

              {paymentMethod === 'deposit_balance' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Payment Plan 2: Deposit Now, Balance Later</p><ul className="text-xs text-amber-800 leading-relaxed list-disc pl-4 space-y-2">
                    <li>The deposit and delivery fee are paid online through Hubtel during checkout.</li>
                    <li>The remaining balance becomes payable from your Order page after the order is shipped and the balance payment option is enabled.</li>
                    <li>The product is handed over only after the remaining balance is verified successfully.</li>
                    <li>Delivery fees are non-refundable once the shipping process has started.</li>
                  </ul>
                  <Button type="button" onClick={() => setDepositWarningAccepted(true)} className="mt-3 text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white" disabled={depositWarningAccepted}>
                    {depositWarningAccepted ? 'Agreed' : 'I agree'}
                  </Button>
                </div>
              )}

              {paymentMethod === 'pay_on_delivery' && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-sm font-semibold text-purple-900 mb-2">Payment Plan 3: Delivery Fee Now, Balance Later</p><ul className="text-xs text-purple-800 leading-relaxed list-disc pl-4 space-y-2">
                    <li>The delivery fee is paid online through Hubtel during checkout.</li>
                    <li>The product balance becomes payable from your Order page after the order is shipped and the balance payment option is enabled.</li>
                    <li>The product is handed over only after the remaining balance is verified successfully.</li>
                    <li>Delivery fees are non-refundable once the shipping process has started.</li>
                  </ul>
                  <Button type="button" onClick={() => setDeliveryStageWarningAccepted(true)} className="mt-3 text-xs px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white" disabled={deliveryStageWarningAccepted}>
                    {deliveryStageWarningAccepted ? 'Agreed' : 'I agree'}
                  </Button>
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
                  <span className="text-sm text-gray-600">Product Amount</span>
                  <span className="text-sm font-semibold">{paymentMethod === 'pay_on_delivery' ? 'Pay later' : `₵${orderSummary.initialProductAmount.toFixed(2)}`}</span>
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
                    <span className="text-sm font-medium text-amber-800">Remaining Balance</span>
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
                disabled={isSubmitting || (locationValidation.isReady && !locationValidation.isValid) || locationMismatch || ((paymentMethod === 'deposit_balance' || paymentMethod === 'pay_on_delivery') && !strictTwoStageLocationMatch) || (requiresTermsAcceptance && !termsAccepted)}
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
