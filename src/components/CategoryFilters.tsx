'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CatalogFilters,
  CategoryKey,
  Product,
  getAllowedBrands,
  getAllowedSubcategories,
  getVisibleProducts,
  sanitizeFilters,
} from '../lib/catalog-filtering';

type Props = {
  products: Product[];
  onFilteredProductsChange?: (products: Product[]) => void;
};

const CATEGORY_OPTIONS: { label: string; value: CategoryKey }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Phones', value: 'phones' },
  { label: 'Phone Accessories', value: 'phone-accessories' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Home Appliances', value: 'home-appliances' },
];

export default function CategoryFilters({ products, onFilteredProductsChange }: Props) {
  const [filters, setFilters] = useState<CatalogFilters>({
    category: 'all',
    subcategory: 'all',
    brand: 'all',
    search: '',
  });

  const safeFilters = useMemo(() => sanitizeFilters(products, filters), [products, filters]);
  const subcategories = useMemo(() => getAllowedSubcategories(products, safeFilters.category), [products, safeFilters.category]);
  const brands = useMemo(() => getAllowedBrands(products, safeFilters.category), [products, safeFilters.category]);
  const filteredProducts = useMemo(() => getVisibleProducts(products, safeFilters), [products, safeFilters]);

  useEffect(() => {
    onFilteredProductsChange?.(filteredProducts);
  }, [filteredProducts, onFilteredProductsChange]);

  useEffect(() => {
    if (
      safeFilters.subcategory !== filters.subcategory ||
      safeFilters.brand !== filters.brand
    ) {
      setFilters(safeFilters);
    }
  }, [safeFilters, filters.subcategory, filters.brand]);

  return (
    <section className="section-page-filters">
      <div className="section-page-filters__row">
        <select
          value={safeFilters.category}
          onChange={(e) => {
            const nextCategory = e.target.value as CategoryKey;
            setFilters((prev) => ({
              ...prev,
              category: nextCategory,
              subcategory: 'all',
              brand: 'all',
            }));
          }}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={safeFilters.subcategory}
          onChange={(e) => setFilters((prev) => ({ ...prev, subcategory: e.target.value }))}
        >
          {subcategories.map((subcategory) => (
            <option key={subcategory} value={subcategory}>
              {subcategory === 'all' ? 'All Subcategories' : subcategory}
            </option>
          ))}
        </select>

        <select
          value={safeFilters.brand}
          onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value }))}
        >
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand === 'all' ? 'All Brands' : brand}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search products..."
          value={safeFilters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />
      </div>

      <div className="section-page-filters__count">
        {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
      </div>

      <div className="products-grid">
        {filteredProducts.map((product) => (
          <article className="product-card" key={product.id}>
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p>{product.brand}</p>
            <span>₵{product.price.toFixed(2)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
