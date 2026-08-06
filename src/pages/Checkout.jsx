import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import {
  createBalancePaymentReference,
  createInitialPaymentReference,
  initiatePayment,
} from '@/api/hubtelClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
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
import { getHubtelCallbackUrl } from '@/lib/runtime-config';

const DELIVERY_ZONES = [
  { id: 'accra', label: 'Within Accra Delivery', fee: 30 },
  { id: 'kumasi', label: 'Within Kumasi Delivery', fee: 30 },
  { id: 'umat_doorstep', label: 'UMaT Main Campus – Doorstep Delivery', fee: 10 },
  { id: 'tarkwa', label: 'Approved Tarkwa In-Town Delivery', fee: 25 },
  { id: 'outside', label: 'Outside Kumasi, Accra & Tarkwa', fee: 50 },
  { id: 'bus_station', label: 'Delivery to Bus Stations', fee: 25 },
];

const TWO_STAGE_ZONE_IDS = ['accra', 'kumasi', 'umat_doorstep', 'tarkwa'];
const HUBTEL_CALLBACK_URL = getHubtelCallbackUrl();

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function toMoney(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Number(toMoney(value).toFixed(2));
}

function formatMoney(value) {
  return `₵${roundMoney(value).toFixed(2)}`;
}

function createOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FMM${timestamp}${random}`.slice(0, 20);
}

function buildDeliveryAddress({ address, landmark, city, region }) {
  return [address, landmark, city, region].filter(Boolean).join(', ');
}

function sanitizeHubtelDescription(value = '') {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 .,_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function buildOrderItems(items = []) {
  return items.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    product_image: item.product_image || null,
    quantity: Number(item.quantity || 1),
    price: roundMoney(item.product_price),
    selected_color: item.selected_color || null,
    selected_wattage: item.selected_wattage || null,
    selected_type: item.selected_type || null,
    variant_summary: item.variant_summary || null,
    options_signature: item.options_signature || null,
  }));
}

function getSelectedZone(zoneId) {
  return DELIVERY_ZONES.find((zone) => zone.id === zoneId) || null;
}

function getPaymentMethodLabel(method) {
  if (method === 'deposit_balance') return 'Deposit + Balance on Delivery';
  if (method === 'pay_on_delivery') return 'Pay on Delivery';
  return 'Full Payment';
}

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    region: '',
    city: '',
    address: '',
    landmark: '',
    delivery_zone_id: '',
    payment_method: 'full_payment',
  });

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: async () => ensureArray(await appClient.entities.CartItem.filter({ user_email: user?.email })),
    enabled: !!user?.email,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!user) return;
    setFormData((previous) => ({
      ...previous,
      customer_name: previous.customer_name || user.full_name || '',
      customer_phone: previous.customer_phone || user.phone || '',
      city: previous.city || user.city || '',
      address: previous.address || user.address || '',
    }));
  }, [user]);

  const locationContext = useMemo(() => ({
    regionInput: formData.region,
    cityInput: formData.city,
    addressInput: formData.address,
    landmarkInput: formData.landmark,
  }), [formData.region, formData.city, formData.address, formData.landmark]);

  const locationValidation = useMemo(
    () => validateGhanaLocationPair({ regionInput: formData.region, cityInput: formData.city }),
    [formData.region, formData.city]
  );

  const allowedZoneIds = useMemo(() => getAllowedDeliveryZoneIds(locationContext), [locationContext]);

  const availableZones = useMemo(
    () => DELIVERY_ZONES.filter((zone) => allowedZoneIds.includes(zone.id)),
    [allowedZoneIds]
  );

  const selectedZone = useMemo(
    () => getSelectedZone(formData.delivery_zone_id),
    [formData.delivery_zone_id]
  );

  const twoStageEligible = useMemo(() => {
    if (!formData.delivery_zone_id || !TWO_STAGE_ZONE_IDS.includes(formData.delivery_zone_id)) return false;
    return isTwoStagePaymentEligibleForZone(formData.delivery_zone_id, locationContext);
  }, [formData.delivery_zone_id, locationContext]);

  const paymentMethodOptions = useMemo(() => {
    const options = [
      {
        value: 'full_payment',
        label: 'Full Payment',
        description: 'Pay the full order amount with Hubtel now.',
      },
    ];

    if (twoStageEligible) {
      options.push(
        {
          value: 'deposit_balance',
          label: 'Deposit + Balance on Delivery',
          description: 'Pay 50% of the products plus delivery now. Pay the rest before handover.',
        },
        {
          value: 'pay_on_delivery',
          label: 'Pay on Delivery',
          description: 'Pay only the delivery fee now. Pay the product balance before handover.',
        }
      );
    }

    return options;
  }, [twoStageEligible]);

  const orderSummary = useMemo(() => {
    const subtotal = roundMoney(
      cartItems.reduce((sum, item) => sum + (toMoney(item.product_price) * toMoney(item.quantity, 1)), 0)
    );
    const deliveryFee = roundMoney(selectedZone?.fee || 0);
    const grandTotal = roundMoney(subtotal + deliveryFee);

    let totalToPayNow = grandTotal;
    let balanceDue = 0;

    if (twoStageEligible && formData.payment_method === 'deposit_balance') {
      totalToPayNow = roundMoney((subtotal * 0.5) + deliveryFee);
      balanceDue = roundMoney(grandTotal - totalToPayNow);
    }

    if (twoStageEligible && formData.payment_method === 'pay_on_delivery') {
      totalToPayNow = deliveryFee;
      balanceDue = roundMoney(subtotal);
    }

    return {
      subtotal,
      deliveryFee,
      grandTotal,
      totalToPayNow,
      balanceDue,
      isTwoStage: balanceDue > 0,
    };
  }, [cartItems, selectedZone, formData.payment_method, twoStageEligible]);

  useEffect(() => {
    if (availableZones.length === 0) {
      if (formData.delivery_zone_id) {
        setFormData((previous) => ({ ...previous, delivery_zone_id: '', payment_method: 'full_payment' }));
      }
      return;
    }

    if (!availableZones.some((zone) => zone.id === formData.delivery_zone_id)) {
      setFormData((previous) => ({ ...previous, delivery_zone_id: availableZones[0]?.id || '', payment_method: 'full_payment' }));
    }
  }, [availableZones, formData.delivery_zone_id]);

  useEffect(() => {
    if (!paymentMethodOptions.some((option) => option.value === formData.payment_method)) {
      setFormData((previous) => ({ ...previous, payment_method: 'full_payment' }));
    }
  }, [paymentMethodOptions, formData.payment_method]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const showFeedback = (variant, message, title) => {
    setFeedback({ variant, message, title });
  };

  const validateBeforeSubmit = () => {
    if (!isAuthenticated) {
      navigateToLogin(createPageUrl('Checkout'));
      return false;
    }

    if (cartItems.length === 0) {
      showFeedback('warning', 'Your cart is empty. Add products before checking out.', 'Nothing to checkout');
      return false;
    }

    if (!formData.customer_name.trim() || !formData.customer_phone.trim() || !formData.region.trim() || !formData.city.trim() || !formData.address.trim()) {
      showFeedback('error', 'Please complete your name, phone number, region, city, and address before continuing.', 'Missing information');
      return false;
    }

    if (!locationValidation.isValid) {
      showFeedback('error', locationValidation.message || 'Please enter a valid Ghana Region and City/Town pair.', 'Invalid delivery location');
      return false;
    }

    if (!selectedZone) {
      showFeedback('error', 'Please select a delivery zone before continuing.', 'Delivery zone required');
      return false;
    }

    if (!availableZones.some((zone) => zone.id === selectedZone.id)) {
      showFeedback('error', 'The selected delivery zone does not match the address you entered. Pick one of the allowed zones.', 'Delivery zone mismatch');
      return false;
    }

    if (!paymentMethodOptions.some((option) => option.value === formData.payment_method)) {
      showFeedback('error', 'The chosen payment option is not available for this delivery zone.', 'Payment option unavailable');
      return false;
    }

    if (orderSummary.totalToPayNow <= 0) {
      showFeedback('error', 'The amount due now must be greater than zero before starting Hubtel checkout.', 'Invalid payment total');
      return false;
    }

    return true;
  };

  const handleCheckout = async () => {
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const orderNumber = createOrderNumber();
    const initialPaymentReference = createInitialPaymentReference(orderNumber, formData.payment_method);
    const balancePaymentReference = orderSummary.balanceDue > 0 ? createBalancePaymentReference(orderNumber) : null;
    const paymentLabel = getPaymentMethodLabel(formData.payment_method);
    const orderItems = buildOrderItems(cartItems);
    const deliveryAddress = buildDeliveryAddress({
      address: formData.address,
      landmark: formData.landmark,
      city: locationValidation.canonicalCity || formData.city,
      region: locationValidation.canonicalRegion || formData.region,
    });
    const payDescription = sanitizeHubtelDescription(`FMM CLASSICO ${paymentLabel} ${orderNumber}`);

    try {
      const orderRecord = await appClient.entities.Order.create({
        order_number: orderNumber,
        customer_name: formData.customer_name.trim(),
        customer_email: user.email,
        customer_phone: formData.customer_phone.trim(),
        delivery_address: deliveryAddress,
        address: formData.address.trim(),
        landmark: formData.landmark.trim() || null,
        region: locationValidation.canonicalRegion || formData.region.trim(),
        city: locationValidation.canonicalCity || formData.city.trim(),
        delivery_zone_id: selectedZone.id,
        delivery_zone_label: selectedZone.label,
        delivery_fee: orderSummary.deliveryFee,
        subtotal: orderSummary.subtotal,
        total_amount: orderSummary.totalToPayNow,
        grand_total: orderSummary.grandTotal,
        amount_paid_now: orderSummary.totalToPayNow,
        initial_payment_amount: orderSummary.totalToPayNow,
        balance_due: orderSummary.balanceDue,
        balance_payment_amount: orderSummary.balanceDue,
        payment_method: formData.payment_method,
        payment_status: 'pending_payment',
        initial_payment_status: 'pending_payment',
        balance_payment_status: orderSummary.isTwoStage ? 'pending' : 'not_required',
        payment_stage: orderSummary.isTwoStage ? 'awaiting_initial_payment' : 'awaiting_full_payment',
        remaining_balance_paid: false,
        is_fully_paid: false,
        balance_payment_enabled: false,
        initial_payment_reference: initialPaymentReference,
        balance_payment_reference: balancePaymentReference,
        items: orderItems,
        status: 'confirmed',
        tracking_updates: [
          {
            status: 'Checkout Created',
            message: `Order created for ${paymentLabel}. Waiting for Hubtel payment redirect.`,
            timestamp: new Date().toISOString(),
          },
        ],
        created_date: new Date().toISOString(),
      });

      const returnUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=success&orderId=${orderRecord.id}`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=cancelled&orderId=${orderRecord.id}`;

      const initRes = await initiatePayment({
        totalAmount: orderSummary.totalToPayNow,
        description: payDescription,
        callbackUrl: HUBTEL_CALLBACK_URL,
        returnUrl,
        cancellationUrl,
        clientReference: initialPaymentReference,
        payeeName: formData.customer_name.trim(),
        payeeMobileNumber: formData.customer_phone.trim(),
        payeeEmail: user.email,
      });

      const checkoutUrl = initRes?.data?.checkoutUrl;
      const checkoutId = initRes?.data?.checkoutId || null;
      const responseCode = initRes?.responseCode || null;
      const gatewayStatus = initRes?.status || null;

      await appClient.entities.Order.update(orderRecord.id, {
        initial_checkout_id: checkoutId,
        payment_reference: initialPaymentReference,
        tracking_updates: [
          ...(Array.isArray(orderRecord.tracking_updates) ? orderRecord.tracking_updates : []),
          {
            status: checkoutUrl ? 'Hubtel Redirect Created' : 'Hubtel Initiation Failed',
            message: checkoutUrl
              ? `Hubtel accepted the payment request. ResponseCode ${responseCode || 'N/A'}. CheckoutId ${checkoutId || 'N/A'}.`
              : `Hubtel could not start checkout. ${initRes?.error || gatewayStatus || 'Unknown error.'}`,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });

      if (checkoutUrl && responseCode === '0000') {
        showFeedback('info', 'Redirecting you to Hubtel for secure payment...', 'Opening payment');
        window.location.href = checkoutUrl;
        return;
      }

      showFeedback(
        'error',
        initRes?.error || initRes?.message || gatewayStatus || 'Hubtel did not return a valid checkout link.',
        'Unable to continue'
      );
    } catch (error) {
      console.error('Checkout error:', error);
      showFeedback('error', error?.message || 'We could not start your checkout right now. Please try again.', 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated && user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B3A6B]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Card className="p-6 text-center space-y-4">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#1B3A6B]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sign in to continue</h1>
            <p className="text-sm text-gray-500 mt-2">You need an account before you can place your order and continue to Hubtel checkout.</p>
          </div>
          <Button className="bg-[#1B3A6B] hover:bg-[#162f58]" onClick={() => navigateToLogin(createPageUrl('Checkout'))}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (!isLoading && cartItems.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Card className="p-6 text-center space-y-4">
          <Truck className="mx-auto h-10 w-10 text-[#1B3A6B]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Your cart is empty</h1>
            <p className="text-sm text-gray-500 mt-2">Add products to your cart before opening the checkout page.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => navigate(createPageUrl('Cart'))}>Back to Cart</Button>
            <Button className="bg-[#1B3A6B] hover:bg-[#162f58]" onClick={() => navigate(createPageUrl('Shop'))}>Continue Shopping</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
                <p className="text-sm text-gray-500 mt-1">Fill your delivery details, choose an allowed delivery zone, then continue to Hubtel.</p>
              </div>
            </div>

            <InlineNotice
              variant={feedback?.variant}
              title={feedback?.title}
              message={feedback?.message}
              onDismiss={() => setFeedback(null)}
              className="mt-4"
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customer_name">Full Name</Label>
                <Input id="customer_name" name="customer_name" value={formData.customer_name} onChange={handleFieldChange} placeholder="Enter your full name" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customer_phone">Phone Number</Label>
                <Input id="customer_phone" name="customer_phone" value={formData.customer_phone} onChange={handleFieldChange} placeholder="e.g. 0208207543 or 233208207543" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input id="region" name="region" value={formData.region} onChange={handleFieldChange} placeholder="e.g. Greater Accra" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City / Town</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleFieldChange} placeholder="e.g. Madina" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleFieldChange} placeholder="House number, street, area" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input id="landmark" name="landmark" value={formData.landmark} onChange={handleFieldChange} placeholder="Nearby landmark to help the rider" />
              </div>
            </div>

            <div className="mt-4">
              <InlineNotice
                variant={locationValidation.isReady ? (locationValidation.isValid ? 'success' : 'warning') : 'info'}
                title={locationValidation.isReady ? (locationValidation.isValid ? 'Location confirmed' : 'Check your location') : 'Enter location details'}
                message={locationValidation.isReady
                  ? locationValidation.message
                  : 'Add your Region and City/Town so the checkout can restrict delivery zones correctly.'}
              />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-100 p-2 text-orange-700">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delivery and payment</h2>
                <p className="text-sm text-gray-500 mt-1">Only delivery zones that match the Ghana location you entered are shown below.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label>Delivery Zone</Label>
                <Select value={formData.delivery_zone_id} onValueChange={(value) => setFormData((previous) => ({ ...previous, delivery_zone_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a delivery zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.label} — {formatMoney(zone.fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableZones.length === 0 ? (
                  <p className="text-xs text-amber-700">No delivery zone is available yet because the Region / City pair is incomplete or invalid.</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Payment methods shown here follow your delivery zone.</p>
                    <p className="mt-1 text-blue-800">
                      {twoStageEligible
                        ? 'This location supports full payment, deposit + balance, and pay on delivery with Hubtel redirect checkout.'
                        : 'This location currently supports full Hubtel payment only. Two-stage payments appear only for eligible local delivery zones.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <div className="grid gap-3">
                  {paymentMethodOptions.map((option) => {
                    const active = formData.payment_method === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((previous) => ({ ...previous, payment_method: option.value }))}
                        className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[#1B3A6B] bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-200'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 ${active ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{option.label}</p>
                            <p className="mt-1 text-sm text-gray-500">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6 sticky top-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order summary</h2>
                <p className="text-sm text-gray-500 mt-1">Hubtel redirect checkout will open after your order is created.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500">No img</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{item.product_name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    {item.variant_summary ? <p className="text-xs text-blue-700 mt-0.5">{item.variant_summary}</p> : null}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatMoney(toMoney(item.product_price) * toMoney(item.quantity, 1))}</p>
                </div>
              ))}
            </div>

            <Separator className="my-5" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatMoney(orderSummary.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Delivery fee</span>
                <span>{formatMoney(orderSummary.deliveryFee)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-900 font-semibold">
                <span>Total order value</span>
                <span>{formatMoney(orderSummary.grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-900">
                <span>Pay now</span>
                <span>{formatMoney(orderSummary.totalToPayNow)}</span>
              </div>
              {orderSummary.balanceDue > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 font-semibold text-orange-800">
                  <span>Balance later</span>
                  <span>{formatMoney(orderSummary.balanceDue)}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Selected method: {getPaymentMethodLabel(formData.payment_method)}</p>
              <p className="mt-1 leading-6">
                {formData.payment_method === 'deposit_balance'
                  ? 'You are paying 50% of the product total plus delivery now. The remaining balance must be completed before the product is handed over.'
                  : formData.payment_method === 'pay_on_delivery'
                    ? 'You are paying only the delivery fee now. The full product balance stays outstanding until final handover.'
                    : 'You are paying the full product and delivery amount now through Hubtel.'}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="leading-6">
                  Hubtel status checks remain available after checkout. If a callback is delayed, the app can still verify the transaction by client reference and the server logs now keep clearer initiation, callback, and status traces.
                </p>
              </div>
            </div>

            <Button
              className="mt-5 w-full bg-[#1B3A6B] py-6 text-base hover:bg-[#162f58]"
              onClick={handleCheckout}
              disabled={isSubmitting || isLoading || cartItems.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening Hubtel...
                </>
              ) : (
                <>Continue to Hubtel</>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
