function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[
,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function generateDescription(product = {}) {
  const name = String(product.name ?? 'Product').trim();
  const brand = String(product.brand ?? '').trim();
  const category = String(product.subcategory || product.category || '').trim();
  const features = normalizeList(product.features).slice(0, 5);
  const colors = normalizeList(product.available_colors || product.colors);
  const variants = normalizeList(product.available_types || product.variants);

  const introBits = [];
  if (brand) introBits.push(brand);
  if (category) introBits.push(category);

  const introText = introBits.length
    ? `${name} is a ${introBits.join(' ')} designed for reliable everyday use.`
    : `${name} is a reliable product designed for everyday use.`;

  const featureItems = [
    ...features,
    brand ? `Authentic ${brand} quality` : 'High quality product',
    'Fast delivery available',
  ].slice(0, 5);

  const specs = [];
  if (product.warranty) specs.push(`<li><strong>Warranty:</strong> ${escapeHtml(product.warranty)}</li>`);
  if (product.storage) specs.push(`<li><strong>Storage:</strong> ${escapeHtml(product.storage)}</li>`);
  if (product.ram) specs.push(`<li><strong>RAM:</strong> ${escapeHtml(product.ram)}</li>`);
  if (product.capacity) specs.push(`<li><strong>Capacity:</strong> ${escapeHtml(product.capacity)}</li>`);
  if (product.power) specs.push(`<li><strong>Power:</strong> ${escapeHtml(product.power)}</li>`);
  if (product.voltage) specs.push(`<li><strong>Voltage:</strong> ${escapeHtml(product.voltage)}</li>`);
  if (product.screen_size) specs.push(`<li><strong>Screen Size:</strong> ${escapeHtml(product.screen_size)}</li>`);

  const colorLine = colors.length
    ? `<p><strong>Available colours:</strong> ${escapeHtml(colors.join(', '))}</p>`
    : '';

  const variantLine = variants.length
    ? `<p><strong>Available options:</strong> ${escapeHtml(variants.join(', '))}</p>`
    : '';

  const featuresHtml = featureItems
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const specsHtml = specs.length
    ? `<h3>Key specifications</h3><ul>${specs.join('')}</ul>`
    : '';

  return [
    `<h2>${escapeHtml(name)}</h2>`,
    `<p>${escapeHtml(introText)}</p>`,
    '<h3>Why customers will like it</h3>',
    `<ul>${featuresHtml}</ul>`,
    colorLine,
    variantLine,
    specsHtml,
    '<p>Order from FMM CLASSICO for trusted support and fast delivery where available.</p>',
  ].filter(Boolean).join('');
}
