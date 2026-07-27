import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { appClient } from '@/api/appClient.js';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { ShoppingBag, Filter, X } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getBrandLogoSrc, normalizeBrandKey, resolveBrandEntry } from '@/lib/brandDirectory';

const CATEGORY_LABELS = {
  phones: 'Phones',
  phone_cases: 'Phone Cases',
  chargers: 'Chargers & Power',
  earphones: 'Earphones & Audio',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronics',
  home_appliances: 'Home Appliances',
};

export default function BrandProducts() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const brand = searchParams.get('brand');

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.Product.list('-created_date', 200);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const settings = Array.isArray(appSettings) ? appSettings : [];
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];
  const brandEntry = useMemo(() => resolveBrandEntry(settings, safeProducts, brand || ''), [settings, safeProducts, brand]);
  const activeBrandName = brandEntry?.sourceName || brand || '';
  const brandLabel = brandEntry?.displayName || brand || 'Brand';
  const brandKey = normalizeBrandKey(activeBrandName);
  const uploadedLogo = getBrandLogoSrc(settings, activeBrandName);

  let brandProducts = safeProducts.filter((product) => {
    if (product.is_visible === false) return false;
    if (product.stock != null && product.stock === 0) return false;
    const matchBrand = normalizeBrandKey(product.brand) === brandKey;
    if (!matchBrand) return false;

    if (categoryFilter) {
      return product.category === categoryFilter;
    }

    return true;
  });

  if (sortBy === 'price_low') brandProducts = [...brandProducts].sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_high') brandProducts = [...brandProducts].sort((a, b) => b.price - a.price);
  else brandProducts = [...brandProducts].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  const availableCategories = [...new Set(
    safeProducts
      .filter((product) => normalizeBrandKey(product.brand) === brandKey && product.is_visible !== false)
      .map((product) => product.category)
  )].filter(Boolean);

  const clearFilters = () => {
    setCategoryFilter('');
    setSortBy('newest');
  };

  const activeFilters = [
    categoryFilter ? `Category: ${CATEGORY_LABELS[categoryFilter] || categoryFilter}` : null,
    sortBy !== 'newest' ? `Sort: ${sortBy.replace('_', ' ')}` : null,
  ].filter(Boolean);

  if (!brand) {
    return <div className="p-8 text-center text-gray-500">No brand specified.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-white border flex items-center justify-center p-2 overflow-hidden">
            {uploadedLogo ? (
              <img
                src={uploadedLogo}
                alt={brandLabel}
                className="w-10 h-10 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  const fallback = event.currentTarget.parentElement?.querySelector('[data-brand-fallback]');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <span data-brand-fallback className={`text-lg font-bold text-gray-400 ${uploadedLogo ? 'hidden' : ''}`}>
              {brandLabel.charAt(0)}
            </span>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{brandLabel}</h1>
            <p className="text-xs text-gray-500">{brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''} available</p>
          </div>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="rounded-full border-gray-300">
                <Filter className="h-4 w-4 mr-2" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Brand Filters</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">All Categories</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>{CATEGORY_LABELS[category] || category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="newest">Newest</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
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
          <div className="flex flex-wrap gap-2 mb-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3">
                <Skeleton className="w-full aspect-square rounded-xl mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : brandProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {brandProducts.map((product) => (
              <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                  <p className="text-sm font-extrabold text-gray-900 mt-2">₵{product.price?.toLocaleString()}</p>
                  {product.original_price > product.price && (
                    <p className="text-xs text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No {brandLabel} products found</p>
            <p className="text-sm text-gray-400 mt-1">This brand is listed, but it does not have any visible in-stock products yet.</p>
            <Link to={createPageUrl('AllBrands')} className="inline-flex mt-4 text-sm font-semibold text-[#0A2E60]">Back to all brands</Link>
          </div>
        )}
      </div>
    </div>
  );
}
