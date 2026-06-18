# 🎨 Visual Testing Guide - What You'll See

**This guide shows what each screen should look like during testing**

---

## 📱 Phase 1: Guest Homepage (What You'll See)

### Screen 1.1: GuestHome Page Load
```
┌──────────────────────────────────────────────────┐
│  FMM CLASSICO  [Search...]  Account Cart Help   │  ← Header
├──────────────────────────────────────────────────┤
│                                                  │
│         🎉 WELCOME TO FMM CLASSICO 🎉           │
│       Your Premium Electronics & Gadgets Store  │
│                                                  │
│                   [Hero Banner]                 │
│            Summer Sale - Up to 50% Off!         │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│     🔥 FLASH SALE - Ends in: 05:32:18 🔥       │
│                                                  │
│  [Discounted Product 1]  [Discounted Prod 2]   │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  📱 CATEGORIES                                   │
│                                                  │
│  [Phones]  [Accessories]  [Electronics]        │
│  [Home Appliances]  [More...]                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  FEATURED PRODUCTS                              │
│                                                  │
│  Product 1          Product 2          Product 3│
│  [Image]            [Image]            [Image] │
│  Samsung Galaxy     iPhone 15         Tecno    │
│  ₵2,500             ₵3,800            ₵1,200  │
│  ⭐⭐⭐⭐⭐          ⭐⭐⭐⭐⭐         ⭐⭐⭐⭐  │
│  [View] [Add Cart]  [View] [Add Cart] [View]  │
│                                                  │
└──────────────────────────────────────────────────┘

✅ EXPECTED:
- Header shows: Logo | Search | Account | Cart | Help
- Cart badge empty (0)
- Hero banner visible
- Categories clickable
- Products show with prices
- No admin menu
- No errors in console
```

---

## 🛒 Phase 1.2: Add to Cart

### Screen 1.2: Product Added
```
After clicking "Add Cart" on a product:

┌──────────────────────────────────────────────────┐
│  Toast Notification (top right):                │
│  ┌────────────────────────────────────────────┐ │
│  │ ✅ Added to cart!                          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Cart Icon now shows: [🛒 3]                   │
│                                                  │
│  (Previously was [🛒 0])                       │
│                                                  │
│  DevTools → Storage → LocalStorage:            │
│  fmm_guest_cart: [{                            │
│    "product_id": "123",                        │
│    "product_name": "Samsung Galaxy S23",      │
│    "product_price": 2500,                      │
│    "quantity": 2                               │
│  }, ...]                                       │
│                                                  │
└──────────────────────────────────────────────────┘

✅ EXPECTED:
- Toast notification shows "Added to cart"
- Cart badge updates (0 → 1 or more)
- Can add multiple products
- LocalStorage has fmm_guest_cart key with items
```

---

## 📦 Phase 1.3: View Cart

### Screen 1.3: Shopping Cart
```
┌──────────────────────────────────────────────────┐
│  FMM CLASSICO  [Search...]  Account Cart Help   │
├──────────────────────────────────────────────────┤
│                                                  │
│  YOUR SHOPPING CART                             │
│  ═══════════════════════════════════════════════ │
│                                                  │
│  Item 1: Samsung Galaxy S23                    │
│  ┌──────────────────────────────────────────┐  │
│  │ [Image]  Name: Samsung Galaxy S23        │  │
│  │ Price: ₵2,500                            │  │
│  │ Quantity: [−] 2 [+]  Remove              │  │
│  │ Subtotal: ₵5,000                         │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  Item 2: Phone Case                            │
│  ┌──────────────────────────────────────────┐  │
│  │ [Image]  Name: Phone Case                │  │
│  │ Price: ₵150                              │  │
│  │ Quantity: [−] 1 [+]  Remove              │  │
│  │ Subtotal: ₵150                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ═══════════════════════════════════════════════ │
│  Total Items: 3                                 │
│  Cart Total: ₵5,150                            │
│  ═══════════════════════════════════════════════ │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ [Continue Shopping]                      │  │
│  │ [Proceed To Checkout]  ← CLICK THIS      │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘

✅ EXPECTED:
- All products visible with images
- Quantities show correct amounts
- +/- buttons work to adjust
- Remove button removes item
- Cart total calculated correctly
- "Proceed To Checkout" button visible
```

---

## 🔐 Phase 1.4: Click "Proceed To Checkout" → Redirected to Auth

### Screen 1.4: Redirected to Base44 Login
```
URL Changes From: http://localhost:5173/Cart
                To: https://auth.base44.com/login (or similar)

┌──────────────────────────────────────────────────┐
│  BASE44 AUTHENTICATION                           │
│  ══════════════════════════════════════════════  │
│                                                  │
│           [Base44 Logo]                         │
│                                                  │
│     FMM CLASSICO - Secure Login                 │
│                                                  │
│  Email: [_________________________]             │
│                                                  │
│  Password: [_________________________]          │
│                                                  │
│  [ ] Remember me                                │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  [Sign In with Base44]                 │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Don't have an account? [Sign Up]              │
│  [Forgot Password?]                            │
│                                                  │
└──────────────────────────────────────────────────┘

✅ EXPECTED:
- Redirected to EXTERNAL authentication page
- URL changed from localhost to auth provider
- Login form appears
- Base44 branding visible
```

---

## ✅ Phase 2: After Login

### Screen 2.1: Back in App (Authenticated)
```
After successful login:

URL: http://localhost:5173 or http://localhost:5173/Shop

┌──────────────────────────────────────────────────┐
│  FMM CLASSICO  [Search...]  [👤 Your Name ▼]   │
│                            Cart  Help           │
├──────────────────────────────────────────────────┤
│  Welcome back, user@example.com! ✅            │
│  Your cart has been loaded.                     │
│                                                  │
│  (Same product catalog as guest view)           │
│                                                  │
└──────────────────────────────────────────────────┘

✅ EXPECTED:
- Logged in message shows
- Account dropdown shows user email
- Cart badge still shows item count
- Redirected back to app
- NO errors
```

---

## 🛒 Phase 2.2: Go to Cart (Items Still There!) ⭐ CRITICAL

### Screen 2.2: Cart After Login (CRITICAL TEST)
```
Navigate to Cart:

┌──────────────────────────────────────────────────┐
│  YOUR SHOPPING CART (Authenticated User)        │
│  ═══════════════════════════════════════════════ │
│                                                  │
│  ✅ ALL YOUR ITEMS FROM BEFORE LOGIN:          │
│                                                  │
│  Item 1: Samsung Galaxy S23 (x2)   ₵5,000     │
│  Item 2: Phone Case (x1)            ₵150      │
│                                                  │
│  ═══════════════════════════════════════════════ │
│  Total: ₵5,150                                  │
│  ═══════════════════════════════════════════════ │
│                                                  │
│  [Continue Shopping]                            │
│  [Proceed To Checkout]                          │
│                                                  │
└──────────────────────────────────────────────────┘

⭐ CRITICAL VERIFICATION:
✅ ALL items from guest cart are STILL HERE
✅ Quantities preserved (2x Samsung, 1x Case)
✅ Total is same as before (₵5,150)
✅ NO items lost during authentication

DevTools → Storage → LocalStorage:
fmm_guest_cart: (EMPTY or GONE - items transferred)
```

---

## 🛍️ Phase 3: Checkout

### Screen 3.1: Checkout Page (ORDER SUMMARY AT TOP) ⭐ CRITICAL

```
┌──────────────────────────────────────────────────┐
│  CHECKOUT PAGE                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ╔══════════════════════════════════════════╗  │
│  ║         ORDER SUMMARY (FIRST!)           ║  │ ⭐ MUST BE HERE
│  ║                                          ║  │    AT TOP!
│  ║  Items in Your Order:                   ║  │
│  ║  ─────────────────────────────────────  ║  │
│  ║  Samsung Galaxy S23                     ║  │
│  ║  Price: ₵2,500 × 2  =  ₵5,000           ║  │
│  ║                                          ║  │
│  ║  Phone Case                             ║  │
│  ║  Price: ₵150 × 1  =  ₵150               ║  │
│  ║  ─────────────────────────────────────  ║  │
│  ║  Subtotal:           ₵5,150             ║  │
│  ║  Delivery Fee:       FREE (Pickup)      ║  │
│  ║  ═════════════════════════════════════  ║  │
│  ║  TOTAL TO PAY:       ₵5,150             ║  │
│  ╚══════════════════════════════════════════╝  │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  DELIVERY INFORMATION                           │
│  ═════════════════════════════════════════════  │
│                                                  │
│  Full Name: [John Doe________________]         │
│                                                  │
│  Phone Number: [0244123456________________]    │
│                                                  │
│  Delivery Address:                             │
│  [UMAT Campus, Block A, Room 101____________]  │
│                                                  │
│  City/Location: [Kumasi________________]       │
│                                                  │
│  Select Delivery:                              │
│  ○ Pickup Point (FREE)  ← Select this         │
│  ○ Home Delivery (+₵50)                        │
│                                                  │
│  Delivery Fee: FREE                             │
│  Updated Total: ₵5,150                         │
│                                                  │
│  Notes (Optional):                             │
│  [Please leave at gate_____________]           │
│                                                  │
│  ┌────────────────────────────────────────┐   │
│  │ [Get My Location]  [Update Total]      │   │
│  │ [Place Order & Pay with Hubtel]  ✓    │   │
│  └────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘

⭐ CRITICAL CHECKS:
✅ Order Summary is FIRST element on page
✅ Shows all products with quantities
✅ Subtotal calculated correctly
✅ Delivery fee shows based on selection
✅ Total amount updates when delivery changes
✅ Delivery form below summary (not above)
```

---

## 💳 Phase 3.2: Hubtel Payment Page

### Screen 3.2: Redirected to Hubtel

```
After clicking "Place Order & Pay with Hubtel":

URL Changes From: http://localhost:5173/Checkout
                To: https://pay.hubtel.com/... (EXTERNAL)

┌──────────────────────────────────────────────────┐
│  HUBTEL SECURE PAYMENT                          │
│  ══════════════════════════════════════════════  │
│                                                  │
│         [Hubtel Payment Logo]                   │
│                                                  │
│  Payment Details:                               │
│  ─────────────────────────────────────────      │
│  Amount to Pay:        ₵5,150                   │
│  Order Number:         FMMMQJCRH9A             │
│  Merchant:             FMM CLASSICO            │
│  Payment Reference:    FMM-XXXXX...            │
│                                                  │
│  Select Payment Method:                         │
│  ───────────────────────────────────────────    │
│                                                  │
│  📱 Mobile Money                                │
│  ○ MTN Ghana                                    │
│  ○ Vodafone Ghana                              │
│  ○ AirtelTigo Ghana                            │
│                                                  │
│  💳 Credit/Debit Card                          │
│  ○ Visa / MasterCard                           │
│                                                  │
│  🏦 Bank Transfer                               │
│  ○ Ghana Bank Account                          │
│                                                  │
│  ┌────────────────────────────────────────┐   │
│  │  [Continue to Payment]                 │   │
│  └────────────────────────────────────────┘   │
│                                                  │
│  Powered by Hubtel                             │
│  🔒 Secure HTTPS Connection                    │
│                                                  │
└──────────────────────────────────────────────────┘

✅ CRITICAL CHECKS:
✅ URL is HTTPS://pay.hubtel.com (NOT localhost)
✅ Hubtel branding and logo visible
✅ Payment methods available
✅ Amount shows correctly (₵5,150)
✅ Order reference visible
✅ Lock icon in browser address bar (🔒)
```

---

## ✅ Phase 3.3: Payment Confirmed

### Screen 3.3: Success Page

```
After completing payment:

URL: http://localhost:5173/PaymentConfirmed?orderNumber=FMMMQJCRH9A&amount=5150

┌──────────────────────────────────────────────────┐
│  FMM CLASSICO  [Search...]  Account Cart Help   │
├──────────────────────────────────────────────────┤
│                                                  │
│  ╔══════════════════════════════════════════╗  │
│  ║         ✅ PAYMENT SUCCESSFUL! ✅         ║  │
│  ║                                          ║  │
│  ║  Order Number: FMMMQJCRH9A              ║  │
│  ║  Amount Paid: ₵5,150                    ║  │
│  ║  Status: PAID ✓                         ║  │
│  ║  Payment Method: Mobile Money (MTN)    ║  │
│  ║                                          ║  │
│  ║  Your order has been confirmed!         ║  │
│  ║  You will receive an email with:        ║  │
│  ║  • Order details                        ║  │
│  ║  • Tracking information                 ║  │
│  ║  • Expected delivery date               ║  │
│  ║                                          ║  │
│  ╚══════════════════════════════════════════╝  │
│                                                  │
│  ┌────────────────────────────────────────┐   │
│  │  [View Order Details]                  │   │
│  │  [Continue Shopping]                   │   │
│  │  [Track Order]                         │   │
│  └────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘

✅ CRITICAL CHECKS:
✅ Redirected back to localhost (NOT external URL)
✅ Success message displayed
✅ Order number shown
✅ Amount and payment status shown
✅ Next steps provided
```

---

## 📧 Phase 3.4: Confirmation Email

### Screen 3.4: Check Your Email

```
Email Received:

From: noreply@fmm-classico.com
Subject: Order Confirmation - Order #FMMMQJCRH9A

┌──────────────────────────────────────────────────┐
│  [FMM CLASSICO LOGO]                            │
│                                                  │
│  Order Confirmed! ✅                            │
│                                                  │
│  Hi John,                                        │
│                                                  │
│  Your order has been confirmed and will be      │
│  delivered shortly.                             │
│                                                  │
│  ─────────────────────────────────────────      │
│  ORDER DETAILS                                  │
│  ─────────────────────────────────────────      │
│  Order Number: FMMMQJCRH9A                      │
│  Order Date: June 18, 2026                      │
│  Total Amount: ₵5,150.00                        │
│  Payment Status: PAID ✓                         │
│                                                  │
│  ─────────────────────────────────────────      │
│  ITEMS ORDERED                                  │
│  ─────────────────────────────────────────      │
│  1. Samsung Galaxy S23 (x2) ......... ₵5,000   │
│  2. Phone Case (x1) ................ ₵150     │
│                                                  │
│  ─────────────────────────────────────────      │
│  DELIVERY DETAILS                               │
│  ─────────────────────────────────────────      │
│  Name: John Doe                                 │
│  Address: UMAT Campus, Block A, Room 101       │
│  Phone: 0244123456                              │
│  Expected Delivery: June 21, 2026              │
│  Status: Pending Fulfillment                   │
│                                                  │
│  ─────────────────────────────────────────      │
│  NEED HELP?                                     │
│  ─────────────────────────────────────────      │
│  [View Order Details]  [Track Order]            │
│  [Contact Support]  [Return to Store]           │
│                                                  │
│  Thank you for shopping with FMM CLASSICO!     │
│                                                  │
│  Best regards,                                  │
│  FMM CLASSICO Team                             │
│                                                  │
└──────────────────────────────────────────────────┘

✅ CRITICAL CHECKS:
✅ Email received within 1-2 minutes
✅ Contains order number
✅ Shows total amount paid
✅ Lists all items with quantities
✅ Shows delivery address
✅ Provides tracking link
```

---

## 🔒 Phase 4: Security Checks

### Screen 4.1: Admin Page Protection

```
Test 1: Try accessing as GUEST (Logged Out)

URL Attempt: http://localhost:5173/AdminProducts
Result: 

┌──────────────────────────────────────────────────┐
│  BASE44 AUTHENTICATION                          │
│  ══════════════════════════════════════════════  │
│                                                  │
│  You must be authenticated to continue.         │
│                                                  │
│  Please sign in or create an account.           │
│                                                  │
│  [Sign In]  [Sign Up]                          │
│                                                  │
└──────────────────────────────────────────────────┘

✅ EXPECTED: Redirected to login (NOT showing admin content)

Test 2: Try accessing as REGULAR USER (Logged In)

URL Attempt: http://localhost:5173/AdminProducts
Result: 

Either:
✅ Redirected to login (user not admin)
   OR
✅ Error page: "Insufficient Permissions"
   OR
✅ Redirects to home (access denied silently)

❌ SHOULD NOT: Show admin product management page
❌ SHOULD NOT: Show "Add Product" button
❌ SHOULD NOT: Show edit/delete controls
```

---

## 🎯 Summary of All Expected Screens

| # | Screen | Expected | Status |
|---|--------|----------|--------|
| 1.1 | GuestHome | Products visible, no admin | ✅ |
| 1.2 | Add to Cart | Toast + badge update | ✅ |
| 1.3 | Shopping Cart | Items show, total correct | ✅ |
| 1.4 | Proceed to Checkout | Redirect to Base44 auth | ✅ |
| 2.1 | After Login | Back in app, logged in | ✅ |
| 2.2 | Cart After Login | ALL items still there! | ⭐ CRITICAL |
| 3.1 | Checkout | Order Summary at TOP | ⭐ CRITICAL |
| 3.2 | Hubtel Payment | External Hubtel page | ✅ |
| 3.3 | Payment Success | Confirmation page | ✅ |
| 3.4 | Confirmation Email | Email received | ✅ |
| 4.1 | Admin Protection | Not accessible | ✅ |

---

## 🎬 Start Testing Now!

1. Open: http://localhost:5173
2. Follow this visual guide
3. Compare what you see with what's shown above
4. Mark off each screen ✅ as you verify

Good luck! 🚀
