import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Zap, Star, Tag, Home as HomeIcon, Smartphone, Headphones, Tv, ShoppingBag, Gem } from 'lucide-react';
import { toast } from 'sonner';
import HeroBanner from '../components/home/HeroBanner';

// 4 merged categories shown on home page
const HOME_CATEGORIES = [
  {
    id: 'phones',
    label: 'Phones',
    icon: Smartphone,
    color: 'bg-blue-100 text-blue-700',
    link: createPageUrl('Shop?category=phones'),
    match: (p) => p.category === 'phones',
  },
  {
    id: 'phone_accessories',
    label: 'Phone Accessories',
    icon: Headphones,
    color: 'bg-orange-100 text-orange-700',
    link: createPageUrl('Shop?category=phone_cases'),
    match: (p) => ['phone_cases','chargers','earphones','cables','power_banks','screen_protectors','holders','speakers'].includes(p.category),
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: Tv,
    color: 'bg-purple-100 text-purple-700',
    link: createPageUrl('Shop?category=electronic_appliances'),
    match: (p) => ['electronic_appliances','smart_watches'].includes(p.category),
  },
  {
    id: 'home_appliances',
    label: 'Home Appliances',
    icon: HomeIcon,
    color: 'bg-green-100 text-green-700',
    link: createPageUrl('Shop?category=home_appliances'),
    match: (p) => p.category === 'home_appliances',
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
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
  const phoneProducts = products.filter(p => p.category === 'phones');
  const accessoriesProducts = products.filter(p => phoneAccessoryCategories.includes(p.category));
  const electronicsProducts = products.filter(p => ['electronic_appliances', 'smart_watches'].includes(p.category));
  const homeProducts = products.filter(p => p.category === 'home_appliances');
  const allAccessoryAndPhone = products.filter(p => ['phones', ...phoneAccessoryCategories].includes(p.category));
  // Flash sale = discounted or featured items
  const flashSaleProducts = products.filter(p => p.original_price && p.original_price > p.price).slice(0, 6);
  const fallbackFlash = products.filter(p => p.featured).slice(0, 6);
  const flashItems = flashSaleProducts.length >= 2 ? flashSaleProducts : fallbackFlash.length > 0 ? fallbackFlash : products.slice(0, 6);
  // New arrivals = latest added (exclude home_appliances)
  const newArrivals = [...products].filter(p => p.category !== 'home_appliances').sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 6);
  // Classico Deals = featured products
  const classicoDeals = products.filter(p => p.featured).slice(0, 6);
  // Falaa deals = cheapest priced products (exclude home_appliances)
  const falaaDeals = [...products].filter(p => p.price > 0 && p.category !== 'home_appliances').sort((a, b) => a.price - b.price).slice(0, 6);

  return (
    <div className="pb-6 bg-gray-100 min-h-screen" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* Hero Slider */}
      <HeroBanner />

      {/* ── CATEGORIES ── */}
      <div className="bg-white mt-3 mx-2 md:mx-4 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900 text-base">Shop by Category</h2>
          <Link to={createPageUrl('Categories')} className="text-orange-500 text-xs font-semibold flex items-center hover:underline">
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {HOME_CATEGORIES.map(cat => {
            const img = products.find(cat.match)?.image_url;
            return (
              <Link key={cat.id} to={cat.link} className="flex flex-col items-center gap-2 group">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-sm border-2 border-white group-hover:scale-105 transition-transform ${cat.color} flex items-center justify-center`}>
                  {img
                    ? <img src={img} alt={cat.label} className="w-full h-full object-cover" />
                    : <cat.icon className="h-8 w-8 opacity-70" />}
                </div>
                <span className="text-xs md:text-sm font-semibold text-gray-700 text-center leading-tight">{cat.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── FLASH SALES ── */}
      <div className="mt-4 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-white fill-white" />
              <h2 className="font-black text-white text-base uppercase tracking-wide">Flash Sale</h2>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Limited Time</span>
            </div>
            <Link to={createPageUrl('Shop?featured=true')} className="flex items-center gap-1 text-white text-xs font-bold border border-white/60 rounded-full px-3 py-1 hover:bg-white/20 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {/* horizontal scroll — max 6 products visible */}
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[44vw] md:w-44 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : (flashItems.length > 0 ? flashItems : products.slice(0, 5)).map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[44vw] md:w-44 bg-white hover:bg-orange-50 transition-colors p-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-gray-300" /></div>}
                      {product.original_price > product.price && (
                        <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          -{Math.round((1 - product.price / product.original_price) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                    <p className="text-sm font-black text-orange-600">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
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
          {/* 2-column fixed + rest horizontal scroll */}
          <div className="flex gap-px bg-gray-100">
            {/* Fixed left: first 2 items vertical */}
            <div className="flex flex-col gap-px flex-shrink-0" style={{ width: '45vw', maxWidth: '180px' }}>
              {isLoading
                ? Array(2).fill(0).map((_, i) => (
                    <div key={i} className="bg-white p-2 space-y-2">
                      <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    </div>
                  ))
                : newArrivals.slice(0, 2).map(product => (
                    <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                      className="bg-white hover:bg-yellow-50 transition-colors p-2">
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                        <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-full">NEW</span>
                      </div>
                      <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                      <p className="text-xs font-black text-orange-600">₵{product.price?.toLocaleString()}</p>
                    </Link>
                  ))}
            </div>
            {/* Scrollable right: remaining items */}
            <div className="overflow-x-auto flex gap-px flex-1" style={{ scrollbarWidth: 'none' }}>
              {isLoading
                ? Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex-shrink-0 bg-white p-2 space-y-2" style={{ width: '40vw', maxWidth: '160px' }}>
                      <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    </div>
                  ))
                : newArrivals.slice(2).map(product => (
                    <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                      className="flex-shrink-0 bg-white hover:bg-yellow-50 transition-colors p-2"
                      style={{ width: '40vw', maxWidth: '160px' }}>
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-50">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-gray-300" /></div>}
                        <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[8px] font-black px-1 py-0.5 rounded-full">NEW</span>
                      </div>
                      <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-0.5">{product.name}</p>
                      <p className="text-xs font-black text-orange-600">₵{product.price?.toLocaleString()}</p>
                    </Link>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CLASSICO DEALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
            <div className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-white" />
              <h2 className="font-black text-white text-base uppercase tracking-wide">Classico Deals</h2>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Top Picks</span>
            </div>
            <Link to={createPageUrl('Shop?featured=true')} className="flex items-center gap-1 text-white text-xs font-bold border border-white/60 rounded-full px-3 py-1 hover:bg-white/20 transition-colors">
              See All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex gap-px bg-gray-100" style={{ scrollbarWidth: 'none' }}>
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[44vw] md:w-44 bg-white p-2 space-y-2">
                    <div className="aspect-square bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                ))
              : (classicoDeals.length > 0 ? classicoDeals : products.slice(0, 5)).map(product => (
                  <Link key={product.id} to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    className="flex-shrink-0 w-[44vw] md:w-44 bg-white hover:bg-purple-50 transition-colors p-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-gray-50">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-gray-300" /></div>}
                      <span className="absolute top-1 left-1 bg-purple-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">⭐ PICK</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                    <p className="text-sm font-black text-purple-700">₵{product.price?.toLocaleString()}</p>
                    {product.original_price > product.price && (
                      <p className="text-[10px] text-gray-400 line-through">₵{product.original_price?.toLocaleString()}</p>
                    )}
                  </Link>
                ))}
          </div>
        </div>
      </div>

      {/* ── FALAA DEALS ── */}
      <div className="mt-5 mx-2 md:mx-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600 to-teal-500">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-white" />
              <h2 className="font-black text-white text-base uppercase tracking-wide">Falaa Deals</h2>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Best Prices</span>
            </div>
            <Link to={createPageUrl('Shop')} className="flex items-center gap-1 text-white text-xs font-bold border border-white/60 rounded-full px-3 py-1 hover:bg-white/20 transition-colors">
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

      {/* Bottom spacer for nav */}
      <div className="h-6" />
    </div>
  );
}