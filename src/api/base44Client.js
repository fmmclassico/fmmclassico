import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { supabase } from '@/lib/supabase';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: appBaseUrl,
  requiresAuth: false,
  appBaseUrl
});

// Patch auth.me() to use Supabase session + env admin emails
base44.auth.me = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
  const adminList = envAdminEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = adminList.includes(user.email?.toLowerCase());
  return { email: user.email, role: isAdmin ? 'admin' : 'user', id: user.id, full_name: user.user_metadata?.full_name || '' };
};

base44.auth.isAuthenticated = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
};

export function redirectLoginWithProvider(provider = "google", returnUrl = "/") {
  if (typeof window === "undefined") return;
  return base44.auth.loginWithProvider(provider, returnUrl);
}
