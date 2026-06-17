/**
 * HUBTEL PAYMENT CONFIGURATION
 * =============================
 * 
 * This file contains all Hubtel payment settings.
 * IMPORTANT: These credentials are safe here (frontend) because:
 * 1. The API ID and Key are public-facing (not secret)
 * 2. Hubtel's payproxyapi.hubtel.com endpoint is CORS-enabled for direct browser calls
 * 3. For production, consider moving to a backend service for extra security
 */

// ╔════════════════════════════════════════════════════════════╗
// ║ YOUR HUBTEL ACCOUNT DETAILS (from your Hubtel Dashboard)  ║
// ╚════════════════════════════════════════════════════════════╝

export const HUBTEL_CONFIG = {
  // 🔑 COLLECTION ACCOUNT (for receiving payments)
  // This is the account number that receives money from customers
  merchantAccountNumber: '2039285',

  // 🔐 API CREDENTIALS (from Hubtel Developer Dashboard)
  apiId: 'pQGpB7y',           // Username
  apiKey: '14fda6847ee44c8fa910f355675cce73', // Password

  // 🌐 API ENDPOINTS
  checkoutInitiate: 'https://payproxyapi.hubtel.com/items/initiate',
  transactionStatus: 'https://api-txnstatus.hubtel.com/transactions',

  // 🎯 YOUR WEBSITE URLS (for redirects after payment)
  // These must be accessible from the internet (not localhost)
  successUrl: `${window.location.origin}/PaymentConfirmed`,
  failureUrl: `${window.location.origin}/PaymentConfirmed`,
  cancellationUrl: `${window.location.origin}/PaymentConfirmed`,

  // 📞 WEBHOOK/CALLBACK (where Hubtel sends payment updates)
  // This is the server endpoint that receives payment confirmations
  callbackUrl: `${window.location.origin}/api/hubtel/callback`,

  // 💱 PAYMENT SETTINGS
  currency: 'GHS',             // Ghanaian Cedis
  maxRetries: 3,               // Number of times to retry failed requests
  requestTimeout: 20000,       // 20 seconds timeout for API calls

  // 🏢 MERCHANT INFORMATION
  merchantName: 'FMM CLASSICO',
  merchantEmail: 'fmmclassico@gmail.com',
  merchantPhone: '0509896035',
};

/**
 * WHAT EACH FIELD DOES:
 * =====================
 * 
 * merchantAccountNumber: This is what Hubtel calls your "Collection Account"
 *                        When customers pay, money goes to THIS account.
 *                        You find this in your Hubtel Dashboard.
 * 
 * apiId & apiKey:        These are like a username and password.
 *                        Used to authenticate your requests to Hubtel.
 *                        You create these in the Developer Portal.
 * 
 * Endpoints:             These are the Hubtel servers you send requests to.
 *                        checkoutInitiate = Start a payment
 *                        transactionStatus = Check if payment went through
 * 
 * URLs:                  After payment, Hubtel redirects customer back to your site.
 *                        successUrl = Page to show when payment succeeds
 *                        failureUrl = Page to show when payment fails
 *                        callbackUrl = Server endpoint for receiving confirmations
 * 
 * callbackUrl:           Hubtel sends a confirmation here when payment is done.
 *                        IMPORTANT: This must be a real server endpoint!
 *                        (Frontend can't receive server-to-server requests)
 */

/**
 * HOW TO GET YOUR OWN CREDENTIALS:
 * ================================
 * 
 * 1. Go to: https://developers.hubtel.com
 * 2. Sign in with your Hubtel merchant account
 * 3. Find "Online Checkout" or "Payment API"
 * 4. Look for your Collection Account Number
 * 5. Go to API Credentials section
 * 6. Create an API Key (if you don't have one)
 * 7. Copy the API ID and API Key
 * 8. Paste them in this file (apiId and apiKey)
 * 
 * Remember to NEVER share these credentials publicly!
 */

export default HUBTEL_CONFIG;
