import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Zap, Star, Tag, Home as HomeIcon, Smartphone, Headphones, Tv, ShoppingBag, Gem, TrendingUp, Battery, Cable, Wifi, Shield } from 'lucide-react';
import { toast } from 'sonner';
import HeroBanner from '../components/home/HeroBanner';
import FlashSaleCountdown from '../components/home/FlashSaleCountdown';
import FlashSaleTimer from '../components/home/FlashSaleTimer';

// Brands per category
const CATEGORY_BRANDS = {
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

// Main categories shown on home page
const HOME_CATEGORIES = [
  {
    id: 'phones',
    label: 'Phones',
    icon: Smartphone,
    color: 'bg-blue-100 text-blue-700',
    link: createPageUrl('Shop?category=phones'),
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    match: (p) => p.category === 'phones',
    brands: CATEGORY_BRANDS.phones,
    chipColor: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'phone_accessories',
    label: 'Phone Accessories',
    icon: Headphones,
    color: 'bg-[#0093A6]/10 text-[#0093A6]',
    link: createPageUrl('Shop?category=phone_cases'),
    image: 'https://mate.net.in/public/uploads/all/UsReqZvujmEjMUb27qlTtRcCG8Pf18SyULO4HW7U.jpg',
    match: (p) => ['phone_cases','chargers','earphones','cables','power_banks','screen_protectors','holders','speakers'].includes(p.category),
    brands: CATEGORY_BRANDS.phone_accessories,
    chipColor: 'text-[#0093A6] bg-[#0093A6]/5 border-[#0093A6]/30 hover:bg-[#0093A6]/10',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: Tv,
    color: 'bg-purple-100 text-purple-700',
    link: createPageUrl('Shop?category=electronic_appliances'),
    image: 'https://images.unsplash.com/photo-1593640408182-31c228f30ca0?w=400&q=90',
    match: (p) => ['electronic_appliances','smart_watches'].includes(p.category),
    brands: CATEGORY_BRANDS.electronics,
    chipColor: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    id: 'home_appliances',
    label: 'Home Appliances',
    icon: HomeIcon,
    color: 'bg-green-100 text-green-700',
    link: createPageUrl('Shop?category=home_appliances'),
    match: (p) => p.category === 'home_appliances',
    brands: CATEGORY_BRANDS.home_appliances,
    chipColor: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSetting.list(),
    staleTime: 5 * 60 * 1000,
  });

  const getPromoNotice = (key) => {
    const raw = appSettings.find(s => s.key === key)?.value;
    if (!raw) return null;
    try { const d = JSON.parse(raw); return d?.active && d?.image_url ? d : null; } catch { return null; }
  };
  const notice1 = getPromoNotice('promo_notice_1');
  const notice2 = getPromoNotice('promo_notice_2');

  const showBrandSection = appSettings.find(s => s.key === 'shop_by_brand_visible')?.value !== 'false';

  const flashSaleSettings = appSettings.find(s => s.key === 'flash_sale_config');
  const flashConfig = flashSaleSettings?.value ? (() => { try { return JSON.parse(flashSaleSettings.value); } catch { return {}; } })() : {};
  const showFlashTimer = flashConfig.show_timer !== false;
  const flashTimerEndTime = flashConfig.end_time || null;



  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
    staleTime: 60000,
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      if (!user) { window.location.href = '/login'; return; }
      toast.success('Added to cart!');
      queryClient.setQueryData(['cartItems', user?.email], (old = []) => {
        const existing = old.find(i => i.product_id === product.id);
        if (existing) return old.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...old, { id: 'optimistic-' + product.id, product_id: product.id, product_name: product.name, product_image: product.image_url, product_price: product.price, quantity: 1, user_email: user.email }];
      });
      const existingItems = await base44.entities.CartItem.filter({ user_email: user.email, product_id: product.id });
      if (existingItems.length > 0) {
        await base44.entities.CartItem.update(existingItems[0].id, { quantity: existingItems[0].quantity + 1 });
      } else {
        await base44.entities.CartItem.create({ product_id: product.id, product_name: product.name, product_image: product.image_url, product_price: product.price, quantity: 1, user_email: user.email });
      }
      if (product.stock != null) base44.entities.Product.update(product.id, { stock: Math.max(0, product.stock - 1) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  // Filter out hidden and out-of-stock (stock === 0) products for public display
  const visibleProducts = products.filter(p => p.is_visible !== false && !(p.stock != null && p.stock === 0));

  // Product buckets — STRICT: only show products explicitly assigned to each section by admin
  const flashItems    = visibleProducts.filter(p => p.flash_sale  && (!p.flash_sale_end || new Date(p.flash_sale_end) > new Date()));
  const flashSaleEndTime = flashItems.length > 0 ? flashItems[0].flash_sale_end : null;
  const classicoDeals = visibleProducts.filter(p => p.featured);
  const donkomiDeals  = visibleProducts.filter(p => p.donkomi);
  const newArrivals   = visibleProducts.filter(p => p.new_arrival);
  const topSellingFallback = visibleProducts.filter(p => p.top_selling);

  return (
    <div className="pb-6 bg-gray-100 min-h-screen" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* Hero Slider */}
      <HeroBanner />

      {/* ── CATEGORIES ── */}
      <div className="bg-white mt-3 mx-2 md:mx-4 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900 text-base">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-[#2E86C1] text-xs font-semibold flex items-center hover:underline">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {HOME_CATEGORIES.map(cat => {
            const adminImg = appSettings.find(s => s.key === `cat_img_${cat.id}`)?.value;
            const displayImg = adminImg || cat.image || products.find(cat.match)?.image_url;
            const isExpanded = expandedCat === cat.id;
            return (
              <button key={cat.id} onClick={() => setExpandedCat(isExpanded ? null : cat.id)} className="flex flex-col items-center gap-2 group">
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-sm border-2 group-hover:scale-105 transition-transform ${isExpanded ? 'border-[#2E86C1]' : 'border-white'} ${cat.color} flex items-center justify-center`}>
                  {adminImg
                    ? <img src={adminImg} alt={cat.label} className="w-full h-full object-cover" />
                    : displayImg
                      ? <img src={displayImg} alt={cat.label} className="w-full h-full object-cover" />
                      : <cat.icon className="h-10 w-10 opacity-70" />}
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-800 text-center leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>
        {/* Brands — shown on click */}
        {expandedCat && (() => {
          const cat = HOME_CATEGORIES.find(c => c.id === expandedCat);
          if (!cat?.brands) return null;
          return (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Shop {cat.label} by Brand</p>
              <div className="flex flex-wrap gap-2">
                {cat.brands.map(b => (
                  <Link key={b.brand + b.category} to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(b.brand)}&category=${b.category}`)}
                    className={`text-xs font-semibold border rounded-full px-3 py-1 transition-colors ${cat.chipColor}`}>
                    {b.label}
                  </Link>
                ))}
                <Link to={cat.link} className={`text-xs font-semibold border rounded-full px-3 py-1 transition-colors ${cat.chipColor}`}>
                  All {cat.label} →
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── PROMO CARDS SCROLL (same design as category cards) ── */}
      {(() => {
        const PROMO_KEYS = ['promo_card_1','promo_card_2','promo_card_3','promo_card_4','promo_card_5','promo_card_6'];
        const allCards = PROMO_KEYS.map(k => {
          const raw = appSettings.find(s => s.key === k)?.value;
          if (!raw) return null;
          try { const d = JSON.parse(raw); return d?.active ? { ...d, key: k } : null; } catch { return null; }
        }).filter(Boolean);
        const frontCards = allCards.filter(c => c.position === 'front');
        const middleCards = allCards.filter(c => c.position === 'middle');
        const backCards = allCards.filter(c => c.position === 'back' || !c.position);
        const orderedCards = [...frontCards, ...middleCards, ...backCards];
        if (!orderedCards.length) return null;
        return (
          <div className="mt-3 mx-2 md:mx-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                <h2 className="font-black text-gray-900 text-sm uppercase tracking-wide">🎉 Promotions</h2>
              </div>
              <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
                {orderedCards.map(card => {
                  const CardWrapper = card.link ? Link : 'div';
                  const wrapperProps = card.link ? { to: card.link } : {};
                  return (
                    <CardWrapper key={card.key} {...wrapperProps}
                      className="flex-shrink-0 w-[72vw] md:w-72 relative overflow-hidden"
                      style={{ minHeight: 130 }}>
                      <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient || 'from-blue-600 to-blue-400'}`} />
                      {card.image_url && (
                        <img src={card.image_url} alt={card.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      )}
                      <div className="relative z-10 p-3 h-full flex flex-col justify-between" style={{ minHeight: 130 }}>
                        <div>
                          <p className="text-white font-black text-sm leading-tight drop-shadow">{card.title}</p>
                          {card.subtitle && <p className="text-white/90 text-xs font-bold mt-0.5">{card.subtitle}</p>}
                          {card.description && <p className="text-white/80 text-[11px] mt-1 leading-snug line-clamp-2">{card.description}</p>}
                        </div>
                        {card.cta_text && (
                          <span className="mt-2 self-start bg-white text-[#2E86C1] text-[11px] font-black px-3 py-1 rounded-full shadow">
                            {card.cta_text}
                          </span>
                        )}
                      </div>
                    </CardWrapper>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CLASSICO DEALS (Flash Sale) ── */}
      <div className="mt-4 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="h-5 w-5 text-[#2E86C1] fill-[#2E86C1]" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">CLASSICO Deals</h2>
              <span className="bg-blue-100 text-[#2E86C1] text-[10px] font-bold px-2 py-0.5 rounded-full">Flash Sale</span>
              <FlashSaleTimer endTime={flashTimerEndTime} isVisible={showFlashTimer} />
            </div>
            <Link to={createPageUrl('Shop?featured=true')} className="flex items-center gap-1 text-[#2E86C1] text-xs font-bold border border-[#2E86C1] rounded-full px-3 py-1 hover:bg-blue-50 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[40vw] md:w-40 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : flashItems.length === 0
                ? <div className="px-6 py-8 text-gray-400 text-sm">No products assigned to this section yet.</div>
                : flashItems.map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-blue-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      {product.original_price > product.price && (
                       <span className="absolute top-1 left-1 bg-[#2E86C1] text-white text-[8px] font-black px-1 py-0.5 rounded-full">
                         -{Math.round((1 - product.price / product.original_price) * 100)}%
                       </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-[#2E86C1]">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[9px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── DONKOMI DEALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-green-600" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Donkomi Deals</h2>
              <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Best Prices</span>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-[#2E86C1] text-xs font-bold border border-[#2E86C1] rounded-full px-3 py-1 hover:bg-blue-50 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[40vw] md:w-40 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : donkomiDeals.length === 0
                ? <div className="px-6 py-8 text-gray-400 text-sm">No products assigned to this section yet.</div>
                : donkomiDeals.map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-green-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-green-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">🔥</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-green-700">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[9px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── SHOP BY BRAND ── */}
      {showBrandSection && (
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-purple-600" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Shop by Brand</h2>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-[#2E86C1] text-xs font-bold border border-[#2E86C1] rounded-full px-3 py-1 hover:bg-blue-50 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3 p-4">
            {[
              { name: 'Apple', fallback: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
              { name: 'Samsung', fallback: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
              { name: 'Tecno', fallback: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/TECNO_Mobile_Logo.svg' },
              { name: 'Hisense', fallback: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Hisense_logo.svg' },
              { name: 'TCL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/1/16/TCL_Logo.svg' },
              { name: 'Oraimo', fallback: 'https://play-lh.googleusercontent.com/3f4sJfJMJc5Y8mWj4LYl_aSiZ0sGOnJ9iuSqlMzNFJELBPJqBDYQfuCpkJn3RNHanA=s180' },
              { name: 'Sony', fallback: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
              { name: 'JBL', fallback: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/JBL_logo.svg' },
            ].map(brand => {
              const uploadedLogo = appSettings.find(s => s.key === `brand_logo_${brand.name.toLowerCase().replace(/ /g,'_')}`)?.value;
              const logoSrc = uploadedLogo || brand.fallback;
              return (
                <Link key={brand.name} to={createPageUrl(`BrandProducts?brand=${encodeURIComponent(brand.name)}`)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all gap-1.5">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1.5 border border-gray-100">
                    {logoSrc
                      ? <img src={logoSrc} alt={brand.name} className="max-w-full max-h-full object-contain" onError={e => { e.target.style.display='none'; }} />
                      : <span className="text-[10px] font-black text-gray-400">{brand.name[0]}</span>}
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">{brand.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── NEW ARRIVALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">New Arrivals</h2>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-[#2E86C1] text-xs font-bold border border-[#2E86C1] rounded-full px-3 py-1 hover:bg-blue-50 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[40vw] md:w-40 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : newArrivals.length === 0
                ? <div className="px-6 py-8 text-gray-400 text-sm">No products assigned to this section yet.</div>
                : newArrivals.map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-blue-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-full">NEW</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-[#2E86C1]">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[9px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── TOP SELLING ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#2E86C1]" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Top Selling</h2>
              <span className="bg-blue-100 text-[#2E86C1] text-[10px] font-bold px-2 py-0.5 rounded-full">🔥 Hot</span>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-[#2E86C1] text-xs font-bold border border-[#2E86C1] rounded-full px-3 py-1 hover:bg-blue-50 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[40vw] md:w-40 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : topSellingFallback.length === 0
                ? <div className="px-6 py-8 text-gray-400 text-sm">No products assigned to this section yet.</div>
                : topSellingFallback.map((product, idx) => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-blue-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-[#2E86C1] text-white text-[8px] font-black px-1 py-0.5 rounded-full">#{idx + 1}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-[#2E86C1]">₵{product.price?.toLocaleString()}</p>
                    {product.reviews_count > 0 && (
                      <p className="text-[10px] text-yellow-600 font-bold">⭐ {product.reviews_count} sold</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-6" />
    </div>
  );
}