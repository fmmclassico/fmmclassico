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

// Redirect-based provider login helper. Uses the same endpoints the SDK
// would call but forces a full-page redirect which avoids popup/cookie
// issues that can cause "session expired" during provider sign-in.
export function redirectLoginWithProvider(provider = "google", returnUrl = "/") {
  if (typeof window === "undefined") return;
  const appIdParam = `app_id=${appId}`;
  const fromUrl = encodeURIComponent(new URL(returnUrl, window.location.origin).toString());
  const query = `${appIdParam}&from_url=${fromUrl}`;
  // SDK uses a special path for google (no provider segment) and for sso.
  const path = provider === "sso"
    ? `/apps/${appId}/auth/sso/login`
    : `/apps/auth${provider === "google" ? "" : `/${provider}`}/login`;
  const url = `${appBaseUrl}/api${path}?${query}`;
  window.location.href = url;
}
