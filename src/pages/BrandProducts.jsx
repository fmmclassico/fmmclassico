import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
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

const BRAND_PRODUCT_TYPES = {
  // ── PHONES (only phone models, never accessories/electronics/appliances) ──
  Apple: {
    phones: ['iPhone 11', 'iPhone 12 Series', 'iPhone 13 Series', 'iPhone 14 Series', 'iPhone 15 Series', 'iPhone SE'],
  },
  Samsung: {
    phones: ['Galaxy A Series', 'Galaxy S Series', 'Galaxy Z Fold/Flip'],
    // Samsung also appears under phone_accessories, electronic_appliances, home_appliances
    // but those entries live in their own category-scoped sections below.
    phone_cases: ['Samsung Galaxy Cases'],
    chargers: ['Samsung Fast Charger', 'Samsung Wireless Charger'],
    earphones: ['Galaxy Buds', 'Galaxy Buds Pro'],
    electronic_appliances: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Soundbar', 'Home Theatre'],
    home_appliances: ['Refrigerator', 'Washing Machine', 'Microwave', 'Air Conditioner'],
  },
  Tecno: {
    phones: ['Spark Series', 'Camon Series', 'Phantom Series', 'Pop Series'],
  },
  Infinix: {
    phones: ['Hot Series', 'Note Series', 'Smart Series', 'Zero Series'],
  },
  Itel: {
    phones: ['A Series', 'S Series', 'P Series (Big Battery)'],
  },

  // ── PHONE ACCESSORIES (only accessory categories, never phones/electronics/appliances) ──
  Oraimo: {
    earphones: ['FreePods (Wireless Earbuds)', 'Neckband Earphones', 'Wired Earphones', 'Bluetooth Headphones'],
    chargers: ['Fast Charger (20W)', 'Car Charger', 'Wireless Charger', 'Multi-port Charger'],
    power_banks: ['Power Bank 10,000mAh', 'Power Bank 20,000mAh', 'Solar Power Bank'],
    cables: ['USB-C Cable', 'Lightning Cable', 'Micro USB Cable', 'Braided Cable'],
    smart_watches: ['Oraimo Watch', 'Oraimo Watch Pro'],
    speakers: ['Bluetooth Speaker', 'Mini Speaker'],
  },
  JBL: {
    speakers: ['JBL Go', 'JBL Flip', 'JBL Charge', 'JBL Xtreme', 'JBL PartyBox'],
    earphones: ['JBL Tune Earbuds', 'JBL Free X', 'JBL Live Series', 'JBL Wired Earphones'],
  },

  // ── ELECTRONICS (only electronic_appliances, never phones/accessories/home) ──
  Sony: {
    electronic_appliances: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Soundbar', 'Home Theatre'],
    earphones: ['Sony WF Series (Earbuds)', 'Sony WH Series (Headphones)', 'Sony Wired Earphones'],
    speakers: ['Sony Portable Speaker', 'Sony Party Speaker'],
  },
  TCL: {
    electronic_appliances: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Smart TV 65"', 'Android TV', '4K UHD TV'],
  },
  Hisense: {
    electronic_appliances: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Smart TV 65"', 'QLED TV'],
    home_appliances: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Microwave'],
  },
  LG: {
    electronic_appliances: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'OLED TV', 'Soundbar'],
    home_appliances: ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Microwave'],
  },
  Midea: {
    electronic_appliances: ['Air Conditioner Split Unit', 'Air Purifier'],
    home_appliances: ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Microwave', 'Rice Cooker', 'Blender'],
  },

  // ── HOME APPLIANCES (only home_appliances, never phones/accessories/electronics) ──
  Roch: {
    home_appliances: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Standing Fan', 'Air Conditioner'],
  },
  'Silver Crest': {
    home_appliances: ['Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Toaster', 'Sandwich Maker', 'Food Processor', 'Juicer', 'Standing Fan'],
  },
  Nasco: {
    home_appliances: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Standing Fan', 'Air Conditioner'],
  },
  Hoffman: {
    home_appliances: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Standing Fan', 'Blender', 'Rice Cooker', 'Electric Kettle'],
  },
};

// ── CATEGORY-SCOPED subtype lookup ────────────────────────────────────────────
// When ?category is present, only return subtypes for that exact category key.
// This prevents a brand's subtypes from other categories leaking through.
function getSubTypes(brand, category) {
  const map = BRAND_PRODUCT_TYPES[brand] || {};
  if (!category) return [];
  return map[category] || [];
}

export default function BrandProducts() {
  const [searchParams] = useSearchParams();
  const brand = searchParams.get('brand');
  const category = searchParams.get('category');
  const subtype = searchParams.get('subtype');

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

  const brandProducts = allProducts.filter(p => {
    const matchBrand = p.brand?.toLowerCase() === brand?.toLowerCase();
    const matchCat = category
      ? p.category === category
      : allowedCats.length === 0 || allowedCats.includes(p.category);
    const matchSub = subtype ? (p.subcategory?.toLowerCase().includes(subtype.toLowerCase()) || p.name?.toLowerCase().includes(subtype.toLowerCase())) : true;
    return matchBrand && matchCat && matchSub;
  });

  const categories = [...new Set(brandProducts.map(p => p.category))].filter(Boolean);

  // Get sub-types for this brand+category combo — strictly scoped to current category
  const subTypes = getSubTypes(brand, category);

  if (!brand) {
    return <div className="container mx-auto px-4 py-12 text-center text-gray-500">No brand specified.</div>;
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
            <Link to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}`)} className="text-gray-600 hover:text-gray-900">
              {CATEGORY_LABELS[category] || category}
            </Link>
          </>
        )}
        {subtype && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-semibold">{subtype}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">
          {brand}{category ? ` — ${CATEGORY_LABELS[category] || category}` : ''}{subtype ? ` — ${subtype}` : ''}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''} found</p>
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

      {/* Sub-type chips (shown when category selected) */}
      {category && subTypes.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Product Types</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}&category=${category}`)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${!subtype ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
            >
              All
            </Link>
            {subTypes.map(st => (
              <Link
                key={st}
                to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand)}&category=${category}&subtype=${encodeURIComponent(st)}`)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${subtype === st ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
              >
                {st}
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