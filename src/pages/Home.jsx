import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { appClient } from '@/api/appClient.js';
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
    link: createPageUrl('Shop?category=/phones'),
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    match: function(p) { return p.category === 'phones'; },
    brands: CATEGORY_BRANDS.phones,
    chipColor: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'phone_accessories',
    label: 'Phone Accessories',
    icon: Headphones,
    link: createPageUrl('Shop?category=/phone-accessories'),
    image: 'https://mate.net.in/public/uploads/all/UsReqZvujmEjMUb27qlTtRcCG8Pf18SyULO4HW7U.jpg',
    match: function(p) { return ['phone_cases','chargers','earphones','cables','power_banks','screen_protectors','holders','speakers'].includes(p.category); },
    brands: CATEGORY_BRANDS.phone_accessories,
    chipColor: 'text-[#0093A6] bg-[#0093A6]/5 border-[#0093A6]/30 hover:bg-[#0093A6]/10',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: Tv,
    link: createPageUrl('Shop?category=/electronics'),
    image: 'https://images.unsplash.com/photo-1593640408182-31c228f30ca0?w=160&q=50',
    match: function(p) { return ['electronic_appliances','smart_watches'].includes(p.category); },
    brands: CATEGORY_BRANDS.electronics,
    chipColor: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    id: 'home_appliances',
    label: 'Home Appliances',
    icon: HomeIcon,
    link: createPageUrl('Shop?category=/home-appliances'),
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=160&q=50',
    match: function(p) { return p.category === 'home_appliances'; },
    brands: CATEGORY_BRANDS.home_appliances,
    chipColor: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
  },
];

export default function Home() {
  var { user, isAuthenticated, navigateToLogin } = useAuth();
  var [expandedCat, setExpandedCat] = useState(null);
  var queryClient = useQueryClient();
  var navigate = useNavigate();

  var { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async function() {
      try {
        var result = await appClient.entities.AppSetting.list();
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
        var result = await appClient.entities.Product.list('-created_date', 100);
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (err) { return []; }
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  var safeProducts = Array.isArray(products) ? products : [];

  useEffect(function() { refetch(); }, [refetch]);

  var addToCartMutation = useMutation({
    mutationFn: async function(product) {
      if (!isAuthenticated || !user) { navigateToLogin(); return; }
      queryClient.setQueryData(['cartItems', user?.email], function(old) {
        var safeOld = Array.isArray(old) ? old : [];
        var existing = safeOld.find(function(i) { return i.product_id === product.id; });
        if (existing) return safeOld.map(function(i) { return i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i; });
        return safeOld.concat([{ id: 'optimistic-' + product.id, product_id: product.id, product_name: product.name, product_image: product.image_url, product_price: product.price, quantity: 1, user_email: user.email }]);
      });
      var rawExisting = await appClient.entities.CartItem.filter({ user_email: user.email, product_id: product.id });
      var existingItems = Array.isArray(rawExisting) ? rawExisting : Array.isArray(rawExisting?.data) ? rawExisting.data : [];
      if (existingItems.length > 0) { await appClient.entities.CartItem.update(existingItems[0].id, { quantity: existingItems[0].quantity + 1 }); }
      else { await appClient.entities.CartItem.create({ product_id: product.id, product_name: product.name, product_image: product.image_url, product_price: product.price, quantity: 1, user_email: user.email }); }
      if (product.stock != null) appClient.entities.Product.update(product.id, { stock: Math.max(0, product.stock - 1) });
    },
    onSuccess: function() {
      queryClient.invalidateQueries({ queryKey: ['cartItems', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  var visibleProducts = safeProducts.filter(function(p) { return p.is_visible !== false && !(p.stock != null && p.stock === 0); });

  var flashItems = visibleProducts.filter(function(p) { return p.flash_sale && (!p.flash_sale_end || new Date(p.flash_sale_end) > new Date()); });
  var donkomiDeals = visibleProducts.filter(function(p) { return p.donkomi; });
  var newArrivals = visibleProducts.filter(function(p) { return p.new_arrival; });
  var topSellingFallback = visibleProducts.filter(function(p) { return p.top_selling; });

  return (
    <div className="pb-4 bg-gray-100 min-h-screen" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>

      <HeroBanner />

      {/* CATEGORIES */}
      <div className="bg-white mt-3 mx-2 md:mx-4 rounded-2xl shadow-sm px-3 py-3 md:px-4 md:py-3.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900 text-base">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-[#2E86C1] text-xs font-semibold flex items-center hover:underline">All <ChevronRight className="h-3 w-3" /></Link>
        </div>
        <div className="grid grid-cols-4 gap-2.5 md:gap-3">
          {HOME_CATEGORIES.map(cat => {
  const adminImg = settings.find(s => s.key === `cat_img_${cat.id}`)?.value;
  const isExpanded = expandedCat === cat.id;
  return (
    <div key={cat.id} onClick={() => setExpandedCat(isExpanded ? null : cat.id)} className="flex flex-col items-center gap-1.5 group">
      <div className={`w-16 h-16 sm:w-[4.25rem] sm:h-[4.25rem] md:w-[4.5rem] md:h-[4.5rem] rounded-2xl ${cat.color} flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform`}>
        {adminImg
          ? <img src={adminImg} alt={cat.label} className="w-full h-full object-cover" />
          : null}
      </div>
      <span className="text-[11px] md:text-xs leading-tight font-medium text-gray-700 text-center">{cat.label}</span>
    </div>
  );
})}
        </div>
        {expandedCat && (function() {
          var cat = HOME_CATEGORIES.find(function(c) { return c.id === expandedCat; });
          if (!cat?.brands) return null;
          return (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shop {cat.label} by Brand</p>
              <div className="flex flex-wrap gap-2">
                {cat.brands.map(function(b) {
                  return <Link key={b.brand + b.category} to={createPageUrl('BrandProducts?brand=' + encodeURIComponent(b.brand) + '&category=' + b.category)} className={'text-xs font-semibold border rounded-full px-3 py-1 transition-colors ' + cat.chipColor}>{b.label}</Link>;
                })}
                <Link to={cat.link} className={'text-xs font-semibold border rounded-full px-3 py-1 transition-colors ' + cat.chipColor}>All {cat.label} →</Link>;
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
          try { var d = JSON.parse(raw); return d?.active ? { ...d, key: k } : null; } catch { return null; }
        }).filter(Boolean);
        var frontCards = allCards.filter(function(c) { return c.position === 'front'; });
        var middleCards = allCards.filter(function(c) { return c.position === 'middle'; });
        var backCards = allCards.filter(function(c) { return c.position === 'back' || !c.position; });
        var orderedCards = frontCards.concat(middleCards).concat(backCards);
        if (!orderedCards.length) return null;
        return (
          <div className="mt-3 mx-2 md:mx-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <h2 className="font-black text-gray-900 text-sm">Promotions</h2>
              </div>
              <div className="fmm-stable-rail overflow-x-auto flex gap-px bg-gray-100">
                {orderedCards.map(function(card) {
                  var CardWrapper = card.link ? Link : 'div';
                  var wrapperProps = card.link ? { to: card.link } : {};
                  return (
                    <CardWrapper key={card.key} {...wrapperProps} className="fmm-stable-promo-card flex-shrink-0 relative overflow-hidden" style={{ minHeight: 130 }}>
                      <div className={'absolute inset-0 bg-gradient-to-r ' + (card.gradient || 'from-blue-600 to-blue-400')} />
                      {card.image_url && <img src={card.image_url} alt={card.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                      <div className="relative z-10 p-3 h-full flex flex-col justify-between" style={{ minHeight: 130 }}>
                        <div>
                          <p className="text-white font-black text-sm leading-tight drop-shadow">{card.title}</p>
                          {card.subtitle && <p className="text-white/90 text-xs font-bold mt-0.5">{card.subtitle}</p>}
                          {card.description && <p className="text-white/80 text-[11px] mt-1 leading-snug">{card.description}</p>}
                        </div>
                        {card.cta_text && <span className="mt-2 inline-block bg-white text-[11px] font-bold text-blue-700 px-3 py-1 rounded-full w-fit">{card.cta_text}</span>}
                      </div>
                    </CardWrapper>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CLASSICO DEALS */}
      <div className="mt-3 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm">CLASSICO Deals</h2>
            <Link to="/classico-deals" className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="fmm-stable-rail overflow-x-auto flex gap-2 p-3">
            {isLoading
              ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-xl animate-pulse"><div className="w-full aspect-square rounded-t-xl bg-gray-200" /><div className="p-2 space-y-2"><div className="h-3 bg-gray-200 rounded" /><div className="h-3 w-16 bg-gray-200 rounded" /></div></div>; })
              : flashItems.length === 0
                ? <p className="text-gray-400 text-xs px-2">No products assigned yet.</p>
                : flashItems.map(function(product) { return (
                <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-32 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative">
                    <div className="w-full aspect-square bg-gray-200">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gray-200 animate-pulse" />}
                    </div>
                    {product.original_price > product.price && (
                      <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">-{Math.round((1 - product.price / product.original_price) * 100)}%</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-gray-700 font-medium line-clamp-2 leading-tight">{product.name}</p>
                    <p className="text-xs font-extrabold text-gray-900 mt-1">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>}
                  </div>
                </Link>
              ); })}
          </div>
        </div>
      </div>

      {/* DONKOMI DEALS */}
      <div className="mt-3 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm">Donkomi Deals</h2>

            <Link to="/donkomi-deals" className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="fmm-stable-rail overflow-x-auto flex gap-2 p-3">
            {isLoading
              ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-xl animate-pulse"><div className="w-full aspect-square rounded-t-xl bg-gray-200" /><div className="p-2 space-y-2"><div className="h-3 bg-gray-200 rounded" /><div className="h-3 w-16 bg-gray-200 rounded" /></div></div>; })
              : donkomiDeals.length === 0
                ? <p className="text-gray-400 text-xs px-2">No products assigned yet.</p>
                : donkomiDeals.map(function(product) { return (
                <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-32 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative">
                    <div className="w-full aspect-square bg-gray-200">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gray-200 animate-pulse" />}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-gray-700 font-medium line-clamp-2 leading-tight">{product.name}</p>
                    <p className="text-xs font-extrabold text-gray-900 mt-1">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>}
                  </div>
                </Link>
              ); })}
          </div>
        </div>
      </div>

      {/* SHOP BY BRAND */}
      {showBrandSection && (
        <div className="mt-3 mx-2 md:mx-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-sm">Shop by Brand</h2>
              <Link to="/brands" className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
            </div>
            <div className="fmm-stable-rail overflow-x-auto flex gap-4 p-4">
              {[
                { name: 'Apple', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124420/SzZdRSkx_400x400_tbfe0u.png'},
                { name: 'Samsung', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124507/360_197_1_dnlnk4.avif' },
                { name: 'Tecno', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124576/Tecno_Mobile_logo.svg_q82f72.webp' },
                { name: 'Hisense', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124629/hisense-logo-png_seeklogo-285063_n8qoro.png' },
                { name: 'TCL', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124688/images_jwltph.png' },
                { name: 'Oraimo', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124735/images_puin9l.jpg' },
                { name: 'Sony', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784124971/sony-logo-png_seeklogo-129420_kd8rt7.png' },
                { name: 'JBL', fallback: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784125078/JBL-Logo.svg_a4jkuo.webp' },
              ].map(function(brand) {
                var uploadedLogo = settings.find(function(s) { return s.key === 'brand_logo_' + brand.name.toLowerCase().replace(/ /g,'_'); })?.value;
                var logoSrc = uploadedLogo || brand.fallback;
                return (
                  <Link key={brand.name} to={createPageUrl('BrandProducts?brand=' + encodeURIComponent(brand.name))} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-2">
                      {logoSrc ? <img src={logoSrc} alt={brand.name} className="max-w-full max-h-full object-contain" onError={function(e) { e.target.style.display='none'; }} /> : <span className="text-lg font-bold text-gray-400">{brand.name[0]}</span>}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700 text-center">{brand.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* NEW ARRIVALS */}
      <div className="mt-3 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm">New Arrivals</h2>
            <Link to="/new-arrivals" className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="fmm-stable-rail overflow-x-auto flex gap-2 p-3">
            {isLoading
              ? Array(6).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-xl animate-pulse"><div className="w-full aspect-square rounded-t-xl bg-gray-200" /><div className="p-2 space-y-2"><div className="h-3 bg-gray-200 rounded" /><div className="h-3 w-16 bg-gray-200 rounded" /></div></div>; })
              : newArrivals.length === 0
                ? <p className="text-gray-400 text-xs px-2">No products assigned yet.</p>
                : newArrivals.map(function(product) { return (
                <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-32 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative">
                    <div className="w-full aspect-square bg-gray-200">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gray-200 animate-pulse" />}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-gray-700 font-medium line-clamp-2 leading-tight">{product.name}</p>
                    <p className="text-xs font-extrabold text-gray-900 mt-1">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>}
                  </div>
                </Link>
              ); })}
          </div>
        </div>
      </div>

      {/* TOP SELLING */}
      <div className="mt-3 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm">Top Selling</h2>
            <Link to="/best-selling" className="text-[#2E86C1] text-xs font-semibold flex items-center">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="fmm-stable-rail overflow-x-auto flex gap-2 p-3">
            {isLoading
              ? Array(5).fill(0).map(function(_, i) { return <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-xl animate-pulse"><div className="w-full aspect-square rounded-t-xl bg-gray-200" /><div className="p-2 space-y-2"><div className="h-3 bg-gray-200 rounded" /><div className="h-3 w-16 bg-gray-200 rounded" /></div></div>; })
              : topSellingFallback.length === 0
                ? <p className="text-gray-400 text-xs px-2">No products assigned yet.</p>
                : topSellingFallback.map(function(product) { return (
                <Link key={product.id} to={createPageUrl('ProductDetail?id=' + product.id)} className="flex-shrink-0 w-32 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative">
                    <div className="w-full aspect-square bg-gray-200">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gray-200 animate-pulse" />}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-gray-700 font-medium line-clamp-2 leading-tight">{product.name}</p>
                    <p className="text-xs font-extrabold text-gray-900 mt-1">₵{product.price?.toLocaleString()}</p>
                    {product.reviews_count > 0 && <p className="text-[10px] text-gray-400">{product.reviews_count} sold</p>}
                  </div>
                </Link>
              ); })}
          </div>
        </div>
      </div>

      {/* Small bottom spacer */}
      <div className="h-6" />
    </div>
  );
}
