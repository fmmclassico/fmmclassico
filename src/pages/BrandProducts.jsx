import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from '../components/products/ProductCard';

const CATEGORY_LABELS = {
  phones: 'Phones',
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
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

// STRICT category isolation — defines which categories a brand is allowed to show
// when NO ?category param is present in the URL.
const BRAND_PRIMARY_CATEGORIES = {
  Apple:        ['phones', 'phone_cases', 'chargers', 'cables', 'earphones', 'smart_watches', 'screen_protectors'],
  Samsung:      ['phones', 'phone_cases', 'chargers', 'earphones', 'cables', 'power_banks', 'smart_watches'],
  Tecno:        ['phones'],
  Infinix:      ['phones'],
  Itel:         ['phones'],
  Oraimo:       ['earphones', 'chargers', 'power_banks', 'cables', 'smart_watches', 'speakers', 'phone_cases', 'holders'],
  JBL:          ['speakers', 'earphones'],
  Sony:         ['earphones', 'speakers'],
  TCL:          ['electronic_appliances', 'home_appliances'],
  Hisense:      ['electronic_appliances', 'home_appliances'],
  LG:           ['electronic_appliances', 'home_appliances'],
  Midea:        ['electronic_appliances', 'home_appliances'],
  Roch:         ['home_appliances'],
  'Silver Crest': ['home_appliances'],
  Nasco:        ['home_appliances'],
  Hoffman:      ['home_appliances'],
};

export default function BrandProducts() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();

  const brand = searchParams.get('brand');
  const category = searchParams.get('category'); // null = show all allowed categories

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  const allowedCats = BRAND_PRIMARY_CATEGORIES[brand] || [];

  // Filter strictly by brand + allowed categories
  let brandProducts = allProducts.filter(p => {
    const matchBrand = p.brand?.toLowerCase() === brand?.toLowerCase();
    const matchCat = category
      ? p.category === category
      : allowedCats.length === 0 || allowedCats.includes(p.category);
    return matchBrand && matchCat;
  });

  // Apply sort
  if (sortBy === 'price_low') brandProducts = [...brandProducts].sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_high') brandProducts = [...brandProducts].sort((a, b) => b.price - a.price);

  // Unique categories present in the filtered results, preserving BRAND_PRIMARY_CATEGORIES order
  const categoriesInResults = (allowedCats.length > 0 ? allowedCats : Object.keys(CATEGORY_LABELS))
    .filter(cat => brandProducts.some(p => p.category === cat));

  if (!brand) {
    return <div className="container mx-auto px-4 py-12 text-center text-gray-500">No brand specified.</div>;
  }

  const isSingleCategory = !!category || categoriesInResults.length <= 1;

  return (
    <div className="container mx-auto px-4 py-4 max-w-5xl">

      {/* Top bar: Back + Brand name + Sort */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
              {brand}{category ? ` — ${CATEGORY_LABELS[category] || category}` : ''}
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">{brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 text-xs h-8">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_low">Price: Low → High</SelectItem>
            <SelectItem value="price_high">Price: High → Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(s => (
            <div key={s}>
              <Skeleton className="h-5 w-32 mb-3 rounded" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : brandProducts.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <ShoppingBag className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No {brand} products yet</h3>
          <p className="text-gray-400 text-sm mb-4">Check back soon — new stock is added regularly.</p>
          <Link to={createPageUrl('Shop')} className="text-blue-600 text-sm font-semibold hover:underline">
            Browse all products
          </Link>
        </div>
      ) : isSingleCategory ? (
        /* Single category view — flat grid */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {brandProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Multi-category view — sectioned rows like homepage */
        <div className="space-y-8">
          {categoriesInResults.map(cat => {
            const catProducts = brandProducts.filter(p => p.category === cat);
            if (catProducts.length === 0) return null;
            return (
              <div key={cat}>
                {/* Section header with blue bar accent — matches homepage style */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-blue-600" />
                    <h2 className="font-black text-gray-800 text-base">
                      {CATEGORY_LABELS[cat] || cat}
                    </h2>
                  </div>
                  {catProducts.length > 4 && (
                    <Link
                      to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}&category=${cat}`)}
                      className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 hover:underline"
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {catProducts.slice(0, 4).map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}