import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/lib/utils';
import { CATEGORY_LABELS, resolveCollectionFromSlug, getVisibleProducts, getAvailableBrands, getAvailableSubcategories } from '@/lib/storefrontCollections';
import { getBrandLogo, getBrandProductCount, getVisibleBrandDirectory } from '@/lib/brandDirectory';
import ProductCard from '@/components/products/ProductCard';
import PageNotFound from '@/lib/PageNotFound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, ChevronRight } from 'lucide-react';

export default function CollectionPage() {
  const { collectionSlug } = useParams();
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [brandsWithProductsOnly, setBrandsWithProductsOnly] = useState(false);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const settings = Array.isArray(appSettings) ? appSettings : [];
  const visibleProducts = useMemo(() => getVisibleProducts(allProducts), [allProducts]);
  const collection = useMemo(() => resolveCollectionFromSlug(collectionSlug, visibleProducts), [collectionSlug, visibleProducts]);

  const brandDirectory = useMemo(() => getVisibleBrandDirectory(settings, allProducts), [settings, allProducts]);

  const filteredBrandDirectory = useMemo(() => {
    return brandDirectory.filter((entry) => {
      const term = brandSearch.trim().toLowerCase();
      const productCount = getBrandProductCount(visibleProducts, entry);
      if (brandsWithProductsOnly && productCount === 0) return false;
      if (!term) return true;
      return entry.displayName.toLowerCase().includes(term) || entry.sourceName.toLowerCase().includes(term);
    });
  }, [brandDirectory, brandSearch, brandsWithProductsOnly, visibleProducts]);

  const filteredProducts = useMemo(() => {
    if (!collection || collection.type === 'brands_index') return [];

    let products = [...collection.products];

    if (categoryFilter !== 'all') products = products.filter((product) => product.category === categoryFilter);
    if (subcategoryFilter !== 'all') products = products.filter((product) => (product.subcategory || '') === subcategoryFilter);
    if (brandFilter !== 'all') products = products.filter((product) => (product.brand || '') === brandFilter);
    if (availabilityFilter === 'in_stock') products = products.filter((product) => product.stock == null || product.stock > 0);
    if (availabilityFilter === 'preorder') products = products.filter((product) => String(product.availability || '').toLowerCase() === 'pre-order');
    if (availabilityFilter === 'out_of_stock') products = products.filter((product) => product.stock === 0 || String(product.availability || '').toLowerCase() === 'out of stock');
    if (minPrice !== '') products = products.filter((product) => Number(product.price) >= Number(minPrice));
    if (maxPrice !== '') products = products.filter((product) => Number(product.price) <= Number(maxPrice));

    switch (sortBy) {
      case 'best_selling':
        products.sort((a, b) => Number(b.reviews_count || 0) - Number(a.reviews_count || 0));
        break;
      case 'most_popular':
        products.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
        break;
      case 'highest_rated':
        products.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
      case 'price_low':
        products.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case 'price_high':
        products.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case 'newest':
      default:
        products.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
        break;
    }

    return products;
  }, [collection, sortBy, categoryFilter, subcategoryFilter, brandFilter, availabilityFilter, minPrice, maxPrice]);

  const brands = useMemo(() => getAvailableBrands(collection?.products || []), [collection]);
  const subcategories = useMemo(() => getAvailableSubcategories(collection?.products || []), [collection]);
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set((collection?.products || []).map((product) => product.category).filter(Boolean))];
    return uniqueCategories.map((category) => ({ value: category, label: CATEGORY_LABELS[category] || category }));
  }, [collection]);

  const clearFilters = () => {
    setSortBy('newest');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setBrandFilter('all');
    setAvailabilityFilter('all');
    setMinPrice('');
    setMaxPrice('');
  };

  if (!collection) return <PageNotFound />;

  if (collection.type === 'brands_index') {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <Link to={createPageUrl('Home')} className="hover:text-[#0A2E60]">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span>Brands</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">Shop by Brand</h1>
              <p className="text-gray-500">Browse every visible brand exactly as managed from admin.</p>
            </div>

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open brand filters" className="h-10 w-10 shrink-0 rounded-full border-gray-300">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Brand Filters</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Search brand</label>
                    <Input value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="Type a brand name" className="rounded-xl" />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                    <input type="checkbox" checked={brandsWithProductsOnly} onChange={(event) => setBrandsWithProductsOnly(event.target.checked)} className="h-4 w-4" />
                    <span>Show only brands with products</span>
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setBrandSearch(''); setBrandsWithProductsOnly(false); }}>Clear</Button>
                    <Button className="flex-1 rounded-xl bg-[#0A2E60] hover:bg-[#082449]" onClick={() => setFiltersOpen(false)}>Done</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredBrandDirectory.map((entry) => {
            const logoSrc = getBrandLogo(settings, entry.key);
            const productCount = getBrandProductCount(visibleProducts, entry);
            return (
              <Link
                key={entry.key}
                to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(entry.sourceName)}`)}
                className="group flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 transition-all hover:border-[#0A2E60]/30 hover:shadow-md"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2 group-hover:scale-105 transition-transform">
                  {logoSrc ? (
                    <img src={logoSrc} alt={entry.displayName} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">{(entry.displayName || entry.sourceName)[0]}</span>
                  )}
                </div>
                {entry.showName !== false && (
                  <span className="text-center text-xs font-semibold text-gray-700">{entry.displayName || entry.sourceName}</span>
                )}
                <span className="text-[10px] text-gray-400">{productCount} product{productCount === 1 ? '' : 's'}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight text-gray-800 md:text-3xl">{collection.title}</h1>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open filters" className="h-10 w-10 shrink-0 rounded-full border-gray-300">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                  <option value="all">All Categories</option>
                  {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Subcategory</label>
                <select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                  <option value="all">All Subcategories</option>
                  {subcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Brand</label>
                <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                  <option value="all">All Brands</option>
                  {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Availability</label>
                <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                  <option value="all">All</option>
                  <option value="in_stock">In Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="preorder">Pre-order</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
                  <option value="newest">Newest</option>
                  <option value="best_selling">Best Selling</option>
                  <option value="most_popular">Most Popular</option>
                  <option value="highest_rated">Highest Rated</option>
                  <option value="price_low">Price Low → High</option>
                  <option value="price_high">Price High → Low</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Min Price</label>
                  <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" type="number" className="rounded-xl" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Max Price</label>
                  <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="5000" type="number" className="rounded-xl" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={clearFilters}>Clear Filters</Button>
                <Button className="flex-1 rounded-xl bg-[#0A2E60] hover:bg-[#082449]" onClick={() => setFiltersOpen(false)}>Done</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {Array(10).fill(0).map((_, index) => <div key={index} className="aspect-[0.8] animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="rounded-xl border bg-white py-16 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">No products found</h3>
          <p className="text-gray-500">Try adjusting the filters above.</p>
        </div>
      )}
    </div>
  );
}
