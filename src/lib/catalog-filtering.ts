export type CategoryKey = 'all' | 'phones' | 'phone-accessories' | 'electronics' | 'home-appliances';

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: Exclude<CategoryKey, 'all'>;
  subcategory: string;
  brand: string;
  price: number;
  inStock: boolean;
  image: string;
};

export type CatalogFilters = {
  category: CategoryKey;
  subcategory: string;
  brand: string;
  search: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export function getVisibleProducts(products: Product[], filters: CatalogFilters): Product[] {
  const search = normalize(filters.search || '');

  return products.filter((product) => {
    const categoryMatch =
      filters.category === 'all' ? true : product.category === filters.category;

    const subcategoryMatch =
      filters.subcategory === 'all' ? true : normalize(product.subcategory) === normalize(filters.subcategory);

    const brandMatch =
      filters.brand === 'all' ? true : normalize(product.brand) === normalize(filters.brand);

    const searchMatch =
      !search ||
      normalize(product.name).includes(search) ||
      normalize(product.brand).includes(search) ||
      normalize(product.subcategory).includes(search);

    return categoryMatch && subcategoryMatch && brandMatch && searchMatch;
  });
}

export function getAllowedSubcategories(products: Product[], selectedCategory: CategoryKey): string[] {
  const source =
    selectedCategory === 'all'
      ? products
      : products.filter((product) => product.category === selectedCategory);

  return ['all', ...Array.from(new Set(source.map((product) => product.subcategory))).sort((a, b) => a.localeCompare(b))];
}

export function getAllowedBrands(products: Product[], selectedCategory: CategoryKey): string[] {
  const source =
    selectedCategory === 'all'
      ? products
      : products.filter((product) => product.category === selectedCategory);

  return ['all', ...Array.from(new Set(source.map((product) => product.brand))).sort((a, b) => a.localeCompare(b))];
}

export function sanitizeFilters(products: Product[], filters: CatalogFilters): CatalogFilters {
  const allowedSubcategories = getAllowedSubcategories(products, filters.category);
  const allowedBrands = getAllowedBrands(products, filters.category);

  return {
    ...filters,
    subcategory: allowedSubcategories.includes(filters.subcategory) ? filters.subcategory : 'all',
    brand: allowedBrands.includes(filters.brand) ? filters.brand : 'all',
  };
}
