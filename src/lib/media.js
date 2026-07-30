const MEDIA_PROTOCOL_RE = /^(?:https?:)?\/\//i;

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
