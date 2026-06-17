# 📧 EMAIL TEMPLATE - SEND THIS TO HUBTEL

**Copy and paste this email - just fill in [brackets]**

---

## EMAIL FOR HUBTEL

**To:** support@hubtel.com (or your Hubtel relationship manager)  
**Subject:** FMM CLASSICO - Hubtel Online Checkout Integration Complete - Ready for UAT Testing

---

### EMAIL BODY:

```
Dear Hubtel Team,

Greetings from FMM CLASSICO!

We are pleased to inform you that our Hubtel Online Checkout API integration 
is complete and ready for User Acceptance Testing (UAT).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BUSINESS DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Business Name:              FMM CLASSICO
Business Type:              E-Commerce (Phone Accessories)
Merchant Account Number:    2039285
Integration Type:           Online Checkout (Redirect Method)
Environment:                Ready for Live Testing


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TECHNICAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API Endpoint:
- Checkout Initiation:  https://payproxyapi.hubtel.com/items/initiate
- Status Check:         https://api-txnstatus.hubtel.com/transactions/2039285/status

Website Details:
- Live Website URL:     https://www.fmmclassico.com
- Admin Dashboard:      https://www.fmmclassico.com/AdminOrders
- Return URL:           https://www.fmmclassico.com/PaymentConfirmed
- Callback URL:         https://www.fmmclassico.com/api/hubtel/callback
- Cancellation URL:     https://www.fmmclassico.com/PaymentConfirmed

Payment Methods Enabled:
✓ Mobile Money (MTN, Telecel, AirtelTigo)
✓ Bank Cards (Visa, MasterCard)
✓ Mobile Wallets (Hubtel, G-Money, Zeepay)
✓ GH-QR Code


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WHAT WE'VE IMPLEMENTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Payment Initiation API
   - Secure checkout form
   - Real-time amount calculation
   - Customer data validation
   - Error handling with clear messages

✅ Redirect Checkout Implementation
   - CORS-enabled direct browser calls
   - Proper authorization headers
   - Transaction reference generation
   - HTTP timeout handling (20 seconds)

✅ Payment Confirmation
   - Callback endpoint ready for payment notifications
   - Browser redirect fallback
   - Order creation on successful payment
   - Automatic cart clearing

✅ Transaction Status Checking
   - Manual status check implementation
   - Automatic check after 5 minute timeout
   - Handles "Paid", "Unpaid", "Refunded" states
   - Charge calculation and reporting

✅ Order Management
   - Automatic order creation after payment
   - Order persistence with all details
   - Customer and admin notifications
   - Email confirmations

✅ Error Handling
   - Validation of all inputs
   - Clear error messages for failed payments
   - Automatic retry capability
   - Comprehensive logging


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SAMPLE CHECKOUT REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST https://payproxyapi.hubtel.com/items/initiate
Content-Type: application/json
Authorization: Basic [BASE64 ENCODED CREDENTIALS]

{
  "totalAmount": 100.50,
  "description": "FMM CLASSICO Order #FMM-ABC123",
  "callbackUrl": "https://www.fmmclassico.com/api/hubtel/callback",
  "returnUrl": "https://www.fmmclassico.com/PaymentConfirmed",
  "merchantAccountNumber": "2039285",
  "cancellationUrl": "https://www.fmmclassico.com/PaymentConfirmed",
  "clientReference": "FMM-ABC123",
  "payeeName": "John Doe",
  "payeeMobileNumber": "233242825109",
  "payeeEmail": "john@example.com"
}

Response:
{
  "responseCode": "0000",
  "status": "Success",
  "data": {
    "checkoutUrl": "https://pay.hubtel.com/...",
    "checkoutDirectUrl": "https://pay.hubtel.com/.../direct",
    "checkoutId": "7569a11e8b784f21baa9443b3fce31ed",
    "clientReference": "FMM-ABC123"
  }
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SAMPLE CALLBACK PAYLOAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST https://www.fmmclassico.com/api/hubtel/callback

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

Our Response:
{
  "ResponseCode": "0000",
  "Status": "Success",
  "Message": "Webhook processed successfully"
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SAMPLE STATUS CHECK REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /transactions/2039285/status?clientReference=FMM-ABC123 HTTP/1.1
Host: api-txnstatus.hubtel.com
Authorization: Basic [BASE64 ENCODED CREDENTIALS]

Response (Paid):
{
  "message": "Successful",
  "responseCode": "0000",
  "data": {
    "date": "2024-04-25T21:45:48Z",
    "status": "Paid",
    "transactionId": "7fd01221faeb41469daec7b3561bddc5",
    "externalTransactionId": "0000006824852622",
    "paymentMethod": "mobilemoney",
    "clientReference": "FMM-ABC123",
    "amount": 100.50,
    "charges": 2.01,
    "amountAfterCharges": 98.49
  }
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 UAT REQUIREMENTS FULFILLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per Hubtel's UAT Requirements, we provide:

1. ✅ Sample Callbacks
   File: HUBTEL_WEBHOOK_CALLBACK.md
   - Callback receipt implementation
   - Database update logic
   - Error handling
   - Test endpoints

2. ✅ Sample Transaction Status Check Response
   File: HUBTEL_UAT_GUIDE.md (Section 2)
   - Paid response example
   - Unpaid response example
   - Refunded response example
   - Implementation guide

3. ✅ Predesigned Flow Document
   File: FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pptx (attached)
   - Step-by-step payment flow
   - System architecture
   - Integration points
   - User journey

4. ✅ End-User Testing Meeting Readiness
   File: HUBTEL_UAT_GUIDE.md (Section 4)
   - Complete test scenarios
   - Step-by-step procedures
   - Expected outcomes
   - Screenshot checklist

5. ✅ Live Application URL
   - Website: https://www.fmmclassico.com
   - Admin: https://www.fmmclassico.com/AdminOrders


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ATTACHED DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📎 Attachment 1: HUBTEL_UAT_GUIDE.md
   - Complete testing procedures
   - All 5 UAT requirements
   - Test scenarios with expected results
   - Email template for submission

📎 Attachment 2: HUBTEL_WEBHOOK_CALLBACK.md
   - Webhook implementation template
   - Node.js/Express example code
   - Base44 function example
   - Testing procedures with curl

📎 Attachment 3: HUBTEL_IMPLEMENTATION_SUMMARY.md
   - Technical implementation overview
   - File locations and purposes
   - What's complete vs. what needs backend
   - Troubleshooting guide

📎 Attachment 4: FMM_CLASSICO_HUBTEL_PAYMENT_FLOW.pptx
   - Visual representation of payment flow
   - Integration architecture
   - Data flow diagram
   - User journey map

📎 Attachment 5: Screenshots
   - Payment form screenshot
   - Hubtel checkout page
   - Success confirmation page
   - Order details page
   - Email confirmation


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SECURITY & COMPLIANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ HTTPS enforced (not HTTP)
✅ API credentials not exposed to browser
✅ Transaction amounts cannot be changed by customer
✅ Order references are unique
✅ Phone number validation implemented
✅ Email validation implemented
✅ Timeout handling (20 seconds)
✅ Automatic retry logic
✅ Comprehensive error logging
✅ Customer data properly stored


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We request:

1. Test Payment Credentials
   Please provide test credentials for:
   - Successful payment scenario
   - Failed payment scenario
   - Cancelled payment scenario

2. UAT Schedule
   Please confirm when you can conduct UAT testing with us.
   We are available for virtual meetings at your convenience.

3. IP Whitelisting
   Please whitelist our server IP for webhook callback delivery.
   Our IP: [YOUR_SERVER_IP] (to be provided separately)

4. Live Merchant Account
   Once UAT passes, please activate live merchant account
   and provide live credentials.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- This Week:  Receive test credentials
- Next Week:  Conduct UAT testing
- Week 3:     UAT sign-off and approval
- Week 3-4:   Switch to live credentials
- Week 4:     Go live and accept real payments


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Business:
- Name: FMM CLASSICO
- Email: fmmclassico@gmail.com
- Phone: 0509896035
- Website: https://www.fmmclassico.com

Technical Lead:
- Email: [DEVELOPER_EMAIL]
- Phone: [DEVELOPER_PHONE]

Please feel free to reach out if you need any additional information
or have any questions about our implementation.

We look forward to a successful integration with Hubtel!

Best regards,

FMM CLASSICO Team
Date: June 17, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📝 BEFORE SENDING

Replace these with YOUR information:

- [ ] `[YOUR_SERVER_IP]` - Your actual server IP
- [ ] `[DEVELOPER_EMAIL]` - Your developer's email
- [ ] `[DEVELOPER_PHONE]` - Your developer's phone
- [ ] Attach all files mentioned above
- [ ] Verify all URLs are correct
- [ ] Verify merchant account is 2039285

---

## ✅ SEND CHECKLIST

Before clicking send:

- [ ] Email grammar checked
- [ ] All attachments included
- [ ] All placeholders filled in
- [ ] URLs verified as correct
- [ ] Contact info is current
- [ ] Tone is professional
- [ ] Files are named correctly

---

## 💡 TIPS

1. **Send on a Monday** - Better response time
2. **Send in the morning** - Higher priority
3. **Keep email short** - Let attachments do the talking
4. **Use professional tone** - This is business
5. **Include all details** - Saves them from asking follow-up questions
6. **Mention timeline** - Shows urgency and professionalism
7. **Provide alternatives** - "Email or call or WhatsApp"

---

**Good luck! This should get you through UAT quickly.** 🚀

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026
