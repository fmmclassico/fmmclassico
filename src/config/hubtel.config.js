/**
 * HUBTEL PAYMENT CONFIGURATION
 * =============================
 * 
 * This file contains all Hubtel payment settings.
 * All sensitive credentials are loaded from environment variables (.env file)
 * 
 * To configure: Create a .env file with the following variables:
 * - VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER
 * - VITE_HUBTEL_API_ID
 * - VITE_HUBTEL_API_KEY
 * - VITE_HUBTEL_MERCHANT_EMAIL
 * - VITE_HUBTEL_MERCHANT_PHONE
 * 
 * See .env.example for the complete template
 */

// Load credentials from environment variables
// These are prefixed with VITE_ to be accessible in frontend code via import.meta.env
const MERCHANT_ACCOUNT = import.meta.env.VITE_HUBTEL_MERCHANT_ACCOUNT_NUMBER;
const API_ID = import.meta.env.VITE_HUBTEL_API_ID;
const API_KEY = import.meta.env.VITE_HUBTEL_API_KEY;
const MERCHANT_EMAIL = import.meta.env.VITE_HUBTEL_MERCHANT_EMAIL;
const MERCHANT_PHONE = import.meta.env.VITE_HUBTEL_MERCHANT_PHONE;

export const HUBTEL_CONFIG = {
  // 🔑 COLLECTION ACCOUNT (for receiving payments)
  // This is the account number that receives money from customers
  merchantAccountNumber: MERCHANT_ACCOUNT,

  // 🔐 API CREDENTIALS (from Hubtel Developer Dashboard)
  apiId: API_ID,           // Username
  apiKey: API_KEY,         // Password

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
  merchantEmail: MERCHANT_EMAIL,
  merchantPhone: MERCHANT_PHONE,
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
