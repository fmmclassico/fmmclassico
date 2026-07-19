import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { getBrandLogo, normalizeBrandKey, resolveBrandEntry } from '@/lib/brandDirectory';
import { ShoppingBag, Filter } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const brand = searchParams.get('brand');

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Product.list('-created_date', 500);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch {
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
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
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];
  const brandEntry = resolveBrandEntry(settings, safeProducts, brand) || (brand ? {
    key: normalizeBrandKey(brand),
    sourceName: brand,
    displayName: brand,
    showName: true,
    visible: true,
  } : null);

  const brandProducts = useMemo(() => {
    if (!brandEntry?.sourceName) return [];

    let products = safeProducts.filter((product) => {
      if (product.is_visible === false) return false;
      if (product.stock != null && product.stock === 0) return false;
      const matchBrand = normalizeBrandKey(product.brand) === normalizeBrandKey(brandEntry.sourceName);
      if (!matchBrand) return false;
      if (categoryFilter) return product.category === categoryFilter;
      return true;
    });

    if (sortBy === 'price_low') products = [...products].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sortBy === 'price_high') products = [...products].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else products = [...products].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    return products;
  }, [safeProducts, brandEntry, categoryFilter, sortBy]);

  const availableCategories = [...new Set(
    safeProducts
      .filter((product) => normalizeBrandKey(product.brand) === normalizeBrandKey(brandEntry?.sourceName) && product.is_visible !== false)
      .map((product) => product.category)
  )].filter(Boolean);

  const logoSrc = brandEntry ? getBrandLogo(settings, brandEntry.key) : '';

  const clearFilters = () => {
    setCategoryFilter('');
    setSortBy('newest');
  };

  if (!brandEntry) {
    return <div className="p-8 text-center text-gray-500">No brand specified.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              {logoSrc ? (
                <img src={logoSrc} alt={brandEntry.displayName} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-lg font-bold text-gray-400">{(brandEntry.displayName || brandEntry.sourceName)[0]}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-gray-800 md:text-3xl">{brandEntry.displayName || brandEntry.sourceName}</h1>
              <p className="text-sm text-gray-500">{brandProducts.length} product{brandProducts.length === 1 ? '' : 's'} available</p>
            </div>
          </div>

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
                    <option value="">All Categories</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>{CATEGORY_LABELS[category] || category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm">
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

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border bg-white">
                <Skeleton className="h-36 w-full" />
                <div className="p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : brandProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {brandProducts.map((product) => (
              <Link
                key={product.id}
                to={createPageUrl(`ProductDetail?id=${product.id}`)}
                className="group overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-50">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs font-medium text-gray-800">{product.name}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0A2E60]">₵{product.price?.toLocaleString()}</span>
                    {product.original_price > product.price && (
                      <span className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</span>
                    )}
                  </div>
                  {product.original_price > product.price && (
                    <span className="text-[10px] font-medium text-red-500">-{Math.round((1 - product.price / product.original_price) * 100)}% off</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white py-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="font-medium text-gray-500">No {brandEntry.displayName || brandEntry.sourceName} products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
