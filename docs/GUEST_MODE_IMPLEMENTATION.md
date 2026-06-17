# FMM CLASSICO Guest Mode Implementation Guide

## Overview

Guest Mode allows unauthenticated users to browse products, search, view categories, and manage a temporary cart—similar to Jumia and Amazon. When guests attempt to checkout or access user-specific features, they are redirected to the authentication page.

---

## Architecture

### 1. **Layout System**

The application now uses two layouts based on authentication state:

#### **GuestLayout** (`src/components/layouts/GuestLayout.jsx`)
- **Used for**: Unauthenticated users
- **Header**: Logo | Search | Account | Cart | Help
- **Navigation**: Minimal header only, no bottom navigation
- **Account Dropdown**: Sign In | Sign Up | My Account | Track Order | Cancel Order (all redirect to auth)
- **Cart**: Displays count from localStorage, but redirects to auth on click

#### **AuthenticatedLayout** (`src/Layout.jsx`)
- **Used for**: Authenticated users
- **Header**: Logo | Menu | Search | Notifications | Help
- **Navigation**: Bottom navigation + full menu
- **Features**: Full account access, order tracking, notifications

### 2. **Layout Switching Logic** (`src/App.jsx`)

The `LayoutWrapper` component automatically selects the appropriate layout:

```jsx
const LayoutWrapper = ({ children, currentPageName, isAuthenticated }) => {
  const SelectedLayout = isAuthenticated ? Layout : GuestLayout;
  return SelectedLayout ? (
    <SelectedLayout currentPageName={currentPageName}>{children}</SelectedLayout>
  ) : (
    <>{children}</>
  );
};
```

### 3. **Protected Routes**

Routes that require authentication are handled by `ProtectedLayout`:

```jsx
const ProtectedLayout = ({ children, currentPageName, isAuthenticated, navigateToLogin }) => {
  if (!isAuthenticated) {
    React.useEffect(() => {
      navigateToLogin();
    }, []);
    return null;
  }
  return <LayoutWrapper currentPageName={currentPageName} isAuthenticated={true}>{children}</LayoutWrapper>;
};
```

**Protected Routes** (defined in `PROTECTED_ROUTES` constant):
- Checkout
- Cart
- Account / Settings
- Orders
- OrderTracking
- Notifications
- Chat
- All Admin Routes

---

## Authentication Flow

### **New Visitor (Unauthenticated)**

```
Visitor Arrives → AuthContext Checks Token
                  ↓ (No Token)
            Guest Mode Activated
                  ↓
         GuestLayout + Public Pages
                  ↓
      Browse Products, Search, View Categories
                  ↓
    Attempt Checkout → Redirected to Login
```

### **User Login/Signup**

```
Guest → Clicks Any Auth Option (Sign In, My Account, Track Order)
   ↓
Redirected to Base44 Authentication Page
   ↓
Successful Login
   ↓
AuthContext Updates isAuthenticated = true
   ↓
Redirected to Dashboard/Home with AuthenticatedLayout
```

### **User Logout**

```
Authenticated User → Clicks Logout
        ↓
Layout.jsx handleLogout() Called
        ↓
Guest Cart Cleared (localStorage)
        ↓
useAuth.logout(true) Called
        ↓
Session Cleared
        ↓
Redirected to Guest Homepage
        ↓
GuestLayout Activated
```

---

## Key Components

### **AuthContext (`src/lib/AuthContext.jsx`)**

Changes made:
- Removed auth_required error for guests (allows browsing)
- Updated `logout()` to redirect to guest homepage when `redirectToGuest=true`
- Guests can now access the application without forcing login

```jsx
// Guest mode: No error thrown
const authPromise = appParams.token ? checkUserAuth() : Promise.resolve().then(() => {
  setIsLoadingAuth(false);
  setIsAuthenticated(false);
  setAuthError(null); // Allow guest browsing
});
```

### **GuestLayout**

Features:
- Header: Logo | Search | Account | Cart | Help
- Account dropdown with auth redirects
- Help dropdown with links (About, Policies, How to Use)
- No bottom navigation
- Persistent search functionality
- Guest cart count display

### **Layout Changes**

Updated to support guest mode:
- Added `useAuth()` hook
- Updated logout handler to redirect to guest homepage
- Clears guest cart data on logout

---

## Guest Cart Management

### **Storage**

Guest cart items are stored in localStorage under key: `fmm_guest_cart`

```javascript
// Structure
[
  {
    id: "product-id",
    name: "Product Name",
    price: 99.99,
    quantity: 2,
    image_url: "...",
    addedAt: "2026-06-17T10:30:00Z"
  }
]
```

### **Guest Cart Utilities** (`src/lib/guest-cart.js`)

```javascript
import guestCart from '@/lib/guest-cart';

// Get items
const items = guestCart.getItems();

// Add item
guestCart.addItem({
  id: "product-1",
  name: "Phone Case",
  price: 29.99,
  quantity: 1,
  image_url: "..."
});

// Update quantity
guestCart.updateQuantity("product-1", 3);

// Remove item
guestCart.removeItem("product-1");

// Clear cart
guestCart.clear();

// Get total
const total = guestCart.getTotal();
```

### **Cart Persistence Through Login**

When a guest logs in:
1. Guest cart is preserved in localStorage during redirect
2. After login, the application remains on checkout/cart page
3. Guest cart items can be migrated to user's actual cart (optional feature)
4. On logout, guest cart is cleared for security

---

## Public vs. Protected Pages

### **Public Pages** (Accessible to Guests & Authenticated Users)

- Home
- Shop / Browse
- Product Detail
- Categories
- About
- Policies
- How to Use
- Download App
- Mobile App Guide

### **Protected Pages** (Auth Required)

- Cart
- Checkout
- Account / Settings
- My Orders
- Order Tracking
- Notifications
- Chat Support
- Admin Pages (all)

---

## SEO & Public Access

The Guest Homepage is fully SEO-optimized:
- ✅ All public pages crawlable by search engines
- ✅ No authentication required for product browsing
- ✅ Product pages indexed for search
- ✅ Meta tags optimized for FMM CLASSICO branding
- ✅ JSON-LD structured data included

---

## User Experience Flow

### **Scenario 1: Guest Browsing**
```
1. New visitor lands on https://fmmclassico.com
2. Automatically enters Guest Mode
3. Sees GuestLayout with minimal navigation
4. Can search, browse categories, view products
5. Adds products to cart (stored in localStorage)
6. Clicks Cart or Checkout → Redirected to login
```

### **Scenario 2: Guest Account Actions**
```
1. Guest clicks Account menu
2. Sees dropdown: Sign In | Sign Up | My Account | Track Order | Cancel Order
3. Any click → Redirected to Base44 Auth Page
4. After login → Full application access
```

### **Scenario 3: Existing User Returns**
```
1. User with token visits site
2. Token validated by AuthContext
3. Authenticated layout loaded automatically
4. Full navigation + features available
5. No interruption to experience
```

### **Scenario 4: User Logout**
```
1. User clicks Logout
2. Session cleared
3. Guest cart cleared (localStorage)
4. Redirected to Guest Homepage
5. Returns to GuestLayout
```

---

## Implementation Checklist

### Core Features
- [x] GuestLayout component created
- [x] AuthContext updated for guest mode
- [x] App.jsx routes configured with layout switching
- [x] Protected routes implement auth checks
- [x] Layout.jsx logout redirects to guest homepage
- [x] Guest account dropdown created
- [x] Guest cart utility created

### Features to Implement (Optional)
- [ ] Guest cart migration to authenticated user cart
- [ ] Guest email capture for order tracking
- [ ] Persistent guest session (remember searches/filters)
- [ ] Guest wishlist functionality
- [ ] Guest order notifications via email

---

## Testing Checklist

### Guest Mode
- [ ] Visit site without logging in → See GuestLayout
- [ ] Search products → Works
- [ ] Browse categories → Works
- [ ] View product details → Works
- [ ] Add to cart → Stored in localStorage
- [ ] Cart count displays → Updates dynamically
- [ ] Click Account → Dropdown shows options
- [ ] Click any account option → Redirected to auth

### Protected Routes
- [ ] Try accessing /Cart → Redirected to login
- [ ] Try accessing /Checkout → Redirected to login
- [ ] Try accessing /Account → Redirected to login
- [ ] Try accessing /Orders → Redirected to login

### Authenticated User
- [ ] Login → See AuthenticatedLayout
- [ ] Bottom navigation visible → Works
- [ ] Full menu accessible → Works
- [ ] Click Logout → Redirected to Guest Homepage
- [ ] Guest cart cleared → Verified in localStorage

### Cross-Browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Technical Notes

### LocalStorage Usage
- Only used for guest cart (non-sensitive data)
- Cleared on logout
- Separate key `fmm_guest_cart` to avoid conflicts

### Performance
- GuestLayout is lightweight (no user queries)
- Reduced queries for guests (no notifications/orders fetch)
- Layout selection happens once per app load

### Security
- Guests cannot access authenticated-only API endpoints
- Protected routes guard against direct URL access
- Base44 auth handles all actual authentication

---

## Future Enhancements

1. **Guest Checkout with Email**
   - Allow guests to complete checkout with email
   - Send order confirmation via email
   - Guest can track via email link

2. **Guest Features**
   - Save favorites/wishlist
   - Product recommendations based on browsing
   - Email notifications for price drops

3. **Cart Persistence**
   - Migrate guest cart to authenticated cart
   - Preserve guest cart across sessions (with expiration)

4. **A/B Testing**
   - Test guest layout variants
   - Measure conversion from guest to registered

---

## Support & Troubleshooting

### Issue: Guest not seeing GuestLayout
**Solution**: Check AuthContext - ensure `isAuthenticated` is false and `authError` is null for guests

### Issue: Protected routes not redirecting
**Solution**: Verify route is in `PROTECTED_ROUTES` set in App.jsx

### Issue: Logout not redirecting to guest homepage
**Solution**: Ensure Layout.jsx `handleLogout` calls `logout(true)`

### Issue: Guest cart not persisting
**Solution**: Check browser localStorage - verify key `fmm_guest_cart` is saved

---

## File Changes Summary

### Created Files
- `src/components/layouts/GuestLayout.jsx` - Guest-only layout
- `src/lib/guest-cart.js` - Guest cart utilities
- `src/components/ProtectedLayoutRoute.jsx` - Protected route helper

### Modified Files
- `src/App.jsx` - Layout switching logic, protected routes
- `src/lib/AuthContext.jsx` - Guest mode support, logout redirect
- `src/Layout.jsx` - useAuth integration, logout handler

### Unchanged
- All page components work with both layouts
- All existing auth flows preserved
- No breaking changes to authenticated experience
