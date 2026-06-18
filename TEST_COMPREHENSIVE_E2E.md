# 🧪 Comprehensive End-to-End Test Guide
## FMM CLASSICO - Full Guest-to-Authenticated Flow

**Date**: June 18, 2026
**Server**: http://localhost:5173
**Duration**: ~15-20 minutes

---

## 📋 Test Checklist Overview

### Phase 1: Guest Experience (10 minutes)
- [ ] GuestHome page loads correctly
- [ ] Guest header layout correct
- [ ] Browse products as guest
- [ ] Add product to cart
- [ ] View cart items
- [ ] Proceed to Checkout button works

### Phase 2: Authentication (2 minutes)
- [ ] Redirected to Base44 auth page
- [ ] Login with credentials
- [ ] Cart items preserved after login

### Phase 3: Authenticated User Experience (8 minutes)
- [ ] Main user homepage displays
- [ ] Checkout page shows Order Summary at top
- [ ] Fill delivery details
- [ ] Proceed to Hubtel payment
- [ ] Complete payment flow

### Phase 4: Security Verification (5 minutes)
- [ ] Admin pages NOT accessible to guests
- [ ] Admin pages NOT accessible to regular users
- [ ] Products sync between admin and user/guest views
- [ ] Categories display correctly everywhere

---

## 🎬 PHASE 1: Guest Experience Test

### Step 1.1: Load GuestHome Page
**URL**: `http://localhost:5173/`

**Expected Results**:
- ✅ Page loads without errors
- ✅ Header shows: `[LOGO] [SEARCH] [ACCOUNT] [CART] [HELP]`
- ✅ Logo shows "FMM CLASSICO"
- ✅ Search bar visible and functional
- ✅ Account dropdown shows: "Sign In", "Sign Up", "Track Order", "Cancel Order"
- ✅ Cart shows badge with item count (should be 0 initially)
- ✅ Help dropdown visible
- ✅ No admin menu items visible

**How to Verify**:
```
1. Open browser DevTools (F12)
2. Check Console tab - should have NO errors
3. Check Network tab - verify all resources load successfully
4. Take screenshot of header
```

---

### Step 1.2: Browse Products as Guest

**URL**: `http://localhost:5173/`

**Expected Results**:
- ✅ Hero banner displays with FMM CLASSICO branding
- ✅ Flash sale section visible with timer
- ✅ Category cards visible (Phones, Accessories, Electronics, Home Appliances)
- ✅ Can click on categories to see products
- ✅ Product cards show: Image, Name, Price, Rating
- ✅ Browse different categories without errors

**Actions**:
1. Scroll down on GuestHome to see all categories
2. Click on "Phones" category
3. See product list for phones
4. Click on different categories (Electronics, Accessories, etc.)
5. Verify products load for each category

**Expected Behavior**:
- ✅ Categories load correctly
- ✅ Products display with proper pricing
- ✅ No 404 errors
- ✅ Images load properly

---

### Step 1.3: Add Product to Cart (Guest)

**Action**:
1. Click on any product (e.g., "Samsung Galaxy S23" or "iPhone 15")
2. View product details page
3. Select quantity (if available)
4. Click "Add to Cart" button

**Expected Results**:
- ✅ Product added successfully (toast notification: "Added to cart")
- ✅ Cart badge updates to show "1" item
- ✅ Can add multiple products
- ✅ Each product shows in cart with correct quantity

**Verification**:
- ✅ Open browser DevTools → Storage → LocalStorage
- ✅ Look for key: `fmm_guest_cart`
- ✅ Should contain JSON array with product data: `[{id, product_id, product_name, product_price, quantity, ...}]`

---

### Step 1.4: View Cart as Guest

**URL**: Click on Cart icon or navigate to `/Cart`

**Expected Results**:
- ✅ Cart page loads
- ✅ All added products visible with:
  - Product image
  - Product name
  - Price per unit
  - Quantity (with +/- buttons)
  - Remove button
  - Line total (price × quantity)
- ✅ Subtotal calculated correctly
- ✅ "Proceed To Checkout" button visible (not "Place Order & Pay")
- ✅ Clicking +/- updates quantity in real-time
- ✅ Removing product removes from cart
- ✅ Cart badge updates as items change

**Example Calculation**:
```
If added:
  - 2x Samsung Galaxy S23 @ ₵2,500 each = ₵5,000
  - 1x Phone Case @ ₵150 = ₵150
  
Cart should show:
  - Subtotal: ₵5,150
  - Delivery: (varies by location)
  - Total: ₵5,150 + delivery fee
```

---

### Step 1.5: Click "Proceed To Checkout" as Guest

**Action**:
1. In Cart page, click "Proceed To Checkout" button
2. Observe what happens

**Expected Results**:
- ✅ Redirected to Base44 authentication page
- ✅ URL changes to Base44 login page (not localhost anymore)
- ✅ Shows Base44 logo
- ✅ Login form with email/password fields
- ✅ Error message: "You must authenticate to continue"

**Important**: 
- ⚠️ If you see a login form on localhost, the auth redirect is NOT working correctly
- ✅ Correct behavior: External redirect to Base44 auth page

---

## 🔐 PHASE 2: Authentication Test

### Step 2.1: Login with Base44

**On the authentication page**:
1. Enter your email address (e.g., `test@example.com`)
2. Enter your password
3. Click "Sign In" or "Login"

**Expected Results**:
- ✅ Authentication successful
- ✅ Redirected back to `http://localhost:5173`
- ✅ Welcome message: "Logged in as [your-email]"
- ✅ Header updates to show authenticated state
- ✅ Account menu may show additional options like "Logout"

---

### Step 2.2: Verify Guest Cart Persists After Login ⭐ CRITICAL

**Action**:
1. After login, navigate to `/Cart` again
2. Observe the cart contents

**Expected Results**:
✅ **CRITICAL**: All products you added as guest are STILL in your cart!
- Products should include:
  - Samsung Galaxy S23 (2x)
  - Phone Case (1x)
  - Any other items added
- ✅ Quantities preserved exactly as they were
- ✅ Cart total remains the same
- ✅ No items lost during authentication

**Why This Matters**:
- Guest cart stored in localStorage (`fmm_guest_cart`)
- When user logs in, `AuthContext.jsx` runs `mergeGuestCart()` function
- Guest items automatically transferred to authenticated user's database cart
- Guest cart is cleared from localStorage

**Verification**:
1. Open DevTools → Storage → LocalStorage
2. Look for `fmm_guest_cart` key
3. Should be **empty** now (or no longer exist)
4. Guest items are now in the authenticated user's database cart

---

## 🏪 PHASE 3: Authenticated User Experience

### Step 3.1: View Main User Homepage

**Action**:
1. After login, navigate to home (click logo or go to `/`)

**Expected Results**:
- ✅ Page layout changes to **authenticated user layout**
- ✅ Header may look slightly different from guest layout
- ✅ Products visible (same catalog as guest)
- ✅ User account section visible
- ✅ Categories visible
- ✅ All products still accessible

**Difference from GuestHome**:
| Guest | Authenticated User |
|-------|-------------------|
| "Sign In / Sign Up" in menu | User name or "Account" |
| Limited features | Full features enabled |
| LocalStorage cart | Database cart |
| View-only in some areas | Edit capabilities |

---

### Step 3.2: Proceed to Checkout as Authenticated User

**Action**:
1. Navigate to Cart (should show your guest-migrated items)
2. Click "Proceed To Checkout" button (or if it says "Place Order & Pay with Hubtel", click that)

**Expected Results**:
- ✅ Redirected to `/Checkout` page (no auth required this time)
- ✅ Page loads successfully

---

### Step 3.3: Verify Order Summary at Top of Checkout Page ⭐ CRITICAL

**Action**:
1. On Checkout page, look at the very top

**Expected Results**:
✅ **FIRST ELEMENT** on the page is the **Order Summary** card containing:

```
┌─────────────────────────────────────┐
│   ORDER SUMMARY                     │
├─────────────────────────────────────┤
│ Samsung Galaxy S23                  │
│   Price: ₵2,500 x 2 = ₵5,000        │
│                                     │
│ Phone Case                          │
│   Price: ₵150 x 1 = ₵150            │
│                                     │
│ ─────────────────────────────────── │
│ Subtotal:        ₵5,150             │
│ Delivery Fee:    FREE (pickup)      │
│ ─────────────────────────────────── │
│ TOTAL:           ₵5,150             │
│ ═════════════════════════════════ │
└─────────────────────────────────────┘
```

**Verification**:
- ✅ Order Summary is literally the first section (scroll to top if needed)
- ✅ All added products listed with quantities
- ✅ Subtotal calculated correctly
- ✅ Delivery fee shown (might vary by location)
- ✅ Total amount clearly visible

**Why This Matters**:
- User should see exactly what they're paying before entering delivery info
- Order Summary moved from Cart sidebar to Checkout top per your requirements

---

### Step 3.4: Fill Delivery Information

**Below the Order Summary**, you should see a form:

**Required Fields** (fill them in):
1. **Full Name**: Enter your name (e.g., "Test User")
2. **Phone Number**: Enter valid phone (e.g., "0244123456")
3. **Delivery Address**: Enter full address (e.g., "UMAT Campus, Block A, Room 101")
4. **City/Location**: Select from dropdown or enter
5. **Delivery Location**: Select pickup point (FREE) or delivery address
6. **Notes** (optional): Add special delivery instructions

**Action**:
1. Fill in all required fields with test data
2. Click "Get Location" button (optional - uses GPS to auto-fill address)
3. Observe delivery fee updates based on selection

**Expected Results**:
- ✅ All fields accept input without errors
- ✅ Form validates entries
- ✅ If "Pickup" selected: Delivery Fee shows as "FREE"
- ✅ If "Delivery" selected: Delivery Fee shows appropriate amount
- ✅ Total amount updates to include delivery fee

---

### Step 3.5: Review Order Summary (Updated)

**After selecting delivery location**:

**Expected Results**:
- ✅ Order Summary section updates
- ✅ New total shows with delivery fee included:
  ```
  Subtotal:      ₵5,150
  Delivery Fee:  FREE
  ─────────────
  TOTAL:         ₵5,150
  ```

---

### Step 3.6: Click "Place Order & Pay with Hubtel"

**Action**:
1. Scroll down to see submit button
2. Verify button says "Place Order & Pay with Hubtel"
3. Click the button

**Expected Results**:
- ✅ Loading spinner appears
- ✅ Order is created in the system
- ✅ Hubtel payment initiation begins

---

### Step 3.7: Hubtel Payment Page Loads

**Expected Results**:
- ✅ Redirected to Hubtel payment page
- ✅ URL shows: `https://pay.hubtel.com/...` or similar
- ✅ Hubtel logo visible
- ✅ Payment form shows:
  - Amount to pay (e.g., "Amount: ₵5,150")
  - Account number/reference
  - Payment method options:
    - 📱 Mobile Money (MTN, Vodafone, AirtelTigo)
    - 💳 Credit/Debit Card
    - 🏦 Bank Transfer

**Security Check**:
- ✅ URL is HTTPS (secure connection)
- ✅ Hubtel branding visible (not spoofed)
- ✅ Lock icon in browser address bar

---

### Step 3.8: Complete Hubtel Payment ⭐ CRITICAL

**For Testing** (use Hubtel test credentials):
1. Select payment method:
   - **Mobile Money**: Select provider (MTN, Vodafone, AirtelTigo)
   - **Card**: Use test card if available
   - **Bank Transfer**: Use test bank details

2. Enter payment details (these should be test values from Hubtel docs)

3. Click "Pay Now" or "Complete Payment"

**Expected Results**:
- ✅ Payment processes
- ✅ Brief loading/processing screen
- ✅ Redirected back to `http://localhost:5173/PaymentConfirmed`
- ✅ Success message displays

**Payment Confirmation Page Should Show**:
```
✅ PAYMENT SUCCESSFUL

Order Number: FMMMQJCRH9A
Amount: ₵5,150
Payment Status: PAID
Payment Method: Mobile Money (MTN)

Your order has been confirmed!
Check your email for order details.

[View Order Details] [Continue Shopping]
```

---

### Step 3.9: Verify Order Confirmation Email

**Action**:
1. Check your email inbox
2. Look for message from "FMM CLASSICO" or noreply@fmm-classico.com

**Expected Results**:
- ✅ Email received
- ✅ Subject: "Order Confirmation - Order #FMMMQJCRH9A"
- ✅ Contains:
  - Order number
  - Product list with quantities
  - Total amount paid
  - Delivery address
  - Tracking information (if available)
  - Expected delivery date

---

## 🔒 PHASE 4: Security & Admin Verification

### Step 4.1: Verify Admin Pages NOT Accessible as Guest

**Action**:
1. Open incognito/private browser window (to ensure you're logged out)
2. Try accessing admin pages directly:

**Test URLs** (as guest - should redirect):
- `http://localhost:5173/AdminProducts`
- `http://localhost:5173/AdminOrders`
- `http://localhost:5173/AdminAI`
- `http://localhost:5173/AdminPromoBanners2`
- `http://localhost:5173/AdminBrandLogos`

**Expected Results**:
- ✅ Each admin URL redirects to Base44 login page
- ✅ Error message: "You must be authenticated to access this page"
- ✅ Cannot see any admin content
- ✅ Admin pages are completely hidden

---

### Step 4.2: Verify Admin Pages NOT Accessible to Regular Users

**Action**:
1. Login as regular user (non-admin)
2. Try accessing same admin URLs

**Expected Results**:
- ✅ Redirected to login OR shown error page
- ✅ Admin pages not visible
- ✅ Cannot edit products, orders, etc.
- ✅ Only admin users with correct password can access

---

### Step 4.3: Verify Product Sync - Guest View

**Action**:
1. As guest, browse `/Shop` or home page
2. Check if products are visible

**Expected Results**:
- ✅ Products visible to guests
- ✅ Images load correctly
- ✅ Prices show accurately
- ✅ Can add to cart
- ✅ Product information correct

---

### Step 4.4: Verify Product Sync - Authenticated User View

**Action**:
1. Login as regular user
2. Navigate to Shop or home
3. Compare products with guest view

**Expected Results**:
- ✅ **SAME PRODUCTS** visible as guest saw
- ✅ **SAME PRICES** displayed
- ✅ **SAME PRODUCT IMAGES**
- ✅ **SAME CATEGORIES**
- ✅ Products sync perfectly between guest and authenticated views

---

### Step 4.5: Verify Admin Can Edit Products

**Action** (if you have admin access):
1. Navigate to `/AdminProducts`
2. Make a small change to a product (e.g., price or description)
3. Save the change

**Expected Results**:
- ✅ Product updated in database
- ✅ Change appears on guest homepage within seconds
- ✅ Change appears on authenticated user homepage
- ✅ Change appears in Shop page for both user types

---

### Step 4.6: Verify Categories Display Everywhere

**Locations to Check**:
- [ ] GuestHome page - categories visible and clickable
- [ ] Shop page - categories filterable
- [ ] Main user homepage - categories visible
- [ ] Product detail pages - category information shown
- [ ] Admin product management - category selector works

**Expected Results**:
- ✅ All categories visible:
  - Phones
  - Phone Accessories
  - Electronics
  - Home Appliances
  - (Any custom categories)
- ✅ Categories display consistently across all pages
- ✅ Clicking category shows relevant products
- ✅ Category filters work correctly

---

## 📊 Test Results Summary

After completing all phases, fill this out:

### Phase 1: Guest Experience
- [ ] GuestHome loads ✅
- [ ] Can browse products ✅
- [ ] Can add to cart ✅
- [ ] Can view cart ✅
- [ ] Proceed to Checkout works ✅

### Phase 2: Authentication
- [ ] Login redirects correctly ✅
- [ ] Guest cart persists after login ✅
- [ ] All items transferred ✅
- [ ] No items lost ✅

### Phase 3: Checkout & Payment
- [ ] Order Summary at top of Checkout ✅
- [ ] Delivery form works ✅
- [ ] Hubtel payment redirects ✅
- [ ] Payment completes successfully ✅
- [ ] Order confirmation email sent ✅

### Phase 4: Security & Admin
- [ ] Admin pages hidden from guests ✅
- [ ] Admin pages hidden from regular users ✅
- [ ] Products sync across views ✅
- [ ] Categories display correctly ✅

---

## 🐛 Troubleshooting

### Issue: Cart items lost after login
**Solution**:
- Check `src/lib/AuthContext.jsx` - `mergeGuestCart()` function
- Check browser localStorage for `fmm_guest_cart` key before login
- Check database for authenticated user's CartItem records after login
- Check browser console for errors

### Issue: Admin pages accessible to guests
**Solution**:
- Check `src/App.jsx` - verify admin routes are in `PROTECTED_ROUTES`
- Check `ProtectedLayout` component - should redirect unauthenticated users
- Verify `useAuth()` hook is being used correctly

### Issue: Hubtel payment not redirecting
**Solution**:
- Verify `.env` has correct Hubtel credentials
- Check `src/api/hubtel-initiate.js` - verify Basic Auth encoding
- Check browser console for CORS errors
- Verify checkoutUrl is being returned from Hubtel API
- Check if popup blocker is preventing redirect

### Issue: Products not syncing between views
**Solution**:
- Check that both guest and authenticated views query the same Product database
- Verify `base44.entities.Product` is used in both views
- Check if products have status flag (e.g., published=true) that filters them

### Issue: Email not received after payment
**Solution**:
- Check `src/api/hubtel-callback-handler.js` - verify email logic
- Check spam/promotions folder in email
- Verify email service is configured in Base44 backend
- Check Base44 function logs for email sending errors

---

## ✅ Completion Checklist

When all tests pass, verify:

- [ ] Guest can browse products
- [ ] Guest can add to cart
- [ ] Guest can checkout (with auth redirect)
- [ ] Guest cart persists after login
- [ ] Authenticated user can checkout
- [ ] Order Summary appears at top of Checkout
- [ ] Hubtel payment works end-to-end
- [ ] Admin pages are protected
- [ ] Products sync across views
- [ ] Categories display correctly
- [ ] **NO ERROR MESSAGES** in browser console
- [ ] **NO ERRORS** in terminal output
- [ ] **Delivery fee updates** based on location
- [ ] **Payment confirmation emails** sent
- [ ] **Order status** updated to PAID

---

**Test Completed**: _______________  
**Tester Name**: _______________  
**Results**: PASS / FAIL  
**Issues Found**: _______________

---

## 📞 Support

If you encounter issues:
1. Check browser DevTools Console (F12) for errors
2. Check terminal output for server-side errors
3. Check `.env` file for correct configuration
4. Review code in relevant files mentioned above
5. Check IMPLEMENTATION_COMPLETE.md for more details
