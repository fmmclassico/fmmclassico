function readEnv(name) {
  const value = import.meta.env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

function trimTrailingSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

export function getAppBaseUrl() {
  return trimTrailingSlash(
    readEnv('VITE_APP_BASE_URL') || (typeof window !== 'undefined' ? window.location.origin : '')
  );
}

export function getSupabaseConfig() {
  const url = trimTrailingSlash(readEnv('VITE_SUPABASE_URL'));
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running the app.'
    );
  }

  return { url, anonKey };
}

export function getSupabaseFunctionUrl(functionName) {
  return `${getSupabaseConfig().url}/functions/v1/${String(functionName || '').replace(/^\/+/, '')}`;
}

export function getHubtelCallbackUrl() {
  return getSupabaseFunctionUrl('hubtel-callback');
}
