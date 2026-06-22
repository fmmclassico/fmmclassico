# Hubtel Integration - Deployment & Verification Checklist

## Pre-Deployment Verification

### Code Quality
- [x] No linting errors (`npm run lint`)
- [x] All server functions created:
  - [x] `/src/functions/hubtel/initiate.js`
  - [x] `/src/functions/hubtel/callback.js`
  - [x] `/src/functions/hubtel/status.js`
  - [x] `/src/functions/hubtel/uat-samples.js`
- [x] Client wrapper created: `/src/api/hubtelClient.js`
- [x] Checkout page updated: `/src/pages/Checkout.jsx`
- [x] Documentation complete:
  - [x] HUBTEL_INTEGRATION.md
  - [x] HUBTEL_UAT_GUIDE.md
  - [x] HUBTEL_SAMPLE_PAYLOADS.md
  - [x] HUBTEL_DEPLOYMENT_CHECKLIST.md (this file)

### Server Function Syntax
All server functions use standardized patterns:
- Handler accepts `req` and `res`
- JSON parsing with fallback
- Proper HTTP status codes
- Logging with prefixes: `[Hubtel Init]`, `[Hubtel Callback]`, `[Hubtel Status]`
- Base44 SDK integration in callback

## Pre-Deployment: Base44 Configuration

- [ ] Access Base44 app admin dashboard
- [ ] Navigate to Environment Variables section
- [ ] Add the following environment variables:

```
HUBTEL_AP_ID = YOUR_HUBTEL_API_ID
HUBTEL_API_KEY = YOUR_HUBTEL_API_KEY
HUBTEL_MERCHANT_ACCOUNT_NUMBER = YOUR_MERCHANT_ACCOUNT_NUMBER
BASE44_SERVER_TOKEN = <your-base44-server-token>
```

## Deployment Steps

### 1. Deploy to Base44
- [ ] Push code changes to repository
- [ ] Base44 automatically detects server functions in `/src/functions/`
- [ ] Verify functions are deployed (check Base44 dashboard)
- [ ] Note the generated endpoint URLs:
  - [ ] `/api/hubtel/initiate`
  - [ ] `/api/hubtel/callback`
  - [ ] `/api/hubtel/status`
  - [ ] `/api/hubtel/uat-samples`

### 2. Configure Webhook in Hubtel
- [ ] Log in to Hubtel merchant dashboard
- [ ] Navigate to Settings → Webhooks
- [ ] Add callback webhook:
  - **URL:** `https://app.fmm-classico.com/api/hubtel/callback`
  - **Events:** Payment Success, Payment Failed, Payment Cancelled
  - **Retry Policy:** Enable retries (typically 3-5 retries)
  - **Timeout:** Set to 30 seconds

### 3. Whitelist App IP Addresses
- [ ] Get public IP address of Base44 app infrastructure
- [ ] Contact Hubtel support with IP(s)
- [ ] Provide IP address list:
  - [ ] Production IP: `xxx.xxx.xxx.xxx`
  - [ ] Backup/failover IP (if applicable)
- [ ] Confirm whitelisting (typically takes 24-48 hours)

### 4. Test Configuration
- [ ] Test API key by calling `/api/hubtel/status` with a known order
- [ ] Verify authorization header is correct (Basic auth)
- [ ] Check Base44 logs for any auth errors

## Post-Deployment Verification

### Functional Tests

#### Test 1: Payment Initiation Flow
- [ ] Navigate to checkout page
- [ ] Add products to cart
- [ ] Fill delivery information
- [ ] Click "Confirm Order"
- [ ] Verify order is created in database
- [ ] Verify redirect to Hubtel checkout page occurs
- [ ] Check Base44 logs: `[Hubtel Init] Success: {orderNumber} → {checkoutId}`

#### Test 2: Successful Payment Callback
- [ ] Complete payment on Hubtel (test credentials if available)
- [ ] Verify Hubtel redirects to `returnUrl`
- [ ] Verify callback is received at `/api/hubtel/callback`
- [ ] Check Base44 logs: `[Hubtel Callback] Updated order {orderNumber} to payment_status=paid`
- [ ] Verify Order entity is updated:
  - `payment_status: "paid"`
  - `tracking_updates` includes callback info

#### Test 3: Cancelled Payment
- [ ] Go through checkout flow again
- [ ] On Hubtel checkout page, cancel payment
- [ ] Verify callback received with `Status: Cancelled`
- [ ] Verify Order entity updated with `payment_status: "cancelled"`

#### Test 4: Failed Payment
- [ ] Complete checkout flow
- [ ] Enter incorrect OTP or invalid card details
- [ ] Verify callback received with `Status: Failed`
- [ ] Verify Order entity updated with `payment_status: "failed"`

#### Test 5: Status Check Fallback
- [ ] Complete a payment
- [ ] If callback was delayed, verify status check can retrieve final status
- [ ] Call `/api/hubtel/status?clientReference={orderNumber}`
- [ ] Verify response contains final status (Paid, Unpaid, Refunded)

#### Test 6: Concurrent Orders
- [ ] Create and pay for 3-5 orders simultaneously (in different browser tabs)
- [ ] Verify each order is created with unique `clientReference` (order_number)
- [ ] Verify each order updates independently with correct payment status
- [ ] Check no cross-contamination between orders

### Monitoring & Logging

- [ ] Verify logging appears in Base44 app logs:
  - [ ] `[Hubtel Init]` entries for payment initiations
  - [ ] `[Hubtel Callback]` entries for callbacks received
  - [ ] `[Hubtel Status]` entries for status checks
- [ ] Set up log aggregation/alerts for Hubtel errors
- [ ] Monitor for recurring errors:
  - [ ] 401 Unauthorized (check API key)
  - [ ] 403 Forbidden (check IP whitelist status)
  - [ ] 4070 (check with Hubtel if fees are configured)

### Performance Tests

- [ ] Payment initiation response time < 2 seconds
- [ ] Callback processing time < 1 second
- [ ] Status check API response time < 3 seconds
- [ ] Order update to database < 500ms

### Security Verification

- [ ] Verify API key is never logged in plaintext
- [ ] Confirm HTTPS is used for all Hubtel API calls
- [ ] Verify callback payload is validated (clientReference exists)
- [ ] Confirm IP whitelist is active (try status check from different IP, should get 403)

## Rollback Plan

If critical issues are found:

1. **Stop accepting new payments:**
   - Disable "Confirm Order" button on checkout
   - Show maintenance message

2. **Revert code:**
   - Revert `/src/pages/Checkout.jsx` to remove Hubtel redirect
   - Remove or disable server functions

3. **Notify users:**
   - Inform users of issue and ETA for fix
   - Process pending orders manually if needed

4. **Verify rollback:**
   - Confirm checkout page no longer initiates Hubtel payments
   - Verify no new errors in logs

## UAT Sign-Off

Once all tests pass, prepare for Hubtel UAT:

- [ ] Collect sample callback payloads from logs
- [ ] Export status check responses
- [ ] Document any custom error handling
- [ ] Create flow diagram (PPT/PDF)
- [ ] Schedule meeting with Hubtel UAT team
- [ ] Provide app URL and test credentials (if needed)

## Production Go-Live

- [ ] Hubtel UAT team approves integration
- [ ] All performance tests pass
- [ ] Monitoring and alerting configured
- [ ] Database backups verified
- [ ] Rollback plan documented and tested
- [ ] Support team trained on payment troubleshooting
- [ ] Go-live decision approved by team

## Ongoing Maintenance

- [ ] Monitor daily for Hubtel API errors
- [ ] Review payment success/failure rates weekly
- [ ] Check callback receipt latency
- [ ] Verify IP whitelist remains valid
- [ ] Update documentation if Hubtel API changes
- [ ] Test fallback (status check) functionality monthly
- [ ] Review and archive sample payloads for UAT annually

## Support Contacts

- **Hubtel Technical Support:** (provide contact info)
- **Hubtel Webhook Issues:** (provide contact info)
- **Base44 Support:** (provide contact info)
- **Internal Payment Ops:** (provide contact info)

## Useful Links

- Hubtel API Docs: https://developer.hubtel.com/payment-api
- Base44 App Dashboard: (provide URL)
- Base44 Logs: (provide URL)
- Hubtel Merchant Dashboard: (provide URL)
