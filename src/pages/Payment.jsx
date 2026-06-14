import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, Search, Bell, ShoppingCart, User, ChevronLeft, Lock, Loader2, AlertCircle, MessageCircle, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CheckoutSdk from '@hubteljs/checkout';

const ASH = '#2E86C1';
const ASH_HOVER = '#2578ae';

// ── HUBTEL CREDENTIALS ─────────────────────────────────────────────────────
const HUBTEL_CLIENT_ID     = 'pQGpB7y';
const HUBTEL_CLIENT_SECRET = '14fda6847ee44c8fa910f355675cce73';
const HUBTEL_MERCHANT_ACCT = 2025378; // number as required by JS SDK
const HUBTEL_BASIC_AUTH    = btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);
// ───────────────────────────────────────────────────────────────────────────

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
  const [errorMsg, setErrorMsg]       = useState('');
  const [showFallback, setShowFallback] = useState(false);

  const navigate = useNavigate();

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

  useEffect(() => {
    if (orderId && orderNumber && amount > 0) {
      sessionStorage.setItem('fmm_pending_order', JSON.stringify({ orderId, orderNumber, amount }));
    }
  }, []);

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

  const [diagReport, setDiagReport] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailVal.trim()) { setErrorMsg('Please enter your email address.'); return; }
    if (!phone.trim())    { setErrorMsg('Please enter your phone number.'); return; }

    setLoading(true);

    const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer';
    const normPhone    = normalisePhone(phone);
    const clientRef    = (orderNumber || orderId || `FMM${Date.now()}`).slice(0, 32);
    const returnUrl    = `${window.location.origin}/PaymentConfirmed?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}`;
    const cancelUrl    = window.location.href;

    try {
      const checkout = new CheckoutSdk();
      const purchaseInfo = {
        amount: parseFloat(amount.toFixed(2)),
        purchaseDescription: `FMM CLASSICO Order #${orderNumber}`,
        customerPhoneNumber: normPhone,
        clientReference: clientRef,
      };
      const config = {
        branding: 'enabled',
        callbackUrl: returnUrl,
        returnUrl: returnUrl,
        cancellationUrl: cancelUrl,
        merchantAccount: HUBTEL_MERCHANT_ACCT,
        basicAuth: HUBTEL_BASIC_AUTH,
      };
      checkout.redirect({ purchaseInfo, config });
    } catch (err) {
      setErrorMsg(`SDK error: ${err?.message}`);
      setLoading(false);
    }
  };

  // ── DIAGNOSTIC: direct API call, captures exact request + response ──────
  const runDiagnostic = async () => {
    setDiagLoading(true);
    setDiagReport(null);

    const clientRef    = `DIAG${Date.now()}`.slice(0, 32);
    const returnUrl    = `${window.location.origin}/PaymentConfirmed?orderId=DIAG&orderNumber=DIAG&amount=0.01`;
    const cancelUrl    = window.location.href;

    const requestBody = {
      totalAmount: 0.01,
      description: 'FMM CLASSICO Diagnostic Test',
      callbackUrl: returnUrl,
      returnUrl: returnUrl,
      merchantAccountNumber: String(HUBTEL_MERCHANT_ACCT),
      cancellationUrl: cancelUrl,
      clientReference: clientRef,
      payeeName: 'Diagnostic Test',
      payeeMobileNumber: '233200000000',
      payeeEmail: 'test@fmmclassico.com',
    };

    const authHeader = `Basic ${HUBTEL_BASIC_AUTH}`;

    let httpStatus = null;
    let responseBody = null;
    let fetchError = null;

    try {
      const res = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(requestBody),
      });
      httpStatus = res.status;
      const text = await res.text();
      try { responseBody = JSON.parse(text); } catch { responseBody = text; }
    } catch (err) {
      fetchError = err.message;
    }

    setDiagReport({
      requestSent: {
        endpoint: 'POST https://payproxyapi.hubtel.com/items/initiate',
        authorization: `Basic ${HUBTEL_CLIENT_ID}:******* (base64 encoded)`,
        merchantAccountNumber: String(HUBTEL_MERCHANT_ACCT),
        clientReference: clientRef,
        totalAmount: requestBody.totalAmount,
        callbackUrl: requestBody.callbackUrl,
        returnUrl: requestBody.returnUrl,
        cancellationUrl: requestBody.cancellationUrl,
        payeeName: requestBody.payeeName,
        payeeMobileNumber: requestBody.payeeMobileNumber,
        payeeEmail: requestBody.payeeEmail,
        description: requestBody.description,
      },
      httpStatus,
      responseBody,
      fetchError,
      responseCode: responseBody?.responseCode || responseBody?.ResponseCode || 'N/A',
      message: responseBody?.message || responseBody?.Message || 'N/A',
      status: responseBody?.status || responseBody?.Status || 'N/A',
      checkoutUrl: responseBody?.data?.checkoutUrl || 'none',
    });

    setDiagLoading(false);
  };

  const whatsappMsg = encodeURIComponent(
    `Hello FMM CLASSICO! I want to pay for my order.\n\nOrder Number: #${orderNumber}\nAmount: GHS ${formatAmount(amount)}\n\nPlease send me a Hubtel payment link.`
  );

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
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-6xl pb-10">

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
        <div className="flex flex-col lg:flex-row gap-0 rounded-xl overflow-hidden shadow-lg border border-gray-100 min-h-[500px]">

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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone number <span className="font-normal text-gray-400 text-xs">(e.g. 0244123456)</span>
                </label>
                <Input placeholder="0244123456" value={phone} onChange={e => setPhone(e.target.value)} className="h-11" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <div className="flex gap-2">
                  <div className="flex items-center border border-input rounded-md px-3 h-11 bg-gray-50 text-gray-600 font-semibold flex-shrink-0">GHS</div>
                  <Input value={formatAmount(amount)} readOnly className="h-11 bg-gray-50 font-semibold text-gray-700 cursor-default" />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button type="submit" disabled={loading}
                className="w-full py-6 text-base font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600">
                {loading
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Redirecting to Hubtel...</>
                  : `Pay ₵${formatAmount(amount)} with Hubtel`}
              </Button>

              <p className="text-center text-xs text-gray-400">
                You will be redirected to Hubtel's secure checkout page.
              </p>

              {/* WhatsApp fallback — always visible as secondary option */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-400 text-center mb-3">Having trouble? Pay via WhatsApp instead:</p>
                <a href={`https://wa.me/233509896035?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold">
                    <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp — Order #{orderNumber}
                  </Button>
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── DIAGNOSTIC PANEL ── */}
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl mb-10">
        <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-700 text-sm">🔍 Hubtel API Diagnostic</p>
              <p className="text-xs text-gray-500">Send a test request to Hubtel and capture the exact response</p>
            </div>
            <Button onClick={runDiagnostic} disabled={diagLoading} variant="outline" size="sm" className="text-xs">
              {diagLoading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Running...</> : 'Run Diagnostic'}
            </Button>
          </div>

          {diagReport && (
            <div className="space-y-3 mt-3">
              {/* Request sent */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">📤 Request Sent</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {Object.entries(diagReport.requestSent).map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="font-semibold text-gray-500 min-w-[140px]">{k}:</span>
                      <span className="text-gray-800 break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response received */}
              <div className={`border rounded-lg p-3 ${diagReport.fetchError ? 'bg-red-50 border-red-200' : diagReport.responseCode === '0000' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">📥 Hubtel Response</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs mb-2">
                  <div className="flex gap-1"><span className="font-semibold text-gray-500 min-w-[140px]">HTTP Status:</span><span className="font-bold">{diagReport.httpStatus ?? 'N/A (fetch blocked)'}</span></div>
                  <div className="flex gap-1"><span className="font-semibold text-gray-500 min-w-[140px]">responseCode:</span><span className="font-bold text-red-600">{diagReport.responseCode}</span></div>
                  <div className="flex gap-1"><span className="font-semibold text-gray-500 min-w-[140px]">message:</span><span className="font-bold">{diagReport.message}</span></div>
                  <div className="flex gap-1"><span className="font-semibold text-gray-500 min-w-[140px]">status:</span><span className="font-bold">{diagReport.status}</span></div>
                  <div className="flex gap-1"><span className="font-semibold text-gray-500 min-w-[140px]">checkoutUrl:</span><span className="font-bold text-green-700 break-all">{diagReport.checkoutUrl}</span></div>
                  {diagReport.fetchError && <div className="flex gap-1 col-span-2"><span className="font-semibold text-red-500 min-w-[140px]">Fetch Error:</span><span className="text-red-700">{diagReport.fetchError}</span></div>}
                </div>
                <p className="text-xs font-bold text-gray-600 mb-1">Full Raw Response:</p>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-64">
                  {JSON.stringify(diagReport.responseBody, null, 2)}
                </pre>
              </div>

              {/* Diagnosis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-700 mb-1">⚡ What this means:</p>
                <p className="text-xs text-blue-800">
                  {diagReport.fetchError?.includes('CORS') || diagReport.fetchError?.includes('fetch') 
                    ? '❌ CORS/Network block — direct browser fetch to Hubtel is blocked. The SDK redirect should still work.'
                    : diagReport.responseCode === '0000'
                    ? '✅ Merchant account is valid and working! The issue is elsewhere.'
                    : diagReport.responseCode === '4000'
                    ? '❌ ResponseCode 4000: Validation Error — one or more fields are invalid/missing or the merchant account number is wrong.'
                    : diagReport.responseCode === '4070'
                    ? '❌ ResponseCode 4070: Fees not configured for this merchant account. Contact Hubtel to enable Online Checkout for account 2025378.'
                    : diagReport.httpStatus === 401
                    ? '❌ HTTP 401: Invalid API credentials (Client ID or Secret is wrong).'
                    : diagReport.httpStatus === 403
                    ? '❌ HTTP 403: Merchant account 2025378 is not authorized/enabled for Online Checkout.'
                    : diagReport.fetchError
                    ? `❌ Network error: ${diagReport.fetchError}`
                    : `❌ Unknown error — check the full response above and share with Hubtel support.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}