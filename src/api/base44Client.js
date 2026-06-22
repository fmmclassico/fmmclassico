import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  // Ensure SDK knows the correct server/app base URL. If `appBaseUrl` is
  // provided it will be used; otherwise the SDK will use a sensible default.
  serverUrl: appBaseUrl,
  requiresAuth: false,
  appBaseUrl
});

// Redirect-based provider login helper using Base44 SDK's built-in flow.
// This keeps provider login behavior aligned with the SDK and removes custom
// URL construction from the app code.
export function redirectLoginWithProvider(provider = "google", returnUrl = "/") {
  if (typeof window === "undefined") return;
  return base44.auth.loginWithProvider(provider, returnUrl);
}
