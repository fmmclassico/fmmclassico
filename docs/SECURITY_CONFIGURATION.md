# 🔒 Security Configuration Guide - FMM CLASSICO

## CRITICAL SECURITY FIXES APPLIED

This document outlines the security vulnerabilities that were fixed and how to properly configure your environment variables.

---

## ⚠️ Vulnerabilities Fixed

### 1. **Hardcoded API Credentials (FIXED)**
- **Status**: ✅ RESOLVED
- **Previous Issue**: Hubtel API credentials were hardcoded in source files
- **Fix Applied**: Moved to environment variables (VITE_HUBTEL_*)
- **Files Updated**:
  - `src/config/hubtel.config.js` - Now reads from env vars
  - `src/pages/Payment.jsx` - Now reads from env vars

### 2. **Hardcoded Admin Password (FIXED)**
- **Status**: ✅ RESOLVED
- **Previous Issue**: Admin password `<YOUR_ADMIN_PASSWORD>` was referenced in `AdminAuthModal.jsx`
- **Fix Applied**: Moved to environment variable `VITE_ADMIN_PASSWORD`
- **File Updated**: `src/components/AdminAuthModal.jsx`

### 3. **Exposed Credentials in Documentation (FIXED)**
- **Status**: ✅ RESOLVED
- **Previous Issue**: Credentials were exposed in multiple markdown files
- **Fix Applied**: Redacted from documentation, replaced with references to `.env`
- **Files Updated**:
  - `docs/README.md`
  - `docs/HUBTEL_IMPLEMENTATION_SUMMARY.md`
  - Other docs scrubbed of credentials

---

## 🔧 Setup Instructions

### Step 1: Create Your `.env` File

Create a new file in the project root: `.env`

```bash
# From /workspaces/fmm-classico/
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit `.env` and add your actual credentials:

```env
# HUBTEL PAYMENT GATEWAY
VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER=YOUR_MERCHANT_ACCOUNT_NUMBER
VITE_HUBTEL_API_ID=YOUR_API_ID
VITE_HUBTEL_API_KEY=YOUR_API_KEY
VITE_HUBTEL_MERCHANT_EMAIL=your-email@example.com
VITE_HUBTEL_MERCHANT_PHONE=<YOUR_HUBTEL_MERCHANT_PHONE>

# ADMIN AUTHENTICATION
VITE_ADMIN_PASSWORD=YOUR_SECURE_PASSWORD_HERE
```

### Step 3: Never Commit `.env`

Verify `.env` is in `.gitignore`:

```bash
cat .gitignore | grep ".env"
# Should show: .env
```

### Step 4: Restart Development Server

The changes take effect after restarting:

```bash
npm run dev  # or yarn dev
```

---

## 📋 How Credentials Are Used

### Frontend (Vite + React)

Vite automatically exposes environment variables prefixed with `VITE_`:

```javascript
// In any component/config file
const apiKey = import.meta.env.VITE_HUBTEL_API_KEY;

// This is equivalent to:
// process.env.VITE_HUBTEL_API_KEY (in Node.js)
```

**These values are baked into the frontend bundle during build time.**

### Files Using Credentials

1. **`src/config/hubtel.config.js`**
   ```javascript
   const API_ID = import.meta.env.VITE_HUBTEL_API_ID;
   const API_KEY = import.meta.env.VITE_HUBTEL_API_KEY;
   const MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER;
   ```

2. **`src/pages/Payment.jsx`**
   ```javascript
   const HUBTEL_COLLECTION_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER;
   ```

3. **`src/components/AdminAuthModal.jsx`**
   ```javascript
   const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
   ```

---

## ⚠️ Important Security Notes

### Frontend Limitations

**These credentials are NOT truly "secret" because:**
1. They exist in the frontend code
2. Anyone inspecting the browser DevTools can see them
3. They're visible in the built JavaScript bundle

### Recommendations

1. **For Hubtel Credentials:**
   - If possible, handle all payment API calls through a backend server
   - The frontend should only send payment initiation requests, backend handles verification
   - This prevents credential exposure

2. **For Admin Password:**
   - This should ideally be verified on a backend API, not in frontend code
   - Consider implementing OAuth or session-based authentication
   - Never share admin credentials with anyone

3. **For Production:**
   - Use a proper secrets management system (e.g., AWS Secrets Manager, HashiCorp Vault)
   - Rotate credentials regularly
   - Monitor for unauthorized access attempts
   - Use a reverse proxy/API gateway to protect payment endpoints

---

## 🔐 Securing for Production

### Step 1: Use Environment-Specific Configs

Create separate files for different environments:

```
.env                    # Local development (ignored by git)
.env.example           # Template for other developers
.env.production        # Production secrets (managed by hosting provider)
.env.staging           # Staging secrets
```

### Step 2: Use Hosting Provider's Secret Management

**Vercel (recommended for React apps):**
- Dashboard → Project → Settings → Environment Variables
- Add your secrets there, they're encrypted and managed by Vercel

**Netlify:**
- Site Settings → Build & Deploy → Environment
- Add secrets, never commit them locally

**Docker/Self-hosted:**
- Use `--env-file` flag or Docker secrets
- Never commit `.env` to version control

### Step 3: Rotate Credentials

Regularly rotate your:
- Hubtel API Keys
- Admin passwords
- Any other sensitive credentials

Steps to rotate Hubtel keys:
1. Generate new API key in Hubtel Dashboard
2. Update `.env` with new key
3. Test on staging
4. Deploy to production
5. Remove old key from Hubtel Dashboard

---

## ✅ Security Checklist

- [ ] `.env` file created with your credentials
- [ ] `.env` is in `.gitignore` (verified)
- [ ] No hardcoded credentials in source code
- [ ] Development server restarted
- [ ] Credentials are working (tested payment flow)
- [ ] No credentials in git history (check with `git log -p` if needed)
- [ ] `.env.example` has placeholder values (safe to share)
- [ ] Admin password is strong and unique
- [ ] Hubtel credentials are from production account

---

## 🐛 Troubleshooting

### Issue: "Cannot read property 'VITE_HUBTEL_API_KEY' of undefined"

**Solution:**
1. Make sure `.env` file exists in project root
2. Verify variables are prefixed with `VITE_`
3. Restart dev server: `npm run dev`
4. Check `.env` has no spaces around `=`: `KEY=value` ✅ not `KEY = value` ❌

### Issue: Payment Form Shows Errors

**Solution:**
1. Open DevTools Console (F12)
2. Check for errors
3. Verify credentials in `.env` are correct
4. Ensure `.env` was reloaded (restart dev server)

### Issue: Admin Login Not Working

**Solution:**
1. Check `VITE_ADMIN_PASSWORD` in `.env`
2. Ensure password matches exactly (case-sensitive)
3. Clear browser cache/localStorage
4. Restart dev server

---

## 📚 Related Documentation

- `GUEST_MODE_IMPLEMENTATION.md` - Guest mode features
- `README.md` - General project setup
- [Hubtel Documentation](https://hubtelghana.com/developers)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## 🎯 Quick Reference

**File Locations:**
```
/workspaces/fmm-classico/
├── .env                          # ← Your credentials (DO NOT COMMIT)
├── .env.example                  # ← Template (safe to share)
├── src/config/hubtel.config.js   # Uses env vars
├── src/pages/Payment.jsx         # Uses env vars
└── src/components/AdminAuthModal.jsx # Uses env vars
```

**Check if Setup is Correct:**
```bash
# From project root
ls -la .env              # Should exist
grep "VITE_" .env       # Should show your variables
npm run dev             # Should start without errors
```

---

## ✨ Summary

All sensitive credentials have been:
- ✅ Removed from source code
- ✅ Removed from documentation
- ✅ Moved to environment variables
- ✅ Protected by `.gitignore`
- ✅ No authentication affected

**Next Step:** Create your `.env` file with your actual credentials and restart the dev server.

---

**Last Updated:** 2026-06-17  
**Security Status:** 🟢 FIXED - All credentials now environment-based
