import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, Search, Bell, ShoppingCart, User, ChevronLeft, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ASH = '#2E86C1';
const ASH_HOVER = '#2578ae';

// ── HUBTEL CREDENTIALS ────────────────────────────────────────────────────────
const HUBTEL_CLIENT_ID     = 'pQGpB7y';
const HUBTEL_CLIENT_SECRET = '14fda6847ee44c8fa910f355675cce73';
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
  const [diagLog, setDiagLog]         = useState(null);
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

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');
    setDiagLog(null);

    if (!emailVal.trim()) { setError('Please enter your email address.'); return; }
    if (!phone.trim())    { setError('Please enter your phone number.'); return; }

    // Normalise phone: strip spaces, convert 0XX → 233XX
    let rawPhone = phone.trim().replace(/\s+/g, '').replace(/-/g, '');
    if (rawPhone.startsWith('+')) rawPhone = rawPhone.slice(1);
    else if (rawPhone.startsWith('0')) rawPhone = '233' + rawPhone.slice(1);

    setLoading(true);

    const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer';
    const clientRef    = (orderNumber || orderId || `FMM${Date.now()}`).slice(0, 32);

    const returnUrl       = `${window.location.origin}/PaymentConfirmed?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}`;
    const callbackUrl     = returnUrl;
    const cancellationUrl = `${window.location.origin}/Payment?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}&email=${encodeURIComponent(emailVal)}`;

    // ── CORRECT HUBTEL REQUEST BODY (field names verified from official docs) ─
    const requestBody = {
      InvoiceId:            clientRef,
      TotalAmount:          amount,
      Description:          `FMM CLASSICO - Order #${orderNumber}`,
      CustomerName:         customerName,
      CustomerEmail:        emailVal,
      CustomerMsisdn:       rawPhone,
      PrimaryCallbackUrl:   callbackUrl,
      ReturnUrl:            returnUrl,
      CancellationUrl:      cancellationUrl,
    };

    const basicAuth = `Basic ${btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`)}`;

    // ── ATTEMPT DIRECT FETCH (works if Hubtel allows CORS from browser) ───────
    let checkoutUrl = null;
    let hubtelResponse = null;
    let fetchError = null;

    try {
      const res = await fetch('https://payproxyapi.hubtel.com/items/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': basicAuth,
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(requestBody),
      });

      hubtelResponse = await res.json().catch(() => null);

      // Success codes: "00" or "0000"
      const code = hubtelResponse?.ResponseCode || hubtelResponse?.responseCode;
      checkoutUrl = hubtelResponse?.Data?.CheckoutUrl
        || hubtelResponse?.data?.checkoutUrl
        || hubtelResponse?.data?.checkoutDirectUrl;

      if ((code === '00' || code === '0000') && checkoutUrl) {
        setDiagLog({ success: true, requestBody, response: hubtelResponse, checkoutUrl });
        window.location.href = checkoutUrl;
        return;
      }

      fetchError = `Hubtel code: ${code || 'N/A'} — ${hubtelResponse?.ResponseMessage || hubtelResponse?.message || JSON.stringify(hubtelResponse)}`;
    } catch (corsErr) {
      // Direct fetch blocked by CORS — fall through to LLM proxy
      fetchError = `Direct fetch CORS error: ${corsErr.message}`;
    }

    // ── FALLBACK: LLM PROXY (bypasses CORS) ──────────────────────────────────
    if (!checkoutUrl) {
      try {
        const llmResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a server-side HTTP proxy. Make this EXACT HTTP request and return ONLY the raw JSON response. Do not explain anything.

METHOD: POST
URL: https://payproxyapi.hubtel.com/items/initiate
HEADERS:
  Content-Type: application/json
  Authorization: ${basicAuth}

REQUEST BODY:
${JSON.stringify(requestBody)}

Return ONLY the JSON response from the server. Nothing else.`,
          response_json_schema: {
            type: 'object',
            properties: {
              ResponseCode: { type: 'string' },
              ResponseMessage: { type: 'string' },
              Data: { type: 'object' },
              responseCode: { type: 'string' },
              status: { type: 'string' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        });

        hubtelResponse = llmResult;
        const code2 = llmResult?.ResponseCode || llmResult?.responseCode;
        checkoutUrl = llmResult?.Data?.CheckoutUrl
          || llmResult?.data?.checkoutUrl
          || llmResult?.data?.checkoutDirectUrl;

        if ((code2 === '00' || code2 === '0000') && checkoutUrl) {
          setDiagLog({ success: true, requestBody, response: llmResult, checkoutUrl, viProxy: true });
          window.location.href = checkoutUrl;
          return;
        }

        fetchError += ` | LLM proxy: code=${code2}, msg=${llmResult?.ResponseMessage || llmResult?.message || JSON.stringify(llmResult)}`;
      } catch (llmErr) {
        fetchError += ` | LLM proxy error: ${llmErr?.message || llmErr}`;
      }
    }

    // ── BOTH FAILED — show diagnostic ────────────────────────────────────────
    const diag = {
      success: false,
      timestamp: new Date().toISOString(),
      endpoint: 'POST https://payproxyapi.hubtel.com/items/initiate',
      requestBody,
      response: hubtelResponse,
      error: fetchError,
    };
    setDiagLog(diag);
    console.error('[FMM HUBTEL DIAGNOSTIC]', JSON.stringify(diag, null, 2));

    const hubtelMsg = hubtelResponse?.ResponseMessage || hubtelResponse?.message || '';
    setError(
      hubtelMsg
        ? `Hubtel error: "${hubtelMsg}". Please check your credentials or contact Hubtel support.`
        : `Could not reach Hubtel payment gateway. Please try again or pay via WhatsApp (0509896035).`
    );
    setLoading(false);
  };

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

      {/* PAGE BODY */}
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

        <div className="flex flex-col lg:flex-row gap-0 rounded-xl overflow-hidden shadow-lg border border-gray-100 min-h-[560px]">

          {/* LEFT — store info */}
          <div className="lg:w-5/12 flex flex-col items-center justify-center py-8 px-6 sm:px-8 text-center"
            style={{ background: '#e8f0f9' }}>

            <h2 className="text-xl sm:text-2xl font-black text-gray-800 mb-4">FMM CLASSICO</h2>
            <p className="text-sm text-blue-700 leading-relaxed max-w-sm">
              Accept payments via <span className="font-semibold">MTN MoMo</span>,{' '}
              <span className="font-semibold">Telecel Cash</span>,{' '}
              <span className="font-semibold">AirtelTigo</span>, and <span className="font-semibold">Bank Cards</span>.
            </p>

            <div className="mt-6 bg-white/70 rounded-xl p-4 text-left w-full max-w-xs">
              <p className="text-xs font-bold text-gray-700 mb-2 text-center">How it works</p>
              {[
                '1. Fill in your details below',
                '2. Click "Pay now with Hubtel"',
                '3. You\'ll be taken to Hubtel\'s secure page',
                '4. Choose your payment method & pay',
                '5. Order confirmed automatically ✅',
              ].map(s => <p key={s} className="text-xs text-gray-600 mb-1">{s}</p>)}
            </div>

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

          {/* RIGHT — form */}
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
                <Input placeholder="0244123456" value={phone}
                  onChange={e => setPhone(e.target.value)} className="h-11" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <div className="flex gap-2">
                  <div className="flex items-center border border-input rounded-md px-3 h-11 bg-gray-50 text-gray-600 font-semibold flex-shrink-0">GHS</div>
                  <Input value={formatAmount(amount)} readOnly className="h-11 bg-gray-50 font-semibold text-gray-700 cursor-default" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{error}</p>
                    {diagLog && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-red-500 underline">Show technical details</summary>
                        <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
{`ENDPOINT: ${diagLog.endpoint || 'POST https://payproxyapi.hubtel.com/items/initiate'}

REQUEST BODY:
${JSON.stringify(diagLog.requestBody, null, 2)}

HUBTEL RESPONSE:
${JSON.stringify(diagLog.response, null, 2)}

ERROR:
${diagLog.error}`}
                        </pre>
                      </details>
                    )}
                    <p className="mt-2 text-xs text-red-600">
                      Need help? Call Hubtel support or{' '}
                      <a href="https://wa.me/233509896035" className="underline font-semibold">pay via WhatsApp</a>.
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 text-base font-bold rounded-lg text-white bg-orange-500 hover:bg-orange-600"
              >
                {loading
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting to Hubtel...</>
                  : `Pay ₵${formatAmount(amount)} with Hubtel`}
              </Button>

              <p className="text-center text-xs text-gray-400">
                You will be redirected to Hubtel's secure payment page to complete your payment.
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}