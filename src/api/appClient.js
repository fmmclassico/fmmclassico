import { supabase } from '@/lib/supabase';
import { getSupabaseConfig, getSupabaseFunctionUrl } from '@/lib/runtime-config';
import { normalizeTextDeep } from '@/lib/text';
import { prepareUploadFile } from '@/lib/uploadOptimizer';

const PROMO_BANNER_RESPONSIVE_FIELDS = ['desktop_image_url', 'mobile_image_url'];
const PRODUCT_ARRAY_FIELDS = ['image_urls', 'available_colors', 'available_wattage', 'available_types'];
const PRODUCT_BOOLEAN_FIELDS = [
  'is_visible',
  'featured',
  'flash_sale',
  'donkomi',
  'new_arrival',
  'top_selling',
  'review_enabled',
  'show_colors',
  'show_wattage',
  'show_type',
];

function getErrorMessage(error) {
  return [
    error?.message,
    error?.details,
    error?.hint,
    error?.error_description,
  ]
    .filter(Boolean)
    .join(' ');
}

function isMissingColumnError(error, fields = []) {
  const message = getErrorMessage(error).toLowerCase();
  return fields.some((field) => message.includes(field.toLowerCase()));
}

function stripFields(record = {}, fields = []) {
  const clone = { ...record };
  fields.forEach((field) => {
    delete clone[field];
  });
  return clone;
}

function uniqueStrings(values = []) {
  return [...new Set(
    values
      .map((value) => (typeof value === 'string' ? value.trim() : String(value || '').trim()))
      .filter(Boolean)
  )];
}

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed);
      }
    } catch (_) {
      // fall through
    }

    const normalized = trimmed
      .split(String.fromCharCode(13)).join('')
      .split(String.fromCharCode(10)).join(',');

    if (normalized.includes(',')) {
      return uniqueStrings(normalized.split(','));
    }

    return [trimmed];
  }

  return [];
}

function parseBooleanValue(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeUrlValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

const ADMIN_ACCESS_SETTING_KEY = 'admin_access_controls';
const ADMIN_VERIFICATION_STORAGE_KEY = 'fmmclassico_admin_verified';
const ADMIN_CONFIG_CACHE_TTL_MS = 60 * 1000;
let adminAccessConfigCache = { value: null, expiresAt: 0 };

function normalizeProductRecord(record = {}) {
  const product = normalizeTextDeep({ ...record });

  product.image_url = normalizeUrlValue(product.image_url);
  product.image_urls = parseArrayValue(product.image_urls);
  product.video_url = normalizeUrlValue(product.video_url);

  PRODUCT_ARRAY_FIELDS.slice(1).forEach((field) => {
    product[field] = parseArrayValue(product[field]);
  });

  PRODUCT_BOOLEAN_FIELDS.forEach((field) => {
    const defaultValue = field === 'is_visible' || field === 'review_enabled';
    product[field] = parseBooleanValue(product[field], defaultValue);
  });

  product.price = parseNullableNumber(product.price) ?? 0;
  product.original_price = parseNullableNumber(product.original_price);
  product.stock = parseNullableNumber(product.stock);
  product.rating = parseNullableNumber(product.rating);
  product.reviews_count = parseNullableNumber(product.reviews_count);

  const combinedImages = uniqueStrings([
    product.image_url,
    ...product.image_urls,
  ].filter(Boolean));

  product.image_url = combinedImages[0] || null;
  product.image_urls = combinedImages.slice(1);

  return product;
}

function normalizeRecord(tableName, record) {
  if (!record || typeof record !== 'object') return record;
  if (tableName === 'products') return normalizeProductRecord(record);
  return normalizeTextDeep(record);
}

function normalizeRecords(tableName, records) {
  return Array.isArray(records) ? records.map((record) => normalizeRecord(tableName, record)) : [];
}

function getAdminEmailList() {
  return uniqueStrings([
    ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(','),
    ...(import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '').split(','),
    import.meta.env.VITE_MASTER_ADMIN_EMAIL || '',
  ]).map((email) => email.toLowerCase());
}

function getUserMetadata(user) {
  if (!user || typeof user !== 'object') return {};
  return user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
}

function parseAdminAccessControls(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  return {};
}

function getStoredAdminVerification() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = sessionStorage.getItem(ADMIN_VERIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (_) {
    return {};
  }
}

function setStoredAdminVerification(state = {}) {
  if (typeof window === 'undefined') return;

  try {
    if (!state || Object.keys(state).length === 0) {
      sessionStorage.removeItem(ADMIN_VERIFICATION_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(ADMIN_VERIFICATION_STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // ignore storage failures
  }
}

function clearStoredAdminVerification(email) {
  const current = getStoredAdminVerification();
  if (!email) {
    setStoredAdminVerification({});
    return;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !current[normalizedEmail]) return;

  const nextState = { ...current };
  delete nextState[normalizedEmail];
  setStoredAdminVerification(nextState);
}

function markAdminVerified(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const current = getStoredAdminVerification();
  setStoredAdminVerification({
    ...current,
    [normalizedEmail]: true,
  });
}

async function loadAdminAccessConfig(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && adminAccessConfigCache.value && adminAccessConfigCache.expiresAt > now) {
    return adminAccessConfigCache.value;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', ADMIN_ACCESS_SETTING_KEY)
      .limit(1);

    if (error) throw error;

    const controls = parseAdminAccessControls(data?.[0]?.value);
    adminAccessConfigCache = {
      value: controls,
      expiresAt: now + ADMIN_CONFIG_CACHE_TTL_MS,
    };
    return controls;
  } catch (error) {
    console.error('load admin access config:', error);
    adminAccessConfigCache = {
      value: {},
      expiresAt: now + ADMIN_CONFIG_CACHE_TTL_MS,
    };
    return {};
  }
}

async function getAdminPasswordValue() {
  const { data, error } = await supabase
    .from('admin_passwords')
    .select('password_hash')
    .order('last_changed', { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    const message = getErrorMessage(error).toLowerCase();
    if (!message.includes('last_changed')) {
      throw error;
    }

    const fallbackResult = await supabase
      .from('admin_passwords')
      .select('password_hash')
      .limit(1);

    if (fallbackResult.error) throw fallbackResult.error;
    return fallbackResult.data?.[0]?.password_hash || import.meta.env.VITE_ADMIN_PASSWORD || '';
  }

  return data?.[0]?.password_hash || import.meta.env.VITE_ADMIN_PASSWORD || '';
}

async function buildAuthUser(user) {
  if (!user) return null;

  const adminList = getAdminEmailList();
  const metadata = getUserMetadata(user);
  const email = String(user.email || '').trim().toLowerCase();
  const isConfiguredAdmin = adminList.includes(email);
  const controls = isConfiguredAdmin ? await loadAdminAccessConfig() : {};
  const emailControl = controls[email];
  const isMasterAdmin = email === String(import.meta.env.VITE_MASTER_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminEnabled = isConfiguredAdmin && (isMasterAdmin || emailControl?.enabled !== false);
  const adminVerified = isMasterAdmin || !!getStoredAdminVerification()[email];

  return {
    id: user.id,
    email: user.email || '',
    role: adminEnabled ? 'admin' : 'user',
    isAdmin: adminEnabled,
    admin_requires_verification: adminEnabled && !adminVerified,
    full_name: metadata.full_name || '',
    phone: metadata.phone || '',
    address: metadata.address || '',
    city: metadata.city || '',
    notifications_enabled: parseBooleanValue(metadata.notifications_enabled, true),
    newsletter_enabled: parseBooleanValue(metadata.newsletter_enabled, true),
  };
}

async function executeQueryWithOrderFallback(createQuery, orderBy) {
  let result = await createQuery(true);

  if (result.error && orderBy) {
    const column = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
    if (isMissingColumnError(result.error, [column])) {
      result = await createQuery(false);
    }
  }

  return result;
}

function getRetryableMissingFields(error, payload = {}) {
  const message = getErrorMessage(error).toLowerCase();
  return Object.keys(payload).filter((field) => message.includes(field.toLowerCase()));
}

async function runWriteWithLegacyFallback(tableName, writeFn, payload) {
  let currentPayload = { ...payload };
  const removedFields = new Set();

  while (true) {
    try {
      return await writeFn(currentPayload);
    } catch (error) {
      if (
        tableName === 'promo_banners'
        && isMissingColumnError(error, PROMO_BANNER_RESPONSIVE_FIELDS)
      ) {
        const retryFields = PROMO_BANNER_RESPONSIVE_FIELDS.filter((field) => field in currentPayload && !removedFields.has(field));
        if (retryFields.length === 0) throw error;
        retryFields.forEach((field) => removedFields.add(field));
        currentPayload = stripFields(currentPayload, retryFields);
        continue;
      }

      const missingFields = getRetryableMissingFields(error, currentPayload)
        .filter((field) => !removedFields.has(field));
      if (missingFields.length > 0) {
        missingFields.forEach((field) => removedFields.add(field));
        currentPayload = stripFields(currentPayload, missingFields);
        continue;
      }

      throw error;
    }
  }
}

function withOrdering(query, orderBy) {
  if (!orderBy) return query;
  const desc = orderBy.startsWith('-');
  const column = desc ? orderBy.slice(1) : orderBy;
  return query.order(column, { ascending: !desc });
}

function withFilters(query, filters) {
  if (!filters || typeof filters !== 'object') return query;

  return Object.entries(filters).reduce((builder, [key, value]) => {
    if (Array.isArray(value)) {
      return builder.in(key, value);
    }
    if (value === null) {
      return builder.is(key, null);
    }
    return builder.eq(key, value);
  }, query);
}

function normalizeWritePayload(tableName, payload) {
  const normalizedPayload = normalizeTextDeep(payload);
  if (tableName === 'products') {
    return normalizeProductRecord(normalizedPayload);
  }
  return normalizedPayload;
}

function createEntity(tableName) {
  return {
    async list(orderBy, limit) {
      const createQuery = async (includeOrder) => {
        let query = supabase.from(tableName).select('*');
        if (includeOrder) {
          query = withOrdering(query, orderBy);
        }
        if (limit) query = query.limit(limit);
        return query;
      };

      const { data, error } = await executeQueryWithOrderFallback(createQuery, orderBy);
      if (error) {
        console.error('list ' + tableName + ':', error);
        return [];
      }
      return normalizeRecords(tableName, data || []);
    },

    async filter(filters, orderBy, limit) {
      const createQuery = async (includeOrder) => {
        let query = supabase.from(tableName).select('*');
        query = withFilters(query, filters);
        if (includeOrder) {
          query = withOrdering(query, orderBy);
        }
        if (limit) query = query.limit(limit);
        return query;
      };

      const { data, error } = await executeQueryWithOrderFallback(createQuery, orderBy);
      if (error) {
        console.error('filter ' + tableName + ':', error);
        return [];
      }
      return normalizeRecords(tableName, data || []);
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) {
        console.error('get ' + tableName + ':', error);
        return null;
      }
      return normalizeRecord(tableName, data);
    },

    async create(record) {
      try {
        const payload = normalizeWritePayload(tableName, record);
        const data = await runWriteWithLegacyFallback(
          tableName,
          async (finalPayload) => {
            const { data, error } = await supabase.from(tableName).insert(finalPayload).select().single();
            if (error) throw error;
            return data;
          },
          payload
        );
        return normalizeRecord(tableName, data);
      } catch (error) {
        console.error('create ' + tableName + ':', error);
        throw error;
      }
    },

    async update(id, updates) {
      try {
        const payload = normalizeWritePayload(tableName, updates);
        const data = await runWriteWithLegacyFallback(
          tableName,
          async (finalPayload) => {
            const { data, error } = await supabase.from(tableName).update(finalPayload).eq('id', id).select().single();
            if (error) throw error;
            return data;
          },
          payload
        );
        return normalizeRecord(tableName, data);
      } catch (error) {
        console.error('update ' + tableName + ':', error);
        throw error;
      }
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) {
        console.error('delete ' + tableName + ':', error);
        throw error;
      }
    },

    subscribe(callback) {
      const channel = supabase.channel(tableName + '-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          callback({ type: payload.eventType, data: normalizeRecord(tableName, payload.new || payload.old) });
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  };
}

const TABLE_MAP = {
  Product: 'products',
  CartItem: 'cart_items',
  AppSetting: 'app_settings',
  Notification: 'notifications',
  PromoBanner: 'promo_banners',
  Order: 'orders',
  Feedback: 'feedbacks',
  Review: 'reviews',
  ChatMessage: 'chat_messages',
};

const entitiesProxy = new Proxy({}, {
  get(target, prop) {
    if (typeof prop !== 'string') {
      return target[prop];
    }

    const tableName = TABLE_MAP[prop] || toTableName(prop);
    if (!target[prop]) {
      target[prop] = createEntity(tableName);
    }
    return target[prop];
  }
});

function toTableName(name) {
  return String(name)
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/([^s])$/, '$1s');
}

const auth = {
  async me(options = {}) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('auth me:', error);
      return null;
    }

    if (options?.forceAdminRefresh) {
      await loadAdminAccessConfig(true);
    }

    return buildAuthUser(user);
  },

  async isAuthenticated() {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  },

  async updateMe(updates = {}) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('You must be logged in to update your account.');

    const currentMetadata = getUserMetadata(user);
    const nextMetadata = {
      ...currentMetadata,
      full_name: typeof updates.full_name === 'string' ? updates.full_name.trim() : (currentMetadata.full_name || ''),
      phone: typeof updates.phone === 'string' ? updates.phone.trim() : (currentMetadata.phone || ''),
      address: typeof updates.address === 'string' ? updates.address.trim() : (currentMetadata.address || ''),
      city: typeof updates.city === 'string' ? updates.city.trim() : (currentMetadata.city || ''),
      notifications_enabled: parseBooleanValue(updates.notifications_enabled, parseBooleanValue(currentMetadata.notifications_enabled, true)),
      newsletter_enabled: parseBooleanValue(updates.newsletter_enabled, parseBooleanValue(currentMetadata.newsletter_enabled, true)),
    };

    const { data, error } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    if (error) throw error;
    return buildAuthUser(data.user);
  },

  async deleteMe() {
    throw new Error('Self-service account deletion is not configured yet. Add a secure server-side function with service-role permissions before enabling this action.');
  },

  loginWithProvider(provider, returnUrl) {
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + (returnUrl || '/') } });
  },

  redirectToLogin(returnUrl) {
    try {
      sessionStorage.setItem('redirectAfterLogin', returnUrl || '/');
    } catch (e) {
      // ignore
    }
    window.location.href = '/login';
  },

  async verifyAdminAccess(password) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return { success: false, error: 'Please sign in again before verifying admin access.' };
    }

    const authUser = await buildAuthUser(user);
    if (!authUser?.isAdmin) {
      clearStoredAdminVerification(user.email);
      return { success: false, error: 'This email no longer has admin access.' };
    }

    const expectedPassword = await getAdminPasswordValue();
    if (!expectedPassword) {
      return { success: false, error: 'Admin password is not configured yet.' };
    }

    if (String(password || '') !== String(expectedPassword)) {
      return { success: false, error: 'Invalid password.' };
    }

    markAdminVerified(user.email);
    return { success: true };
  },

  clearAdminVerification(email) {
    clearStoredAdminVerification(email);
  }
};

const appLogs = {
  logUserInApp() { return Promise.resolve(); }
};

const { anonKey: SUPABASE_ANON_KEY } = getSupabaseConfig();

const integrations = {
  Core: {
    async UploadFile({ file, maxBytes, maxDimension } = {}) {
      const preparedFile = await prepareUploadFile(file, { maxBytes, maxDimension });
      const safeName = (preparedFile?.name || file?.name || 'upload')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage.from('uploads').upload(fileName, preparedFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      return { file_url: publicUrl };
    },

    async SendEmail({ to, from_name, subject, body }) {
      try {
        const response = await fetch(getSupabaseFunctionUrl('send-email'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            to,
            from_name: from_name || 'FMM CLASSICO',
            subject,
            body,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          console.error('[SendEmail] Failed:', result);
          return { success: false, error: result.error };
        }
        console.log('[SendEmail] Sent to:', to);
        return { success: true };
      } catch (error) {
        console.error('[SendEmail] Error:', error);
        return { success: false, error: error.message };
      }
    }
,

    async SendSMS({ to, message }) {
      try {
        const response = await fetch(getSupabaseFunctionUrl('send-sms'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ to, message }),
        });
        const result = await response.json();
        if (!response.ok) {
          console.error('[SendSMS] Failed:', result);
          return { success: false, error: result.error || result.message || 'SMS failed' };
        }
        return { success: true, data: result };
      } catch (error) {
        console.error('[SendSMS] Error:', error);
        return { success: false, error: error.message };
      }
    }
  }
};

export const appClient = { entities: entitiesProxy, auth, appLogs, integrations };

export function redirectLoginWithProvider(provider, returnUrl) {
  if (typeof window === 'undefined') return;
  return auth.loginWithProvider(provider || 'google', returnUrl || '/');
}
