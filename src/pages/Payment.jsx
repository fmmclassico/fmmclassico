import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, Search, Bell, ShoppingCart, User, ChevronLeft, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ASH = '#2E86C1';
const ASH_HOVER = '#2578ae';

// ── HUBTEL CONFIG ─────────────────────────────────────────────────────────────
const HUBTEL_API_ID  = 'pQGpB7y';
const HUBTEL_API_KEY = '14fda6847ee44c8fa910f355675cce73';
const HUBTEL_MERCHANT_ACCOUNT = '2039285';
// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(num) {
  const n = Number(num);
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}

export default function Payment() {
  const urlParams   = new URLSearchParams(window.location.search);
  const orderId     = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw   = urlParams.get('amount');
  const emailParam  = urlParams.get('email') || '';
  const amount      = amountRaw ? parseFloat(amountRaw) : 0;

  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [cartCount, setCartCount]     = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError]             = useState('');
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
      base44.entities.CartItem.filter({ user_email: u.email })
        .then(items => setCartCount(items.reduce((s, i) => s + (i.quantity || 1), 0)))
        .catch(() => {});
    }).catch(() => {});
  }, []);

  // Save pending order for PaymentConfirmed page
  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/Shop?search=${encodeURIComponent(searchQuery)}`);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailVal.trim()) { setError('Please enter your email address.'); return; }
    if (!phone.trim())    { setError('Please enter your phone number.'); return; }

    // Normalise phone to international format (233XXXXXXXXX)
    let rawPhone = phone.trim().replace(/\s+/g, '');
    if (rawPhone.startsWith('+')) rawPhone = rawPhone.slice(1);
    else if (rawPhone.startsWith('0')) rawPhone = '233' + rawPhone.slice(1);

    setLoading(true);

    const callbackUrl = `${window.location.origin}/PaymentConfirmed?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}`;
    const cancelUrl   = `${window.location.origin}/Payment?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}&email=${encodeURIComponent(emailVal)}`;

    // Build Hubtel hosted checkout URL directly — no SDK, no popup
    const params = new URLSearchParams({
      merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
      basicAuth: 'Basic ' + btoa(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`),
      totalAmount: amount.toFixed(2),
      description: `FMM CLASSICO – Order #${orderNumber}`,
      clientReference: orderNumber || orderId || Date.now().toString(),
      callbackUrl: callbackUrl,
      returnUrl: callbackUrl,
      cancellationUrl: cancelUrl,
      merchantBusinessLogoUrl: 'https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg',
      customerEmail: emailVal.trim(),
      customerPhoneNumber: rawPhone,
      customerName: `${firstName} ${lastName}`.trim() || 'Customer',
    });

    // Redirect to Hubtel hosted checkout — this ALWAYS works, no popup needed
    window.location.href = `https://payhere.hubtel.com/pay?${params.toString()}`;
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

      {/* ══ SITE HEADER ══ */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
                <Menu className="h-7 w-7 text-white" style={{ strokeWidth: 3 }} />
              </Button>
              <Link to="/" className="flex items-center">
                <h1 className="text-base md:text-lg font-black text-white tracking-tight whitespace-nowrap">FMM CLASSICO</h1>
              </Link>
            </div>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Input type="text" placeholder="Search for phone accessories..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90 focus:bg-white" />
                <Button type="submit" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
                  style={{ background: ASH }}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="flex items-center gap-1">
              <Link to="/Notifications" className="relative flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
                <Bell className="h-5 w-5" /><span className="text-[10px] font-semibold leading-tight">Alerts</span>
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
                <User className="h-5 w-5" /><span className="text-[10px] font-semibold leading-tight">Account</span>
              </Link>
            </div>
          </div>

          <form onSubmit={handleSearch} className="md:hidden pb-3">
            <div className="relative">
              <Input type="text" placeholder="Search products..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90" />
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
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl pb-8">

        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-6">
          <div>
            <button onClick={() => { sessionStorage.removeItem('fmm_pending_order'); navigate('/Checkout'); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back to Checkout
            </button>
            <p className="font-bold text-gray-800 text-sm">Secure Payment – FMM CLASSICO</p>
            <p className="text-xs text-gray-400">Order #{orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Amount</p>
            <p className="text-2xl sm:text-3xl font-black text-orange-500">₵{formatAmount(amount)}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-0 rounded-xl overflow-hidden shadow-lg border border-gray-100 min-h-[600px]">

          {/* LEFT — store info */}
          <div className="lg:w-5/12 flex flex-col items-center justify-center py-8 sm:py-10 px-6 sm:px-8 text-center"
            style={{ background: '#e8f0f9' }}>

            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-4 sm:mb-5">FMM CLASSICO</h2>
            <p className="text-sm text-blue-700 leading-relaxed max-w-sm">
              FMM CLASSICO is an online store offering a wide range of{' '}
              <span className="font-semibold">Phones &amp; Accessories</span>,{' '}
              <span className="font-semibold">Home Appliances</span> and{' '}
              <span className="font-semibold">Electronics</span>.
            </p>

            {/* How it works */}
            <div className="mt-6 bg-white/70 rounded-xl p-4 text-left w-full max-w-xs">
              <p className="text-xs font-bold text-gray-700 mb-2 text-center">How Hubtel Payment Works</p>
              {[
                '1. Fill in your details below',
                '2. Click "Pay now" — you are taken to Hubtel',
                '3. Choose MoMo, Card, or Bank Transfer',
                '4. Complete payment — your order is confirmed ✅',
              ].map(s => (
                <p key={s} className="text-xs text-gray-600 mb-1">{s}</p>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Secured by</span>
              <span className="font-black text-orange-600">Hubtel</span>
            </div>

            {/* Payment logos */}
            <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
              <div className="h-8 w-14 bg-yellow-400 rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-black font-black text-[10px] leading-tight text-center">MTN<br/>MoMo</span>
              </div>
              <div className="h-8 w-14 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-red-600 font-black text-[10px]">Telecel</span>
              </div>
              <div className="h-8 w-14 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-red-500 font-black text-[9px]">AirtelTigo</span>
              </div>
              <div className="h-8 w-12 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <svg viewBox="0 0 38 24" width="36" height="22"><circle cx="15" cy="12" r="10" fill="#EB001B"/><circle cx="23" cy="12" r="10" fill="#F79E1B"/><path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00"/></svg>
              </div>
              <div className="h-8 w-12 bg-white rounded flex items-center justify-center shadow-sm px-1">
                <span className="text-blue-700 font-black text-sm italic">VISA</span>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="lg:w-7/12 bg-white flex flex-col justify-center px-4 sm:px-8 py-6 sm:py-8">
            <form onSubmit={handlePay} className="space-y-4 sm:space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name</label>
                  <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} className="text-base h-11 sm:h-12" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name</label>
                  <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} className="text-base h-11 sm:h-12" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <Input type="email" placeholder="Email address" value={emailVal}
                  onChange={e => setEmailVal(e.target.value)}
                  required className="text-base h-11 sm:h-12" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone number
                  <span className="ml-1 text-xs font-normal text-gray-400">(e.g. 0244123456)</span>
                </label>
                <Input
                  placeholder="0244123456"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="text-base h-11 sm:h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <div className="flex gap-2">
                  <div className="flex items-center border border-input rounded-md px-3 py-2.5 bg-gray-50 text-base text-gray-600 flex-shrink-0 font-semibold h-11 sm:h-12">
                    GHS
                  </div>
                  <Input value={formatAmount(amount)} readOnly
                    className="text-base flex-1 bg-gray-50 font-semibold text-gray-700 cursor-default h-11 sm:h-12" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 sm:py-7 text-base sm:text-lg font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600 mt-3"
              >
                {loading
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Redirecting to Hubtel...</>
                  : 'Pay now with Hubtel'}
              </Button>

              <p className="text-center text-xs text-gray-400 mt-1">
                You will be redirected to Hubtel's secure payment page. Pay with MoMo, Card, or Bank Transfer.
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}