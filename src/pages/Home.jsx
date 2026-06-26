import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Zap, Star, Tag, Home as HomeIcon, Smartphone, Headphones, Tv, ShoppingBag, Gem, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import HeroBanner from '../components/home/HeroBanner';
import FlashSaleTimer from '../components/home/FlashSaleTimer';

var CATEGORY_BRANDS = {
  phones: [
    { label: 'Apple (iPhone)', brand: 'Apple', category: 'phones' },
    { label: 'Samsung', brand: 'Samsung', category: 'phones' },
    { label: 'Tecno', brand: 'Tecno', category: 'phones' },
    { label: 'Infinix', brand: 'Infinix', category: 'phones' },
    { label: 'Itel', brand: 'Itel', category: 'phones' },
  ],
  phone_accessories: [
    { label: 'Oraimo', brand: 'Oraimo', category: 'earphones' },
    { label: 'Apple', brand: 'Apple', category: 'phone_cases' },
    { label: 'Samsung', brand: 'Samsung', category: 'phone_cases' },
    { label: 'JBL', brand: 'JBL', category: 'speakers' },
    { label: 'Sony', brand: 'Sony', category: 'earphones' },
  ],
  electronics: [
    { label: 'Samsung', brand: 'Samsung' },
    { label: 'TCL', brand: 'TCL' },
    { label: 'Hisense', brand: 'Hisense' },
    { label: 'Sony', brand: 'Sony' },
    { label: 'LG', brand: 'LG' },
    { label: 'Midea', brand: 'Midea' },
    { label: 'Oraimo', brand: 'Oraimo' },
  ],
  home_appliances: [
    { label: 'Hisense', brand: 'Hisense' },
    { label: 'Roch', brand: 'Roch' },
    { label: 'Silver Crest', brand: 'Silver Crest' },
    { label: 'TCL', brand: 'TCL' },
    { label: 'Nasco', brand: 'Nasco' },
    { label: 'Hoffman', brand: 'Hoffman' },
    { label: 'Samsung', brand: 'Samsung' },
    { label: 'Oraimo', brand: 'Oraimo' },
  ],
};

var HOME_CATEGORIES = [
  {
    id: 'phones',
    label: 'Phones',
    icon: Smartphone,
    link: createPageUrl('Shop?category=phones'),
    match: function(p) { return p.category === 'phones'; },
    brands: CATEGORY_BRANDS.phones,
    chipColor: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'phone_accessories',
    label: 'Phone Accessories',
    icon: Headphones,
    link: createPageUrl('Shop?category=phone_cases'),
    match: function(p) { return ['phone_cases','chargers','earphones','cables','power_banks','screen_protectors','holders','speakers'].includes(p.category); },
    brands: CATEGORY_BRANDS.phone_accessories,
    chipColor: 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: Tv,
    link: createPageUrl('Shop?category=electronic_appliances'),
    match: function(p) { return ['electronic_appliances','smart_watches'].includes(p.category); },
    brands: CATEGORY_BRANDS.electronics,
    chipColor: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    id: 'home_appliances',
    label: 'Home Appliances',
    icon: HomeIcon,
    link: createPageUrl('Shop?category=home_appliances'),
    match: function(p) { return p.category === 'home_appliances'; },
    brands: CATEGORY_BRANDS.home_appliances,
    chipColor: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
  },
];

export default function Home() {
  var auth = useAuth();
  var user = auth.user;
  var isAuthenticated = auth.isAuthenticated;
  var navigateToLogin = auth.navigateToLogin;
  var [expandedCat, setExpandedCat] = useState(null);
  var queryClient = useQueryClient();
  var navigate = useNavigate();

  var { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async function() {
      try {
        var result = await base44.entities.AppSetting.list();
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (err) { return []; }
    },
    staleTime: 5 * 60 * 1000,
  });

  var settings = Array.isArray(appSettings) ? appSettings : [];

  var showBrandSection = settings.find(function(s) { return s.key === 'shop_by_brand_visible'; })?.value !== 'false';

  var { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async function() {
      try {
        var result = await base44.entities.Product.list('-created_date', 100);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (err) { return []; }
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  var safeProducts = Array.isArray(products) ? products : [];

  useEffect(function() { refetch(); }, [refetch]);

  var visibleProducts = safeProducts.filter(function(p) { return p.is_visible !== false && !(p.stock != null && p.stock === 0); });

  var flashItems = visibleProducts.filter(function(p) { return p.flash_sale && (!p.flash_sale_end || new Date(p.flash_sale_end) > new Date()); });
  var donkomiDeals = visibleProducts.filter(function(p) { return p.donkomi; });
  var newArrivals = visibleProducts.filter(function(p) { return p.new_arrival; });
  var topSellingFallback = visibleProducts.filter(function(p) { return p.top_selling; });

  return (
    <div className="pb-6 bg-gray-100 min-h-screen" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* Hero Slider */}
      <HeroBanner />

      {/* CATEGORIES */}
      <div className="bg-white mt-3 mx-2 md:mx-4 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900 text-base">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-[#2E86C1] text-xs font-semibold flex items-center hover:underline">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {HOME_CATEGORIES.map(function(cat) {
            var adminImg = settings.find(function(s) { return s.key === 'cat_img_' + cat.id; })?.value;
            var isExpanded = expandedCat === cat.id;
            return (
              <button key={cat.id} onClick={function() { setExpandedCat(isExpanded ? null : cat.id); }} className="flex flex-col items-center gap-2 group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                  {adminImg
                    ? <img src={adminImg} alt={cat.label} className="w-full h-full object-cover brightness-125" />
                    : <cat.icon className="h-10 w-10 text-gray-400" />
                  }
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-800 text-center leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>
        {/* Brands on click */}
        {expandedCat && (function() {
          var cat = HOME_CATEGORIES.find(function(c) { return c.id === expandedCat; });
          if (!cat?.brands) return null;
          return (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shop {cat.label} by Brand</p>
              <div className="flex flex-wrap gap-2">
                {cat.brands.map(function(b) {
                  return (
                    <Link key={b.brand + b.category} to={createPageUrl('BrandProducts?brand=' + encodeURIComponent(b.brand) + '&category=' + b.category)}
                      className={'text-xs font-semibold border rounded-full px-3 py-1 transition-colors ' + cat.chipColor}>
                      {b.label}
                    </Link>
                  );
                })}
                <Link to={cat.link} className={'text-xs font-semibold border rounded-full px-3 py-1 transition-colors ' + cat.chipColor}>
                  All {cat.label}
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      {/* PROMO CARDS */}
      {(function() {
        var PROMO_KEYS = ['promo_card_1','promo_card_2','promo_card_3','promo_card_4','promo_card_5','promo_card_6'];
        var allCards = PROMO_KEYS.map(function(k) {
          var raw = settings.find(function(s) { return s.key === k; })?.value;
          if (!raw) return null;
          try { var d = JSON.parse(raw); return d?.active ? Object.assign({}, d, { key: k }) : null; } catch(e) { return null; }
        }).filter(Boolean);
        if (!allCards.length) return null;
        return (
          <div className="mt-3 mx-2 md:mx-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <h2 className="font-black text-gray-900 text-sm uppercase tracking-wide">Promotions</h2>
              </div>
              <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
                {allCards.map(function(card) {
                  var CardWrapper = card.link ? Link : 'div';
                  var wrapperProps = card.link ? { to: card.link } : {};
                  return (
                    <CardWrapper key={card.key} {...wrapperProps} className="flex-shrink-0 w-[72vw] md:w-72 relative overflow-hidden" style={{ minHeight: 130 }}>
                      <div className={'absolute inset-0 bg-gradient-to-r ' + (card.gradient || 'from-blue-600 to-blue-400')} />
                      {card.image_url && <img src={card.image_url} alt={card.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                      <div className="relative z-10 p-3 h-full flex flex-col justify-between" style={{ minHeight: 130 }}>
                        <div>
                          <p className="text-white font-black text-sm leading-tight drop-shadow">{card.title}</p>
                          {card.subtitle && <p className="text-white/90 text-xs font-bold mt-0.5">{card.subtitle}</p>}
                        </div>
                        {card.cta_text && <span className="text-white text-xs font-bold underline">{card.cta_text}</span>}
                      </div>
                    </CardWrapper>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CLASSICO DEALS (Flash Sale) */}
      <div className="mt-3 mx-2 md:mx-4 bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h2 className="font-black text-gray-900 text-sm">CLASSICO Deals</h2>
            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">Flash Sale</span>
          </div>
          <Link to={createPageUrl('Shop?featured=true')} className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {isLoading
            ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-36 h-48 bg-gray-100 rounded-xl animate-pulse" />; })
            : flashItems.length === 0
              ? <p className="text-xs text-gray-400">No products assigned to this section yet.</p>
              : flashItems.map(function(product) {
                return (
                  <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-36">
                    <div className="relative h-36 bg-gray-50 rounded-xl overflow-hidden mb-1">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <ShoppingBag className="w-8 h-8 text-gray-300 absolute inset-0 m-auto" />}
                      {product.original_price > product.price && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          -{Math.round((1 - product.price / product.original_price) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold text-gray-900">{"₵"}{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && <p className="text-[10px] text-gray-400 line-through">{"₵"}{product.original_price?.toLocaleString()}</p>}
                  </Link>
                );
              })
          }
        </div>
      </div>

      {/* DONKOMI DEALS */}
      <div className="mt-3 mx-2 md:mx-4 bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-orange-500" />
            <h2 className="font-black text-gray-900 text-sm">Donkomi Deals</h2>
            <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">Best Prices</span>
          </div>
          <Link to={createPageUrl('Shop')} className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {isLoading
            ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-36 h-48 bg-gray-100 rounded-xl animate-pulse" />; })
            : donkomiDeals.length === 0
              ? <p className="text-xs text-gray-400">No products assigned to this section yet.</p>
              : donkomiDeals.map(function(product) {
                return (
                  <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-36">
                    <div className="relative h-36 bg-gray-50 rounded-xl overflow-hidden mb-1">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <ShoppingBag className="w-8 h-8 text-gray-300 absolute inset-0 m-auto" />}
                    </div>
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold text-gray-900">{"₵"}{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && <p className="text-[10px] text-gray-400 line-through">{"₵"}{product.original_price?.toLocaleString()}</p>}
                  </Link>
                );
              })
          }
        </div>
      </div>

      {/* SHOP BY BRAND */}
      {showBrandSection && (
        <div className="mt-3 mx-2 md:mx-4 bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-blue-500" />
              <h2 className="font-black text-gray-900 text-sm">Shop by Brand</h2>
            </div>
            <Link to={createPageUrl('Categories')} className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {[
              { name: 'Apple', fallback: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
              { name: 'Samsung', fallback: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
              { name: 'Tecno', fallback: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/TECNO_Mobile_Logo.svg' },
              { name: 'Hisense', fallback: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Hisense_logo.svg' },
              { name: 'TCL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/1/16/TCL_Logo.svg' },
              { name: 'Oraimo', fallback: 'https://play-lh.googleusercontent.com/3f4sJfJMJc5Y8mWj4LYl_aSiZ0sGOnJ9iuSqlMzNFJELBPJqBDYQfuCpkJn3RNHanA=s180' },
              { name: 'Sony', fallback: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
              { name: 'JBL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/JBL_logo.svg' },
            ].map(function(brand) {
              var uploadedLogo = settings.find(function(s) { return s.key === 'brand_logo_' + brand.name.toLowerCase().replace(/ /g,'_'); })?.value;
              var logoSrc = uploadedLogo || brand.fallback;
              return (
                <Link key={brand.name} to={createPageUrl('BrandProducts?brand=' + encodeURIComponent(brand.name))} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-2">
                    {logoSrc
                      ? <img src={logoSrc} alt={brand.name} className="w-full h-full object-contain" onError={function(e) { e.target.style.display='none'; }} />
                      : <span className="text-lg font-bold text-gray-400">{brand.name[0]}</span>}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 text-center">{brand.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW ARRIVALS */}
      <div className="mt-3 mx-2 md:mx-4 bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <h2 className="font-black text-gray-900 text-sm">New Arrivals</h2>
          </div>
          <Link to={createPageUrl('Shop')} className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {isLoading
            ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-36 h-48 bg-gray-100 rounded-xl animate-pulse" />; })
            : newArrivals.length === 0
              ? <p className="text-xs text-gray-400">No products assigned to this section yet.</p>
              : newArrivals.map(function(product) {
                return (
                  <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-36">
                    <div className="relative h-36 bg-gray-50 rounded-xl overflow-hidden mb-1">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <ShoppingBag className="w-8 h-8 text-gray-300 absolute inset-0 m-auto" />}
                      <span className="absolute top-1 left-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
                    </div>
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold text-gray-900">{"₵"}{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && <p className="text-[10px] text-gray-400 line-through">{"₵"}{product.original_price?.toLocaleString()}</p>}
                  </Link>
                );
              })
          }
        </div>
      </div>

      {/* TOP SELLING */}
      <div className="mt-3 mx-2 md:mx-4 bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h2 className="font-black text-gray-900 text-sm">Top Selling</h2>
          </div>
          <Link to={createPageUrl('Shop')} className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {isLoading
            ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-36 h-48 bg-gray-100 rounded-xl animate-pulse" />; })
            : topSellingFallback.length === 0
              ? <p className="text-xs text-gray-400">No products assigned to this section yet.</p>
              : topSellingFallback.map(function(product, idx) {
                return (
                  <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-36">
                    <div className="relative h-36 bg-gray-50 rounded-xl overflow-hidden mb-1">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <ShoppingBag className="w-8 h-8 text-gray-300 absolute inset-0 m-auto" />}
                      <span className="absolute top-1 left-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">#{idx + 1}</span>
                    </div>
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold text-gray-900">{"₵"}{product.price?.toLocaleString()}</p>
                  </Link>
                );
              })
          }
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-20" />
    </div>
  );
}
