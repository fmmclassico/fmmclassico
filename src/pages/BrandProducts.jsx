import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from '../components/products/ProductCard';

// Full product sub-type labels per category
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

// ─── STRICT CATEGORY ISOLATION ───────────────────────────────────────────────
// BRAND_PRIMARY_CATEGORIES defines the ONLY categories a brand may show
// when NO ?category param is in the URL.  This prevents Samsung's TVs from
// appearing when the user browses Samsung Phones, for example.
// The ?category URL param always overrides and narrows to a single category.

const BRAND_PRIMARY_CATEGORIES = {
  // Phone-only brands
  Apple:   ['phones', 'phone_cases'],
  Samsung: ['phones', 'phone_cases', 'chargers', 'earphones'],
  Tecno:   ['phones'],
  Infinix: ['phones'],
  Itel:    ['phones'],
  // Phone-accessories-only brands
  Oraimo:  ['earphones', 'chargers', 'power_banks', 'cables', 'smart_watches', 'speakers'],
  JBL:     ['speakers', 'earphones'],
  Sony:    ['earphones', 'speakers'],
  // Electronics-only brands
  TCL:     ['electronic_appliances'],
  Hisense: ['electronic_appliances', 'home_appliances'],
  LG:      ['electronic_appliances', 'home_appliances'],
  Midea:   ['electronic_appliances', 'home_appliances'],
  // Home-appliances-only brands
  Roch:         ['home_appliances'],
  'Silver Crest': ['home_appliances'],
  Nasco:        ['home_appliances'],
  Hoffman:      ['home_appliances'],
};



export default function BrandProducts() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('newest');
  const brand = searchParams.get('brand');
  const category = searchParams.get('category');

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  // STRICT category isolation:
  // 1. If ?category is in URL → show ONLY that exact category.
  // 2. If no ?category → show only categories in BRAND_PRIMARY_CATEGORIES for this brand.
  //    This prevents Samsung's TVs appearing when browsing Samsung Phones.
  const allowedCats = BRAND_PRIMARY_CATEGORIES[brand] || [];

  let brandProducts = allProducts.filter(p => {
    if (p.is_visible === false) return false;
    if (p.stock != null && p.stock === 0) return false;
    const matchBrand = p.brand?.toLowerCase() === brand?.toLowerCase();
    const matchCat = category
      ? p.category === category
      : allowedCats.length === 0 || allowedCats.includes(p.category);
    return matchBrand && matchCat;
  });

  // Sort
  if (sortBy === 'price_low') brandProducts = [...brandProducts].sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_high') brandProducts = [...brandProducts].sort((a, b) => b.price - a.price);

  const categories = [...new Set(brandProducts.map(p => p.category))].filter(Boolean);

  if (!brand) {
    return <div className="container mx-auto px-4 py-12 text-center text-gray-500">No brand specified.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">{brand}</h1>

        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_low">Price: Low to High</SelectItem>
            <SelectItem value="price_high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category chips (shown when no category selected and brand has multiple allowed categories) */}
      {!category && categories.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Browse by Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Link
                key={cat}
                to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}&category=${cat}`)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {CATEGORY_LABELS[cat] || cat}
              </Link>
            ))}
          </div>
        </div>
      )}





      {/* Products */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : brandProducts.length > 0 ? (
        !category && categories.length > 1 ? (
          <div className="space-y-8">
            {categories.map(cat => {
              const catProducts = brandProducts.filter(p => p.category === cat);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-black text-gray-800 text-base uppercase tracking-wide">{CATEGORY_LABELS[cat] || cat}</h2>
                    <Link
                      to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}&category=${cat}`)}
                      className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 hover:underline"
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </Link>
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {brandProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )
      ) : (
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
      )}
    </div>
  );
}