const SITE_NAME = 'FMM CLASSICO';
const SITE_URL = 'https://fmmclassico.com';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;
const DEFAULT_KEYWORDS = 'FMM CLASSICO, FMM, CLASSICO, FMM CLASSICO Ghana, phones Ghana, phone accessories Ghana, electronics Ghana, home appliances Ghana, branded products Ghana, online store Ghana, shop in Ghana, phone shop in Ghana, electronics shop in Ghana';
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, follow';

const PATH_META = {
  '/': {
    title: 'FMM CLASSICO | Phones, Phone Accessories, Electronics, Home Appliances & Branded Products',
    description: 'FMM CLASSICO is your trusted destination in Ghana for smartphones, phone accessories, electronics, home appliances and branded products.',
  },
  '/phones': {
    title: 'Phones | FMM CLASSICO',
    description: 'Shop smartphones from Apple, Samsung, Tecno, Infinix and more at FMM CLASSICO Ghana.',
  },
  '/phone-accessories': {
    title: 'Phone Accessories | FMM CLASSICO',
    description: 'Shop phone cases, chargers, earphones, cables, power banks and other accessories at FMM CLASSICO Ghana.',
  },
  '/electronics': {
    title: 'Electronics | FMM CLASSICO',
    description: 'Browse TVs, smart watches, audio devices and everyday electronics from FMM CLASSICO Ghana.',
  },
  '/home-appliances': {
    title: 'Home Appliances | FMM CLASSICO',
    description: 'Browse kitchen and household appliances from FMM CLASSICO, including fridges, kettles, cookers and more.',
  },
  '/brands': {
    title: 'Branded Products | FMM CLASSICO',
    description: 'Browse branded products from FMM CLASSICO, including phones, accessories, electronics and home appliance brands.',
  },
  '/categories': {
    title: 'Shop by Category | FMM CLASSICO',
    description: 'Browse FMM CLASSICO departments for phones, accessories, electronics and home appliances.',
    robots: NOINDEX_ROBOTS,
  },
  '/about': {
    title: 'About FMM CLASSICO',
    description: 'Learn more about FMM CLASSICO, our stores and how we serve shoppers across Ghana.',
    robots: NOINDEX_ROBOTS,
  },
  '/allbrands': {
    title: 'All Brands | FMM CLASSICO',
    description: 'Browse every brand configured in FMM CLASSICO.',
    canonicalPath: '/brands',
    robots: NOINDEX_ROBOTS,
  },
  '/privacy-policy': {
    title: 'Privacy Policy | FMM CLASSICO',
    description: 'Read the FMM CLASSICO privacy policy and learn how customer information is collected, used and protected.',
  },
  '/terms-of-service': {
    title: 'Terms of Service | FMM CLASSICO',
    description: 'Read the FMM CLASSICO terms of service for using the website and placing orders.',
  },
};

const NOINDEX_PATH_PREFIXES = ['/admin'];
const NOINDEX_PATHS = new Set([
  '/cart',
  '/checkout',
  '/orders',
  '/ordertracking',
  '/invoices',
  '/notifications',
  '/settings',
  '/chat',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/brandproducts',
  '/home',
  '/about',
  '/categories',
  '/policies',
  '/downloadapp',
  '/mobileappguide',
  '/feedback',
  '/howtouse',
]);

function slugToWords(pathname = '/') {
  const slug = String(pathname || '/').replace(/^\/+|\/+$/g, '');
  if (!slug) return SITE_NAME;
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ensureMeta(attr, key) {
  let element = document.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  return element;
}

function setMeta(attr, key, content) {
  ensureMeta(attr, key).setAttribute('content', content);
}

function setCanonical(pathname) {
  const canonicalPath = pathname || '/';
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = `${SITE_URL}${canonicalPath}`;
}

export function buildSeoMetadata(pathname = '/', search = '') {
  const safePath = pathname || '/';
  const lowerPath = safePath.toLowerCase();
  const fullPath = `${safePath}${search || ''}`;
  const params = new URLSearchParams(search || '');
  const brand = params.get('brand');
  const category = params.get('category');
  const searchTerm = params.get('search');
  const subcategory = params.get('sub');

  if (NOINDEX_PATH_PREFIXES.some((prefix) => lowerPath.startsWith(prefix)) || NOINDEX_PATHS.has(lowerPath)) {
    const pageName = brand ? `${brand} Brand` : slugToWords(safePath);
    return {
      title: `${pageName} | ${SITE_NAME}`,
      description: `Private or utility page for ${SITE_NAME}.`,
      canonicalPath: fullPath,
      robots: NOINDEX_ROBOTS,
    };
  }

  if (lowerPath === '/shop' || lowerPath === '/search') {
    const titlePart = subcategory
      ? decodeURIComponent(subcategory)
      : category
        ? slugToWords(category)
        : searchTerm
          ? `Search: ${searchTerm}`
          : 'Shop';

    return {
      title: `${titlePart} | ${SITE_NAME}`,
      description: `Browse ${titlePart.toLowerCase()} products from FMM CLASSICO Ghana.`,
      canonicalPath: fullPath,
      robots: NOINDEX_ROBOTS,
    };
  }

  const matched = PATH_META[lowerPath];
  if (matched) {
    return {
      title: matched.title,
      description: matched.description,
      canonicalPath: matched.canonicalPath || fullPath || safePath,
      robots: matched.robots || INDEX_ROBOTS,
    };
  }

  return {
    title: `${slugToWords(safePath)} | ${SITE_NAME}`,
    description: PATH_META['/'].description,
    canonicalPath: fullPath || safePath,
    robots: NOINDEX_ROBOTS,
  };
}

export function applySeoMetadata(meta = {}) {
  const title = meta.title || SITE_NAME;
  const description = meta.description || PATH_META['/'].description;
  const robots = meta.robots || INDEX_ROBOTS;
  const canonicalPath = meta.canonicalPath || '/';

  document.title = title;

  setMeta('name', 'description', description);
  setMeta('name', 'keywords', meta.keywords || DEFAULT_KEYWORDS);
  setMeta('name', 'robots', robots);
  setMeta('name', 'googlebot', robots);
  setMeta('name', 'author', SITE_NAME);
  setMeta('name', 'application-name', SITE_NAME);
  setMeta('name', 'apple-mobile-web-app-title', SITE_NAME);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', `${SITE_URL}${canonicalPath}`);
  setMeta('property', 'og:image', DEFAULT_IMAGE);
  setMeta('property', 'og:image:alt', 'FMM CLASSICO logo');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', DEFAULT_IMAGE);
  setCanonical(canonicalPath);
}
