import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Package, Lock, ShieldCheck, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ⚠️ Replace this with your actual Paystack PUBLIC key from your Paystack dashboard
// Go to: https://dashboard.paystack.com/#/settings/developers → copy your "Public Key"
const PAYSTACK_PUBLIC_KEY = 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxx'; // TODO: replace with real key

function formatAmount(num) {
  const n = Number(num);
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
}

export default function Payment() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId      = urlParams.get('orderId');
  const orderNumber  = urlParams.get('orderNumber');
  const amountRaw    = urlParams.get('amount');
  const email        = urlParams.get('email') || '';
  const amount       = amountRaw ? parseFloat(amountRaw) : 0;

  const [paystackReady, setPaystackReady] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const scriptRef = useRef(null);

  // Save order to sessionStorage so PaymentConfirmed can read it
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
    script.onload = () => {
      setPaystackReady(true);
      setLoading(false);
    };
    script.onerror = () => setLoading(false);
    document.body.appendChild(script);
    scriptRef.current = script;
  }, []);

  const openPaystack = () => {
    if (!window.PaystackPop) return;
    setPaymentStarted(true);

    const callbackUrl = `${window.location.origin}/PaymentConfirmed?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&amount=${amount}`;

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email || 'customer@fmmclassico.com',
      amount: Math.round(amount * 100), // pesewas
      currency: 'GHS',
      ref: orderNumber,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        custom_fields: [
          { display_name: 'Store', variable_name: 'store', value: 'FMM CLASSICO' },
          { display_name: 'Order Number', variable_name: 'order_number', value: orderNumber },
        ]
      },
      callback: function(response) {
        // Payment successful — go to confirmation page
        window.location.href = callbackUrl + `&reference=${response.reference}`;
      },
      onClose: function() {
        setPaymentStarted(false);
      }
    });

    handler.openIframe();
  };

  if (amount <= 0) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shadow-md" style={{ background: 'linear-gradient(90deg, #1f2937 0%, #374151 100%)' }}>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-white font-bold text-lg">FMM CLASSICO</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-red-600 font-semibold mb-4">Invalid order. Please return to checkout and try again.</p>
            <Link to="/Checkout" className="text-sm text-gray-500 underline">← Back to Checkout</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Dark ash header ── */}
      <header
        className="flex items-center justify-between px-4 py-3 shadow-md flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #1f2937 0%, #374151 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">FMM CLASSICO</p>
            <p className="text-gray-300 text-[11px] leading-tight">Secure Checkout</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-gray-400 text-[10px] uppercase tracking-wider">Amount</p>
            <p className="text-white font-black text-xl leading-tight">₵{formatAmount(amount)}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
            <Lock className="h-3 w-3 text-green-400" />
            <span className="text-green-300 text-[10px] font-semibold">Secure</span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-10">

        {/* Order card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Order</p>
              <p className="font-bold text-gray-800">#{orderNumber}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-gray-300" />
          </div>

          {/* Amount */}
          <div className="px-5 py-6 text-center border-b border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Total to pay</p>
            <p className="text-5xl font-black text-gray-800">₵{formatAmount(amount)}</p>
            <p className="text-xs text-gray-400 mt-1">Ghana Cedis (GHS)</p>
          </div>

          {/* Pay button */}
          <div className="px-5 py-5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Loading payment...</span>
              </div>
            ) : (
              <Button
                onClick={openPaystack}
                disabled={!paystackReady || paymentStarted}
                className="w-full py-6 text-base font-bold rounded-xl text-white"
                style={{ background: 'linear-gradient(90deg, #1f2937 0%, #374151 100%)' }}
              >
                {paymentStarted ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Payment window open...
                  </>
                ) : (
                  '💳 Pay with Paystack'
                )}
              </Button>
            )}
            <p className="text-center text-xs text-gray-400 mt-3">
              A Paystack payment popup will open on this page
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
          <span>🔒 SSL Secured</span>
          <span>·</span>
          <span>✅ Paystack Verified</span>
          <span>·</span>
          <span>🛡️ Safe Checkout</span>
          <span>·</span>
          <span>📱 Mobile Money Accepted</span>
        </div>

        <Link to="/Checkout" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Checkout
        </Link>
      </div>
    </div>
  );
}