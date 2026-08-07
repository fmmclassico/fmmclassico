import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, MapPin, Navigation, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { createInitialPaymentReference, initiatePayment } from '@/api/hubtelClient';
import { useAuth } from '@/lib/AuthContext';
import { getHubtelCallbackUrl } from '@/lib/runtime-config';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InlineNotice from '@/components/ui/InlineNotice';

const DELIVERY_ZONES = [
  { id: 'ashongman_pickup', label: 'Ashongman Estate (Pickup)', fee: 0 },
  { id: 'umat_pickup', label: 'UMAT Campus (Pickup)', fee: 0 },
  { id: 'umat_doorstep', label: 'UMAT Campus (Doorstep Delivery)', fee: 10 },
  { id: 'tarkwa_town', label: 'Tarkwa (Outside UMAT)', fee: 25 },
  { id: 'airport_residential', label: 'Airport Residential Area', fee: 22 },
  { id: 'madina', label: 'Madina', fee: 30 },
  { id: 'east_legon', label: 'East Legon', fee: 30 },
  { id: 'adenta', label: 'Adenta', fee: 35 },
  { id: 'accra_mall', label: 'Accra Mall', fee: 25 },
  { id: 'osu', label: 'Osu', fee: 30 },
  { id: 'circle', label: 'Circle', fee: 30 },
  { id: 'accra_station', label: 'Accra Station', fee: 35 },
  { id: 'makola', label: 'Makola', fee: 35 },
  { id: 'spintex', label: 'Spintex', fee: 40 },
  { id: 'other_accra', label: 'Other Accra Areas', fee: 50 },
  { id: 'outside_accra_tarkwa', label: 'Outside Accra & Tarkwa', fee: 50 },
];

const TWO_STAGE_ELIGIBLE_ZONES = new Set([
  'umat_doorstep',
  'tarkwa_town',
  'airport_residential',
  'madina',
  'east_legon',
  'adenta',
  'accra_mall',
  'osu',
  'circle',
  'accra_station',
  'makola',
  'spintex',
  'other_accra',
]);

const PAYMENT_OPTIONS = [
  {
    id: 'full_payment',
    title: 'Full payment',
    description: 'Pay everything now with Hubtel. Best for the fastest checkout confirmation.',
    badge: 'Recommended',
  },
  {
    id: 'deposit_balance',
    title: 'Deposit + balance',
    description: 'Pay 50% of the product total plus delivery now, then complete the balance before handover.',
    badge: 'Two-stage',
  },
  {
    id: 'pay_on_delivery',
    title: 'Pay on delivery',
    description: 'Pay only the delivery charge now. The product balance is settled before the item is handed over.',
    badge: 'Delivery-first',
  },
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value) {
  return `₵${toNumber(value).toFixed(2)}`;
}

function createOrderNumber() {
  return `FMM${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
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
    price: toNumber(item.product_price),
    quantity: toNumber(item.quantity, 1),
    selected_color: item.selected_color || null,
    selected_wattage: item.selected_wattage || null,
    selected_type: item.selected_type || null,
    variant_summary: item.variant_summary || null,
    options_signature: item.options_signature || null,
  }));
}

function buildDeliveryAddress({ address, landmark, city, region, zoneLabel }) {
  return [address, landmark, city, region, zoneLabel].filter(Boolean).join(', ');
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function getPaymentOptionLabel(value) {
  if (value === 'deposit_balance') return 'Deposit + Balance';
  if (value === 'pay_on_delivery') return 'Pay on Delivery';
  return 'Full Payment';
}

function getPaymentBreakdown({ subtotal, deliveryFee, paymentMethod }) {
  const grandTotal = subtotal + deliveryFee;

  if (paymentMethod === 'deposit_balance') {
    const productDeposit = Number((subtotal * 0.5).toFixed(2));
    const totalToPayNow = Math.min(grandTotal, Number((productDeposit + deliveryFee).toFixed(2)));
    const balanceDue = Math.max(0, Number((grandTotal - totalToPayNow).toFixed(2)));
    return {
      subtotal,
      deliveryFee,
      grandTotal,
      totalToPayNow,
      balanceDue,
      initialPaymentAmount: totalToPayNow,
      balancePaymentAmount: balanceDue,
      isTwoStage: balanceDue > 0,
      paymentSummary: '50% product deposit + delivery fee now',
    };
  }

  if (paymentMethod === 'pay_on_delivery') {
    const totalToPayNow = Number(deliveryFee.toFixed(2));
    const balanceDue = Math.max(0, Number((grandTotal - totalToPayNow).toFixed(2)));
    return {
      subtotal,
      deliveryFee,
      grandTotal,
      totalToPayNow,
      balanceDue,
      initialPaymentAmount: totalToPayNow,
      balancePaymentAmount: balanceDue,
      isTwoStage: balanceDue > 0,
      paymentSummary: 'Delivery fee now, product balance later',
    };
  }

  return {
    subtotal,
    deliveryFee,
    grandTotal,
    totalToPayNow: grandTotal,
    balanceDue: 0,
    initialPaymentAmount: grandTotal,
    balancePaymentAmount: 0,
    isTwoStage: false,
    paymentSummary: 'Everything paid now',
  };
}

export default function Checkout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    address: '',
    landmark: '',
    city: '',
    region: '',
    notes: '',
  });
  const [selectedZoneId, setSelectedZoneId] = useState(DELIVERY_ZONES[0].id);
  const [paymentMethod, setPaymentMethod] = useState('full_payment');

  const { data: cartItemsRaw = [], isLoading } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => appClient.entities.CartItem.filter({ user_email: user?.email }),
    enabled: Boolean(user?.email),
  });

  const cartItems = useMemo(() => ensureArray(cartItemsRaw), [cartItemsRaw]);
  const selectedZone = useMemo(
    () => DELIVERY_ZONES.find((zone) => zone.id === selectedZoneId) || DELIVERY_ZONES[0],
    [selectedZoneId]
  );
  const twoStageEligible = TWO_STAGE_ELIGIBLE_ZONES.has(selectedZoneId);
  const payOnDeliveryEligible = twoStageEligible && toNumber(selectedZone?.fee) > 0;

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      customer_name: current.customer_name || user?.full_name || user?.name || '',
      customer_email: current.customer_email || user?.email || '',
      customer_phone: current.customer_phone || user?.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    if (paymentMethod === 'full_payment') return;
    if (paymentMethod === 'pay_on_delivery' && !payOnDeliveryEligible) {
      setPaymentMethod('full_payment');
      return;
    }
    if (paymentMethod === 'deposit_balance' && !twoStageEligible) {
      setPaymentMethod('full_payment');
    }
  }, [paymentMethod, payOnDeliveryEligible, twoStageEligible]);

  const orderSummary = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + toNumber(item.product_price) * toNumber(item.quantity, 1),
      0
    );
    const deliveryFee = toNumber(selectedZone?.fee);
    return getPaymentBreakdown({ subtotal, deliveryFee, paymentMethod });
  }, [cartItems, paymentMethod, selectedZone]);

  const showFeedback = (variant, message, title) => {
    setFeedback({ variant, message, title });
  };

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showFeedback('warning', 'This browser cannot auto-detect your location. Paste a Google Maps link into the landmark field instead.', 'Location not available');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude).toFixed(6);
        const longitude = Number(position.coords.longitude).toFixed(6);
        const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        setFormData((current) => ({
          ...current,
          landmark: current.landmark ? `${current.landmark} | ${mapLink}` : mapLink,
        }));
        setDetectingLocation(false);
        showFeedback('success', 'Your current location link was added to the landmark field.', 'Location captured');
      },
      (error) => {
        setDetectingLocation(false);
        showFeedback('warning', error?.message || 'Allow location access or paste your map link manually.', 'Location capture failed');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validateBeforeSubmit = () => {
    if (!user?.email) {
      showFeedback('error', 'Please sign in again before checking out.', 'Authentication required');
      return false;
    }

    if (cartItems.length === 0) {
      showFeedback('error', 'Your cart is empty. Add an item before checking out.', 'Cart is empty');
      return false;
    }

    if (!formData.customer_name.trim()) {
      showFeedback('error', 'Enter the customer name for this order.', 'Missing information');
      return false;
    }

    if (!formData.customer_phone.trim()) {
      showFeedback('error', 'Enter a phone number so the store can reach you about delivery.', 'Missing information');
      return false;
    }

    if (!formData.address.trim() || !formData.city.trim() || !formData.region.trim()) {
      showFeedback('error', 'Address, city, and region are required before payment can start.', 'Missing delivery details');
      return false;
    }

    if (paymentMethod === 'deposit_balance' && !twoStageEligible) {
      showFeedback('error', 'Deposit + balance is available only for the supported Accra and Tarkwa delivery zones shown on this page.', 'Payment option unavailable');
      return false;
    }

    if (paymentMethod === 'pay_on_delivery' && !payOnDeliveryEligible) {
      showFeedback('error', 'Pay on delivery needs a supported doorstep delivery zone with a delivery charge.', 'Payment option unavailable');
      return false;
    }

    if (orderSummary.totalToPayNow <= 0) {
      showFeedback('error', 'The amount due now must be greater than zero before payment can start.', 'Invalid total');
      return false;
    }

    return true;
  };

  const handleCheckout = async () => {
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const orderNumber = createOrderNumber();
    const initialPaymentReference = createInitialPaymentReference(orderNumber, paymentMethod);
    const orderItems = buildOrderItems(cartItems);
    const deliveryAddress = buildDeliveryAddress({
      address: formData.address.trim(),
      landmark: formData.landmark.trim(),
      city: formData.city.trim(),
      region: formData.region.trim(),
      zoneLabel: selectedZone.label,
    });
    const payDescription = sanitizeHubtelDescription(`FMM CLASSICO ${getPaymentOptionLabel(paymentMethod)} ${orderNumber}`);

    try {
      const callbackUrl = getHubtelCallbackUrl();
      const returnUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=success&orderNumber=${encodeURIComponent(orderNumber)}`;
      const cancellationUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=cancelled&orderNumber=${encodeURIComponent(orderNumber)}`;

      const initRes = await initiatePayment({
        totalAmount: orderSummary.totalToPayNow,
        description: payDescription,
        callbackUrl,
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

      if (!(checkoutUrl && responseCode === '0000')) {
        showFeedback(
          'error',
          initRes?.error || initRes?.message || gatewayStatus || 'Hubtel did not return a valid checkout link.',
          'Unable to continue'
        );
        return;
      }

      await appClient.entities.Order.create({
        order_number: orderNumber,
        items: orderItems,
        product_subtotal: orderSummary.subtotal,
        delivery_fee: orderSummary.deliveryFee,
        grand_total: orderSummary.grandTotal,
        total_amount: orderSummary.grandTotal,
        amount_paid_now: orderSummary.totalToPayNow,
        initial_payment_amount: orderSummary.initialPaymentAmount,
        balance_due: orderSummary.balanceDue,
        balance_payment_amount: orderSummary.balancePaymentAmount,
        payment_method: paymentMethod,
        delivery_zone: selectedZone.label,
        payment_status: 'pending_payment',
        initial_payment_status: 'pending',
        balance_payment_status: orderSummary.isTwoStage ? 'pending' : 'not_required',
        payment_stage: 'awaiting_initial_payment',
        remaining_balance_paid: !orderSummary.isTwoStage,
        is_fully_paid: !orderSummary.isTwoStage,
        balance_payment_enabled: false,
        initial_payment_reference: initialPaymentReference,
        balance_payment_reference: orderSummary.isTwoStage ? `${orderNumber}-BAL` : null,
        initial_checkout_id: checkoutId,
        payment_reference: initialPaymentReference,
        status: 'confirmed',
        customer_name: formData.customer_name.trim(),
        customer_email: user.email,
        customer_phone: formData.customer_phone.trim(),
        delivery_address: deliveryAddress,
        address: formData.address.trim(),
        delivery_landmark: formData.landmark.trim() || null,
        city: formData.city.trim(),
        region: formData.region.trim(),
        notes: formData.notes.trim() || null,
        tracking_updates: [
          {
            status: 'Hubtel Redirect Created',
            message: `Hubtel accepted the payment request for order ${orderNumber}. ResponseCode ${responseCode || 'N/A'}. CheckoutId ${checkoutId || 'N/A'}.`,
            timestamp: new Date().toISOString(),
          },
        ],
        created_date: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
      showFeedback('info', 'Redirecting you to Hubtel for secure payment...', 'Opening payment');
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      showFeedback(
        'error',
        error?.message || 'We could not start your checkout right now. Please try again.',
        'Checkout failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B3A6B]" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-6">
          <ShoppingBag className="h-12 w-12 text-[#1B3A6B]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add products to your cart before starting checkout.</p>
        <Link to={createPageUrl('Shop')}>
          <Button className="bg-[#1B3A6B] hover:bg-[#162f58]">Back to shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:px-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your delivery details, choose how you want to pay, then continue to Hubtel.</p>
        </div>

        <InlineNotice
          variant={feedback?.variant}
          title={feedback?.title}
          message={feedback?.message}
          onDismiss={() => setFeedback(null)}
        />

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Card className="p-4 sm:p-6 bg-white">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h2 className="text-lg font-semibold text-gray-900">Delivery details</h2>
                  <p className="text-sm text-gray-500 mt-1">Fill this in before payment. Accra and Tarkwa locations work best when you also add a landmark or Google Maps link.</p>
                </div>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Full name</span>
                  <Input value={formData.customer_name} onChange={(event) => updateField('customer_name', event.target.value)} placeholder="Customer name" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Phone number</span>
                  <Input value={formData.customer_phone} onChange={(event) => updateField('customer_phone', event.target.value)} placeholder="0XX XXX XXXX" />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <Input value={formData.customer_email} onChange={(event) => updateField('customer_email', event.target.value)} placeholder="name@example.com" disabled />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Street address</span>
                  <Textarea value={formData.address} onChange={(event) => updateField('address', event.target.value)} placeholder="Street address, area, or detailed delivery description" />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">Landmark / Google Maps link</span>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDetectLocation} disabled={detectingLocation}>
                      {detectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                      {detectingLocation ? 'Detecting...' : 'Auto-detect location'}
                    </Button>
                  </div>
                  <Input value={formData.landmark} onChange={(event) => updateField('landmark', event.target.value)} placeholder="Nearest landmark or paste a Google Maps link" />
                  <p className="text-xs text-gray-500">If auto-detect does not work, open Google Maps, copy your location link, and paste it here.</p>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">City / town</span>
                  <Input value={formData.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Accra, Tarkwa, etc." />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Region</span>
                  <Input value={formData.region} onChange={(event) => updateField('region', event.target.value)} placeholder="Greater Accra, Western, etc." />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700">Delivery zone</span>
                  <select
                    value={selectedZoneId}
                    onChange={(event) => setSelectedZoneId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {DELIVERY_ZONES.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.label} — {zone.fee > 0 ? formatCurrency(zone.fee) : 'FREE'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Order notes / delivery instructions</span>
                  <Textarea value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Anything the rider or store should know before delivery" />
                </label>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white">
              <div className="flex items-center gap-2 text-gray-900">
                <Truck className="h-5 w-5 text-[#1B3A6B]" />
                <h2 className="text-lg font-semibold">Delivery guide</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-gray-700">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Accra deliveries</p><ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc pl-4">
                    <li>Ashongman Estate pickup stays free.</li>
                    <li>Accra Mall, Madina, East Legon, Osu, Circle, Makola, Spintex and nearby zones keep their delivery rates.</li>
                    <li>Use a landmark or Google Maps link so the rider can find the address faster.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Tarkwa / UMAT deliveries</p><ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc pl-4">
                    <li>UMAT pickup stays free.</li>
                    <li>UMAT doorstep and Tarkwa town delivery still use their separate delivery charges.</li>
                    <li>Add your hostel, hall, junction, or a map link in the landmark field.</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 flex gap-3">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Outside Accra and Tarkwa can still check out, but two-stage payment options stay limited to the supported local zones above.</p>
              </div>
            </Card>
          </div>

          <Card className="p-4 sm:p-6 bg-white h-fit">
            <div className="flex items-center gap-2 text-gray-900">
              <CreditCard className="h-5 w-5 text-[#1B3A6B]" />
              <h2 className="text-lg font-semibold">Order summary</h2>
            </div>

            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="h-14 w-14 rounded-lg object-cover bg-slate-100" loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.product_name}</p>
                    <p className="text-xs text-gray-500">Qty: {toNumber(item.quantity, 1)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(toNumber(item.product_price) * toNumber(item.quantity, 1))}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Products</span>
                <span className="font-medium">{formatCurrency(orderSummary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-medium">{orderSummary.deliveryFee > 0 ? formatCurrency(orderSummary.deliveryFee) : 'FREE'}</span>
              </div>
              {orderSummary.balanceDue > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Remaining balance later</span>
                  <span className="font-medium">{formatCurrency(orderSummary.balanceDue)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-gray-900">
                <span>Total to pay now</span>
                <span>{formatCurrency(orderSummary.totalToPayNow)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 text-gray-900">
                <ShieldCheck className="h-5 w-5 text-[#1B3A6B]" />
                <h3 className="text-base font-semibold">Payment method</h3>
              </div>

              {PAYMENT_OPTIONS.map((option) => {
                const disabled = (option.id === 'deposit_balance' && !twoStageEligible) || (option.id === 'pay_on_delivery' && !payOnDeliveryEligible);
                const active = paymentMethod === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !disabled && setPaymentMethod(option.id)}
                    disabled={disabled}
                    className={`w-full rounded-xl border p-4 text-left transition ${active ? 'border-[#1B3A6B] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'} ${disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-[#1B3A6B]/45'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{option.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{option.badge}</span>
                    </div>
                    {disabled && (
                      <p className="mt-3 text-xs text-amber-700">
                        {option.id === 'pay_on_delivery'
                          ? 'Available only for supported delivery zones with a delivery charge.'
                          : 'Available only for supported Accra and Tarkwa delivery zones.'}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Hubtel secure checkout</p>
              <p className="mt-1">Mobile Money, debit card, bank transfer and wallet options will show after Hubtel opens.</p>
              <p className="mt-2 text-xs text-blue-700">Selected now: {getPaymentOptionLabel(paymentMethod)} • {orderSummary.paymentSummary}</p>
            </div>

            <Button
              className="mt-5 w-full bg-[#1B3A6B] hover:bg-[#162f58] text-white"
              onClick={handleCheckout}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening Hubtel...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pay {formatCurrency(orderSummary.totalToPayNow)} with Hubtel
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
