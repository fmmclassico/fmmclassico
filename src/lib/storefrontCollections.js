export const CATEGORY_LABELS = {
  phones: 'Phones',
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronics',
  home_appliances: 'Home Appliances',
};

export const SECTION_CONFIG = {
  'classico-deals': {
    title: 'FMM CLASSICO Deals',
    description: 'All products in FMM CLASSICO Deals.',
    match: (product) => product.flash_sale === true,
  },
  'donkomi-deals': {
    title: 'Donkomi Deals',
    description: 'All products in Donkomi Deals.',
    match: (product) => product.donkomi === true,
  },
  'new-arrivals': {
    title: 'New Arrivals',
    description: 'Latest products added to the store.',
    match: (product) => product.new_arrival === true,
  },
  'best-selling': {
    title: 'Best Selling',
    description: 'Top selling products.',
    match: (product) => product.top_selling === true,
  },
  'featured-products': {
    title: 'Featured Products',
    description: 'Featured products selected by admin.',
    match: (product) => product.featured === true,
  },
};

export const DEPARTMENT_SLUGS = {
  'phones': {
    title: 'Phones',
    categories: ['phones'],
  },
  'phone-accessories': {
    title: 'Phone Accessories',
    categories: ['phone_cases', 'chargers', 'earphones', 'cables', 'power_banks', 'screen_protectors', 'holders', 'speakers'],
  },
  'electronics': {
    title: 'Electronics',
    categories: ['electronic_appliances', 'smart_watches'],
  },
  'home-appliances': {
    title: 'Home Appliances',
    categories: ['home_appliances'],
  },
};

export function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function unslugify(value = '') {
  return String(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getVisibleProducts(products = []) {
  return products.filter((product) => product.is_visible !== false && !(product.stock != null && product.stock === 0));
}

export function getAvailableBrands(products = []) {
  return [...new Set(products.map((product) => product.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function getAvailableSubcategories(products = []) {
  return [...new Set(products.map((product) => product.subcategory).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function resolveCollectionFromSlug(slug, products = []) {
  const normalized = slugify(slug);
  const visibleProducts = getVisibleProducts(products);

  if (normalized === 'brands') {
    return {
      type: 'brands_index',
      title: 'Brands',
      description: 'Browse all available brands.',
      products: [],
      brands: getAvailableBrands(visibleProducts),
    };
  }

  if (SECTION_CONFIG[normalized]) {
    return {
      type: 'section',
      title: SECTION_CONFIG[normalized].title,
      description: SECTION_CONFIG[normalized].description,
      products: visibleProducts.filter(SECTION_CONFIG[normalized].match),
    };
  }

  if (DEPARTMENT_SLUGS[normalized]) {
    const config = DEPARTMENT_SLUGS[normalized];
    return {
      type: 'department',
      title: config.title,
      description: `Browse all ${config.title}.`,
      products: visibleProducts.filter((product) => config.categories.includes(product.category)),
    };
  }

  const matchingBrand = getAvailableBrands(visibleProducts).find((brand) => slugify(brand) === normalized);
  if (matchingBrand) {
    return {
      type: 'brand',
      title: matchingBrand,
      description: `Browse all ${matchingBrand} products.`,
      products: visibleProducts.filter((product) => (product.brand || '').toLowerCase() === matchingBrand.toLowerCase()),
    };
  }

  const matchingSubcategory = getAvailableSubcategories(visibleProducts).find((subcategory) => slugify(subcategory) === normalized);
  if (matchingSubcategory) {
    return {
      type: 'subcategory',
      title: matchingSubcategory,
      description: `Browse all ${matchingSubcategory} products.`,
      products: visibleProducts.filter((product) => (product.subcategory || '') === matchingSubcategory),
    };
  }

  const matchingCategoryEntry = Object.entries(CATEGORY_LABELS).find(([categoryKey, categoryLabel]) => {
    return slugify(categoryKey) === normalized || slugify(categoryLabel) === normalized;
  });

  if (matchingCategoryEntry) {
    const [categoryKey, categoryLabel] = matchingCategoryEntry;
    return {
      type: 'category',
      title: categoryLabel,
      description: `Browse all ${categoryLabel}.`,
      products: visibleProducts.filter((product) => product.category === categoryKey),
    };
  }

  return null;
}

