import {
  getHubtelCallbackUrl,
  getHubtelInitiateUrl,
  getHubtelReconcileReturnUrl,
  getHubtelStatusUrl,
} from '@/lib/runtime-config';

export async function reconcileReturnedPayment({ clientReference }) {
  const endpoint = getHubtelReconcileReturnUrl();
  const headers = await buildRequestHeaders({
    includeJsonContentType: true,
    includeAuthorization: true,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ clientReference }),
  });

  const result = await readJsonResponse(response, 'Unable to reconcile returned payment.');
  return withMeta(result, response);
}
src/pages/PaymentVerification.jsx
Replace the page logic with this pattern:



import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { appClient } from '@/api/appClient.js';
import { getBaseOrderReference, reconcileReturnedPayment } from '@/api/hubtelClient';
import { createPageUrl } from '../utils';

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clearLoggedInCart(userEmail, queryClient) {
  const cartRows = ensureArray(await appClient.entities.CartItem.filter({ user_email: userEmail }));
  await Promise.allSettled(cartRows.map((item) => appClient.entities.CartItem.delete(item.id)));
  queryClient.invalidateQueries({ queryKey: ['cartItems', userEmail] });
}

export default function PaymentVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('Waiting for Hubtel payment confirmation...');
  const [statusTone, setStatusTone] = useState('pending');

  useEffect(() => {
    let active = true;

    const run = async () => {
      const ref = searchParams.get('hubtelRef') || '';
      const paymentStage = searchParams.get('paymentStage') || 'initial';
      const hintedStatus = String(searchParams.get('status') || '').toLowerCase();

      if (!ref || paymentStage !== 'initial') {
        navigate(createPageUrl('Checkout'), { replace: true });
        return;
      }

      if (hintedStatus === 'cancelled' || hintedStatus === 'canceled') {
        setStatusTone('warning');
        setMessage('Payment was cancelled. Redirecting you back to checkout...');
        setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1500);
        return;
      }

      try {
        const user = await appClient.auth.me();
        const baseReference = getBaseOrderReference(ref);

        for (let attempt = 0; attempt < 90; attempt += 1) {
          if (!active) return;

          setMessage('Waiting for Hubtel payment confirmation...');
          const result = await reconcileReturnedPayment({ clientReference: ref }).catch(() => null);
          const state = String(result?.state || '').toLowerCase();

          if (state === 'paid') {
            await clearLoggedInCart(user.email, queryClient);
            queryClient.invalidateQueries({ queryKey: ['orders', user.email] });
            setStatusTone('success');
            setMessage('Payment confirmed successfully. Redirecting you to your orders...');
            setTimeout(() => navigate(createPageUrl('Orders'), { replace: true }), 1200);
            return;
          }

          if (state === 'failed') {
            setStatusTone('error');
            setMessage('Payment was not completed. Redirecting you back to checkout...');
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1600);
            return;
          }

          if (state === 'review_required') {
            setStatusTone('warning');
            setMessage('Payment needs manual review because the received amount did not match the expected amount. Please contact support.');
            return;
          }

          if (state === 'not_found') {
            setStatusTone('error');
            setMessage(`We could not find order ${baseReference}. Redirecting you back to checkout...`);
            setTimeout(() => navigate(createPageUrl('Checkout'), { replace: true }), 1600);
            return;
          }

          await sleep(5000);
        }

        setStatusTone('warning');
        setMessage('We are still waiting for confirmation. Please check your orders shortly.');
      } catch (error) {
        console.error('Payment verification page error:', error);
        setStatusTone('error');
        setMessage('We could not verify the payment right now. Please check your orders shortly.');
      }
    };

    run();
    return () => { active = false; };
  }, [navigate, queryClient, searchParams]);

  const cardTone = statusTone === 'success'
    ? 'bg-green-50 border-green-200 text-green-900'
    : statusTone === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : statusTone === 'error'
        ? 'bg-red-50 border-red-200 text-red-900'
        : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 shadow-sm ${cardTone}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          {statusTone === 'success' ? <ShieldCheck className="h-8 w-8 text-green-600" /> : <Loader2 className="h-8 w-8 animate-spin text-blue-600" />}
        </div>
        <h1 className="text-lg font-bold text-center mb-2">Verifying Payment</h1>
        <p className="text-sm text-center leading-6">{message}</p>
      </div>
    </div>
  );
}
Important frontend rule
Remove browser-side appClient.entities.Order.update(...) payment-confirmation writes from:

PaymentVerification.jsx
Orders.jsx balance verification return flow


For balance return, use the same reconcileReturnedPayment({ clientReference }) pattern.



8) Checkout URLs stay simple
Your checkout page can still create:



const callbackUrl = getHubtelCallbackUrl();
const returnUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&orderId=${createdOrder.id}`;
const cancellationUrl = `${window.location.origin}${createPageUrl('PaymentVerification')}?hubtelRef=${encodeURIComponent(initialPaymentReference)}&paymentStage=initial&status=cancelled&orderId=${createdOrder.id}`;


That is fine.



The key change is that the return page does not mark the order paid.



9) Fix the Product schema so bulk import fields can actually persist
Right now your importer/editor writes fields that are missing from Product.jsonc.

Add these properties to fmmclassico/entities/Product.jsonc
"sku": { "type": "string", "description": "Stock keeping unit" },
"barcode": { "type": "string", "description": "Barcode / EAN / UPC" },
"warranty": { "type": "string", "description": "Warranty text" },
"voltage": { "type": "string", "description": "Voltage specification" },
"power": { "type": "string", "description": "Power specification" },
"capacity": { "type": "string", "description": "Capacity specification" },
"ram": { "type": "string", "description": "RAM specification" },
"storage": { "type": "string", "description": "Storage specification" },
"screen_size": { "type": "string", "description": "Screen size" },
"features": { "type": "string", "description": "Feature summary" },
"tags": {
  "type": "array",
  "items": { "type": "string" },
  "description": "Product tags"
},
"keywords": {
  "type": "array",
  "items": { "type": "string" },
  "description": "SEO keywords"
},
"slug": { "type": "string", "description": "SEO slug" },
"seo_title": { "type": "string", "description": "SEO title" },
"seo_description": { "type": "string", "description": "SEO description" },
"main_category": { "type": "string", "description": "Category label used during import" },
"product_type": { "type": "string", "description": "Product type label used during import" },
"import_batch_id": { "type": "string", "description": "Bulk import batch id" },
"import_source": { "type": "string", "description": "Bulk import source" },
"import_filename": { "type": "string", "description": "Bulk import filename" }
