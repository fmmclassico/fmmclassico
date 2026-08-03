export const SITE_NAME = 'FMM CLASSICO';
export const COMPANY_SHORT_DESCRIPTION = 'Phones • Electronics • Home Appliances in Ghana';
export const SITE_URL = 'https://www.fmmclassico.com';
export const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;
const DEFAULT_KEYWORDS = 'FMM CLASSICO, phones Ghana, phone accessories Ghana, electronics Ghana, home appliances Ghana, online store Ghana';
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, follow';

const PATH_META = {
  '/': {
    title: SITE_NAME,
    description: 'Phones • Electronics • Home Appliances. Shop smartphones, accessories, electronics, and home appliances from FMM CLASSICO in Ghana.',
  },
  '/phones': {
    title: `Phones | ${SITE_NAME}`,
    description: 'Shop smartphones from trusted brands at FMM CLASSICO in Ghana.',
  },
  '/phone-accessories': {
    title: `Phone Accessories | ${SITE_NAME}`,
    description: 'Shop chargers, earphones, cases, cables, and power banks at FMM CLASSICO.',
  },
  '/electronics': {
    title: `Electronics | ${SITE_NAME}`,
    description: 'Browse TVs, smart gadgets, and everyday electronics at FMM CLASSICO.',
  },
  '/home-appliances': {
    title: `Home Appliances | ${SITE_NAME}`,
    description: 'Browse kitchen and household appliances from FMM CLASSICO.',
  },
  '/brands': {
    title: `Brands | ${SITE_NAME}`,
    description: 'Browse product brands available at FMM CLASSICO.',
  },
  '/categories': {
    title: `Categories | ${SITE_NAME}`,
    description: 'Explore phones, accessories, electronics, and home appliances at FMM CLASSICO.',
  },
  '/about': {
    title: `About ${SITE_NAME}`,
    description: `Learn more about ${SITE_NAME} and our focus on phones, electronics, and home appliances in Ghana.`,
  },
  '/allbrands': {
    title: `Brands | ${SITE_NAME}`,
    description: 'Browse product brands available at FMM CLASSICO.',
    canonicalPath: '/brands',
    robots: NOINDEX_ROBOTS,
  },
  '/privacy-policy': {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: `Read the ${SITE_NAME} privacy policy.`,
  },
  '/terms-of-service': {
    title: `Terms of Service | ${SITE_NAME}`,
    description: `Read the ${SITE_NAME} terms of service.`,
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
  const canonicalPath = meta.canonicalPath || pathname || '/';

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
      image: DEFAULT_IMAGE,
      description: COMPANY_SHORT_DESCRIPTION,
      sameAs: [
        'https://instagram.com/fmmclassico',
        'https://tiktok.com/@fmmclassico',
        'https://youtube.com/@fmmclassico',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+233208207543',
        contactType: 'customer service',
        email: 'fmmclassico@gmail.com',
        availableLanguage: ['English'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': ['Store', 'OnlineStore'],
      '@id': `${SITE_URL}/#store`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      image: DEFAULT_IMAGE,
      logo: DEFAULT_IMAGE,
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
      '@id': `${SITE_URL}${canonicalPath}#webpage`,
      url: `${SITE_URL}${canonicalPath}`,
      name: meta.title,
      description: meta.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      primaryImageOfPage: DEFAULT_IMAGE,
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
      title: titlePart === 'Shop' ? `Shop | ${SITE_NAME}` : `${titlePart} | ${SITE_NAME}`,
      description: searchTerm
        ? `Search ${SITE_NAME} for ${searchTerm}.`
        : `Browse ${titlePart.toLowerCase()} products from ${SITE_NAME}.`,
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
  setMeta('property', 'og:image:width', '512');
  setMeta('property', 'og:image:height', '512');
  setMeta('property', 'og:locale', 'en_GH');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', DEFAULT_IMAGE);
  setMeta('name', 'twitter:image:alt', 'FMM CLASSICO logo');
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
