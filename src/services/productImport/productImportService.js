import * as XLSX from 'xlsx';
import { appClient } from '@/api/appClient.js';
import {
  CATEGORY_SUBCATEGORIES,
  GROUP_BRANDS,
  GROUP_CATEGORIES,
  HOME_SECTIONS,
  buildEmptyProductForm,
  hydrateProductForm,
  isHttpUrl,
  normalizeProductMedia,
  normalizeStringArray,
  saveProduct,
  splitUrlList,
  uploadFiles,
} from '@/services/products/productWriteService.js';
import { generateDescription } from '@/services/product-engine/descriptionGenerator.js';

export const SUPPORTED_IMPORT_ACCEPT = '.xlsx,.xls,.csv';
export const DEFAULT_BATCH_SIZE = 50;
export const MAX_IMPORT_ROWS = 10000;
export const IMPORT_HISTORY_KEY = 'product_import_history_v1';
const CUSTOM_BRANDS_KEY = 'custom_brands_list';
const CUSTOM_CATEGORY_PREFIX = 'custom_cat_';
const JOB_META_PREFIX = 'product_import_job_meta_';
const JOB_ROWS_PREFIX = 'product_import_job_rows_';
const JOB_CREATED_IDS_PREFIX = 'product_import_job_created_ids_';
const JOB_UPDATED_SNAPSHOTS_PREFIX = 'product_import_job_updated_snapshots_';

export const IMPORT_MODES = [
  { value: 'skip', label: 'Skip Existing', description: 'Leave matched products untouched and import only new rows.' },
  { value: 'update', label: 'Update Existing', description: 'Patch matched products while preserving fields that are not present in the file.' },
  { value: 'replace', label: 'Replace Existing', description: 'Rewrite supported product fields from the spreadsheet while still using the shared product save workflow.' },
];

const COLUMN_ALIASES = {
  productName: ['product name', 'name', 'product', 'title', 'product title', 'item name', 'item', 'item title', 'model', 'model name'],
  mainCategory: ['main category', 'main_category', 'parent category', 'department', 'main group', 'product department'],
  category: ['category', 'product category'],
  subcategory: ['subcategory', 'sub category', 'sub-category', 'product type', 'product type / subcategory', 'type', 'variant type'],
  brand: ['brand', 'manufacturer', 'make'],
  price: ['price', 'sale price', 'current price'],
  originalPrice: ['original price', 'regular price', 'compare at price', 'old price'],
  stock: ['stock quantity', 'stock', 'quantity', 'qty', 'inventory'],
  description: ['description', 'details', 'product description', 'description rich text', 'rich description'],
  mainImageUrl: ['main image url', 'main product image url', 'main image', 'image url', 'primary image', 'featured image'],
  extraImageUrls: ['extra image urls', 'extra product images url', 'gallery image urls', 'gallery images', 'extra images', 'image urls', 'additional images'],
  videoUrl: ['video url', 'product video url optional', 'product video url', 'video', 'product video'],
  sku: ['sku', 'product sku'],
  slug: ['slug', 'product slug', 'seo slug', 'url slug', 'handle'],
  barcode: ['barcode', 'ean', 'upc'],
  tags: ['tags', 'labels'],
  warranty: ['warranty'],
  voltage: ['voltage'],
  power: ['power', 'wattage', 'show wattage options to customers', 'wattage options'],
  capacity: ['capacity'],
  ram: ['ram', 'memory'],
  storage: ['storage', 'rom'],
  screenSize: ['screen size', 'screen_size', 'display size'],
  features: ['features', 'feature list', 'highlights'],
  seoTitle: ['seo title', 'meta title'],
  seoDescription: ['seo description', 'meta description'],
  keywords: ['keywords', 'seo keywords', 'search keywords'],
  homepageSections: ['homepage sections', 'sections', 'home sections'],
  visibility: ['visibility', 'is visible', 'visible'],
  reviewsEnabled: ['reviews enabled', 'review enabled', 'allow reviews'],
  colors: ['colors', 'available colors', 'colour', 'colours', 'show color options to customers', 'color options'],
  variants: ['variants', 'types', 'options', 'show typevariant options to customers', 'show type variant options to customers', 'type/variant options', 'type variant options'],
  flashSale: ['flash sale', 'is flash sale'],
  flashSaleEndDate: ['flash sale end date', 'flash sale end', 'flash end'],
  featuredSection: ['featured'],
  classicoDealsSection: ['classico deals'],
  donkomiDealsSection: ['donkomi deals', 'donkomi'],
  topSellingSection: ['top selling', 'top seller'],
  newArrivalSection: ['new arrival', 'new arrivals'],
};

const CATEGORY_SYNONYMS = {
  phones: ['phone', 'phones', 'cell phone', 'cell phones', 'mobile phone', 'mobile phones', 'smartphone', 'smartphones'],
  phone_cases: ['phone cover', 'phone covers', 'phone case', 'phone cases', 'case', 'cases'],
  chargers: ['charger', 'chargers', 'charging brick', 'charging adapter'],
  earphones: ['earphone', 'earphones', 'earbuds', 'headphones', 'headset'],
  cables: ['cable', 'cables', 'charging cable', 'data cable'],
  power_banks: ['power bank', 'power banks', 'powerbank'],
  screen_protectors: ['screen protector', 'screen protectors', 'tempered glass'],
  holders: ['holder', 'holders', 'mount', 'mounts', 'phone holder'],
  speakers: ['speaker', 'speakers', 'bluetooth speaker'],
  smart_watches: ['smart watch', 'smart watches', 'watch', 'wearable'],
  electronic_appliances: ['electronics', 'electronic appliances', 'tv', 'tvs', 'audio'],
  home_appliances: ['home appliances', 'appliance', 'appliances', 'kitchen appliances'],
};

const BRAND_SYNONYMS = {
  apple: ['apple', 'iphone', 'i phone'],
  samsung: ['samsung', 'samsng', 'sam sung'],
  hp: ['hp', 'hewlett packard'],
  lg: ['lg', 'l.g.'],
  tecno: ['tecno'],
  infinix: ['infinix'],
  itel: ['itel'],
  oraimo: ['oraimo'],
  sony: ['sony'],
  hisense: ['hisense'],
  midea: ['midea'],
  tcl: ['tcl'],
  roch: ['roch'],
  'silver crest': ['silver crest', 'silvercrest'],
  nasco: ['nasco'],
  hoffman: ['hoffman'],
  jbl: ['jbl'],
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.avif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];

function createImportId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function titleCase(value = '') {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function sanitizeDescription(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*(["']).*?\1/gi, '')
    .trim();
}

function splitMultiValue(value) {
  if (Array.isArray(value)) return normalizeStringArray(value);
  if (typeof value === 'number') return [String(value)];
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return normalizeStringArray(parsed);
  } catch (_) {
    // ignore
  }
  return normalizeStringArray(
    trimmed
      .replace(/\r/g, '\n')
      .split(/[\n,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseBooleanish(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = normalizeKey(value);
    if (['true', '1', 'yes', 'y', 'on', 'checked'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off', 'unchecked'].includes(normalized)) return false;
  }
  return defaultValue;
}

function parseNumberish(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}\b)/g, '');
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function trimOrEmpty(value) {
  return String(value || '').trim();
}

function trimOrNull(value) {
  const trimmed = trimOrEmpty(value);
  return trimmed || null;
}

function levenshtein(a = '', b = '') {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function similarity(a = '', b = '') {
  const left = normalizeKey(a).replace(/\s+/g, '');
  const right = normalizeKey(b).replace(/\s+/g, '');
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function buildHeaderMap(headers = []) {
  const normalizedHeaders = headers.map((header) => ({ raw: header, normalized: normalizeKey(header) }));
  const map = {};

  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const match = normalizedHeaders.find(({ normalized }) => aliases.includes(normalized));
    if (match) {
      map[field] = match.raw;
      return;
    }

    const fuzzyMatch = normalizedHeaders.find(({ normalized }) => aliases.some((alias) => similarity(normalized, alias) >= 0.92));
    if (fuzzyMatch) {
      map[field] = fuzzyMatch.raw;
    }
  });

  if (!map.productName) {
    const nameLikeHeader = normalizedHeaders.find(({ normalized }) => (
      (normalized.includes('product') || normalized.includes('item') || normalized.includes('model'))
      && (normalized.includes('name') || normalized.includes('title'))
    ));
    if (nameLikeHeader) map.productName = nameLikeHeader.raw;
  }

  if (!map.description) {
    const descriptionLikeHeader = normalizedHeaders.find(({ normalized }) => normalized.includes('description') || normalized.includes('details'));
    if (descriptionLikeHeader) map.description = descriptionLikeHeader.raw;
  }

  return map;
}

function getCellValue(row, headerMap, key) {
  const header = headerMap[key];
  return header ? row?.[header] : undefined;
}

function toHttpsUrl(value) {
  const raw = trimOrEmpty(value);
  if (!raw) return '';
  if (raw.startsWith('http://')) return `https://${raw.slice('http://'.length)}`;
  return raw;
}

function isImageUrl(value) {
  const url = toHttpsUrl(value);
  if (!isHttpUrl(url)) return false;
  return IMAGE_EXTENSIONS.some((extension) => url.toLowerCase().includes(extension)) || url.includes('image');
}

function isVideoUrl(value) {
  const url = toHttpsUrl(value);
  if (!isHttpUrl(url)) return false;
  return VIDEO_EXTENSIONS.some((extension) => url.toLowerCase().includes(extension)) || /(youtube|youtu\.be|tiktok|instagram|facebook|vimeo|cloudinary)/i.test(url);
}

function buildSeoDefaults({ name, brand, subcategory }) {
  const cleanName = trimOrEmpty(name);
  const cleanBrand = trimOrEmpty(brand);
  const cleanType = trimOrEmpty(subcategory);
  const composedName = [cleanBrand, cleanName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || cleanName;
  const keywords = normalizeStringArray([cleanBrand, cleanName, cleanType, 'FMM CLASSICO', 'Ghana'].filter(Boolean));

  return {
    slug: slugify(cleanName || composedName),
    seo_title: cleanName ? `Buy ${cleanName} in Ghana | FMM CLASSICO` : 'Buy Product in Ghana | FMM CLASSICO',
    seo_description: cleanName
      ? `${cleanName} available at FMM CLASSICO in Ghana. Shop authentic products, accessories, and appliances with fast support.`
      : 'Shop authentic products and accessories at FMM CLASSICO in Ghana.',
    keywords,
  };
}

function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the spreadsheet file.'));
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('The spreadsheet does not contain any sheets.'));
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        resolve({ workbook, sheetName: firstSheetName, rows });
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function listAppSettings() {
  const settings = await appClient.entities.AppSetting.list();
  return Array.isArray(settings) ? settings : [];
}

async function getSettingRecord(key) {
  const matches = await appClient.entities.AppSetting.filter({ key });
  return Array.isArray(matches) ? matches[0] || null : null;
}

async function upsertSetting(key, value) {
  const existing = await getSettingRecord(key);
  if (existing?.id) {
    return appClient.entities.AppSetting.update(existing.id, { value });
  }
  return appClient.entities.AppSetting.create({ key, value });
}

async function deleteSetting(key) {
  const existing = await getSettingRecord(key);
  if (existing?.id) {
    await appClient.entities.AppSetting.delete(existing.id);
  }
}

async function saveChunkedJson(prefix, importId, items, chunkSize = 200) {
  const safeItems = Array.isArray(items) ? items : [];
  const settings = await listAppSettings();
  const keyPrefix = `${prefix}${importId}_`;
  const existing = settings.filter((entry) => String(entry.key || '').startsWith(keyPrefix));
  const chunks = [];
  for (let index = 0; index < safeItems.length; index += chunkSize) {
    chunks.push(safeItems.slice(index, index + chunkSize));
  }
  await Promise.all(chunks.map((chunk, index) => upsertSetting(`${keyPrefix}${index}`, JSON.stringify(chunk))));
  const staleKeys = existing.slice(chunks.length).map((entry) => entry.key);
  await Promise.all(staleKeys.map((key) => deleteSetting(key)));
}

async function loadChunkedJson(prefix, importId) {
  const settings = await listAppSettings();
  const keyPrefix = `${prefix}${importId}_`;
  return settings
    .filter((entry) => String(entry.key || '').startsWith(keyPrefix))
    .sort((left, right) => Number(String(left.key).split('_').pop()) - Number(String(right.key).split('_').pop()))
    .flatMap((entry) => {
      try {
        const parsed = JSON.parse(entry.value || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    });
}

async function saveHistoryEntry(summary) {
  const setting = await getSettingRecord(IMPORT_HISTORY_KEY);
  let history = [];
  if (setting?.value) {
    try {
      history = JSON.parse(setting.value);
    } catch (_) {
      history = [];
    }
  }
  const nextHistory = [summary, ...history.filter((entry) => entry.importId !== summary.importId)].slice(0, 50);
  await upsertSetting(IMPORT_HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export async function loadImportHistory() {
  const setting = await getSettingRecord(IMPORT_HISTORY_KEY);
  if (!setting?.value) return [];
  try {
    const parsed = JSON.parse(setting.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function buildCategoryIndex(customCategories = []) {
  const index = [];
  Object.entries(GROUP_CATEGORIES).forEach(([group, categories]) => {
    categories.forEach((category) => {
      index.push({
        group,
        value: category.value,
        label: category.label,
        synonyms: [category.label, category.value, ...(CATEGORY_SYNONYMS[category.value] || [])],
      });
    });
  });
  customCategories.forEach((item) => {
    if (item?.id && item?.name) {
      index.push({ group: 'custom', value: item.id, label: item.name, synonyms: [item.name] });
    }
  });
  return index;
}

function parseCustomCategories(settings = []) {
  return settings
    .filter((entry) => String(entry.key || '').startsWith(CUSTOM_CATEGORY_PREFIX))
    .map((entry) => {
      try {
        return JSON.parse(entry.value || '{}');
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

function parseCustomBrands(settings = []) {
  const raw = settings.find((entry) => entry.key === CUSTOM_BRANDS_KEY)?.value || '[]';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function buildBrandIndex(products = [], settings = []) {
  const customBrands = parseCustomBrands(settings);
  const staticBrands = Object.values(GROUP_BRANDS).flat().map((value) => value.replace(' (type below)', ''));
  const productBrands = products.map((product) => product?.brand).filter(Boolean);
  const uniqueBrands = [...new Set([...staticBrands, ...customBrands, ...productBrands].map((value) => titleCase(value)))].filter(Boolean);
  return uniqueBrands.map((brand) => ({
    brand,
    normalized: normalizeKey(brand),
    synonyms: [...(BRAND_SYNONYMS[normalizeKey(brand)] || []), brand],
  }));
}

function resolveBrand(value, brandIndex = []) {
  const raw = trimOrEmpty(value);
  if (!raw) return { brand: '', created: false, matched: false };
  const normalized = normalizeKey(raw);
  const exact = brandIndex.find((entry) => entry.normalized === normalized || entry.synonyms.some((alias) => normalizeKey(alias) === normalized));
  if (exact) {
    return { brand: exact.brand, created: false, matched: true };
  }
  const fuzzy = brandIndex
    .map((entry) => ({ entry, score: Math.max(entry.synonyms.reduce((best, alias) => Math.max(best, similarity(alias, raw)), 0), similarity(entry.brand, raw)) }))
    .sort((left, right) => right.score - left.score)[0];
  if (fuzzy?.score >= 0.83) {
    return { brand: fuzzy.entry.brand, created: false, matched: true };
  }
  return { brand: titleCase(raw), created: true, matched: false };
}

function resolveCategory({ categoryValue, mainCategoryValue }, categoryIndex = []) {
  const candidates = [categoryValue, mainCategoryValue].map(trimOrEmpty).filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const exact = categoryIndex.find((entry) => entry.synonyms.some((alias) => normalizeKey(alias) === normalized));
    if (exact) return exact;

    const fuzzy = categoryIndex
      .map((entry) => ({ entry, score: entry.synonyms.reduce((best, alias) => Math.max(best, similarity(alias, candidate)), 0) }))
      .sort((left, right) => right.score - left.score)[0];
    if (fuzzy?.score >= 0.82) {
      return fuzzy.entry;
    }
  }
  return null;
}

function resolveSubcategory(categoryKey, value) {
  const raw = trimOrEmpty(value);
  if (!raw) return '';
  const options = CATEGORY_SUBCATEGORIES[categoryKey] || [];
  const exact = options.find((option) => normalizeKey(option) === normalizeKey(raw));
  if (exact) return exact;
  const fuzzy = options
    .map((option) => ({ option, score: similarity(option, raw) }))
    .sort((left, right) => right.score - left.score)[0];
  if (fuzzy?.score >= 0.86) return fuzzy.option;
  return raw;
}

async function persistNewBrandIfNeeded(brand, settings = []) {
  if (!brand) return;
  const existing = parseCustomBrands(settings);
  if (existing.some((entry) => normalizeKey(entry) === normalizeKey(brand))) return;
  const nextBrands = [...existing, brand].sort((left, right) => left.localeCompare(right));
  await upsertSetting(CUSTOM_BRANDS_KEY, JSON.stringify(nextBrands));
}

function buildImportContext(products, settings) {
  const customCategories = parseCustomCategories(settings);
  return {
    settings,
    products,
    categoryIndex: buildCategoryIndex(customCategories),
    brandIndex: buildBrandIndex(products, settings),
  };
}

function inferCategoryFromName(name, categoryIndex = []) {
  const normalizedName = normalizeKey(name);
  if (!normalizedName) return null;

  const containsMatch = categoryIndex.find((entry) => entry.synonyms.some((alias) => {
    const normalizedAlias = normalizeKey(alias);
    return normalizedAlias && normalizedName.includes(normalizedAlias);
  }));
  if (containsMatch) return containsMatch;

  const fuzzy = categoryIndex
    .map((entry) => ({
      entry,
      score: entry.synonyms.reduce((best, alias) => Math.max(best, similarity(alias, name)), 0),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (fuzzy?.score >= 0.56) return fuzzy.entry;
  return null;
}

function inferBrandFromName(name, brandIndex = []) {
  const normalizedName = normalizeKey(name);
  if (!normalizedName) return { brand: '', created: false, matched: false };

  const exact = brandIndex.find((entry) => entry.synonyms.some((alias) => {
    const normalizedAlias = normalizeKey(alias);
    return normalizedAlias && normalizedName.includes(normalizedAlias);
  }));
  if (exact) {
    return { brand: exact.brand, created: false, matched: true };
  }

  const fuzzy = brandIndex
    .map((entry) => ({
      entry,
      score: Math.max(
        similarity(entry.brand, name),
        entry.synonyms.reduce((best, alias) => Math.max(best, similarity(alias, name)), 0)
      ),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (fuzzy?.score >= 0.65) {
    return { brand: fuzzy.entry.brand, created: false, matched: true };
  }

  return { brand: '', created: false, matched: false };
}

function inferSubcategoryFromName(categoryKey, name) {
  const options = CATEGORY_SUBCATEGORIES[categoryKey] || [];
  const normalizedName = normalizeKey(name);
  if (!normalizedName || options.length === 0) return '';

  const containsMatch = options.find((option) => {
    const normalizedOption = normalizeKey(option);
    return normalizedOption && normalizedName.includes(normalizedOption);
  });
  if (containsMatch) return containsMatch;

  const fuzzy = options
    .map((option) => ({ option, score: similarity(option, name) }))
    .sort((left, right) => right.score - left.score)[0];

  if (fuzzy?.score >= 0.58) return fuzzy.option;
  return '';
}

function buildRowWarnings() {
  return [];
}

function buildHomepageSections(row, headerMap) {
  const sections = new Set();
  splitMultiValue(getCellValue(row, headerMap, 'homepageSections')).forEach((value) => {
    const normalized = normalizeKey(value);
    if (normalized.includes('featured')) sections.add('featured');
    if (normalized.includes('classico') || normalized.includes('flash')) sections.add('flash_sale');
    if (normalized.includes('donkomi')) sections.add('donkomi');
    if (normalized.includes('new')) sections.add('new_arrival');
    if (normalized.includes('top')) sections.add('top_selling');
  });
  if (parseBooleanish(getCellValue(row, headerMap, 'featuredSection'))) sections.add('featured');
  if (parseBooleanish(getCellValue(row, headerMap, 'classicoDealsSection'))) sections.add('flash_sale');
  if (parseBooleanish(getCellValue(row, headerMap, 'donkomiDealsSection'))) sections.add('donkomi');
  if (parseBooleanish(getCellValue(row, headerMap, 'newArrivalSection'))) sections.add('new_arrival');
  if (parseBooleanish(getCellValue(row, headerMap, 'topSellingSection'))) sections.add('top_selling');
  if (parseBooleanish(getCellValue(row, headerMap, 'flashSale'))) sections.add('flash_sale');
  return [...sections];
}

function detectDuplicate(row, products = []) {
  const rowNameKey = normalizeKey(row.name);
  const rowBrandKey = normalizeKey(row.brand);
  const rowTypeKey = normalizeKey(row.subcategory);
  const skuKey = normalizeKey(row.sku);
  const barcodeKey = normalizeKey(row.barcode);

  return products.find((product) => {
    if (skuKey && normalizeKey(product.sku) === skuKey) return true;
    if (barcodeKey && normalizeKey(product.barcode) === barcodeKey) return true;
    return rowNameKey && rowBrandKey && normalizeKey(product.name) === rowNameKey && normalizeKey(product.brand) === rowBrandKey && normalizeKey(product.subcategory) === rowTypeKey;
  }) || null;
}

function buildRowFingerprint(row) {
  return [normalizeKey(row.sku), normalizeKey(row.barcode), normalizeKey(row.name), normalizeKey(row.brand), normalizeKey(row.subcategory)].join('|');
}

function buildPreparedRow(row, index, headerMap, context) {
  const warnings = buildRowWarnings();
  const name = trimOrEmpty(getCellValue(row, headerMap, 'productName'));
  const explicitCategoryMatch = resolveCategory({
    categoryValue: getCellValue(row, headerMap, 'category'),
    mainCategoryValue: getCellValue(row, headerMap, 'mainCategory'),
  }, context.categoryIndex);
  const inferredCategoryMatch = explicitCategoryMatch ? null : inferCategoryFromName(name, context.categoryIndex);
  const categoryMatch = explicitCategoryMatch || inferredCategoryMatch;
  const category = categoryMatch?.value || '';
  const explicitBrandResolution = resolveBrand(getCellValue(row, headerMap, 'brand'), context.brandIndex);
  const inferredBrandResolution = explicitBrandResolution.brand ? null : inferBrandFromName(name, context.brandIndex);
  const brandResolution = explicitBrandResolution.brand ? explicitBrandResolution : (inferredBrandResolution || explicitBrandResolution);
  const brand = brandResolution.brand;
  const subcategory = resolveSubcategory(category, getCellValue(row, headerMap, 'subcategory') || inferSubcategoryFromName(category, name));
  const mainImageUrl = toHttpsUrl(getCellValue(row, headerMap, 'mainImageUrl'));
  const extraImageUrls = splitUrlList(toHttpsUrl(getCellValue(row, headerMap, 'extraImageUrls')) || getCellValue(row, headerMap, 'extraImageUrls'));
  const image_url = mainImageUrl || extraImageUrls[0] || '';
  const image_urls = mainImageUrl ? extraImageUrls : extraImageUrls.slice(1);
  const videoUrl = toHttpsUrl(getCellValue(row, headerMap, 'videoUrl'));
  const rawDescription = sanitizeDescription(getCellValue(row, headerMap, 'description'));
  const price = parseNumberish(getCellValue(row, headerMap, 'price'));
  const original_price = parseNumberish(getCellValue(row, headerMap, 'originalPrice'));
  const stock = parseNumberish(getCellValue(row, headerMap, 'stock'));
  const colors = splitMultiValue(getCellValue(row, headerMap, 'colors'));
  const variants = splitMultiValue(getCellValue(row, headerMap, 'variants'));
  const keywords = splitMultiValue(getCellValue(row, headerMap, 'keywords'));
  const tags = splitMultiValue(getCellValue(row, headerMap, 'tags'));
  const home_sections = buildHomepageSections(row, headerMap);
  const description = rawDescription || (name ? generateDescription({
    name,
    brand,
    category: categoryMatch?.label || category,
    subcategory,
    features: trimOrEmpty(getCellValue(row, headerMap, 'features')),
    warranty: trimOrEmpty(getCellValue(row, headerMap, 'warranty')),
    storage: trimOrEmpty(getCellValue(row, headerMap, 'storage')),
    ram: trimOrEmpty(getCellValue(row, headerMap, 'ram')),
    capacity: trimOrEmpty(getCellValue(row, headerMap, 'capacity')),
    power: trimOrEmpty(getCellValue(row, headerMap, 'power')),
    voltage: trimOrEmpty(getCellValue(row, headerMap, 'voltage')),
    screen_size: trimOrEmpty(getCellValue(row, headerMap, 'screenSize')),
    available_colors: colors,
    available_types: variants,
  }) : '');
  const seoDefaults = buildSeoDefaults({ name, brand, subcategory });

  const normalizedRow = {
    rowNumber: index + 2,
    original: row,
    presence: Object.fromEntries(Object.keys(headerMap).map((key) => [key, !!headerMap[key]])),
    name,
    category,
    categoryLabel: categoryMatch?.label || '',
    main_group: categoryMatch?.group || '',
    brand,
    subcategory,
    description,
    descriptionAutoGenerated: !rawDescription && !!description,
    price,
    original_price,
    stock,
    image_url,
    image_urls,
    video_url: videoUrl,
    sku: trimOrEmpty(getCellValue(row, headerMap, 'sku')),
    barcode: trimOrEmpty(getCellValue(row, headerMap, 'barcode')),
    tags,
    warranty: trimOrEmpty(getCellValue(row, headerMap, 'warranty')),
    voltage: trimOrEmpty(getCellValue(row, headerMap, 'voltage')),
    power: trimOrEmpty(getCellValue(row, headerMap, 'power')),
    capacity: trimOrEmpty(getCellValue(row, headerMap, 'capacity')),
    ram: trimOrEmpty(getCellValue(row, headerMap, 'ram')),
    storage: trimOrEmpty(getCellValue(row, headerMap, 'storage')),
    screen_size: trimOrEmpty(getCellValue(row, headerMap, 'screenSize')),
    features: trimOrEmpty(getCellValue(row, headerMap, 'features')),
    seo_title: trimOrEmpty(getCellValue(row, headerMap, 'seoTitle')) || seoDefaults.seo_title,
    seo_description: trimOrEmpty(getCellValue(row, headerMap, 'seoDescription')) || seoDefaults.seo_description,
    keywords: keywords.length ? keywords : seoDefaults.keywords,
    slug: trimOrEmpty(getCellValue(row, headerMap, 'slug')) || seoDefaults.slug,
    home_sections,
    review_enabled: parseBooleanish(getCellValue(row, headerMap, 'reviewsEnabled'), true),
    is_visible: parseBooleanish(getCellValue(row, headerMap, 'visibility'), true),
    flash_sale_end: trimOrNull(getCellValue(row, headerMap, 'flashSaleEndDate')),
    flash_sale: home_sections.includes('flash_sale'),
    show_colors: colors.length > 0 || parseBooleanish(getCellValue(row, headerMap, 'colors'), false),
    available_colors: colors,
    show_type: variants.length > 0 || parseBooleanish(getCellValue(row, headerMap, 'variants'), false),
    available_types: variants,
    show_wattage: !!trimOrEmpty(getCellValue(row, headerMap, 'power')) || parseBooleanish(getCellValue(row, headerMap, 'power'), false),
    available_wattage: trimOrEmpty(getCellValue(row, headerMap, 'power')) ? [trimOrEmpty(getCellValue(row, headerMap, 'power'))] : [],
    warnings,
    errors: [],
    brandWasCreated: brandResolution.created,
  };

  if (normalizedRow.image_url && !isImageUrl(normalizedRow.image_url)) {
    warnings.push('Main image URL does not look like a direct image file. It will still be attempted.');
  }
  if (normalizedRow.video_url && !isVideoUrl(normalizedRow.video_url)) {
    warnings.push('Video URL does not match a known provider or direct video extension.');
  }
  if (brandResolution.created) {
    warnings.push(`Brand "${normalizedRow.brand}" was not found and will be added to the admin brand list.`);
  }
  if (!normalizedRow.category) {
    warnings.push('Category could not be matched automatically.');
  } else if (!explicitCategoryMatch && inferredCategoryMatch) {
    warnings.push(`Category was inferred from the product name as ${normalizedRow.categoryLabel || normalizedRow.category}.`);
  }
  if (!explicitBrandResolution.brand && brandResolution.brand) {
    warnings.push(`Brand was inferred from the product name as ${normalizedRow.brand}.`);
  }
  if (!rawDescription && normalizedRow.description) {
    warnings.push('Description was generated automatically because the spreadsheet did not provide one.');
  }

  return normalizedRow;
}

function validatePreparedRows(rows, products, mode) {
  const seenSkus = new Map();
  const seenBarcodes = new Map();
  const seenFingerprints = new Map();

  return rows.map((row) => {
    const next = { ...row, warnings: [...row.warnings], errors: [...row.errors] };

    if (!next.name) next.errors.push('Missing product name.');
    if (!next.brand) next.errors.push('Missing brand.');
    if (!next.category) next.errors.push('Missing or unmatched category.');
    if (next.price === null || next.price < 0) next.errors.push('Invalid price.');
    if (next.stock !== null && next.stock < 0) next.errors.push('Invalid stock quantity.');
    if (next.image_url && !isHttpUrl(next.image_url)) next.errors.push('Invalid main image URL.');
    next.image_urls.forEach((url) => {
      if (!isHttpUrl(url)) next.errors.push(`Invalid gallery image URL: ${url}`);
    });
    if (next.video_url && !isHttpUrl(next.video_url)) next.errors.push('Invalid video URL.');

    const skuKey = normalizeKey(next.sku);
    if (skuKey) {
      if (seenSkus.has(skuKey)) {
        next.errors.push(`Duplicate SKU inside file (also row ${seenSkus.get(skuKey)}).`);
      } else {
        seenSkus.set(skuKey, next.rowNumber);
      }
    }

    const barcodeKey = normalizeKey(next.barcode);
    if (barcodeKey) {
      if (seenBarcodes.has(barcodeKey)) {
        next.errors.push(`Duplicate barcode inside file (also row ${seenBarcodes.get(barcodeKey)}).`);
      } else {
        seenBarcodes.set(barcodeKey, next.rowNumber);
      }
    }

    const fingerprint = buildRowFingerprint(next);
    if (seenFingerprints.has(fingerprint)) {
      next.warnings.push(`This row appears to describe the same product as row ${seenFingerprints.get(fingerprint)}.`);
    } else {
      seenFingerprints.set(fingerprint, next.rowNumber);
    }

    const matchedProduct = detectDuplicate(next, products);
    next.duplicateMatch = matchedProduct
      ? {
          id: matchedProduct.id,
          name: matchedProduct.name,
          brand: matchedProduct.brand,
          category: matchedProduct.category,
          subcategory: matchedProduct.subcategory,
        }
      : null;

    if (matchedProduct && mode === 'skip') next.decision = 'skip_existing';
    else if (matchedProduct) next.decision = mode === 'replace' ? 'replace_existing' : 'update_existing';
    else next.decision = 'create_new';

    if (matchedProduct && skuKey && !matchedProduct.sku) {
      next.warnings.push('Duplicate matched by name + brand + type because existing SKU was unavailable.');
    }

    return next;
  });
}

async function validateAndUploadExternalAsset(url, expectedKind, warnings, importId, rowNumber) {
  const safeUrl = toHttpsUrl(url);
  if (!safeUrl) return null;
  if (!isHttpUrl(safeUrl)) {
    warnings.push(`${expectedKind} URL is not HTTP(S): ${safeUrl}`);
    return null;
  }

  try {
    const response = await fetch(safeUrl, { method: 'GET' });
    if (!response.ok) {
      warnings.push(`${expectedKind} URL returned HTTP ${response.status}: ${safeUrl}`);
      return safeUrl;
    }

    const contentType = response.headers.get('content-type') || '';
    if (expectedKind === 'image' && !contentType.includes('image')) {
      warnings.push(`Main media URL did not respond with an image content type: ${safeUrl}`);
    }
    if (expectedKind === 'video' && !contentType.includes('video') && !contentType.includes('application/octet-stream')) {
      warnings.push(`Video URL did not respond with a video content type: ${safeUrl}`);
    }

    const blob = await response.blob();
    const extension = expectedKind === 'image'
      ? (IMAGE_EXTENSIONS.find((item) => safeUrl.toLowerCase().includes(item)) || '.jpg')
      : (VIDEO_EXTENSIONS.find((item) => safeUrl.toLowerCase().includes(item)) || '.mp4');
    const file = new File([blob], `${importId}-${rowNumber}-${expectedKind}${extension}`, { type: blob.type || (expectedKind === 'image' ? 'image/jpeg' : 'video/mp4') });
    const [uploadedUrl] = await uploadFiles([file]);
    return uploadedUrl || safeUrl;
  } catch (error) {
    warnings.push(`Could not mirror ${expectedKind} from ${safeUrl}. Kept the source URL instead. (${error.message})`);
    return safeUrl;
  }
}

async function hydrateRowMedia(row, importId) {
  const warnings = [...row.warnings];
  const mainImage = await validateAndUploadExternalAsset(row.image_url, 'image', warnings, importId, row.rowNumber);
  const galleryImages = [];
  for (const imageUrl of row.image_urls) {
    const mirrored = await validateAndUploadExternalAsset(imageUrl, 'image', warnings, importId, row.rowNumber);
    if (mirrored) galleryImages.push(mirrored);
  }
  const normalizedMedia = normalizeProductMedia(mainImage, galleryImages);
  let videoUrl = row.video_url;
  if (videoUrl && isVideoUrl(videoUrl) && VIDEO_EXTENSIONS.some((extension) => videoUrl.toLowerCase().includes(extension))) {
    videoUrl = await validateAndUploadExternalAsset(videoUrl, 'video', warnings, importId, row.rowNumber);
  }

  return {
    warnings,
    image_url: normalizedMedia.image_url,
    image_urls: normalizedMedia.image_urls,
    video_url: videoUrl || null,
  };
}

function applyImportedValue(target, key, value, shouldApply = true) {
  if (!shouldApply) return;
  target[key] = value;
}

function buildImportForm(row, mode, existingProduct) {
  const base = existingProduct && mode !== 'replace' ? hydrateProductForm(existingProduct) : buildEmptyProductForm();
  const next = { ...base };

  applyImportedValue(next, 'name', row.name, !!row.name || mode === 'replace');
  applyImportedValue(next, 'description', row.description, row.presence.description || row.descriptionAutoGenerated || mode === 'replace');
  applyImportedValue(next, 'price', row.price ?? '', row.presence.price || mode === 'replace');
  applyImportedValue(next, 'original_price', row.original_price ?? '', row.presence.originalPrice || mode === 'replace');
  applyImportedValue(next, 'main_group', row.main_group, !!row.category || !!row.main_group);
  applyImportedValue(next, 'category', row.category, !!row.category || mode === 'replace');
  applyImportedValue(next, 'brand', row.brand, !!row.brand || mode === 'replace');
  applyImportedValue(next, 'custom_brand', '', true);
  applyImportedValue(next, 'subcategory', row.subcategory, !!row.subcategory || mode === 'replace');
  applyImportedValue(next, 'custom_subcategory', '', true);
  applyImportedValue(next, 'stock', row.stock ?? '', row.presence.stock || mode === 'replace');
  applyImportedValue(next, 'home_sections', row.home_sections, row.presence.homepageSections || row.presence.featuredSection || row.presence.classicoDealsSection || row.presence.donkomiDealsSection || row.presence.topSellingSection || row.presence.newArrivalSection || row.presence.flashSale || mode === 'replace');
  applyImportedValue(next, 'review_enabled', row.review_enabled, row.presence.reviewsEnabled || mode === 'replace');
  applyImportedValue(next, 'is_visible', row.is_visible, row.presence.visibility || mode === 'replace');
  applyImportedValue(next, 'image_url', row.image_url || '', row.presence.mainImageUrl || row.presence.extraImageUrls || mode === 'replace');
  applyImportedValue(next, 'image_urls', row.image_urls || [], row.presence.mainImageUrl || row.presence.extraImageUrls || mode === 'replace');
  applyImportedValue(next, 'video_url', row.video_url || '', row.presence.videoUrl || mode === 'replace');
  applyImportedValue(next, 'flash_sale_end', row.flash_sale_end || '', row.presence.flashSaleEndDate || mode === 'replace');
  applyImportedValue(next, 'show_colors', row.show_colors, row.presence.colors || mode === 'replace');
  applyImportedValue(next, 'available_colors', row.available_colors, row.presence.colors || mode === 'replace');
  applyImportedValue(next, 'show_type', row.show_type, row.presence.variants || mode === 'replace');
  applyImportedValue(next, 'available_types', row.available_types, row.presence.variants || mode === 'replace');
  applyImportedValue(next, 'show_wattage', row.show_wattage, row.presence.power || mode === 'replace');
  applyImportedValue(next, 'available_wattage', row.available_wattage, row.presence.power || mode === 'replace');

  if (row.presence.sku || mode === 'replace') next.sku = row.sku;
  if (row.presence.barcode || mode === 'replace') next.barcode = row.barcode;
  if (row.presence.tags || mode === 'replace') next.tags = row.tags;
  if (row.presence.warranty || mode === 'replace') next.warranty = row.warranty;
  if (row.presence.voltage || mode === 'replace') next.voltage = row.voltage;
  if (row.presence.power || mode === 'replace') next.power = row.power;
  if (row.presence.capacity || mode === 'replace') next.capacity = row.capacity;
  if (row.presence.ram || mode === 'replace') next.ram = row.ram;
  if (row.presence.storage || mode === 'replace') next.storage = row.storage;
  if (row.presence.screenSize || mode === 'replace') next.screen_size = row.screen_size;
  if (row.presence.features || mode === 'replace') next.features = row.features;
  if (row.presence.seoTitle || mode === 'replace') next.seo_title = row.seo_title;
  if (row.presence.seoDescription || mode === 'replace') next.seo_description = row.seo_description;
  if (row.presence.keywords || mode === 'replace') next.keywords = row.keywords;
  next.slug = row.slug;
  next.main_category = row.categoryLabel;
  next.product_type = row.subcategory;
  next.import_batch_id = row.import_batch_id;
  next.import_source = 'bulk_spreadsheet';
  next.import_filename = row.import_filename;

  return next;
}

function buildSummaryFromJob(job) {
  return {
    importId: job.importId,
    fileName: job.fileName,
    status: job.status,
    mode: job.mode,
    rows: job.totalRows,
    imported: job.results.imported,
    updated: job.results.updated,
    skipped: job.results.skipped,
    failed: job.results.failed,
    startedAt: job.startedAt,
    completedAt: job.completedAt || null,
    durationMs: job.completedAt ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime() : null,
    importedBy: job.createdBy?.email || job.createdBy?.id || 'Unknown',
    errorReportRows: job.errorRows.length,
    canResume: job.status === 'validated' || job.status === 'importing',
    canRollback: ['completed', 'importing'].includes(job.status) && (job.rollback.createdIds.length > 0 || job.rollback.updatedSnapshots.length > 0),
  };
}

async function persistJob(job, saveRows = false) {
  const meta = {
    importId: job.importId,
    fileName: job.fileName,
    mode: job.mode,
    batchSize: job.batchSize,
    startedAt: job.startedAt,
    completedAt: job.completedAt || null,
    status: job.status,
    cursor: job.cursor,
    totalRows: job.totalRows,
    createdBy: job.createdBy,
    results: job.results,
    previewRows: job.rows.slice(0, 20),
    errorRows: job.errorRows,
  };

  await upsertSetting(`${JOB_META_PREFIX}${job.importId}`, JSON.stringify(meta));
  if (saveRows) {
    await saveChunkedJson(JOB_ROWS_PREFIX, job.importId, job.rows);
  }
  await saveChunkedJson(JOB_CREATED_IDS_PREFIX, job.importId, job.rollback.createdIds);
  await saveChunkedJson(JOB_UPDATED_SNAPSHOTS_PREFIX, job.importId, job.rollback.updatedSnapshots);
  await saveHistoryEntry(buildSummaryFromJob(job));
}

export async function loadImportJob(importId) {
  const metaSetting = await getSettingRecord(`${JOB_META_PREFIX}${importId}`);
  if (!metaSetting?.value) return null;
  const meta = JSON.parse(metaSetting.value);
  const rows = await loadChunkedJson(JOB_ROWS_PREFIX, importId);
  const createdIds = await loadChunkedJson(JOB_CREATED_IDS_PREFIX, importId);
  const updatedSnapshots = await loadChunkedJson(JOB_UPDATED_SNAPSHOTS_PREFIX, importId);
  return {
    ...meta,
    rows,
    rollback: {
      createdIds,
      updatedSnapshots,
    },
  };
}

export async function prepareImportFile(file, options = {}) {
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  if (!file || !['xlsx', 'xls', 'csv'].includes(extension)) {
    throw new Error('Upload a valid .xlsx, .xls, or .csv file.');
  }

  const { rows } = await parseWorkbook(file);
  if (!rows.length) {
    throw new Error('The spreadsheet is empty.');
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`The file contains ${rows.length} rows. The current import limit is ${MAX_IMPORT_ROWS} rows per run.`);
  }

  const [user, products, settings] = await Promise.all([
    appClient.auth.me(),
    appClient.entities.Product.list('-created_date', 20000),
    listAppSettings(),
  ]);
  const context = buildImportContext(products, settings);
  const headers = Object.keys(rows[0] || {});
  const headerMap = buildHeaderMap(headers);
  const preparedRows = validatePreparedRows(rows.map((row, index) => buildPreparedRow(row, index, headerMap, context)), products, options.mode || 'skip');

  const job = {
    importId: createImportId(),
    fileName: file.name || 'import.xlsx',
    mode: options.mode || 'skip',
    batchSize: Number(options.batchSize) > 0 ? Number(options.batchSize) : DEFAULT_BATCH_SIZE,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'validated',
    cursor: 0,
    totalRows: preparedRows.length,
    createdBy: user,
    rows: preparedRows.map((row) => ({ ...row, import_batch_id: '', import_filename: file.name || 'import.xlsx' })),
    results: {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      processed: 0,
    },
    rollback: {
      createdIds: [],
      updatedSnapshots: [],
    },
    errorRows: [],
  };

  job.rows = job.rows.map((row) => ({ ...row, import_batch_id: job.importId }));

  await persistJob(job, true);
  return job;
}

function waitForUi() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function processPreparedRow(job, row, latestProducts) {
  const warnings = [...row.warnings];
  if (row.errors.length > 0) {
    return {
      type: 'failed',
      rowNumber: row.rowNumber,
      productName: row.name,
      warnings,
      error: row.errors.join(' '),
      original: row.original,
    };
  }

  const existing = row.duplicateMatch ? latestProducts.find((product) => product.id === row.duplicateMatch.id) || null : null;
  if (row.decision === 'skip_existing') {
    return {
      type: 'skipped',
      rowNumber: row.rowNumber,
      productName: row.name,
      warnings,
      original: row.original,
    };
  }

  if (row.brandWasCreated) {
    const settings = await listAppSettings();
    await persistNewBrandIfNeeded(row.brand, settings);
  }

  const media = await hydrateRowMedia(row, job.importId);
  const rowWithMedia = {
    ...row,
    ...media,
    warnings: media.warnings,
  };
  const formData = buildImportForm(rowWithMedia, job.mode, existing);

  try {
    const saved = await saveProduct({
      formData,
      productId: existing?.id || null,
    });

    if (existing?.id) {
      job.rollback.updatedSnapshots.push({ id: existing.id, snapshot: existing });
    } else if (saved?.id) {
      job.rollback.createdIds.push(saved.id);
    }

    return {
      type: existing?.id ? 'updated' : 'imported',
      rowNumber: row.rowNumber,
      productName: saved?.name || row.name,
      productId: saved?.id || existing?.id || null,
      warnings: rowWithMedia.warnings,
      original: row.original,
    };
  } catch (error) {
    return {
      type: 'failed',
      rowNumber: row.rowNumber,
      productName: row.name,
      warnings: rowWithMedia.warnings,
      error: error.message || 'Unknown save error.',
      original: row.original,
    };
  }
}

export async function runImport(importId, { onProgress } = {}) {
  const job = await loadImportJob(importId);
  if (!job) throw new Error('Import job not found.');

  job.status = 'importing';
  await persistJob(job, false);

  let latestProducts = await appClient.entities.Product.list('-created_date', 20000);

  for (let index = job.cursor; index < job.rows.length; index += job.batchSize) {
    const batch = job.rows.slice(index, index + job.batchSize);
    for (const row of batch) {
      const result = await processPreparedRow(job, row, latestProducts);
      if (result.type === 'imported') {
        job.results.imported += 1;
      } else if (result.type === 'updated') {
        job.results.updated += 1;
      } else if (result.type === 'skipped') {
        job.results.skipped += 1;
      } else {
        job.results.failed += 1;
        job.errorRows.push({
          rowNumber: result.rowNumber,
          reason: result.error,
          originalData: JSON.stringify(result.original),
          suggestedFix: 'Review the row values, fix the reported issue, and re-import only the failed rows if needed.',
        });
      }
      job.results.processed += 1;
      if (typeof onProgress === 'function') {
        onProgress({
          processed: job.results.processed,
          total: job.totalRows,
          currentRow: row.rowNumber,
          currentProduct: row.name,
          currentBatch: Math.floor(job.results.processed / job.batchSize) + 1,
          result,
        });
      }
    }

    job.cursor = Math.min(index + job.batchSize, job.rows.length);
    latestProducts = await appClient.entities.Product.list('-created_date', 20000);
    await persistJob(job, false);
    await waitForUi();
  }

  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  await persistJob(job, false);
  return job;
}

export async function rollbackImport(importId) {
  const job = await loadImportJob(importId);
  if (!job) throw new Error('Import job not found.');

  for (const productId of [...new Set(job.rollback.createdIds.filter(Boolean))]) {
    await appClient.entities.Product.delete(productId);
  }

  for (const item of [...job.rollback.updatedSnapshots].reverse()) {
    if (!item?.id || !item?.snapshot) continue;
    await appClient.entities.Product.update(item.id, item.snapshot);
  }

  const history = await loadImportHistory();
  const current = history.find((entry) => entry.importId === importId);
  if (current) {
    await saveHistoryEntry({
      ...current,
      status: 'rolled_back',
      canResume: false,
      canRollback: false,
    });
  }

  return true;
}

export async function deleteImportArtifacts(importId) {
  await deleteSetting(`${JOB_META_PREFIX}${importId}`);
  const settings = await listAppSettings();
  const prefixes = [JOB_ROWS_PREFIX, JOB_CREATED_IDS_PREFIX, JOB_UPDATED_SNAPSHOTS_PREFIX].map((prefix) => `${prefix}${importId}_`);
  const staleKeys = settings.filter((entry) => prefixes.some((prefix) => String(entry.key || '').startsWith(prefix))).map((entry) => entry.key);
  await Promise.all(staleKeys.map((key) => deleteSetting(key)));
}

export async function downloadErrorReport(importId) {
  const job = await loadImportJob(importId);
  if (!job) throw new Error('Import job not found.');
  if (!job.errorRows?.length) throw new Error('This import does not have any failed rows.');

  const worksheet = XLSX.utils.json_to_sheet(job.errorRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');
  XLSX.writeFile(workbook, `${job.fileName.replace(/\.[^.]+$/, '') || 'product-import'}-errors.xlsx`);
}
