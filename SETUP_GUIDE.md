# 🚀 FMM CLASSICO - Setup & Deployment Guide

## Quick Start (5 minutes)

### 1️⃣ Create Your `.env` File
```bash
cp .env.example .env
```

### 2️⃣ Add Your Hubtel Credentials
Edit `.env` and fill in:
```env
VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER=<Your merchant account from Hubtel>
VITE_HUBTEL_API_ID=<Your API ID from Hubtel Developer Portal>
VITE_HUBTEL_API_KEY=<Your API Key - keep this SECRET>
VITE_HUBTEL_MERCHANT_EMAIL=your@business.email
VITE_HUBTEL_MERCHANT_PHONE=0XXXXXXXXX
VITE_ADMIN_PASSWORD=<Your secure admin password>
```

**Where to get these:**
- Go to: https://developers.hubtel.com
- Sign in with your merchant account
- Find "Collection Account Number" in dashboard
- Go to "API Credentials" section → Create API Key

### 3️⃣ Configure Hubtel Webhook (Important!)
1. In your `.env`, note the `HUBTEL_CALLBACK_URL` (leave empty for now)
2. Deploy the app first
3. Base44 will generate a public URL for the `hubtelCallback` function
4. In your Hubtel Dashboard → Settings → Callback URL → Paste that URL
5. Update `.env` with: `HUBTEL_CALLBACK_URL=<the-url-base44-gave-you>`

### 4️⃣ Build & Deploy
```bash
npm install
npm run build
npm run preview  # Test locally first
```

### 5️⃣ Test the Checkout Flow
1. Open: `https://yoursite.com/Shop`
2. Add a product to cart (as guest or logged-in user)
3. Click "Proceed To Checkout"
4. If guest → complete login
5. Fill delivery info
6. Click "Place Order & Pay with Hubtel"
7. Complete test payment on Hubtel test portal

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Guest can add products to cart
- [ ] Guest checkout redirects to authentication
- [ ] After login, guest cart items are still there (transferred to user cart)
- [ ] Checkout form accepts delivery address
- [ ] Clicking "Place Order" redirects to Hubtel payment page
- [ ] Test payment on Hubtel completes
- [ ] Order is marked as PAID in database
- [ ] Confirmation email sent to customer
- [ ] Order appears in Admin Dashboard

---

## 🔒 Security Reminders

⚠️ **CRITICAL:**
- Never commit `.env` file (it's in `.gitignore`)
- Never share your Hubtel API Key
- Never hardcode credentials in source
- Always use environment variables

✅ **Verified:**
- ✅ No API keys in source code
- ✅ No Paystack credentials remain
- ✅ All secrets in environment only
- ✅ `.env` is gitignored

---

## 📞 Hubtel Support

If you need help:
1. **Hubtel Developer Docs**: https://developers.hubtel.com
2. **Get API Credentials**: https://developers.hubtel.com/dashboard
3. **Test Account**: Use Hubtel's sandbox/test environment first
4. **Callback Testing**: Use tools like ngrok or RequestBin to test webhooks locally

---

## 🧪 Running Tests

### Unit Tests
```bash
npm run test
```

### Lint Check
```bash
npm run lint
```

### Type Check
```bash
npm run typecheck
```

### Build Verification
```bash
npm run build
```

### E2E Checkout Test
```bash
node src/tests/checkout-e2e.test.js
```

---

## 📋 Feature Summary

### What's Implemented

✅ **Guest Shopping**
- Browse products without account
- Add to cart as guest
- Cart stored in browser localStorage

✅ **Guest Checkout**
- "Proceed To Checkout" button (redirects to login)
- Guest cart items transfer to user cart after login
- No items lost during authentication

✅ **Hubtel Payment Integration**
- All payment methods supported (Mobile Money, Card, Bank Transfer)
- Transaction status checking (Hubtel compliance)
- Webhook callback for payment confirmation
- Payment confirmation emails

✅ **Order Management**
- Order created after successful payment
- Order status tracking
- Delivery location selection with FREE options
- Order history for authenticated users

✅ **Admin Dashboard**
- View all orders
- Update order status
- Track payments
- Manage products

---

## 🐛 Troubleshooting

### "Hubtel API not configured"
→ Check `.env` file has all 3 required fields:
- VITE_HUBTEL_API_ID
- VITE_HUBTEL_API_KEY  
- VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER

### "Guest cart not persisting after login"
→ Verify AuthContext.jsx is running mergeGuestCart()
→ Check browser console for errors
→ Clear localStorage and try again

### "Hubtel payment not redirecting"
→ Verify checkoutUrl is returned from initiate endpoint
→ Check CORS settings if using custom proxy
→ Verify returnUrl is accessible from internet

### "Payment webhook not received"
→ Verify HUBTEL_CALLBACK_URL is public and accessible
→ Check Hubtel dashboard callback URL matches deployed URL
→ View Base44 function logs for errors

---

## 📞 Support

For issues, check:
1. `IMPLEMENTATION_COMPLETE.md` - Full documentation
2. `src/tests/checkout-e2e.test.js` - Test flow documentation
3. `src/api/hubtel-*.js` - API implementation details
4. `docs/` folder - Additional guides

---

**Last Updated**: June 18, 2026
**Status**: ✅ Production Ready
