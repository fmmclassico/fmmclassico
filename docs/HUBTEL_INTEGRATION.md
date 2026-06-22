Hubtel Integration (Base44 App)

## Environment Variables

Set these in your Base44 app environment configuration:

```
HUBTEL_AP_ID=YOUR_HUBTEL_API_ID
HUBTEL_API_KEY=YOUR_HUBTEL_API_KEY
HUBTEL_MERCHANT_ACCOUNT_NUMBER=YOUR_MERCHANT_ACCOUNT_NUMBER
BASE44_SERVER_TOKEN=<your-base44-server-token>
```

## Server Functions

Deploy these files as Base44 server functions or routes:

- `POST /api/hubtel/initiate` → `src/functions/hubtel/initiate.js`
  - Forwards payment initiation to Hubtel API
  - Body: `totalAmount`, `description`, `callbackUrl`, `returnUrl`, `cancellationUrl`, `clientReference`
  - Returns: `checkoutUrl` (redirect customer here)

- `POST /api/hubtel/callback` → `src/functions/hubtel/callback.js`
  - Receives Hubtel payment callbacks
  - Updates Order entity with payment status
  - Logs samples for UAT

- `GET /api/hubtel/status?clientReference={ref}` → `src/functions/hubtel/status.js`
  - Queries Hubtel for final transaction status
  - Use this 5+ minutes after payment to verify if no callback received
  - Logs samples for UAT

- `GET /api/hubtel/uat-samples` → `src/functions/hubtel/uat-samples.js`
  - Returns collected payment samples for UAT documentation

## Frontend Integration

- Client wrapper: `src/api/hubtelClient.js`
  - `initiatePayment(payload)` calls `/api/hubtel/initiate`
  - `checkPaymentStatus(clientReference)` calls `/api/hubtel/status`

- Checkout page: `src/pages/Checkout.jsx`
  - After order creation, calls `initiatePayment()`
  - Redirects to Hubtel checkout URL
  - Fallback message if initiation fails

## Setup Checklist

- [ ] Configure environment variables in Base44
- [ ] Deploy server functions
- [ ] Whitelist app's public IP(s) with Hubtel (required for status checks)
- [ ] Test payment initiation → redirect flow
- [ ] Test callback receipt and order updates
- [ ] Test fallback status check (after 5-minute timeout)
- [ ] Collect sample payloads for UAT
- [ ] Create flow diagram for Hubtel
- [ ] Schedule UAT meeting

## Testing & UAT

See [HUBTEL_UAT_GUIDE.md](HUBTEL_UAT_GUIDE.md) for:
- Flow diagrams and sequence diagrams
- Detailed test scenarios
- Manual curl examples
- Sample payloads and responses
- Troubleshooting guide
