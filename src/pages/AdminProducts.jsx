import { appClient } from '@/api/appClient.js';
import { normalizeText, normalizeTextDeep } from '@/lib/text';

export const MAIN_CATEGORY_GROUPS = [
  { label: 'Phones', id: 'phones' },
  { label: 'Phone Accessories', id: 'phone_accessories' },
  { label: 'Electronics', id: 'electronics' },
  { label: 'Home Appliances', id: 'home_appliances_group' },
];

export const GROUP_CATEGORIES = {
  phones: [{ value: 'phones', label: 'Phones' }],
  phone_accessories: [
    { value: 'phone_cases', label: 'Phone Cases' },
    { value: 'chargers', label: 'Chargers' },
    { value: 'earphones', label: 'Earphones' },
    { value: 'cables', label: 'Cables' },
    { value: 'power_banks', label: 'Power Banks' },
    { value: 'screen_protectors', label: 'Screen Protectors' },
    { value: 'holders', label: 'Holders & Mounts' },
    { value: 'speakers', label: 'Speakers' },
    { value: 'smart_watches', label: 'Smart Watches' },
  ],
  electronics: [{ value: 'electronic_appliances', label: 'Electronic Appliances' }],
  home_appliances_group: [{ value: 'home_appliances', label: 'Home Appliances' }],
};

export const GROUP_BRANDS = {
  phones: ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Itel', 'Other (type below)'],
  phone_accessories: ['Apple', 'Samsung', 'Oraimo', 'JBL', 'Sony', 'LG', 'Other (type below)'],
  electronics: ['Samsung', 'Sony', 'LG', 'TCL', 'Hisense', 'Midea', 'Other (type below)'],
  home_appliances_group: ['Samsung', 'LG', 'Hisense', 'TCL', 'Midea', 'Roch', 'Silver Crest', 'Nasco', 'Hoffman', 'Other (type below)'],
};

export const CATEGORY_SUBCATEGORIES = {
  phones: [
    'iPhone SE', 'iPhone 11', 'iPhone 12 Series', 'iPhone 13 Series', 'iPhone 14 Series', 'iPhone 15 Series', 'iPhone 16 Series',
    'Galaxy A Series', 'Galaxy S Series', 'Galaxy Z Fold/Flip',
    'Tecno Spark Series', 'Tecno Camon Series', 'Tecno Phantom Series', 'Tecno Pop Series',
    'Infinix Hot Series', 'Infinix Note Series', 'Infinix Smart Series', 'Infinix Zero Series',
    'Itel A Series', 'Itel S Series', 'Itel P Series (Big Battery)',
  ],
  phone_cases: [
    'iPhone Cases', 'Samsung Galaxy Cases', 'Tecno Cases', 'Infinix Cases', 'Universal Cases',
    'Clear Cases', 'Leather Cases', 'Wallet Cases', 'Rugged / Armor Cases', 'Silicone Cases',
  ],
  chargers: [
    'Apple 20W Charger', 'MagSafe Charger', 'Apple Car Charger',
    'Samsung Fast Charger', 'Samsung Wireless Charger',
    'Oraimo Fast Charger 20W', 'Oraimo Car Charger', 'Oraimo Wireless Charger', 'Oraimo Multi-port Charger',
    'USB-C Charger', 'USB-A Charger', 'Wireless Charger', 'Car Charger', 'Desktop / Travel Charger',
  ],
  earphones: [
    'AirPods', 'AirPods Pro', 'AirPods Max',
    'Samsung Galaxy Buds', 'Samsung Galaxy Buds Pro',
    'Oraimo FreePods (Wireless Earbuds)', 'Oraimo Neckband Earphones', 'Oraimo Wired Earphones', 'Oraimo Bluetooth Headphones',
    'JBL Tune Earbuds', 'JBL Free X', 'JBL Live Series', 'JBL Wired Earphones',
    'Sony WF Series (Earbuds)', 'Sony WH Series (Headphones)', 'Sony Wired Earphones',
    'Wired Earphones', 'Wireless Earbuds', 'Over-Ear Headphones', 'Neckband / Sports Earphones',
  ],
  cables: [
    'Lightning Cable', 'USB-C to Lightning', 'USB-C Cable', 'Micro USB Cable',
    'Braided Cable', 'Samsung Data Cable', 'Fast Charging Cable', 'Data Transfer Cable', '3-in-1 Cable',
  ],
  power_banks: [
    'Power Bank 5,000mAh', 'Power Bank 10,000mAh', 'Power Bank 20,000mAh', 'Solar Power Bank',
    'Mini Power Bank', 'Fast Charge Power Bank', 'Wireless Power Bank',
  ],
  screen_protectors: [
    'iPhone Screen Protector', 'Samsung Galaxy Screen Protector', 'Universal Screen Protector',
    'Tempered Glass', 'Anti-Glare Screen Protector', 'Privacy Screen Protector', 'Camera Lens Protector',
  ],
  holders: [
    'Car Phone Holder', 'Desk Stand / Phone Stand', 'Ring Holder', 'Tripod Stand',
    'Dashboard Mount', 'Windshield Mount', 'Vent Clip Holder',
  ],
  speakers: [
    'JBL Go', 'JBL Flip', 'JBL Charge', 'JBL Xtreme', 'JBL PartyBox',
    'Sony Portable Speaker', 'Sony Party Speaker',
    'Oraimo Bluetooth Speaker', 'Oraimo Mini Speaker',
    'Portable Bluetooth Speaker', 'Party / Large Speaker', 'Mini Speaker', 'Soundbar',
  ],
  smart_watches: [
    'Apple Watch SE', 'Apple Watch Series 8', 'Apple Watch Series 9', 'Apple Watch Ultra',
    'Samsung Galaxy Watch', 'Oraimo Watch', 'Oraimo Watch Pro',
    'Fitness Tracker / Band', 'Smart Watch with Calling', 'Kids Smart Watch',
  ],
  electronic_appliances: [
    'Smart TV 24"', 'Smart TV 32"', 'Smart TV 43"', 'Smart TV 50"', 'Smart TV 55"', 'Smart TV 65"', 'Smart TV 75"',
    '4K UHD TV', 'OLED TV', 'QLED TV', 'Android TV',
    'Soundbar', 'Home Theatre',
    'Air Conditioner Split Unit', 'Air Purifier',
    'Projector', 'Digital Camera', 'Laptop', 'Desktop Computer',
  ],
  home_appliances: [
    'Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Refrigerator (Side-by-Side)',
    'Chest Freezer', 'Upright Freezer',
    'Washing Machine (Front Load)', 'Washing Machine (Top Load)',
    'Air Conditioner (Window)', 'Air Conditioner (Split Unit)',
    'Microwave Oven', 'Electric Oven',
    'Blender', 'Rice Cooker', 'Electric Kettle', 'Toaster', 'Sandwich Maker',
    'Food Processor', 'Juicer', 'Hand Mixer',
    'Standing Fan', 'Ceiling Fan', 'Table Fan', 'Tower Fan',
    'Water Dispenser', 'Iron',
  ],
};

export const HOME_SECTIONS = [
  { key: 'flash_sale', label: '⚡ CLASSICO Deals (Flash Sale)' },
  { key: 'featured', label: '⭐ Featured / Classico Picks' },
  { key: 'donkomi', label: '🔥 Donkomi Deals (Best Prices)' },
  { key: 'new_arrival', label: '🆕 New Arrivals' },
  { key: 'top_selling', label: '📈 Top Selling' },
];

export const PRESET_COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Gold', 'Silver', 'Rose Gold', 'Purple', 'Orange', 'Pink', 'Navy', 'Grey', 'Clear/Transparent'];

const HOME_SECTION_KEYS = HOME_SECTIONS.map((section) => section.key);
const OPTIONAL_STRING_FIELDS = [
  'sku', 'barcode', 'warranty', 'seo_title', 'seo_description', 'slug', 'main_category', 'product_type',
  'video_provider', 'import_batch_id', 'import_source', 'import_filename', 'storage', 'ram', 'capacity',
  'screen_size', 'voltage', 'power', 'features',
];
const OPTIONAL_ARRAY_FIELDS = ['tags', 'keywords', 'variants', 'colors'];
const OPTIONAL_BOOLEAN_FIELDS = ['reviews_enabled', 'visibility'];

export function buildEmptyProductForm() {
  return {
    name: '',
    description: '',
    price: '',
    original_price: '',
    main_group: '',
    category: '',
    brand: '',
    custom_brand: '',
    subcategory: '',
    custom_subcategory: '',
    stock: '',
    home_sections: [],
    review_enabled: true,
    rating: '',
    reviews_count: '',
    image_url: '',
    image_urls: [],
    video_url: '',
    flash_sale_end: '',
    is_visible: true,
    show_colors: false,
    available_colors: [],
    color_input: '',
    show_wattage: false,
    available_wattage: [],
    wattage_input: '',
    show_type: false,
    available_types: [],
    type_input: '',
  };
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function splitUrlList(value) {
  return [...new Set(
    String(value || '')
      .split(String.fromCharCode(13)).join('')
      .split(String.fromCharCode(10))
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter((item) => isHttpUrl(item))
  )];
}

export function normalizeProductMedia(mainImage, extraImages) {
  const merged = [...new Set([mainImage, ...(extraImages || [])].map((item) => String(item || '').trim()).filter(Boolean))];
  return {
    image_url: merged[0] || '',
    image_urls: merged.slice(1),
  };
}

export function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => normalizeText(String(item || '')).trim()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    const trimmed = normalizeText(value).trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeStringArray(parsed);
      }
    } catch (_) {
      return splitUrlList(trimmed).length > 0 ? splitUrlList(trimmed) : trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

export function deriveMainGroupFromCategory(category = '') {
  const categoryValue = String(category || '').trim();
  const matchedGroup = Object.entries(GROUP_CATEGORIES).find(([, categories]) => categories.some((entry) => entry.value === categoryValue));
  return matchedGroup?.[0] || '';
}

export function hydrateProductForm(product = {}) {
  const normalizedProduct = normalizeTextDeep(product);
  const main_group = deriveMainGroupFromCategory(normalizedProduct.category);
  const home_sections = HOME_SECTION_KEYS.filter((key) => normalizedProduct[key]);

  const knownBrands = GROUP_BRANDS[main_group] || [];
  const knownBrandNames = knownBrands.map((brand) => brand.replace(' (type below)', ''));
  const brandIsKnown = knownBrandNames.includes(normalizedProduct.brand);
  const brandValue = brandIsKnown ? normalizedProduct.brand : 'Other (type below)';
  const customBrand = brandIsKnown ? '' : (normalizedProduct.brand || '');

  const knownSubs = CATEGORY_SUBCATEGORIES[normalizedProduct.category] || [];
  const subIsKnown = knownSubs.includes(normalizedProduct.subcategory);
  const subValue = subIsKnown ? normalizedProduct.subcategory : (normalizedProduct.subcategory ? '__custom__' : '');
  const customSub = subIsKnown ? '' : (normalizedProduct.subcategory || '');
  const media = normalizeProductMedia(normalizedProduct.image_url, normalizeStringArray(normalizedProduct.image_urls));

  return {
    ...buildEmptyProductForm(),
    name: normalizedProduct.name || '',
    description: normalizedProduct.description || '',
    price: normalizedProduct.price ?? '',
    original_price: normalizedProduct.original_price ?? '',
    main_group,
    category: normalizedProduct.category || '',
    brand: brandValue,
    custom_brand: customBrand,
    subcategory: subValue,
    custom_subcategory: customSub,
    stock: normalizedProduct.stock ?? '',
    home_sections,
    review_enabled: normalizedProduct.review_enabled !== false,
    rating: normalizedProduct.rating ?? '',
    reviews_count: normalizedProduct.reviews_count ?? '',
    image_url: media.image_url || '',
    image_urls: media.image_urls,
    video_url: normalizedProduct.video_url || '',
    flash_sale_end: normalizedProduct.flash_sale_end || '',
    is_visible: normalizedProduct.is_visible !== false,
    show_colors: normalizedProduct.show_colors || false,
    available_colors: normalizeStringArray(normalizedProduct.available_colors),
    color_input: '',
    show_wattage: normalizedProduct.show_wattage || false,
    available_wattage: normalizeStringArray(normalizedProduct.available_wattage),
    wattage_input: '',
    show_type: normalizedProduct.show_type || false,
    available_types: normalizeStringArray(normalizedProduct.available_types),
    type_input: '',
    sku: normalizedProduct.sku || '',
    barcode: normalizedProduct.barcode || '',
    tags: normalizeStringArray(normalizedProduct.tags),
    warranty: normalizedProduct.warranty || '',
    voltage: normalizedProduct.voltage || '',
    power: normalizedProduct.power || '',
    capacity: normalizedProduct.capacity || '',
    ram: normalizedProduct.ram || '',
    storage: normalizedProduct.storage || '',
    screen_size: normalizedProduct.screen_size || '',
    features: normalizedProduct.features || '',
    seo_title: normalizedProduct.seo_title || '',
    seo_description: normalizedProduct.seo_description || '',
    keywords: normalizeStringArray(normalizedProduct.keywords),
    slug: normalizedProduct.slug || '',
  };
}

function parseBooleanish(value, defaultValue = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return defaultValue;
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function trimOrNull(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function sanitizeOptionalFields(source = {}) {
  const extras = {};

  OPTIONAL_STRING_FIELDS.forEach((field) => {
    if (field in source) {
      extras[field] = trimOrNull(source[field]);
    }
  });

  OPTIONAL_ARRAY_FIELDS.forEach((field) => {
    if (field in source) {
      extras[field] = normalizeStringArray(source[field]);
    }
  });

  OPTIONAL_BOOLEAN_FIELDS.forEach((field) => {
    if (field in source) {
      extras[field] = parseBooleanish(source[field], false);
    }
  });

  return Object.fromEntries(Object.entries(extras).filter(([, value]) => value !== undefined));
}

export function buildProductPayload(data = {}) {
  const normalizedData = normalizeTextDeep(data);
  const {
    main_group,
    home_sections,
    custom_brand,
    custom_subcategory,
    color_input,
    wattage_input,
    type_input,
    ...rest
  } = normalizedData;

  const sections = Array.isArray(home_sections) ? home_sections : [];
  const finalBrand = rest.brand === 'Other (type below)' ? (custom_brand || 'Other') : rest.brand;
  const finalSubcategory = rest.subcategory === '__custom__' ? (custom_subcategory || '') : rest.subcategory;
  const stockValue = typeof normalizedData.stock === 'string' ? normalizeText(normalizedData.stock).trim() : normalizedData.stock;
  const stockNumber = stockValue === '' ? null : parseInt(stockValue, 10);
  const media = normalizeProductMedia(rest.image_url, normalizeStringArray(rest.image_urls));

  const payload = {
    name: rest.name?.trim(),
    description: typeof rest.description === 'string' ? rest.description : '',
    price: parseNullableNumber(normalizedData.price) ?? 0,
    original_price: parseNullableNumber(normalizedData.original_price),
    category: rest.category,
    brand: finalBrand,
    subcategory: finalSubcategory,
    stock: stockValue === '' ? null : Number.isNaN(stockNumber) ? null : stockNumber,
    rating: parseNullableNumber(normalizedData.rating),
    reviews_count: normalizedData.reviews_count === '' ? null : parseNullableNumber(parseInt(normalizedData.reviews_count, 10)),
    review_enabled: rest.review_enabled !== false,
    is_visible: normalizedData.is_visible !== false,
    image_url: media.image_url || null,
    image_urls: media.image_urls,
    video_url: trimOrNull(rest.video_url),
    flash_sale_end: trimOrNull(rest.flash_sale_end),
    featured: sections.includes('featured'),
    flash_sale: sections.includes('flash_sale'),
    donkomi: sections.includes('donkomi'),
    new_arrival: sections.includes('new_arrival'),
    top_selling: sections.includes('top_selling'),
    show_colors: !!rest.show_colors,
    available_colors: normalizeStringArray(rest.available_colors),
    show_wattage: !!rest.show_wattage,
    available_wattage: normalizeStringArray(rest.available_wattage),
    show_type: !!rest.show_type,
    available_types: normalizeStringArray(rest.available_types),
  };

  return {
    ...payload,
    ...sanitizeOptionalFields(rest),
  };
}

export async function saveProduct({ formData, productId = null }) {
  const payload = buildProductPayload(formData);
  if (productId) {
    return appClient.entities.Product.update(productId, payload);
  }
  return appClient.entities.Product.create(payload);
}

export async function uploadFiles(files = []) {
  const uploadList = Array.isArray(files) ? files : [files];
  const urls = await Promise.all(
    uploadList.filter(Boolean).map((file) => appClient.integrations.Core.UploadFile({ file }).then((result) => result.file_url))
  );
  return urls.filter(Boolean);
}
