import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from '../components/products/ProductCard';

// Brand → category mapping
const BRAND_CATEGORIES = {
  Apple: ['phones', 'earphones', 'chargers', 'cables', 'smart_watches'],
  Samsung: ['phones', 'electronic_appliances', 'home_appliances', 'chargers', 'earphones'],
  Tecno: ['phones'],
  Infinix: ['phones'],
  Itel: ['phones'],
  Xiaomi: ['phones'],
  Oraimo: ['earphones', 'chargers', 'power_banks', 'cables', 'smart_watches', 'speakers'],
  JBL: ['speakers', 'earphones'],
  Anker: ['chargers', 'power_banks', 'cables'],
  TCL: ['electronic_appliances', 'home_appliances'],
  Hisense: ['electronic_appliances', 'home_appliances'],
  Sony: ['electronic_appliances', 'speakers'],
  LG: ['electronic_appliances', 'home_appliances'],
  Roch: ['home_appliances'],
  'Silver Crest': ['home_appliances'],
  Midea: ['home_appliances'],
  Nasco: ['home_appliances'],
};

const CATEGORY_LABELS = {
  phones: 'Phones',
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronics',
  home_appliances: 'Home Appliances',
};

export default function BrandProducts() {
  const [searchParams] = useSearchParams();
  const brand = searchParams.get('brand');
  const category = searchParams.get('category');

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  // Filter by brand (case-insensitive) and optional category
  const brandProducts = allProducts.filter(p => {
    const matchBrand = p.brand?.toLowerCase() === brand?.toLowerCase();
    const matchCat = category ? p.category === category : true;
    return matchBrand && matchCat;
  });

  // Group by category if no category filter
  const categories = [...new Set(brandProducts.map(p => p.category))].filter(Boolean);

  // Brand's expected categories from the map
  const brandCats = BRAND_CATEGORIES[brand] || [];

  if (!brand) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-gray-500">
        No brand specified.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-4 flex-wrap">
        <Link to={createPageUrl('Home')} className="hover:text-gray-700">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-700 font-semibold">{brand}</span>
        {category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-semibold">{CATEGORY_LABELS[category] || category}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">{brand}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''} found
          {category ? ` in ${CATEGORY_LABELS[category] || category}` : ''}
        </p>
      </div>

      {/* Category filter chips */}
      {!category && categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}`)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-900 text-white"
          >
            All
          </Link>
          {categories.map(cat => (
            <Link
              key={cat}
              to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}&category=${cat}`)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {CATEGORY_LABELS[cat] || cat}
            </Link>
          ))}
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
          // Show by category sections
          <div className="space-y-8">
            {categories.map(cat => {
              const catProducts = brandProducts.filter(p => p.category === cat);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-black text-gray-800 text-base uppercase tracking-wide">
                      {CATEGORY_LABELS[cat] || cat}
                    </h2>
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