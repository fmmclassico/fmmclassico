export const SITE_NAME = 'FMM CLASSICO';
export const COMPANY_SHORT_DESCRIPTION = 'Your trusted Destination for Quality Products';
export const SITE_URL = 'https://www.fmmclassico.com';
export const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;
const DEFAULT_KEYWORDS = 'FMM CLASSICO, FMM CLASSICO Ghana, phones Ghana, phone accessories Ghana, electronics Ghana, home appliances Ghana, online store Ghana, shop in Ghana, phone shop in Ghana, electronics shop in Ghana';
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, follow';

const PATH_META = {
  '/': {
    title: 'FMM CLASSICO | Phones, Phone Accessories, Electronics, Home Appliances & Branded Products',
    description: `FMM CLASSICO — ${COMPANY_SHORT_DESCRIPTION}. Shop smartphones, phone accessories, electronics, home appliances and branded products in Ghana.`,
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
  },
  '/about': {
    title: 'About FMM CLASSICO',
    description: `Learn more about FMM CLASSICO and ${COMPANY_SHORT_DESCRIPTION.toLowerCase()}.`,
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

function structuredDataForPath(pathname = '/', search = '') {
  const meta = buildSeoMetadata(pathname, search);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE,
      },
      description: COMPANY_SHORT_DESCRIPTION,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+233208207543',
        contactType: 'customer service',
        email: 'fmmclassico@gmail.com',
        availableLanguage: ['English'],
      },
      sameAs: [
        'https://instagram.com/fmmclassico',
        'https://tiktok.com/@fmmclassico',
        'https://youtube.com/@fmmclassico',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': ['OnlineStore', 'Store'],
      '@id': `${SITE_URL}/#store`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      image: DEFAULT_IMAGE,
      description: COMPANY_SHORT_DESCRIPTION,
      telephone: '+233208207543',
      email: 'fmmclassico@gmail.com',
      priceRange: 'GH₵',
      currenciesAccepted: 'GHS',
      paymentAccepted: 'Mobile Money, Card Payment, Online Payment',
      areaServed: [
        { '@type': 'City', name: 'Accra' },
        { '@type': 'City', name: 'Kumasi' },
        { '@type': 'City', name: 'Tarkwa' },
        { '@type': 'Country', name: 'Ghana' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: COMPANY_SHORT_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-GH',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/shop?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}${meta.canonicalPath || pathname || '/'}#webpage`,
      name: meta.title,
      description: meta.description,
      url: `${SITE_URL}${meta.canonicalPath || pathname || '/'}`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
  ];
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

  if (lowerPath === '/shop') {
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
      robots: searchTerm || category || subcategory ? NOINDEX_ROBOTS : INDEX_ROBOTS,
    };
  }

  if (lowerPath === '/search') {
    return {
      title: `Search | ${SITE_NAME}`,
      description: `Search products at ${SITE_NAME}.`,
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
  setMeta('property', 'og:locale', 'en_GH');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', DEFAULT_IMAGE);
  setCanonical(canonicalPath);
}

export function applyStructuredData(pathname = '/', search = '') {
  let script = document.querySelector('#fmm-structured-data');
  if (!script) {
    script = document.createElement('script');
    script.id = 'fmm-structured-data';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(structuredDataForPath(pathname, search));
}

