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
  const normalizedBase = String(base || '');
  const normalizedPath = trimLeadingSlash(path);

  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }

  if (/^https?:\/\//i.test(normalizedBase)) {
    return `${trimTrailingSlash(normalizedBase)}/${normalizedPath}`;
  }

  return `${normalizedBase.replace(/\/+$/, '')}/${normalizedPath}`;
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

export function getHubtelFunctionsBaseUrl() {
  const configuredBase = trimTrailingSlash(readEnv('VITE_HUBTEL_FUNCTIONS_BASE_URL'));
  if (configuredBase) {
    return configuredBase;
  }

  if (typeof window !== 'undefined') {
    return '/api';
  }

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    throw new Error('Missing app base URL. Set VITE_APP_BASE_URL before building server-side Hubtel URLs.');
  }

  return `${appBaseUrl}/api`;
}

export function getHubtelCallbackBaseUrl() {
  const configuredBase = trimTrailingSlash(readEnv('VITE_HUBTEL_CALLBACK_BASE_URL'));
  if (configuredBase) {
    return configuredBase;
  }

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    throw new Error('Missing app base URL. Set VITE_APP_BASE_URL before creating the Hubtel callback URL.');
  }

  return appBaseUrl;
}

export function getHubtelInitiateUrl() {
  return joinUrl(getHubtelFunctionsBaseUrl(), 'hubtel/initiate');
}

export function getHubtelStatusUrl() {
  return joinUrl(getHubtelFunctionsBaseUrl(), 'hubtel/status');
}

export function getHubtelCallbackUrl() {
  return joinUrl(getHubtelCallbackBaseUrl(), 'api/hubtel/callback');
}
