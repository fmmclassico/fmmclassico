const WINDOWS_1252_REVERSE_MAP = {
  0x20AC: 0x80,
  0x201A: 0x82,
  0x0192: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02C6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8A,
  0x2039: 0x8B,
  0x0152: 0x8C,
  0x017D: 0x8E,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02DC: 0x98,
  0x2122: 0x99,
  0x0161: 0x9A,
  0x203A: 0x9B,
  0x0153: 0x9C,
  0x017E: 0x9E,
  0x0178: 0x9F,
};

const MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|ðŸ|Å.|�|â‚|â€|â€œ|â€|â„|â€“|â€”)/;
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

function mojibakeScore(value = '') {
  return (String(value).match(/(?:Ã.|Â.|â.|ðŸ|Å.|�|â‚|â€|â€œ|â€|â„|â€“|â€”)/g) || []).length;
}

function toLikelyUtf8Bytes(value = '') {
  const bytes = [];

  for (const char of String(value)) {
    const codePoint = char.charCodeAt(0);

    if (codePoint <= 0xFF) {
      bytes.push(codePoint);
      continue;
    }

    if (WINDOWS_1252_REVERSE_MAP[codePoint] !== undefined) {
      bytes.push(WINDOWS_1252_REVERSE_MAP[codePoint]);
      continue;
    }

    return null;
  }

  return Uint8Array.from(bytes);
}

function decodeLikelyMojibake(value = '') {
  if (!decoder) return value;

  const bytes = toLikelyUtf8Bytes(value);
  if (!bytes) return value;

  try {
    return decoder.decode(bytes);
  } catch (_) {
    return value;
  }
}

export function normalizeText(value) {
  if (typeof value !== 'string') return value;

  let current = value
    .replace(/&nbsp;/gi, ' ')
    .replace(/ /g, ' ')
    .trim() === '' ? value.replace(/&nbsp;/gi, ' ').replace(/ /g, ' ') : value.replace(/&nbsp;/gi, ' ').replace(/ /g, ' ');

  if (!MOJIBAKE_PATTERN.test(current)) {
    return current;
  }

  for (let index = 0; index < 2; index += 1) {
    const decoded = decodeLikelyMojibake(current);
    if (!decoded || decoded === current) break;
    if (mojibakeScore(decoded) > mojibakeScore(current)) break;
    current = decoded;
  }

  return current;
}

export function normalizeTextDeep(value) {
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map((entry) => normalizeTextDeep(entry));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, normalizeTextDeep(entry)])
  );
}
