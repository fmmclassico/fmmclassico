import { supabase } from '@/lib/supabase';

// Helper: convert entity name to table name (e.g. "Product" -> "products", "CartItem" -> "cart_items")
function toTableName(name) {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/([^s])$/, '$1s');
}

// Create a proxy entity that maps Base44 SDK calls to Supabase
function createEntity(tableName) {
  return {
    async list(orderBy, limit) {
      let query = supabase.from(tableName).select('*');
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const col = desc ? orderBy.slice(1) : orderBy;
        query = query.order(col, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) { console.error(`list ${tableName}:`, error); return []; }
      return data || [];
    },
    async filter(filters, orderBy, limit) {
      let query = supabase.from(tableName).select('*');
      if (filters && typeof filters === 'object') {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const col = desc ? orderBy.slice(1) : orderBy;
        query = query.order(col, { ascending: !desc });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) { console.error(`filter ${tableName}:`, error); return []; }
      return data || [];
    },
    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) { console.error(`get ${tableName}:`, error); return null; }
      return data;
    },
    async create(record) {
      const { data, error } = await supabase.from(tableName).insert(record).select().single();
      if (error) { console.error(`create ${tableName}:`, error); throw error; }
      return data;
    },
    async update(id, updates) {
      const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select().single();
      if (error) { console.error(`update ${tableName}:`, error); throw error; }
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) { console.error(`delete ${tableName}:`, error); throw error; }
    },
    subscribe(callback) {
      const channel = supabase.channel(`${tableName}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          callback({ type: payload.eventType, data: payload.new || payload.old });
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  };
}

// Entity name mapping (Base44 name -> Supabase table)
const TABLE_MAP = {
  Product: 'products',
  CartItem: 'cart_items',
  AppSetting: 'app_settings',
  Notification: 'notifications',
  PromoBanner: 'promo_banners',
  Order: 'orders',
};

// Auto-proxy: any entity access creates a Supabase-backed entity
const entitiesProxy = new Proxy({}, {
  get(target, prop) {
    const tableName = TABLE_MAP[prop] || toTableName(prop);
    if (!target[prop]) {
      target[prop] = createEntity(tableName);
    }
    return target[prop];
  }
});

// Auth uses Supabase
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
    const adminList = envAdminEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    const isAdmin = adminList.includes(user.email?.toLowerCase());
    return { email: user.email, role: isAdmin ? 'admin' : 'user', id: user.id, full_name: user.user_metadata?.full_name || '' };
  },
  async isAuthenticated() {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  },
  loginWithProvider(provider, returnUrl) {
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + (returnUrl || '/') } });
  }
};

// App logs (no-op, not needed on Supabase)
const appLogs = {
  logUserInApp() { return Promise.resolve(); }
};

// Integrations placeholder
const integrations = {
  Core: {
    async UploadFile({ file }) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      return { file_url: publicUrl };
    },
    async SendEmail({ to, subject, body }) {
      console.log('SendEmail placeholder:', { to, subject, body });
      return { success: true };
    }
  }
};

export const base44 = { entities: entitiesProxy, auth, appLogs, integrations };

export function redirectLoginWithProvider(provider = "google", returnUrl = "/") {
  if (typeof window === "undefined") return;
  return auth.loginWithProvider(provider, returnUrl);
}
