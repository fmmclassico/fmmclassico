import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: appBaseUrl,
  requiresAuth: false,
  appBaseUrl
});

// Patch auth.me() to return admin role based on Supabase session + env emails
const originalMe = base44.auth.me?.bind(base44.auth);
base44.auth.me = async () => {
  try {
    if (originalMe) {
      const user = await originalMe();
      if (user) {
        const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
        const adminList = envAdminEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        if (adminList.includes(user.email?.toLowerCase())) {
          user.role = 'admin';
        }
        return user;
      }
    }
  } catch (e) {}
  // Fallback: check Supabase session
  const { createClient: createSupaClient } = await import('@supabase/supabase-js');
  const supabase = createSupaClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
    const adminList = envAdminEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    const isAdmin = adminList.includes(user.email?.toLowerCase());
    return { email: user.email, role: isAdmin ? 'admin' : 'user', id: user.id };
  }
  return null;
};

base44.auth.isAuthenticated = async () => {
  const { createClient: createSupaClient } = await import('@supabase/supabase-js');
  const supabase = createSupaClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
};

// Redirect-based provider login helper using Base44 SDK's built-in flow.
// This keeps provider login behavior aligned with the SDK and removes custom
// URL construction from the app code.
export function redirectLoginWithProvider(provider = "google", returnUrl = "/") {
  if (typeof window === "undefined") return;
  return base44.auth.loginWithProvider(provider, returnUrl);
}
