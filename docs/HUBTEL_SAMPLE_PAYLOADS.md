# Hubtel Integration - Sample Payloads & Test Cases

## Sample 1: Successful Mobile Money Payment Flow

### Step 1: Initiate Payment (Request)
```bash
POST /api/hubtel/initiate
Content-Type: application/json

{
  "totalAmount": 50.00,
  "description": "Order FMMP9V9Q - 5 units ordered",
  "callbackUrl": "https://app.fmm-classico.com/api/hubtel/callback",
  "returnUrl": "https://app.fmm-classico.com/orders/FMMP9V9Q?status=success",
  "cancellationUrl": "https://app.fmm-classico.com/orders/FMMP9V9Q?status=cancelled",
  "clientReference": "FMMP9V9Q"
}
```

### Step 2: Initiate Payment (Response)
```json
{
  "responseCode": "0000",
  "status": "Success",
  "data": {
    "checkoutUrl": "https://pay.hubtel.com/7569a11e8b784f21baa9443b3fce31ed",
    "checkoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "clientReference": "FMMP9V9Q",
    "message": "",
    "checkoutDirectUrl": "https://pay.hubtel.com/7569a11e8b784f21baa9443b3fce31ed/direct"
  }
}
```

### Step 3: Customer Redirected & Completes Payment
Customer is redirected to `checkoutUrl`. On Hubtel's page, they:
1. Select Mobile Money
2. Enter phone number: 0244123456
3. Receive OTP
4. Confirm payment

### Step 4: Hubtel Sends Callback
```bash
POST /api/hubtel/callback
Content-Type: application/json

{
  "ResponseCode": "0000",
  "Status": "Success",
  "Data": {
    "CheckoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "SalesInvoiceId": "e96ccfb4746045bba13f425bd573a31c",
    "ClientReference": "FMMP9V9Q",
    "Status": "Success",
    "Amount": 50.00,
    "CustomerPhoneNumber": "0244123456",
    "PaymentDetails": {
      "MobileMoneyNumber": "0244123456",
      "PaymentType": "mobilemoney",
      "Channel": "mtn-gh"
    },
    "Description": "The MTN Mobile Money payment has been approved and processed successfully."
  }
}
```

### Step 5: Backend Callback Handler Response
```json
{
  "message": "Callback processed successfully"
}
```

### Step 6: Order Updated in Database
```javascript
{
  "id": "order-uuid-001",
  "order_number": "FMMP9V9Q",
  "payment_status": "paid",          // Changed from "pending_payment"
  "status": "confirmed",
  "total_amount": 50.00,
  "items": [
    {
      "product_name": "Fresh Tomatoes (2kg)",
      "quantity": 2,
      "price": 15.00
    },
    {
      "product_name": "Organic Eggs (30 pack)",
      "quantity": 1,
      "price": 20.00
    }
  ],
  "tracking_updates": [
    {
      "status": "Order Placed",
      "message": "Order created and waiting for payment confirmation.",
      "timestamp": "2026-06-22T12:00:00.000Z"
    },
    {
      "status": "Payment Success",
      "message": "Hubtel callback received. Status: Success. Amount: 50.00. Method: mobilemoney",
      "timestamp": "2026-06-22T12:05:15.000Z",
      "checkoutId": "7569a11e8b784f21baa9443b3fce31ed"
    }
  ]
}
```

---

## Sample 2: Status Check Fallback (After Timeout)

If callback is not received after 5 minutes, the backend queries Hubtel's status API.

### Request
```bash
GET /api/hubtel/status?clientReference=FMMP9V9Q
Authorization: Basic base64(API_KEY)
```

### Response (Paid)
```json
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
    "date": "2026-06-22T12:05:00.000Z",
    "status": "Paid",
    "transactionId": "7fd01221faeb41469daec7b3561bddc5",
    "externalTransactionId": "0000006824852622",
    "paymentMethod": "mobilemoney",
    "clientReference": "FMMP9V9Q",
    "currencyCode": null,
    "amount": 50.00,
    "charges": 1.50,
    "amountAfterCharges": 48.50,
    "isFulfilled": null
  }
}
```

### Order Updated from Status Check
```javascript
{
  "id": "order-uuid-001",
  "payment_status": "paid",
  "tracking_updates": [
    // ... previous updates ...
    {
      "status": "Payment Verified",
      "message": "Payment status verified via Hubtel API. Status: Paid. Amount: 50.00. Charges: 1.50",
      "timestamp": "2026-06-22T12:05:45.000Z",
      "transactionId": "7fd01221faeb41469daec7b3561bddc5"
    }
  ]
}
```

---

## Sample 3: Failed Payment

### Hubtel Sends Callback (Failed)
```bash
POST /api/hubtel/callback
Content-Type: application/json

{
  "ResponseCode": "2001",
  "Status": "Success",
  "Data": {
    "CheckoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "ClientReference": "FMMP9V9Q",
    "Status": "Failed",
    "Amount": 50.00,
    "CustomerPhoneNumber": "0244123456",
    "PaymentDetails": {
      "MobileMoneyNumber": "0244123456",
      "PaymentType": "mobilemoney",
      "Channel": "mtn-gh"
    },
    "Description": "Customer entered invalid PIN three times. Transaction declined."
  }
}
```

### Order Updated (Failed Status)
```javascript
{
  "payment_status": "failed",
  "tracking_updates": [
    {
      "status": "Payment Failed",
      "message": "Hubtel callback received. Status: Failed. Amount: 50.00. Method: mobilemoney",
      "timestamp": "2026-06-22T12:05:15.000Z"
    }
  ]
}
```

---

## Sample 4: Cancelled Payment

### Hubtel Sends Callback (Cancelled)
```bash
POST /api/hubtel/callback
Content-Type: application/json

{
  "ResponseCode": "0000",
  "Status": "Success",
  "Data": {
    "CheckoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "ClientReference": "FMMP9V9Q",
    "Status": "Cancelled",
    "Amount": 50.00,
    "CustomerPhoneNumber": "0244123456",
    "PaymentDetails": {
      "PaymentType": "mobilemoney",
      "Channel": "mtn-gh"
    },
    "Description": "Customer cancelled the transaction on the Hubtel checkout page."
  }
}
```

### Order Updated (Cancelled Status)
```javascript
{
  "payment_status": "cancelled",
  "tracking_updates": [
    {
      "status": "Payment Cancelled",
      "message": "Hubtel callback received. Status: Cancelled. Customer cancelled the transaction.",
      "timestamp": "2026-06-22T12:05:15.000Z"
    }
  ]
}
```

---

## Sample 5: Card Payment

### Initiate Payment (Same as above)

### Customer Completes Card Payment on Hubtel

### Callback (Card Method)
```json
{
  "ResponseCode": "0000",
  "Status": "Success",
  "Data": {
    "CheckoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "ClientReference": "FMMP9V9Q",
    "Status": "Success",
    "Amount": 50.00,
    "PaymentDetails": {
      "CardNumber": "****1234",
      "PaymentType": "card",
      "CardType": "visa"
    },
    "Description": "Card payment processed successfully."
  }
}
```

---

## Error Cases

### Case 1: Invalid API Key
**Response:** 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "details": "Invalid API key"
}
```

### Case 2: Fees Not Configured
**Response:** 4070
```json
{
  "responseCode": "4070",
  "status": "Error",
  "message": "We're unable to complete this payment at the moment. Fees not set for given conditions."
}
```

### Case 3: Missing Required Fields
**Response:** 400 Bad Request
```json
{
  "error": "Missing required parameter",
  "details": "callbackUrl is required"
}
```

### Case 4: IP Not Whitelisted (Status Check)
**Response:** 403 Forbidden
```json
{
  "error": "IP not whitelisted",
  "details": "Your IP address is not authorized to access this endpoint"
}
```

---

## Testing Command Examples

### Test 1: Valid Initiation
```bash
curl -X POST https://app.fmm-classico.com/api/hubtel/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 25.50,
    "description": "Test Order",
    "callbackUrl": "https://app.fmm-classico.com/api/hubtel/callback",
    "returnUrl": "https://app.fmm-classico.com/orders/TEST001",
    "cancellationUrl": "https://app.fmm-classico.com/orders/TEST001",
    "clientReference": "TEST001"
  }'
```

### Test 2: Check Status
```bash
curl "https://app.fmm-classico.com/api/hubtel/status?clientReference=TEST001"
```

### Test 3: Send Callback (Simulate Hubtel)
```bash
curl -X POST https://app.fmm-classico.com/api/hubtel/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResponseCode": "0000",
    "Status": "Success",
    "Data": {
      "CheckoutId": "test-checkout-123",
      "ClientReference": "TEST001",
      "Status": "Success",
      "Amount": 25.50,
      "CustomerPhoneNumber": "0244000000",
      "PaymentDetails": {
        "PaymentType": "mobilemoney",
        "Channel": "vodafone-gh"
      }
    }
  }'
```

---

## Concurrent Order Test

Create 3 orders rapidly to verify concurrent payment handling:

```bash
# Order 1
curl -X POST https://app.fmm-classico.com/api/hubtel/initiate \
  -H "Content-Type: application/json" \
  -d '{"totalAmount": 30, "description": "Order 1", "callbackUrl": "...", "returnUrl": "...", "cancellationUrl": "...", "clientReference": "CONCURRENT001"}'

# Order 2
curl -X POST https://app.fmm-classico.com/api/hubtel/initiate \
  -H "Content-Type: application/json" \
  -d '{"totalAmount": 45, "description": "Order 2", "callbackUrl": "...", "returnUrl": "...", "cancellationUrl": "...", "clientReference": "CONCURRENT002"}'

# Order 3
curl -X POST https://app.fmm-classico.com/api/hubtel/initiate \
  -H "Content-Type: application/json" \
  -d '{"totalAmount": 60, "description": "Order 3", "callbackUrl": "...", "returnUrl": "...", "cancellationUrl": "...", "clientReference": "CONCURRENT003"}'
```

Then verify each order updates independently with their respective payments.
