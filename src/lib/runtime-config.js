function readEnv(name) {
  const value = import.meta.env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

function trimTrailingSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

function trimLeadingSlash(value = '') {
  return String(value || '').replace(/^\/+/, '');
}

function joinUrl(base, path) {
  const normalizedBase = trimTrailingSlash(base);
  const normalizedPath = trimLeadingSlash(path);
  if (!normalizedBase) return `/${normalizedPath}`;
  return `${normalizedBase}/${normalizedPath}`;
}

export function getSupabaseConfig() {
  const url = trimTrailingSlash(readEnv('VITE_SUPABASE_URL'));
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  return { url, anonKey };
}

export function getSupabaseFunctionUrl(functionName = '') {
  const { url } = getSupabaseConfig();
  return joinUrl(url, `functions/v1/${trimLeadingSlash(functionName)}`);
}

export function getHubtelInitiateUrl() {
  return readEnv('VITE_HUBTEL_INITIATE_FUNCTION_URL') || getSupabaseFunctionUrl('hubtel-initiate');
}

export function getHubtelStatusUrl() {
  return readEnv('VITE_HUBTEL_STATUS_FUNCTION_URL') || getSupabaseFunctionUrl('hubtel-status');
}

export function getHubtelCallbackUrl() {
  return readEnv('VITE_HUBTEL_CALLBACK_URL') || getSupabaseFunctionUrl('hubtel-callback');
}

export function getHubtelReconcileReturnUrl() {
  return readEnv('VITE_HUBTEL_RECONCILE_RETURN_URL') || getSupabaseFunctionUrl('hubtel-reconcile-return');
}
