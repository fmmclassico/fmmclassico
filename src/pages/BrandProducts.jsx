import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { ChevronRight, ShoppingBag, Filter, X } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

const CATEGORY_GROUPS = [
  { label: 'All', value: '' },
  { label: 'Phones', value: 'phones' },
  { label: 'Phone Accessories', values: ['phone_cases', 'chargers', 'earphones', 'cables', 'power_banks', 'screen_protectors', 'holders', 'speakers'] },
  { label: 'Electronics', values: ['electronic_appliances', 'smart_watches'] },
  { label: 'Home Appliances', value: 'home_appliances' },
];

export default function BrandProducts() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const brand = searchParams.get('brand');
  const urlCategory = searchParams.get('category');

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Product.list('-created_date', 200);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) { return []; }
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (e) { return []; }
    },
    staleTime: 5 * 60 * 1000,
  });

  const settings = Array.isArray(appSettings) ? appSettings : [];
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];

  // Filter products for this brand
  const activeCategory = urlCategory || categoryFilter;

  let brandProducts = safeProducts.filter(p => {
    if (p.is_visible === false) return false;
    if (p.stock != null && p.stock === 0) return false;
    const matchBrand = p.brand?.toLowerCase() === brand?.toLowerCase();
    if (!matchBrand) return false;

    if (activeCategory) {
      // Check if it's a group filter
      const group = CATEGORY_GROUPS.find(g => g.label.toLowerCase().replace(/ /g, '_') === activeCategory || g.value === activeCategory);
      if (group && group.values) {
        return group.values.includes(p.category);
      }
      return p.category === activeCategory;
    }
    return true;
  });

  // Sort
  if (sortBy === 'price_low') brandProducts = [...brandProducts].sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_high') brandProducts = [...brandProducts].sort((a, b) => b.price - a.price);
  else brandProducts = [...brandProducts].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  // Get available categories for this brand
  const availableCategories = [...new Set(safeProducts.filter(p => p.brand?.toLowerCase() === brand?.toLowerCase() && p.is_visible !== false).map(p => p.category))].filter(Boolean);

  // Brand logo
  const uploadedLogo = settings.find(s => s.key === `brand_logo_${brand?.toLowerCase().replace(/ /g, '_')}`)?.value;

  if (!brand) {
    return <div className="p-8 text-center text-gray-500">No brand specified.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-6">

        {/* Brand Header */}
        <div className="flex items-center gap-4 mb-5">
          {uploadedLogo && (
            <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center p-2">
              <img src={uploadedLogo} alt={brand} className="w-10 h-10 object-contain" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{brand}</h1>
            <p className="text-xs text-gray-500">{brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''} available</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
            {/* Category Filter */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!activeCategory ? 'bg-[#0A2E60] text-white border-[#0A2E60]' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  All
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCategory === cat ? 'bg-[#0A2E60] text-white border-[#0A2E60]' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Sort */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Sort by Price</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Newest', value: 'newest' },
                  { label: 'Price: Low to High', value: 'price_low' },
                  { label: 'Price: High to Low', value: 'price_high' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sortBy === opt.value ? 'bg-[#0A2E60] text-white border-[#0A2E60]' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(activeCategory || sortBy !== 'newest') && (
              <button onClick={() => { setCategoryFilter(''); setSortBy('newest'); }} className="text-xs text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter badge */}
        {(activeCategory || sortBy !== 'newest') && !showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeCategory && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#0A2E60]/10 text-[#0A2E60] font-medium">
                {CATEGORY_LABELS[activeCategory] || activeCategory}
                <button onClick={() => setCategoryFilter('')} className="ml-1">×</button>
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                {sortBy === 'price_low' ? 'Low to High' : 'High to Low'}
                <button onClick={() => setSortBy('newest')} className="ml-1">×</button>
              </span>
            )}
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border">
                <Skeleton className="h-36 w-full" />
                <div className="p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></div>
              </div>
            ))}
          </div>
        ) : brandProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {brandProducts.map(product => (
              <Link
                key={product.id}
                to={createPageUrl(`ProductDetail?id=${product.id}`)}
                className="bg-white rounded-xl overflow-hidden border hover:shadow-md transition-shadow group"
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-[#0A2E60]">₵{product.price?.toLocaleString()}</span>
                    {product.original_price > product.price && (
                      <span className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</span>
                    )}
                  </div>
                  {product.original_price > product.price && (
                    <span className="text-[10px] text-red-500 font-medium">-{Math.round((1 - product.price / product.original_price) * 100)}% off</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No {brand} products found</p>
            <p className="text-sm text-gray-400 mt-1">{activeCategory ? 'Try removing the filter' : 'Check back soon'}</p>
            {activeCategory && (
              <button onClick={() => setCategoryFilter('')} className="mt-3 text-sm text-[#0A2E60] font-medium">Clear filter</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
