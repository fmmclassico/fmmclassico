import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Menu, Search, Bell, ShoppingCart, User, ChevronLeft, Lock, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ASH = '#1f2937';
const ASH_HOVER = '#374151';

const PAYSTACK_PUBLIC_KEY = 'pk_live_8e08afef1e1e7e7130f3f22d1c30a62cdd6b647e';

function formatAmount(num) {
  const n = Number(num);
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}

export default function Payment() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId     = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw   = urlParams.get('amount');
  const emailParam  = urlParams.get('email') || '';
  const amount      = amountRaw ? parseFloat(amountRaw) : 0;

  const [user, setUser] = useState(null);
  const [paystackReady, setPaystackReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [emailVal, setEmailVal]   = useState(emailParam);
  const [phone, setPhone]         = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      const parts = (u.full_name || '').trim().split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmailVal(u.email || emailParam);
      // fetch cart count
      base44.entities.CartItem.filter({ user_email: u.email })
        .then(items => setCartCount(items.reduce((s, i) => s + (i.quantity || 1), 0)))
        .catch(() => {});
    }).catch(() => {});
  }, []);

  // Save to sessionStorage for PaymentConfirmed
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  // Load Paystack inline script
  useEffect(() => {
    if (document.getElementById('paystack-script')) {
      setPaystackReady(true);
      setLoading(false);
      return;
    }
    const script = document.createElement('script');
    script.id = 'paystack-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => { setPaystackReady(true); setLoading(false); };
    script.onerror = () => setLoading(false);
    document.body.appendChild(script);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/Shop?search=${encodeURIComponent(searchQuery)}`);
  };

  const handlePay = (e) => {
    e.preventDefault();
    if (!window.PaystackPop) return;
    if (!emailVal) { alert('Please enter your email address.'); return; }
    setPaying(true);

    const callbackUrl = `${window.location.origin}/PaymentConfirmed?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}`;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: emailVal,
      amount: Math.round(amount * 100), // pesewas
      currency: 'GHS',
      ref: orderNumber,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        first_name: firstName,
        last_name: lastName,
        phone,
        custom_fields: [
          { display_name: 'Store', variable_name: 'store', value: 'FMM CLASSICO' },
          { display_name: 'Order Number', variable_name: 'order_number', value: orderNumber },
        ]
      },
      callback: function(response) {
        window.location.href = callbackUrl + `&reference=${response.reference}`;
      },
      onClose: function() {
        setPaying(false);
      }
    });

    handler.openIframe();
  };

  if (amount <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ══ FULL SITE HEADER ══ */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
                <Menu className="h-7 w-7 text-white" style={{ strokeWidth: 3 }} />
              </Button>
              <Link to="/" className="flex items-center">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  FMM <span className="text-white">CLASSICO</span>
                </h1>
              </Link>
            </div>

            {/* Search — desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search for phone accessories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90 focus:bg-white"
                />
                <Button type="submit" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
                  style={{ background: ASH }}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Right icons */}
            <div className="flex items-center gap-1">
              <Link to="/Notifications" className="relative flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
                <Bell className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">Alerts</span>
              </Link>
              <Link to="/Cart" className="relative flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-white text-[10px] font-bold" style={{ background: '#ef4444' }}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-tight">Cart</span>
              </Link>
              <Link to="/Settings" className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
                <User className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">Account</span>
              </Link>
            </div>
          </div>

          {/* Search — mobile */}
          <form onSubmit={handleSearch} className="md:hidden pb-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90"
              />
              <Button type="submit" size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
                style={{ background: ASH }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </header>

      {/* ══ PAGE BODY ══ */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-5xl">

        {/* Back + title row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <p className="font-bold text-gray-800 text-sm">Secure Payment – FMM CLASSICO</p>
            <p className="text-xs text-gray-400">Order #{orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Amount</p>
            <p className="text-2xl font-black text-orange-500">₵{formatAmount(amount)}</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-0 rounded-xl overflow-hidden shadow-lg border border-gray-100 min-h-[580px]">

          {/* ── LEFT PANEL — store info (Paystack-style light blue) ── */}
          <div className="md:w-5/12 flex flex-col items-center justify-center py-10 px-8 text-center"
            style={{ background: '#e8f0f9' }}>

            <h2 className="text-2xl font-black text-gray-800 mb-5">FMM CLASSICO</h2>

            <p className="text-sm text-blue-700 leading-relaxed max-w-xs">
              FMM CLASSICO is an online store offering a wide range of{' '}
              <span className="font-semibold">Phones &amp; Accessories</span>,{' '}
              <span className="font-semibold">Home Appliances</span> and{' '}
              <span className="font-semibold">Electronics</span>, providing quality
              products and convenient shopping for our customers.
            </p>

            {/* Paystack badge */}
            <div className="mt-6 flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Secured by</span>
              <span className="font-black text-gray-700">paystack</span>
            </div>

            {/* Payment method logos */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              {/* Mastercard */}
              <div className="h-7 w-11 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <svg viewBox="0 0 38 24" width="36" height="22"><circle cx="15" cy="12" r="10" fill="#EB001B"/><circle cx="23" cy="12" r="10" fill="#F79E1B"/><path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00"/></svg>
              </div>
              {/* Visa */}
              <div className="h-7 w-11 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-blue-700 font-black text-sm italic">VISA</span>
              </div>
              {/* MTN MoMo */}
              <div className="h-7 w-11 bg-yellow-400 rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-black font-black text-[9px] leading-tight text-center">MTN<br/>MoMo</span>
              </div>
              {/* Apple Pay */}
              <div className="h-7 w-11 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-gray-800 font-black text-[10px]"> Pay</span>
              </div>
            </div>

            {/* Telecel & Airteltico */}
            <div className="mt-2 flex items-center gap-3 flex-wrap justify-center">
              <div className="h-6 px-2 bg-white rounded flex items-center justify-center shadow-sm">
                <span className="text-red-600 font-black text-[9px]">Telecel Cash</span>
              </div>
              <div className="h-6 px-2 bg-white rounded flex items-center justify-center shadow-sm">
                <span className="text-red-500 font-black text-[9px]">AirtelTigo Money</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL — payment form ── */}
          <div className="md:w-7/12 bg-white flex flex-col justify-center px-6 md:px-10 py-8 md:py-10">
            <form onSubmit={handlePay} className="space-y-5">

              {/* First & Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name</label>
                  <Input placeholder="First name" value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="text-base h-12" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name</label>
                  <Input placeholder="Last name" value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="text-base h-12" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <Input type="email" placeholder="Email address" value={emailVal}
                  onChange={e => setEmailVal(e.target.value)}
                  required className="text-base h-12" />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone number</label>
                <div className="flex gap-2">
                  <div className="flex items-center border border-input rounded-md px-3 py-2.5 bg-background text-base text-gray-600 gap-1.5 flex-shrink-0 h-12">
                    <span className="text-lg">🇬🇭</span>
                    <span>+233</span>
                    <svg className="h-3.5 w-3.5 ml-0.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  <Input placeholder="Phone number" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="text-base flex-1 h-12" />
                </div>
              </div>

              {/* Amount (read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <div className="flex gap-2">
                  <div className="flex items-center border border-input rounded-md px-3 py-2.5 bg-gray-50 text-base text-gray-600 flex-shrink-0 font-semibold h-12">
                    GHS
                  </div>
                  <Input
                    value={formatAmount(amount)}
                    readOnly
                    className="text-base flex-1 bg-gray-50 font-semibold text-gray-700 cursor-default h-12"
                  />
                </div>
              </div>

              {/* Pay button */}
              <Button
                type="submit"
                disabled={loading || paying}
                className="w-full py-7 text-lg font-bold rounded-lg text-white bg-green-500 hover:bg-green-600 mt-3"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading payment...</>
                ) : paying ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening payment window...</>
                ) : (
                  'Pay now'
                )}
              </Button>

              <p className="text-center text-xs text-gray-400 mt-1">
                You will be redirected to Paystack to complete your payment securely.
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}