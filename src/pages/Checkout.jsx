import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Loader2, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
import { createInitialPaymentReference, initiatePayment } from '@/api/hubtelClient';
import { useAuth } from '@/lib/AuthContext';
import { getHubtelCallbackUrl } from '@/lib/runtime-config';
import DeliveryInfoModal from '@/components/delivery/DeliveryInfoModal';
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

export default function Checkout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      customer_name: current.customer_name || user?.full_name || user?.name || '',
      customer_email: current.customer_email || user?.email || '',
      customer_phone: current.customer_phone || user?.phone || '',
    }));
  }, [user]);

  const orderSummary = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + toNumber(item.product_price) * toNumber(item.quantity, 1),
      0
    );
    const deliveryFee = toNumber(selectedZone?.fee);
    const grandTotal = subtotal + deliveryFee;

    return {
      subtotal,
      deliveryFee,
      grandTotal,
      totalToPayNow: grandTotal,
      balanceDue: 0,
      isTwoStage: false,
    };
  }, [cartItems, selectedZone]);

  const showFeedback = (variant, message, title) => {
    setFeedback({ variant, message, title });
  };

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
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

    if (orderSummary.grandTotal <= 0) {
      showFeedback('error', 'The order total must be greater than zero before payment can start.', 'Invalid total');
      return false;
    }

    return true;
  };

  const handleCheckout = async () => {
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const orderNumber = createOrderNumber();
    const initialPaymentReference = createInitialPaymentReference(orderNumber, 'full_payment');
    const orderItems = buildOrderItems(cartItems);
    const deliveryAddress = buildDeliveryAddress({
      address: formData.address.trim(),
      landmark: formData.landmark.trim(),
      city: formData.city.trim(),
      region: formData.region.trim(),
      zoneLabel: selectedZone.label,
    });
    const payDescription = sanitizeHubtelDescription(`FMM CLASSICO Full Payment ${orderNumber}`);

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
        initial_payment_amount: orderSummary.totalToPayNow,
        balance_due: 0,
        balance_payment_amount: 0,
        payment_method: 'full_payment',
        delivery_zone: selectedZone.label,
        payment_status: 'pending_payment',
        initial_payment_status: 'pending',
        balance_payment_status: 'not_required',
        payment_stage: 'awaiting_initial_payment',
        remaining_balance_paid: false,
        is_fully_paid: false,
        balance_payment_enabled: false,
        initial_payment_reference: initialPaymentReference,
        balance_payment_reference: null,
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={createPageUrl('Cart')} className="inline-flex items-center gap-2 text-sm font-medium text-[#1B3A6B] hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Back to cart
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-500">Review your order, confirm delivery details, and continue to Hubtel payment.</p>
          </div>
          <DeliveryInfoModal
            trigger={
              <Button variant="outline" className="gap-2 bg-white">
                <Truck className="h-4 w-4" />
                Delivery info
              </Button>
            }
          />
        </div>

        <InlineNotice
          variant={feedback?.variant}
          title={feedback?.title}
          message={feedback?.message}
          onDismiss={() => setFeedback(null)}
        />

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-4 sm:p-6 bg-white">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900">Delivery details</h2>
                <p className="text-sm text-gray-500 mt-1">These details are saved with the order before you are redirected to payment.</p>
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

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Landmark</span>
                <Input value={formData.landmark} onChange={(event) => updateField('landmark', event.target.value)} placeholder="Nearest landmark" />
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
                <span className="text-sm font-medium text-gray-700">Order notes</span>
                <Textarea value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Optional delivery instructions or order notes" />
              </label>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-white h-fit">
            <div className="flex items-center gap-2 text-gray-900">
              <CreditCard className="h-5 w-5 text-[#1B3A6B]" />
              <h2 className="text-lg font-semibold">Order summary</h2>
            </div>

            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="h-14 w-14 rounded-lg object-cover bg-slate-100" />
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
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-gray-900">
                <span>Total to pay now</span>
                <span>{formatCurrency(orderSummary.totalToPayNow)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  This checkout now uses a valid default export and a self-contained payment flow, so the route can build and open correctly.
                </p>
              </div>
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
