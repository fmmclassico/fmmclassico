export function generateDescription(product) {
  product = product || {};

  var name = String(product.name || 'Product').trim();
  var brand = String(product.brand || '').trim();
  var category = String(product.subcategory || product.category || '').trim();
  var features = String(product.features || 'High quality product').trim();
  var warranty = String(product.warranty || 'Seller warranty available').trim();

  var intro = name + ' is a reliable product';

  if (brand) {
    intro += ' from ' + brand;
  }

  if (category) {
    intro += ' in the ' + category + ' category';
  }

  intro += '.';

  return '' +
    '<h2>' + name + '</h2>' +
    '<p>' + intro + '</p>' +
    '<h3>Features</h3>' +
    '<ul>' +
      '<li>' + features + '</li>' +
      '<li>Genuine product</li>' +
      '<li>Fast delivery available</li>' +
    '</ul>' +
    '<h3>Warranty</h3>' +
    '<p>' + warranty + '</p>' +
    '<p>Order from FMM CLASSICO for trusted support and fast delivery where available.</p>';
}
