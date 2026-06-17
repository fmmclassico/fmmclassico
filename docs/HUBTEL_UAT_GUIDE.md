# HUBTEL UAT - USER ACCEPTANCE TESTING GUIDE
## For FMM CLASSICO Online Checkout Implementation

**Date:** June 17, 2026  
**Application:** FMM CLASSICO E-Commerce Platform  
**Payment Provider:** Hubtel  

---

## 📋 WHAT IS UAT?

UAT = "User Acceptance Testing"

In simple terms: Before your payment system goes live, Hubtel wants to TEST it with you to make sure:
- ✅ Customers can make payments
- ✅ Payments are confirmed  
- ✅ Orders are created correctly
- ✅ Everything works end-to-end

---

## 🎯 UAT REQUIREMENTS (What Hubtel Asked For)

Hubtel needs these 5 things from you:

### 1. ✅ SAMPLE CALLBACK FROM HUBTEL

**What is this?** A sample payment confirmation that Hubtel sends to your server.

**Sample Callback Hubtel will send:**

```json
POST /api/hubtel/callback

{
  "ResponseCode": "0000",
  "Status": "Success",
  "Data": {
    "CheckoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "SalesInvoiceId": "e96ccfb4746045bba13f425bd573a31c",
    "ClientReference": "FMM-ABC123",
    "Status": "Success",
    "Amount": 100.50,
    "CustomerPhoneNumber": "233242825109",
    "PaymentDetails": {
      "MobileMoneyNumber": "233242825109",
      "PaymentType": "mobilemoney",
      "Channel": "mtn-gh"
    },
    "Description": "The MTN Mobile Money payment has been approved and processed successfully."
  }
}
```

**What you need to tell Hubtel:**
```
Sample Callback has been implemented and tested.
Your payment confirmation will be received at: 
https://fmmclassico.com/api/hubtel/callback (or your actual URL)

On receipt, we will:
1. Verify the clientReference matches our order
2. Confirm the payment status
3. Update our database to mark order as paid
4. Send order confirmation to customer
5. Respond with HTTP 200 OK
```

See: [HUBTEL_WEBHOOK_CALLBACK.md](./HUBTEL_WEBHOOK_CALLBACK.md)

---

### 2. ✅ SAMPLE TRANSACTION STATUS CHECK RESPONSE

**What is this?** When you ask Hubtel "Did this customer pay?" - what Hubtel responds.

**Sample Request:**

```http
GET /transactions/2039285/status?clientReference=FMM-ABC123 HTTP/1.1
Host: api-txnstatus.hubtel.com
Authorization: Basic endjeOBiZHhza24==
```

**Sample Response (Payment Received):**

```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
    "date": "2024-04-25T21:45:48.4740964Z",
    "status": "Paid",
    "transactionId": "7fd01221faeb41469daec7b3561bddc5",
    "externalTransactionId": "0000006824852622",
    "paymentMethod": "mobilemoney",
    "clientReference": "FMM-ABC123",
    "currencyCode": null,
    "amount": 100.50,
    "charges": 2.01,
    "amountAfterCharges": 98.49,
    "isFulfilled": null
  }
}
```

**Sample Response (Payment Not Yet Received):**

```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
    "status": "Unpaid",
    "amount": 100.50,
    "clientReference": "FMM-ABC123"
  }
}
```

**What you need to tell Hubtel:**
```
Transaction Status Check has been implemented.
If a payment confirmation is not received within 5 minutes,
we will automatically check the status using this API.

Implementation: src/utils/hubtel-status-check.js
Usage: checkTransactionStatus('FMM-ABC123')
```

See: [src/utils/hubtel-status-check.js](../src/utils/hubtel-status-check.js)

---

### 3. ✅ PREDESIGNED FLOW (PPT/PDF)

**What is this?** A diagram showing HOW your app works with Hubtel.

**You need to create a document showing:**

```
┌─────────────────────────────────────────────────────────────┐
│ FMM CLASSICO PAYMENT FLOW WITH HUBTEL                       │
└─────────────────────────────────────────────────────────────┘

STEP 1: Customer Clicks "Pay"
│
├─→ Frontend shows payment form
├─→ Customer enters: Email, Phone, Amount
│
STEP 2: Send Payment Request to Hubtel
│
├─→ App calls: POST https://payproxyapi.hubtel.com/items/initiate
├─→ Sends: Amount, Order Number, Customer Details
├─→ Hubtel responds with: Checkout URL
│
STEP 3: Redirect to Hubtel Checkout Page
│
├─→ Customer clicks "Pay ₵100"
├─→ Browser redirects to: https://pay.hubtel.com/7569a11e8b784f21baa9443b3fce31ed
│
STEP 4: Customer Completes Payment
│
├─→ Customer selects payment method (MTN MoMo, Telecel, Bank Card, etc)
├─→ Enters OTP or card details
├─→ Payment processed
│
STEP 5: Hubtel Confirms Payment (Two Ways)
│
├─→ OPTION A: Browser redirect
│   └─→ Hubtel redirects customer back to: /PaymentConfirmed
│
├─→ OPTION B: Server callback (more reliable)
│   └─→ Hubtel sends POST to: /api/hubtel/callback
│
STEP 6: Order is Created
│
├─→ Order saved to database
├─→ Customer receives confirmation email
├─→ Admin receives notification
├─→ Customer sees "Order Confirmed" page
│
STEP 7: Order Fulfillment
│
└─→ Admin sees order in admin panel
   └─→ Prepares and ships order
```

**Create a PowerPoint or PDF file with this flow and save it as:**
```
docs/FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pptx
```

---

### 4. ✅ MEETING TO TEST (End-User Perspective)

**What Hubtel means:** They want to see someone use the payment system from a customer's point of view.

**How to prepare for this meeting:**

#### Test Scenario 1: Successful Payment

1. ✅ Go to your app (www.fmmclassico.com)
2. ✅ Add product to cart
3. ✅ Click "Checkout"
4. ✅ Fill in delivery details
5. ✅ Click "Proceed to Payment"
6. ✅ Enter payment details (name, email, phone)
7. ✅ Click "Pay ₵100"
8. ✅ Use a test payment method (ask Hubtel for test credentials)
9. ✅ Complete payment
10. ✅ Confirm you see "Payment Successful" page
11. ✅ Confirm order appears in "My Orders"
12. ✅ Confirm you received confirmation email
13. ✅ Take screenshot

#### Test Scenario 2: Failed Payment

1. ✅ Repeat steps 1-6 above
2. ✅ Use an INVALID payment method (ask Hubtel for test credentials for failed scenario)
3. ✅ See error message
4. ✅ Confirm order was NOT created
5. ✅ Confirm you can try again
6. ✅ Take screenshot

#### Test Scenario 3: Cancelled Payment

1. ✅ Repeat steps 1-7 above
2. ✅ Click "Cancel" on Hubtel checkout page
3. ✅ Confirm you're redirected back to app
4. ✅ Confirm you see "Payment Cancelled" message
5. ✅ Confirm order was NOT created
6. ✅ Take screenshot

**Screenshots to collect:**
- Cart page
- Checkout form
- Payment form
- Hubtel checkout page
- Success page
- Order confirmation
- Email confirmation
- Admin notification

---

### 5. ✅ LINK TO APP WHEN GO LIVE

**What Hubtel needs:** Your actual website URL.

**What you need to provide:**
```
Live URL: https://www.fmmclassico.com
OR
https://fmm-classico.vercel.app
OR
https://yourdomain.com

Admin Dashboard: https://www.fmmclassico.com/AdminOrders
(where orders appear after payment)
```

---

## 🧪 TEST CHECKLIST

Before meeting with Hubtel, verify ALL of these:

### Payment Flow
- [ ] Customer can add items to cart
- [ ] Customer can go to checkout
- [ ] Customer can fill delivery details
- [ ] Customer can enter payment info
- [ ] Customer is redirected to Hubtel
- [ ] Customer can select payment method
- [ ] Payment completes (with test credentials)
- [ ] Customer is redirected back to app
- [ ] "Payment Successful" message appears

### Order Creation
- [ ] Order appears in database immediately
- [ ] Order has correct: amount, items, customer details
- [ ] Order status is set to "confirmed"
- [ ] Payment status is set to "paid"
- [ ] Order appears in "My Orders" page
- [ ] Order appears in Admin Orders page

### Notifications
- [ ] Customer gets email confirmation
- [ ] Admin gets email notification
- [ ] In-app notification appears for customer
- [ ] In-app notification appears for admin

### Error Handling
- [ ] If payment fails, order is NOT created
- [ ] If payment cancelled, order is NOT created
- [ ] Customer sees clear error message
- [ ] Customer can try again

### Hubtel Integration
- [ ] Callback endpoint is working
- [ ] Status check API is working
- [ ] Correct merchant account number is used
- [ ] Correct API credentials are used
- [ ] Timeout is set to 20 seconds
- [ ] Retries are configured

### Security
- [ ] API credentials are NOT shown to customers
- [ ] Amounts cannot be changed by customer
- [ ] Order numbers are unique
- [ ] Phone numbers are validated
- [ ] HTTPS is enabled (not HTTP)

---

## 📧 WHAT TO SEND TO HUBTEL

Create an email with:

```
Subject: FMM CLASSICO - UAT Ready for Testing

Dear Hubtel Team,

We have completed the Hubtel Online Checkout integration for FMM CLASSICO.

INTEGRATION DETAILS:
====================================

Merchant Account: 2039285
Application: FMM CLASSICO E-Commerce
Live URL: https://www.fmmclassico.com

IMPLEMENTATION CHECKLIST:
====================================

✅ Online Checkout API implemented (Redirect method)
✅ Payment initialization: payproxyapi.hubtel.com/items/initiate
✅ Return URL: https://www.fmmclassico.com/PaymentConfirmed
✅ Callback URL: https://www.fmmclassico.com/api/hubtel/callback
✅ Transaction Status Check implemented
✅ Error handling with proper timeout (20 seconds)
✅ Database order creation on payment success
✅ Email notifications to customer and admin
✅ Customer-facing order tracking

SAMPLE RESPONSE:
====================================

Checkout Initiate Response:
{
  "responseCode": "0000",
  "status": "Success",
  "data": {
    "checkoutUrl": "https://pay.hubtel.com/...",
    "checkoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "clientReference": "FMM-ABC123"
  }
}

Callback Payload:
{
  "ResponseCode": "0000",
  "Status": "Success",
  "Data": {
    "CheckoutId": "...",
    "ClientReference": "FMM-ABC123",
    "Status": "Success",
    "Amount": 100.50,
    "CustomerPhoneNumber": "233242825109",
    "PaymentDetails": {
      "PaymentType": "mobilemoney",
      "Channel": "mtn-gh"
    }
  }
}

UAT DOCUMENTATION:
====================================

Attached: FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pdf
Attached: Test Scenarios & Screenshots
Attached: Sample Callbacks & Responses

We are ready for UAT testing.
Please provide test credentials for successful and failed payment scenarios.

Contact:
Phone: 0509896035
Email: fmmclassico@gmail.com

Thank you!
FMM CLASSICO Team
```

---

## 🔧 TROUBLESHOOTING

**Problem: "Payment not confirming"**
- Solution: Check that callback URL is publicly accessible
- Check: https://www.fmmclassico.com/api/hubtel/callback works from outside
- Fix: Whitelist your IP if Hubtel firewall is enabled

**Problem: "Order not being created"**
- Solution: Check database connection
- Check: Order table exists and has all required fields
- Fix: Review PaymentConfirmed.jsx processOrder() function

**Problem: "Callback not being received"**
- Solution: Hubtel might not have your callback URL
- Check: Callback URL is in your Payment.jsx correctly
- Fix: Explicitly tell Hubtel your callback URL

**Problem: "Status check returning error"**
- Solution: Check merchant account number is correct
- Check: API credentials are valid
- Fix: Verify in Hubtel Developer Dashboard

---

## 📱 TEST PAYMENT METHODS

Ask Hubtel for these test credentials:

```
TEST ACCOUNT 1 - SUCCESSFUL PAYMENT:
Phone: 0500000001  (or similar test number)
Amount: 1.00 GHS
Expected: Payment succeeds

TEST ACCOUNT 2 - FAILED PAYMENT:
Phone: 0500000002  (or similar test number)  
Amount: 999.99 GHS
Expected: Payment fails

TEST CARD:
Number: 4111111111111111
Expiry: 12/25
CVV: 123
Expected: Payment succeeds
```

---

## ✅ SIGN-OFF

When ALL tests pass, update this section:

```
UAT Status: PASSED ✅
Date: [Today's Date]
Tested by: [Your Name]
Hubtel Approved: [Awaiting]
Go-Live Date: [Date]
```

---

## 📞 SUPPORT

If you encounter issues:
1. Check: [HUBTEL_WEBHOOK_CALLBACK.md](./HUBTEL_WEBHOOK_CALLBACK.md)
2. Check: [src/utils/hubtel-status-check.js](../src/utils/hubtel-status-check.js)
3. Check: [src/pages/Payment.jsx](../src/pages/Payment.jsx)
4. Contact Hubtel: developers.hubtel.com

**Document prepared:** June 17, 2026  
**By:** FMM CLASSICO Development Team
