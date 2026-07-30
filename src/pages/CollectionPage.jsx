import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient.js';
import { createPageUrl } from '@/lib/utils';
import { CATEGORY_LABELS, resolveCollectionFromSlug, getVisibleProducts, getAvailableBrands, getAvailableSubcategories } from '@/lib/storefrontCollections';
import ProductCard from '@/components/products/ProductCard';
import PageNotFound from '@/lib/PageNotFound';
import { Button } from '@/components/ui/button';
import AllBrands from './AllBrands';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, ChevronRight, X } from 'lucide-react';

export default function CollectionPage() {
  const { collectionSlug } = useParams();
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => appClient.entities.Product.list('-created_date', 300),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const visibleProducts = useMemo(() => getVisibleProducts(allProducts), [allProducts]);
  const collection = useMemo(() => resolveCollectionFromSlug(collectionSlug, visibleProducts), [collectionSlug, visibleProducts]);

  const filteredProducts = useMemo(() => {
    if (!collection || collection.type === 'brands_index') return [];

    let products = [...collection.products];

    if (categoryFilter !== 'all') {
      products = products.filter((product) => product.category === categoryFilter);
    }

    if (subcategoryFilter !== 'all') {
      products = products.filter((product) => (product.subcategory || '') === subcategoryFilter);
    }

    if (brandFilter !== 'all') {
      products = products.filter((product) => (product.brand || '') === brandFilter);
    }

    if (availabilityFilter === 'in_stock') {
      products = products.filter((product) => product.stock == null || product.stock > 0);
    }

    if (availabilityFilter === 'preorder') {
      products = products.filter((product) => String(product.availability || '').toLowerCase() === 'pre-order');
    }

    if (availabilityFilter === 'out_of_stock') {
      products = products.filter((product) => product.stock === 0 || String(product.availability || '').toLowerCase() === 'out of stock');
    }


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
  }, [collection, sortBy, categoryFilter, subcategoryFilter, brandFilter, availabilityFilter]);

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
  };

  const activeFilters = [
    categoryFilter !== 'all' ? `Category: ${CATEGORY_LABELS[categoryFilter] || categoryFilter}` : null,
    subcategoryFilter !== 'all' ? `Subcategory: ${subcategoryFilter}` : null,
    brandFilter !== 'all' ? `Brand: ${brandFilter}` : null,
    availabilityFilter !== 'all' ? `Availability: ${availabilityFilter.replace('_', ' ')}` : null,
    sortBy !== 'newest' ? `Sort: ${sortBy.replace('_', ' ')}` : null,
  ].filter(Boolean);

  if (!collection) {
    return <PageNotFound />;
  }

  if (collection.type === 'brands_index') {
    return <AllBrands />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Link to={createPageUrl('Home')} className="hover:text-[#0A2E60]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{collection.title}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{collection.title}</h1>
        <p className="text-gray-500">{collection.description}</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-sm text-gray-500">{filteredProducts.length} product(s) found</div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-full border-gray-300">
              <Filter className="h-4 w-4 mr-2" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white">
                  <option value="all">All Categories</option>
                  {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Subcategory</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSubcategoryFilter('all')} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${subcategoryFilter === 'all' ? 'border-[#0A2E60] bg-[#0A2E60] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#2E86C1] hover:text-[#0A2E60]'}`}>All Subcategories</button>
                  {subcategories.map((subcategory) => <button key={subcategory} type="button" onClick={() => setSubcategoryFilter(subcategory)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${subcategoryFilter === subcategory ? 'border-[#0A2E60] bg-[#0A2E60] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#2E86C1] hover:text-[#0A2E60]'}`}>{subcategory}</button>)}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Brand</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setBrandFilter('all')} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${brandFilter === 'all' ? 'border-[#0A2E60] bg-[#0A2E60] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#2E86C1] hover:text-[#0A2E60]'}`}>All Brands</button>
                  {brands.map((brand) => <button key={brand} type="button" onClick={() => setBrandFilter(brand)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${brandFilter === brand ? 'border-[#0A2E60] bg-[#0A2E60] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#2E86C1] hover:text-[#0A2E60]'}`}>{brand}</button>)}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Availability</label>
                <div className="flex flex-wrap gap-2">
                  {['all','in_stock','out_of_stock','preorder'].map((value) => (
                    <button key={value} type="button" onClick={() => setAvailabilityFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${availabilityFilter === value ? 'border-[#0A2E60] bg-[#0A2E60] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#2E86C1] hover:text-[#0A2E60]'}`}>
                      {value === 'all' ? 'All' : value.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border rounded-2xl px-3 py-2.5 text-sm bg-white">
                  <option value="newest">Newest</option>
                  <option value="best_selling">Best Selling</option>
                  <option value="most_popular">Most Popular</option>
                  <option value="highest_rated">Highest Rated</option>
                  <option value="price_low">Price Low → High</option>
                  <option value="price_high">Price High → Low</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={clearFilters}>Clear Filters</Button>
                <Button className="flex-1 rounded-xl bg-[#0A2E60] hover:bg-[#082449]" onClick={() => setFiltersOpen(false)}>Done</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map((filter) => (
            <span key={filter} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
              {filter}
            </span>
          ))}
          <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-medium text-red-600">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, index) => <div key={index} className="aspect-[0.8] rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border rounded-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting the filters above.</p>
        </div>
      )}
    </div>
  );
}
