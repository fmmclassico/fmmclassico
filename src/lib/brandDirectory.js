export const BRAND_DIRECTORY_KEY = 'brand_directory_v2';
export const LEGACY_CUSTOM_BRANDS_KEY = 'custom_brands_list';
export const HOMEPAGE_SECTION_SETTINGS_KEY = 'homepage_section_settings_v2';

export const HOMEPAGE_SECTION_DEFAULTS = {
  brand_rail: 16,
  flash_sale: 16,
  donkomi: 16,
  new_arrivals: 16,
  top_selling: 16,
};

export const CATEGORY_GROUPS = {
  phones: ['phones'],
  phone_accessories: ['phone_cases', 'chargers', 'earphones', 'cables', 'power_banks', 'screen_protectors', 'holders', 'speakers'],
  electronics: ['electronic_appliances', 'smart_watches'],
  home_appliances: ['home_appliances'],
};

export function normalizeBrandKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function slugifyBrand(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseJsonSetting(settings = [], key, fallback) {
  const raw = settings.find((setting) => setting.key === key)?.value;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function ensurePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

export function getHomepageSectionSettings(settings = []) {
  const saved = parseJsonSetting(settings, HOMEPAGE_SECTION_SETTINGS_KEY, {});
  return {
    brand_rail: ensurePositiveInteger(saved.brand_rail, HOMEPAGE_SECTION_DEFAULTS.brand_rail),
    flash_sale: ensurePositiveInteger(saved.flash_sale, HOMEPAGE_SECTION_DEFAULTS.flash_sale),
    donkomi: ensurePositiveInteger(saved.donkomi, HOMEPAGE_SECTION_DEFAULTS.donkomi),
    new_arrivals: ensurePositiveInteger(saved.new_arrivals, HOMEPAGE_SECTION_DEFAULTS.new_arrivals),
    top_selling: ensurePositiveInteger(saved.top_selling, HOMEPAGE_SECTION_DEFAULTS.top_selling),
  };
}

export function getSectionLimit(settings = [], sectionKey, fallback = 16) {
  const limits = getHomepageSectionSettings(settings);
  return ensurePositiveInteger(limits[sectionKey], fallback);
}

function normalizeBrandEntry(entry = {}, index = 0) {
  const sourceName = String(entry.sourceName || entry.source_name || entry.name || entry.displayName || entry.display_name || '').trim();
  if (!sourceName) return null;

  const displayName = String(
    entry.displayName ?? entry.display_name ?? entry.name ?? sourceName
  ).trim();

  return {
    key: normalizeBrandKey(entry.key || sourceName),
    sourceName,
    displayName: displayName || sourceName,
    visible: entry.visible !== false,
    showName: entry.showName !== false && entry.show_name !== false,
    sortOrder: Number.isFinite(Number(entry.sortOrder ?? entry.sort_order)) ? Number(entry.sortOrder ?? entry.sort_order) : index,
  };
}

export function getBrandDirectory(settings = [], products = []) {
  const directoryConfig = parseJsonSetting(settings, BRAND_DIRECTORY_KEY, []);
  const legacyCustomBrands = parseJsonSetting(settings, LEGACY_CUSTOM_BRANDS_KEY, []);

  const visibleProducts = Array.isArray(products)
    ? products.filter((product) => product?.brand && product?.is_visible !== false)
    : [];

  const discoveredBrands = [...new Set(visibleProducts.map((product) => String(product.brand).trim()).filter(Boolean))];
  const manualBrandNames = Array.isArray(legacyCustomBrands)
    ? legacyCustomBrands.map((brand) => String(brand).trim()).filter(Boolean)
    : [];

  const seedEntries = [];

  if (Array.isArray(directoryConfig)) {
    directoryConfig.forEach((entry, index) => {
      const normalized = normalizeBrandEntry(entry, index);
      if (normalized) seedEntries.push(normalized);
    });
  }

  manualBrandNames.forEach((brandName, index) => {
    seedEntries.push(normalizeBrandEntry({ sourceName: brandName, displayName: brandName, sortOrder: 1000 + index }));
  });

  discoveredBrands.forEach((brandName, index) => {
    seedEntries.push(normalizeBrandEntry({ sourceName: brandName, displayName: brandName, sortOrder: 2000 + index }));
  });

  const merged = new Map();
  seedEntries.filter(Boolean).forEach((entry) => {
    const existing = merged.get(entry.key);
    if (!existing) {
      merged.set(entry.key, entry);
      return;
    }

    merged.set(entry.key, {
      ...existing,
      ...entry,
      sourceName: existing.sourceName || entry.sourceName,
      displayName: entry.displayName || existing.displayName,
      visible: entry.visible !== false && existing.visible !== false,
      showName: entry.showName !== false,
      sortOrder: Math.min(existing.sortOrder ?? 9999, entry.sortOrder ?? 9999),
    });
  });

  return [...merged.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function getVisibleBrandDirectory(settings = [], products = []) {
  return getBrandDirectory(settings, products).filter((entry) => entry.visible !== false);
}

export function getBrandLogo(settings = [], brandKey = '') {
  return settings.find((setting) => setting.key === `brand_logo_${normalizeBrandKey(brandKey)}`)?.value || '';
}

export function getBrandProductCount(products = [], entry) {
  if (!entry?.sourceName) return 0;
  const target = normalizeBrandKey(entry.sourceName);
  return (Array.isArray(products) ? products : []).filter((product) => normalizeBrandKey(product?.brand) === target && product?.is_visible !== false).length;
}

export function resolveBrandEntry(settings = [], products = [], brandValue = '') {
  const directory = getBrandDirectory(settings, products);
  const targetKey = normalizeBrandKey(brandValue);
  const targetSlug = slugifyBrand(brandValue);

  return directory.find((entry) => {
    return (
      normalizeBrandKey(entry.key) === targetKey ||
      normalizeBrandKey(entry.sourceName) === targetKey ||
      normalizeBrandKey(entry.displayName) === targetKey ||
      slugifyBrand(entry.sourceName) === targetSlug ||
      slugifyBrand(entry.displayName) === targetSlug
    );
  }) || null;
}

export function getBrandsForCategory(settings = [], products = [], categoryGroupKey = '') {
  const categories = CATEGORY_GROUPS[categoryGroupKey] || [];
  const visibleBrands = getVisibleBrandDirectory(settings, products);
  const brandsInGroup = new Set(
    (Array.isArray(products) ? products : [])
      .filter((product) => product?.is_visible !== false && categories.includes(product?.category) && product?.brand)
      .map((product) => normalizeBrandKey(product.brand))
  );

  return visibleBrands.filter((entry) => brandsInGroup.has(normalizeBrandKey(entry.sourceName)));
}
