import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, Search, Bell, ShoppingCart, User, ChevronLeft, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ASH = '#2E86C1';
const ASH_HOVER = '#2578ae';

// ── HUBTEL ACCOUNT INFO (server-side only — never sent to browser in auth headers) ──
// Collection Account = loaded from environment variables (used for receiving payments)
// Disbursement Account = 2025378 (for sending money - WRONG for checkout)
const HUBTEL_COLLECTION_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER;
// API ID (username) and API Key (password) — loaded from environment variables
const HUBTEL_API_ID  = import.meta.env.VITE_HUBTEL_API_ID;
const HUBTEL_API_KEY = import.meta.env.VITE_HUBTEL_API_KEY;

function formatAmount(num) {
  const n = Number(num);
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}

// Generate a unique client reference that never repeats
function generateClientRef(orderNumber) {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const base = `FMM-${ts}-${rand}`;
  return base.slice(0, 32);
}

// ── DIRECT HUBTEL API CALL ────────────────────────────────────────────────────
// payproxyapi.hubtel.com is Hubtel's own CORS-enabled proxy endpoint — direct fetch works
async function callHubtelDirect(requestBody) {
  const basicAuth = btoa(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`);

  const res = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: JSON.stringify(requestBody),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _rawText: text, _parseError: 'Response was not valid JSON' }; }

  return { httpStatus: res.status, body: json };
}

export default function Payment() {
  const urlParams   = new URLSearchParams(window.location.search);
  const orderId     = urlParams.get('orderId');
  const orderNumber = urlParams.get('orderNumber');
  const amountRaw   = urlParams.get('amount');
  const emailParam  = urlParams.get('email') || '';
  const amount      = amountRaw ? parseFloat(amountRaw) : 0;

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [payLog, setPayLog]       = useState(null); // full request+response log

  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [emailVal, setEmailVal]   = useState(emailParam);
  const [phone, setPhone]         = useState('');

  useEffect(() => {
    // Always reset loading on mount (handles back-navigation stuck state)
    setLoading(false);
    setErrorMsg('');
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

  // No orderId at this point — order is created only after successful payment
  // sessionStorage already has full order data set by Checkout page

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/Shop?search=${encodeURIComponent(searchQuery)}`);
  };

  const normalisePhone = (raw) => {
    let p = raw.trim().replace(/\s+/g, '').replace(/-/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    else if (p.startsWith('0')) p = '233' + p.slice(1);
    return p;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setPayLog(null);

    if (!emailVal.trim()) { setErrorMsg('Please enter your email address.'); return; }
    if (!phone.trim())    { setErrorMsg('Please enter your phone number.'); return; }

    setLoading(true);

    // Safety timeout — if Hubtel takes >20s, reset the button so user isn't stuck
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setErrorMsg('Request timed out. Please check your internet connection and try again.');
    }, 20000);

    const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer';
    const normPhone    = normalisePhone(phone);
    const clientRef    = generateClientRef(orderNumber);
    // Hubtel appends ?status=success&clientReference=...&transactionId=... to the returnUrl
    const returnUrl    = `${window.location.origin}/PaymentConfirmed?orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount.toFixed(2)}`;
    const cancelUrl    = `${window.location.origin}/PaymentConfirmed?orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount.toFixed(2)}&status=cancelled`;

    const requestBody = {
      totalAmount: parseFloat(amount.toFixed(2)),
      description: `FMM CLASSICO Order #${orderNumber}`,
      callbackUrl: returnUrl,
      returnUrl: returnUrl,
      cancellationUrl: cancelUrl,
      merchantAccountNumber: HUBTEL_COLLECTION_ACCOUNT,
      clientReference: clientRef,
      payeeName: customerName,
      payeeMobileNumber: normPhone,
      payeeEmail: emailVal,
    };

    const log = {
      requestTime: new Date().toISOString(),
      merchantAccountNumber: HUBTEL_COLLECTION_ACCOUNT,
      clientReference: clientRef,
      amount: amount,
      requestBody,
      hubtelResponse: null,
      checkoutUrl: null,
      error: null,
    };

    try {
      const { httpStatus, body: hubtelResponse } = await callHubtelDirect(requestBody);
      clearTimeout(safetyTimer);
      log.httpStatus = httpStatus;
      log.hubtelResponse = hubtelResponse;

      const code = hubtelResponse?.responseCode;
      const checkoutUrl = hubtelResponse?.data?.checkoutUrl || hubtelResponse?.data?.checkoutDirectUrl;
      log.checkoutUrl = checkoutUrl;

      setPayLog(log);

      // Hubtel returns "0000" or "00" for success
      const isSuccess = code === '0000' || code === '00';

      if (isSuccess && checkoutUrl) {
        // SUCCESS — redirect to real Hubtel checkout page
        window.location.href = checkoutUrl;
        return;
      }

      // Hubtel returned an error — show exact code, message, and full response
      const hubtelMsg = hubtelResponse?.message || hubtelResponse?.Message || '';
      const diagMsg = interpretHubtelCode(code, hubtelMsg);
      setErrorMsg(`Hubtel [HTTP ${httpStatus}] code=${code}: ${diagMsg}`);

    } catch (err) {
      clearTimeout(safetyTimer);
      log.error = err?.message || String(err);
      setPayLog(log);
      setErrorMsg(`Network error: ${err?.message || 'Could not reach Hubtel. Check your internet connection.'}`);
    }

    setLoading(false);
  };

  function interpretHubtelCode(code, msg) {
    if (code === '0000' || code === '00') return '✅ Success';
    if (code === '4000') return `Validation error — check all fields are correct. ${msg}`;
    if (code === '4070') return `Fees not configured for merchant account ${HUBTEL_COLLECTION_ACCOUNT}. Contact Hubtel support to enable Online Checkout. ${msg}`;
    if (code === '2001') return `Payment processor error — invalid credentials or account not enabled. ${msg}`;
    return msg || `Unknown error code ${code}`;
  }

  if (amount <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 font-semibold">Invalid order amount. Please return to checkout.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* HEADER */}
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
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90 focus:bg-white" />
                <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white" style={{ background: ASH }}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
            <div className="flex items-center gap-1">
              <Link to="/Notifications" className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
                <Bell className="h-5 w-5" /><span className="text-[10px] font-semibold leading-tight">Alerts</span>
              </Link>
              <Link to="/Cart" className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
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
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90" />
              <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white" style={{ background: ASH }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </header>

      {/* PAGE BODY */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-5xl pb-10">

        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-6">
          <div>
            <button onClick={() => navigate('/Checkout')}
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

        {/* ── PAYMENT FORM ── */}
        <div className="flex flex-col lg:flex-row gap-0 rounded-xl overflow-hidden shadow-lg border border-gray-100 min-h-[500px] mb-6">

          {/* LEFT INFO */}
          <div className="lg:w-5/12 flex flex-col items-center justify-center py-8 px-6 sm:px-8 text-center"
            style={{ background: '#e8f0f9' }}>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-4">FMM CLASSICO</h2>
            <p className="text-sm text-blue-700 leading-relaxed max-w-sm">
              Pay with <strong>MTN MoMo</strong>, <strong>Telecel Cash</strong>, <strong>AirtelTigo</strong>, or <strong>Bank Card</strong> via Hubtel.
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Secured by</span>
              <span className="font-black text-orange-600">Hubtel</span>
            </div>
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

          {/* RIGHT FORM */}
          <div className="lg:w-7/12 bg-white flex flex-col justify-center px-4 sm:px-8 py-6 sm:py-8">
            <form onSubmit={handlePay} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">First name</label>
                  <Input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last name</label>
                  <Input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} className="h-11" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <Input type="email" placeholder="Email address" value={emailVal}
                  onChange={e => setEmailVal(e.target.value)} required className="h-11" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone number</label>
                <Input placeholder="Enter your phone number" value={phone} onChange={e => setPhone(e.target.value)} className="h-11" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <div className="flex gap-2">
                  <div className="flex items-center border border-input rounded-md px-3 h-11 bg-gray-50 text-gray-600 font-semibold flex-shrink-0">GHS</div>
                  <Input value={formatAmount(amount)} readOnly className="h-11 bg-gray-50 font-semibold text-gray-700 cursor-default" />
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold">{errorMsg}</span>
                  </div>
                  {payLog?.hubtelResponse && (
                    <details className="mt-1">
                      <summary className="text-xs cursor-pointer text-red-500 underline">Show full Hubtel response</summary>
                      <pre className="mt-1 text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-40">
                        {JSON.stringify(payLog.hubtelResponse, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading}
                className="w-full py-6 text-base font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600">
                {loading
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Connecting to Hubtel...</>
                  : `Pay ₵${formatAmount(amount)} with Hubtel`}
              </Button>

              <p className="text-center text-xs text-gray-400">
                You will be redirected to Hubtel's secure checkout page.
              </p>


            </form>
          </div>
        </div>

      </div>

      <div className="h-8" />
    </div>
  );
}