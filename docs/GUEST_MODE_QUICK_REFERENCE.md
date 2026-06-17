# Guest Mode - Quick Reference Guide

## 🎯 Quick Start for Developers

### Files to Know

| File | Purpose | Key Function |
|------|---------|--------------|
| `src/components/layouts/GuestLayout.jsx` | Guest-only layout | Header with Logo, Search, Account, Cart, Help |
| `src/App.jsx` | Route configuration | Layout switching & route protection |
| `src/Layout.jsx` | Authenticated layout | Full navigation & user features |
| `src/lib/AuthContext.jsx` | Auth state | Manages isAuthenticated & logout |
| `src/lib/guest-cart.js` | Guest cart utility | localStorage management for cart |

---

## 🔄 How Layout Switching Works

```
User Visits Website
        ↓
AuthContext checks token
        ↓
┌─────────────────┬──────────────────┐
│                 │                  │
Token Found    No Token         Admin
│                 │                  │
↓                 ↓                  ↓
Authenticated    Guest          Admin Verify
Layout          Layout          Modal
(Full Nav)      (Minimal)       (If needed)
```

---

## 🛡️ Protected Routes

Add a route to protected list in `src/App.jsx`:

```javascript
// In App.jsx - PROTECTED_ROUTES constant
const PROTECTED_ROUTES = new Set([
  'Checkout',
  'Cart',
  'Account',
  'Orders',
  'OrderTracking',
  'Notifications',
  'Chat',
  // Add new protected routes here
  'YourNewRoute'
]);
```

When guest tries to access protected route → Redirected to auth

---

## 🛒 Using Guest Cart

```javascript
import guestCart from '@/lib/guest-cart';

// Get all items
const items = guestCart.getItems();

// Add item
guestCart.addItem({
  id: "product-123",
  name: "Phone Case",
  price: 29.99,
  quantity: 1
});

// Update quantity
guestCart.updateQuantity("product-123", 3);

// Remove item
guestCart.removeItem("product-123");

// Get total count
const count = guestCart.getTotal();

// Clear all
guestCart.clear();

// Listen for updates
window.addEventListener('fmm-cart-updated', () => {
  console.log('Cart updated!');
});
```

---

## 🔐 Checking Authentication in Components

```javascript
import { useAuth } from '@/lib/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, logout } = useAuth();
  
  if (!isAuthenticated) {
    // Show guest content
    return <GuestContent />;
  }
  
  // Show authenticated content
  return <AuthenticatedContent user={user} />;
}
```

---

## 🚪 Route Protection Pattern

In `App.jsx`:

```javascript
// For routes that need protection
<Route
  path="/Checkout"
  element={
    <ProtectedLayout 
      currentPageName="Checkout" 
      isAuthenticated={isAuthenticated} 
      navigateToLogin={navigateToLogin}
    >
      <Checkout />
    </ProtectedLayout>
  }
/>

// For public routes
<Route
  path="/Shop"
  element={
    <LayoutWrapper 
      currentPageName="Shop" 
      isAuthenticated={isAuthenticated}
    >
      <Shop />
    </LayoutWrapper>
  }
/>
```

---

## 🎨 GuestLayout Features

```jsx
// Header Elements (in order)
- Logo (clickable, goes home)
- Search bar (with mobile support)
- Account dropdown (Sign In | Sign Up | My Account | Track Order | Cancel Order)
- Cart button (shows count badge)
- Help dropdown (How To Use | Policies | About Us | WhatsApp)

// No Bottom Navigation
// No Menu Hamburger
// No User Notifications
```

---

## 🔄 Logout Flow

```
User clicks Logout
        ↓
Layout.jsx handleLogout()
        ↓
Clear guest cart: localStorage.removeItem('fmm_guest_cart')
        ↓
Call logout(true) from AuthContext
        ↓
Session cleared
        ↓
Redirect to '/' (guest homepage)
        ↓
GuestLayout activated
```

---

## 📱 Responsive Behavior

| Device | Header Layout | Search | Bottom Nav |
|--------|---------------|--------|-----------|
| Desktop | Logo \| Search \| Account \| Cart \| Help | Full width | Hidden (Guests) |
| Mobile | Logo \| Menu | Below (if space) | Hidden (Guests) |
| Tablet | Logo \| Search \| Account \| Cart \| Help | Full width | Hidden (Guests) |

---

## 🧪 Common Test Cases

### Test: Guest Browsing
```
1. Open site (no login)
2. Should see GuestLayout
3. Search should work
4. Browse categories should work
```

### Test: Guest Account Dropdown
```
1. Click Account icon
2. See: Sign In | Sign Up | My Account | Track Order | Cancel Order
3. Click any option
4. Should redirect to Base44 auth page
```

### Test: Protected Route (Guest)
```
1. Try to access /Checkout (without login)
2. Should redirect to login page
3. No checkout form should appear
```

### Test: Protected Route (Authenticated)
```
1. Login first
2. Access /Checkout
3. Should show checkout form
```

### Test: Logout
```
1. Login
2. See AuthenticatedLayout
3. Click Logout
4. Should redirect to guest homepage
5. Should see GuestLayout
```

---

## 🐛 Debugging Tips

### Check Auth State
```javascript
// In browser console
localStorage.getItem('fmm_guest_cart') // Should be null or array
```

### Check Layout Rendering
```javascript
// DevTools → Elements → Look for GuestLayout or Layout wrapper
```

### Check Route Protection
```javascript
// Try accessing protected route
// Should redirect to /Login if guest
```

### Check localStorage
```javascript
// In browser DevTools
Application → Local Storage → Look for 'fmm_guest_cart'
```

---

## ⚙️ Configuration

### Guest Cart Storage Key
```javascript
// In src/lib/guest-cart.js
const GUEST_CART_KEY = 'fmm_guest_cart';
// Change this if you want different key
```

### Protected Routes List
```javascript
// In src/App.jsx
const PROTECTED_ROUTES = new Set([
  // Add/remove routes here
]);
```

### Guest Layout Colors
```javascript
// In src/components/layouts/GuestLayout.jsx
const ASH = '#2E86C1'; // Primary color
const ASH_HOVER = '#2578ae'; // Hover color
```

---

## 📚 Full Documentation

For detailed information, see:
- `docs/GUEST_MODE_IMPLEMENTATION.md` - Complete guide
- `docs/GUEST_MODE_SUMMARY.md` - Implementation summary

---

## ✅ Checklist for Adding New Pages

When adding a new page:

1. **If public** (everyone can access):
   ```jsx
   <Route
     path="/NewPage"
     element={
       <LayoutWrapper currentPageName="NewPage" isAuthenticated={isAuthenticated}>
         <NewPage />
       </LayoutWrapper>
     }
   />
   ```

2. **If protected** (auth required):
   ```jsx
   // Add to PROTECTED_ROUTES
   const PROTECTED_ROUTES = new Set([
     // ... existing routes
     'NewPage' // Add here
   ]);
   
   <Route
     path="/NewPage"
     element={
       <ProtectedLayout 
         currentPageName="NewPage" 
         isAuthenticated={isAuthenticated} 
         navigateToLogin={navigateToLogin}
       >
         <NewPage />
       </ProtectedLayout>
     }
   />
   ```

---

## 💡 Pro Tips

1. **Use `isAuthenticated`** to show/hide content in components
2. **Use `guestCart`** for any guest cart operations
3. **Protect routes** by adding to `PROTECTED_ROUTES`
4. **Test on mobile** - Guest layout optimized for all sizes
5. **Clear console** - Some guest features might log in dev mode

---

## 🎉 You're Ready!

Guest Mode is fully implemented and documented. Start testing! 🚀
