# 🚀 DEPLOY HUBTEL CALLBACK - BASE44 SETUP GUIDE

**Status:** You've been given all the code. This explains how to deploy it.  
**Difficulty:** Medium (Copy & Configure)  

---

## 📋 WHAT YOU NEED TO DO

You have the callback code in: `src/api/hubtel-callback-handler.js`

You need to:
1. ✅ Create a Base44 Automation/Function
2. ✅ Deploy the callback handler
3. ✅ Test it works
4. ✅ Tell Hubtel the URL

---

## 🔧 OPTION 1: Base44 Automation (RECOMMENDED)

### Step 1: Open Base44 Dashboard

1. Go to: https://base44.com (or your Base44 admin panel)
2. Select your app: "FMM CLASSICO"
3. Go to: **Automations** or **Functions** section

### Step 2: Create New Automation

1. Click: **"+ New Automation"** or **"+ New Function"**
2. Name it: **"Hubtel Payment Callback"**
3. Choose trigger type: **"HTTP Webhook"** or **"API Route"**
4. Set HTTP Method: **POST**
5. Set Route/Path: **/api/hubtel/callback**

### Step 3: Copy the Code

Open the file: `src/api/hubtel-callback-handler.js`

Copy the `handleHubtelCallback` function code into the automation editor.

**The code handles:**
```javascript
// 1. Receives payment from Hubtel
// 2. Finds order in database
// 3. Verifies payment is successful
// 4. Updates order with payment_status = 'paid'
// 5. Sends notifications to customer
// 6. Sends notifications to admin
```

### Step 4: Save & Deploy

1. Click: **Save**
2. Click: **Deploy** (or **Publish**)
3. Wait for confirmation: "Deployed successfully"

### Step 5: Get Your Callback URL

After deployment, Base44 will show you:
```
Your webhook is at:
https://yourdomain.com/api/hubtel/callback

OR

https://fmm-classico.base44app.com/api/hubtel/callback
```

**Copy this URL - you'll need it for Hubtel.**

---

## 🔧 OPTION 2: If Base44 Uses Different UI

Your Base44 dashboard might have different naming:

| Possible Names | What to Look For |
|---|---|
| Automations | Functions that trigger on events |
| Functions | Serverless functions / API routes |
| API Routes | Custom HTTP endpoints |
| Webhooks | Incoming webhook receivers |
| Backend | Backend functions/APIs |

**Look for:** Any section that lets you create HTTP endpoints or webhooks.

---

## 🧪 TEST YOUR CALLBACK

### Test with curl (Command Line)

```bash
curl -X POST https://yourdomain.com/api/hubtel/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResponseCode": "0000",
    "Status": "Success",
    "Data": {
      "CheckoutId": "test-checkout-123",
      "SalesInvoiceId": "test-invoice-456",
      "ClientReference": "FMM-TEST123",
      "Status": "Success",
      "Amount": 50.00,
      "CustomerPhoneNumber": "233242825109",
      "PaymentDetails": {
        "MobileMoneyNumber": "233242825109",
        "PaymentType": "mobilemoney",
        "Channel": "mtn-gh"
      },
      "Description": "Test payment"
    }
  }'
```

**Expected Response:**
```json
{
  "ResponseCode": "0000",
  "Status": "Success",
  "Message": "Callback received - order not found (may be old)"
}
```

OR (if order exists):
```json
{
  "ResponseCode": "0000",
  "Status": "Success",
  "Message": "Payment confirmed - order updated"
}
```

### Test in Browser

If you don't have curl, you can use:

1. **Postman** (free app)
   - Open Postman
   - Method: POST
   - URL: `https://yourdomain.com/api/hubtel/callback`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON): [Copy the test JSON from above]
   - Click: Send

2. **Online Tools**
   - https://webhook.site
   - [Or similar webhook testing service]

---

## ✅ VERIFY IT'S WORKING

After you deploy, test this flow:

1. **Go to your website:** https://fmmclassico.com
2. **Add product to cart**
3. **Checkout → Fill form → Click Pay**
4. **Use test credentials** from Hubtel
5. **Complete payment**
6. **Check admin dashboard**
   - Order should show: "✅ Paid" badge
   - Status should be: "Confirmed" with payment verified
7. **Check your test order in database**
   - `payment_status` should be: `"paid"`
   - `hubtel_transaction_id` should be: [Hubtel's ID]
   - `hubtel_status` should be: `"successful"`

---

## 📝 WHAT THE CALLBACK DOES

When Hubtel calls your endpoint:

```
1. Hubtel sends payment confirmation
   └─> POST /api/hubtel/callback

2. Your callback receives it
   └─> Extract: ClientReference (order number)
   └─> Extract: Status (Success/Failed)
   └─> Extract: Amount, CheckoutId, PaymentDetails

3. Find the order in your database
   └─> Search by ClientReference

4. If payment successful:
   └─> Update: payment_status = "paid"
   └─> Update: hubtel_transaction_id = [Hubtel ID]
   └─> Update: hubtel_status = "successful"
   └─> Send notification to customer
   └─> Send notification to admin

5. If payment failed:
   └─> Update: payment_status = "failed"
   └─> Update: hubtel_status = "failed"
   └─> Send notification to customer

6. Return response to Hubtel
   └─> HTTP 200 OK
   └─> ResponseCode: "0000"
   └─> Status: "Success"
```

---

## 🐛 TROUBLESHOOTING

### "404 Not Found" when testing callback

**Problem:** Endpoint not deployed  
**Solution:**
1. Check Base44 dashboard - is automation "active"?
2. Check the URL matches what you configured
3. Try refreshing the page
4. Redeploy the automation

### "500 Server Error"

**Problem:** Code has an error  
**Solution:**
1. Check Base44 error logs
2. Verify code was copied correctly
3. Check database connection (should be automatic in Base44)
4. Compare with template: `src/api/hubtel-callback-handler.js`

### "Order not found"

**Problem:** Callback works but can't find order  
**Solution:**
1. Make sure order was created with correct `ClientReference`
2. Check database has the order
3. Verify `ClientReference` matches what Hubtel sends
4. In Payment.jsx: `clientReference` is generated as `FMM-${timestamp}-${random}`
5. This same reference must be sent to Hubtel

### Callback not being called by Hubtel

**Problem:** Hubtel doesn't know your callback URL  
**Solution:**
1. In `Payment.jsx` line 125: Update `callbackUrl`
2. Must be: `https://yourdomain.com/api/hubtel/callback`
3. Must be HTTPS (not HTTP)
4. Tell Hubtel this URL in their dashboard
5. Ask Hubtel to whitelist your IP

---

## 🎯 FINAL STEPS

Once callback is deployed:

### 1. Update callbackUrl in Payment.jsx

Make sure the URL in Payment.jsx matches:

```javascript
// File: src/pages/Payment.jsx (around line 125)
const callbackUrl = `${window.location.origin}/api/hubtel/callback`;
```

This should automatically be correct (uses current domain).

### 2. Test the Full Flow

1. Create test order
2. Make payment  
3. Order should update to "paid"
4. Admin can see payment verified
5. Admin can process order

### 3. Tell Hubtel

Send them:
```
Callback URL: https://yourdomain.com/api/hubtel/callback
Status Check: Already implemented in frontend
All Hubtel fields: Being saved and tracked
```

### 4. Schedule UAT

Your integration is now complete and Hubtel-compliant!

---

## 📍 YOUR SETUP SUMMARY

```
Frontend Payment:     ✅ src/pages/Payment.jsx
Payment Confirmation: ✅ src/pages/PaymentConfirmed.jsx
Status Check:         ✅ src/utils/hubtel-status-check.js
Callback Handler:     ✅ src/api/hubtel-callback-handler.js (Deploy this)
Admin Guard:          ✅ src/pages/AdminOrders.jsx
Database Schema:      ✅ base44/entities/Order.jsonc

Deployment Needed:
- Base44 Automation for callback endpoint
- Test callback with curl
- Tell Hubtel the URL
- Schedule UAT
```

---

## 🚀 YOU'RE READY!

All code is complete. Just need to:

1. **Deploy callback** (this guide)
2. **Test it works** (curl command above)
3. **Tell Hubtel** the URL
4. **Schedule UAT** with Hubtel
5. **Go live!** 🎉

---

**Questions?** See the callback handler code: `src/api/hubtel-callback-handler.js`

**Need help?** Check the comments in the code - every step is explained.

**Timeline:** 30 minutes to deploy, 1 hour to test = **1.5 hours total**

Good luck! 🚀
