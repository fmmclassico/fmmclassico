function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    return [...new Set(
      value
        .split(/[
,;|]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )];
  }

  return [];
}

function formatSpec(label, value) {
  const safeValue = String(value || '').trim();
  return safeValue ? `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(safeValue)}</li>` : '';
}

export function generateDescription(product = {}) {
  const name = String(product.name || 'Product').trim();
  const brand = String(product.brand || '').trim();
  const category = String(product.subcategory || product.category || '').trim();
  const features = normalizeList(product.features);
  const colors = normalizeList(product.available_colors || product.colors);
  const variants = normalizeList(product.available_types || product.variants);
  const specs = [
    formatSpec('Warranty', product.warranty),
    formatSpec('Storage', product.storage),
    formatSpec('RAM', product.ram),
    formatSpec('Capacity', product.capacity),
    formatSpec('Power', product.power),
    formatSpec('Voltage', product.voltage),
    formatSpec('Screen Size', product.screen_size),
  ].filter(Boolean);

  const highlightItems = [
    ...features,
    ...(brand ? [`Authentic ${brand} quality`] : []),
    ...(category ? [`Designed for ${category}`] : []),
    'Reliable performance for everyday use',
    'Available now from FMM CLASSICO',
  ].filter(Boolean);

  const dedupedHighlights = [...new Set(highlightItems)].slice(0, 5);
  const colorLine = colors.length ? `<p><strong>Available colours:</strong> ${escapeHtml(colors.join(', '))}</p>` : '';
  const variantLine = variants.length ? `<p><strong>Available options:</strong> ${escapeHtml(variants.join(', '))}</p>` : '';
  const introParts = [brand, category].filter(Boolean);
  const intro = introParts.length
    ? `${escapeHtml(name)} is a ${escapeHtml(introParts.join(' '))} built to give customers dependable performance and value.`
    : `${escapeHtml(name)} is a dependable product built for customers who want quality, convenience, and everyday value.`;

  return `
<h2>${escapeHtml(name)}</h2>
<p>${intro}</p>
<h3>Why customers will like it</h3><ul>
${dedupedHighlights.map((item) => `  <li>${escapeHtml(item)}</li>`).join('
')}
</ul>
${colorLine}
${variantLine}
${specs.length ? `<h3>Key specifications</h3><ul>
${specs.map((item) => `  ${item}`).join('
')}
</ul>` : ''}
<p>Order from FMM CLASSICO for a trusted shopping experience, helpful support, and fast delivery options where available.</p>
`.trim();
}
