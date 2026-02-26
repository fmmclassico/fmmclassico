import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Zap, Star, Tag, Home as HomeIcon, Smartphone, Headphones, Tv, ShoppingBag, Gem, TrendingUp, Battery, Cable, Wifi, Shield } from 'lucide-react';
import { toast } from 'sonner';
import HeroBanner from '../components/home/HeroBanner';

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
    subCategories: [
      { label: 'iPhones', link: createPageUrl('Shop?category=phones') },
      { label: 'Samsung', link: createPageUrl('Shop?category=phones') },
      { label: 'Tecno', link: createPageUrl('Shop?category=phones') },
      { label: 'Infinix', link: createPageUrl('Shop?category=phones') },
      { label: 'All Phones', link: createPageUrl('Shop?category=phones') },
    ],
    chipColor: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'phone_accessories',
    label: 'Phone Accessories',
    icon: Headphones,
    color: 'bg-orange-100 text-orange-700',
    link: createPageUrl('Shop?category=phone_cases'),
    image: 'https://mate.net.in/public/uploads/all/UsReqZvujmEjMUb27qlTtRcCG8Pf18SyULO4HW7U.jpg',
    match: (p) => ['phone_cases','chargers','earphones','cables','power_banks','screen_protectors','holders','speakers'].includes(p.category),
    subCategories: [
      { label: 'Cases', link: createPageUrl('Shop?category=phone_cases') },
      { label: 'Chargers', link: createPageUrl('Shop?category=chargers') },
      { label: 'Holders', link: createPageUrl('Shop?category=holders') },
      { label: 'Power Banks', link: createPageUrl('Shop?category=power_banks') },
      { label: 'Earphones', link: createPageUrl('Shop?category=earphones') },
      { label: 'Cables', link: createPageUrl('Shop?category=cables') },
    ],
    chipColor: 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: Tv,
    color: 'bg-purple-100 text-purple-700',
    link: createPageUrl('Shop?category=electronic_appliances'),
    image: 'https://ikonic.com/wp-content/uploads/2023/10/industries-consumer-electronics.jpeg',
    match: (p) => ['electronic_appliances','smart_watches'].includes(p.category),
    subCategories: [
      { label: 'Televisions', link: createPageUrl('Shop?category=electronic_appliances') },
      { label: 'Smart Watches', link: createPageUrl('Shop?category=smart_watches') },
      { label: 'Laptops', link: createPageUrl('Shop?category=electronic_appliances') },
      { label: 'Cameras', link: createPageUrl('Shop?category=electronic_appliances') },
      { label: 'All Electronics', link: createPageUrl('Shop?category=electronic_appliances') },
    ],
    chipColor: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    id: 'home_appliances',
    label: 'Home Appliances',
    icon: HomeIcon,
    color: 'bg-green-100 text-green-700',
    link: createPageUrl('Shop?category=home_appliances'),
    match: (p) => p.category === 'home_appliances',
    subCategories: [
      { label: 'Fridges', link: createPageUrl('Shop?category=home_appliances') },
      { label: 'Microwaves', link: createPageUrl('Shop?category=home_appliances') },
      { label: 'Blenders', link: createPageUrl('Shop?category=home_appliances') },
      { label: 'Irons', link: createPageUrl('Shop?category=home_appliances') },
      { label: 'All Appliances', link: createPageUrl('Shop?category=home_appliances') },
    ],
    chipColor: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100',
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
    };
    getUser();
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 100),
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Product.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
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

  // Product buckets
  const phoneAccessoryCategories = ['phone_cases', 'chargers', 'earphones', 'cables', 'power_banks', 'screen_protectors', 'holders', 'speakers'];
  const flashSaleProducts = products.filter(p => p.original_price && p.original_price > p.price).slice(0, 6);
  const fallbackFlash = products.filter(p => p.featured).slice(0, 6);
  const flashItems = flashSaleProducts.length >= 2 ? flashSaleProducts : fallbackFlash.length > 0 ? fallbackFlash : products.slice(0, 6);
  const newArrivals = [...products].filter(p => p.category !== 'home_appliances').sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 6);
  const classicoDeals = products.filter(p => p.featured).slice(0, 6);
  const falaaDeals = [...products].filter(p => p.price > 0 && p.category !== 'home_appliances').sort((a, b) => a.price - b.price).slice(0, 6);
  // Top selling = highest reviews_count products
  const topSelling = [...products].filter(p => p.reviews_count > 0).sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0)).slice(0, 6);
  const topSellingFallback = topSelling.length >= 2 ? topSelling : [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);

  return (
    <div className="pb-6 bg-gray-100 min-h-screen" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* Hero Slider */}
      <HeroBanner />

      {/* ── CATEGORIES ── */}
      <div className="bg-white mt-3 mx-2 md:mx-4 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900 text-base">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-orange-500 text-xs font-semibold flex items-center hover:underline">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {HOME_CATEGORIES.map(cat => {
            const displayImg = cat.image || products.find(cat.match)?.image_url;
            const isAccessories = cat.id === 'phone_accessories';
            return isAccessories ? (
              <button key={cat.id} onClick={() => setShowSubCats(s => !s)} className="flex flex-col items-center gap-2 group">
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-sm border-2 group-hover:scale-105 transition-transform ${showSubCats ? 'border-orange-400' : 'border-white'} ${cat.color} flex items-center justify-center`}>
                  {displayImg
                    ? <img src={displayImg} alt={cat.label} className="w-full h-full object-cover" />
                    : <cat.icon className="h-10 w-10 opacity-70" />}
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-800 text-center leading-tight">{cat.label}</span>
              </button>
            ) : (
              <Link key={cat.id} to={cat.link} className="flex flex-col items-center gap-2 group">
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-sm border-2 border-white group-hover:scale-105 transition-transform ${cat.color} flex items-center justify-center`}>
                  {displayImg
                    ? <img src={displayImg} alt={cat.label} className="w-full h-full object-cover" />
                    : <cat.icon className="h-10 w-10 opacity-70" />}
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-800 text-center leading-tight">{cat.label}</span>
              </Link>
            );
          })}
        </div>
        {/* Phone Accessories sub-categories — shown on click */}
        {showSubCats && (
          <div className="mt-4 pt-3 border-t border-orange-100">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Phone Accessories</p>
            <div className="flex flex-wrap gap-2">
              {HOME_CATEGORIES.find(c => c.id === 'phone_accessories')?.subCategories?.map(sub => (
                <Link key={sub.label} to={sub.link}
                  className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 hover:bg-orange-100 transition-colors">
                  {sub.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FLASH SALES ── */}
      <div className="mt-4 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500 fill-orange-400" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Flash Sale</h2>
              <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Limited Time</span>
            </div>
            <Link to={createPageUrl('Shop?featured=true')} className="flex items-center gap-1 text-orange-500 text-xs font-bold border border-orange-400 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {/* horizontal scroll — max 6 products visible */}
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[40vw] md:w-40 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : (flashItems.length > 0 ? flashItems : products.slice(0, 5)).map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-orange-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      {product.original_price > product.price && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">
                          -{Math.round((1 - product.price / product.original_price) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-orange-600">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[9px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── NEW ARRIVALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">New Arrivals</h2>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-orange-500 text-xs font-bold border border-orange-400 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors">
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
              : (newArrivals.length > 0 ? newArrivals : products.slice(0, 6)).map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-yellow-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-full">NEW</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-orange-600">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[9px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── CLASSICO DEALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-purple-600" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Classico Deals</h2>
              <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Top Picks</span>
            </div>
            <Link to={createPageUrl('Shop?featured=true')} className="flex items-center gap-1 text-orange-500 text-xs font-bold border border-orange-400 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors">
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
              : (classicoDeals.length > 0 ? classicoDeals : products.slice(0, 5)).map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-purple-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-purple-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">⭐ PICK</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-purple-700">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[9px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── FALAA DEALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-green-600" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Falaa Deals</h2>
              <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Best Prices</span>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-orange-500 text-xs font-bold border border-orange-400 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors">
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
              : (falaaDeals.length > 0 ? falaaDeals : products.slice(0, 5)).map(product => (
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

      {/* ── TOP SELLING ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <h2 className="font-black text-gray-900 text-base uppercase tracking-wide">Top Selling</h2>
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">🔥 Hot</span>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-orange-500 text-xs font-bold border border-orange-400 rounded-full px-3 py-1 hover:bg-orange-50 transition-colors">
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
              : (topSellingFallback.length > 0 ? topSellingFallback : products.slice(0, 6)).map((product, idx) => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[40vw] md:w-40 bg-white hover:bg-red-50 transition-colors p-1.5">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full">#{idx + 1}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                    <p className="text-xs font-black text-orange-600">₵{product.price?.toLocaleString()}</p>
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