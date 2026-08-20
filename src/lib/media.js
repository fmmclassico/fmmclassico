const MEDIA_PROTOCOL_RE = /^(?:https?:)?\/\//i;
const CLOUDINARY_UPLOAD_SEGMENT = '/upload/';
const DEFAULT_WIDTHS = [320, 480, 640, 768, 960, 1200, 1600];

export function normalizeMediaUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (/^http:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }

  return trimmed;
}

export function uniqueMediaCandidates(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => normalizeMediaUrl(value)).filter(Boolean))];
}

export function isExternalMediaUrl(value) {
  return MEDIA_PROTOCOL_RE.test(normalizeMediaUrl(value));
}

function withSearchParam(url, key, value) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set(key, String(value));
  return nextUrl.toString();
}

function optimizeUnsplashUrl(url, width, quality = 70) {
  let next = withSearchParam(url, 'auto', 'format');
  next = withSearchParam(next, 'fit', 'max');
  next = withSearchParam(next, 'w', width);
  next = withSearchParam(next, 'q', quality);
  return next;
}

function optimizeCloudinaryUrl(url, width, quality = 'auto') {
  if (!url.includes(CLOUDINARY_UPLOAD_SEGMENT)) return url;
  const transformation = `f_auto,q_${quality},w_${width},c_limit`;
  if (url.includes(`/${transformation}/`)) return url;
  return url.replace(CLOUDINARY_UPLOAD_SEGMENT, `${CLOUDINARY_UPLOAD_SEGMENT}${transformation}/`);
}

export function getOptimizedMediaUrl(value, options = {}) {
  const normalized = normalizeMediaUrl(value);
  if (!normalized || !isExternalMediaUrl(normalized)) return normalized;

  const width = Number(options.width) || 960;
  const quality = options.quality ?? 70;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('images.unsplash.com')) {
      return optimizeUnsplashUrl(url.toString(), width, Number(quality) || 70);
    }

    if (hostname.includes('res.cloudinary.com')) {
      return optimizeCloudinaryUrl(url.toString(), width, quality === 'auto' ? 'auto' : Number(quality) || 70);
    }

    if (hostname.includes('images.pexels.com') || hostname.includes('images.pixabay.com')) {
      url.searchParams.set('auto', 'compress');
      url.searchParams.set('cs', 'tinysrgb');
      url.searchParams.set('w', String(width));
      url.searchParams.set('dpr', '1');
      return url.toString();
    }
  } catch (_) {
    return normalized;
  }

  return normalized;
}

export function getResponsiveImageSources(value, widths = DEFAULT_WIDTHS, options = {}) {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return [];
  const supportedWidths = [...new Set((Array.isArray(widths) ? widths : DEFAULT_WIDTHS).map((width) => Number(width)).filter(Boolean))];
  if (!isExternalMediaUrl(normalized)) {
    return supportedWidths.length ? [{ src: normalized, width: supportedWidths[0] }] : [{ src: normalized, width: 0 }];
  }
  return supportedWidths.map((width) => ({
    width,
    src: getOptimizedMediaUrl(normalized, { ...options, width }),
  }));
}

export function buildSrcSet(value, widths = DEFAULT_WIDTHS, options = {}) {
  return getResponsiveImageSources(value, widths, options)
    .filter((entry) => entry?.src && entry?.width)
    .map((entry) => `${entry.src} ${entry.width}w`)
    .join(', ');
}
