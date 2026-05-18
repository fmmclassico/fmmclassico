import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Star, Shield, Plus, Minus } from 'lucide-react';
import ReviewSection from '@/components/products/ReviewSection';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const categoryNames = {
  phone_cases: 'Phone Cases',
  chargers: 'Chargers',
  earphones: 'Earphones',
  cables: 'Cables',
  power_banks: 'Power Banks',
  screen_protectors: 'Screen Protectors',
  holders: 'Holders & Mounts',
  speakers: 'Speakers',
  smart_watches: 'Smart Watches',
  electronic_appliances: 'Electronic Appliances',
  home_appliances: 'Home Appliances',
};

export default function ProductDetail() {
  const [user, setUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

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
    queryFn: () => base44.entities.Product.list(),
  });

  const product = products.find(p => p.id === productId);

  const allImages = product ? [
    product.image_url,
    ...(product.image_urls || [])
  ].filter(Boolean).slice(0, 4) : [];

  while (allImages.length < 4 && product?.image_url) {
    allImages.push(product.image_url);
  }

  const videoUrl = product?.video_url || null;
  const galleryItems = videoUrl
    ? [...allImages, { type: 'video', url: videoUrl }]
    : allImages.map(u => ({ type: 'image', url: u }));

  const isVideo = (item) => typeof item === 'object' && item?.type === 'video';
  const getUrl = (item) => typeof item === 'string' ? item : item?.url;

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      queryClient.setQueryData(['cartItems', user.email], (old = []) => {
        const existing = old.find(i => i.product_id === product.id);
        if (existing) return old.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
        return [...old, { id: 'opt-' + product.id, product_id: product.id, product_name: product.name, product_image: product.image_url, product_price: product.price, quantity, user_email: user.email }];
      });
      if (product.stock != null) {
        queryClient.setQueryData(['products'], (old = []) =>
          old.map(p => p.id === product.id ? { ...p, stock: Math.max(0, p.stock - quantity) } : p)
        );
      }
      toast.success('Added to cart!');
      const existingItems = await base44.entities.CartItem.filter({ user_email: user.email, product_id: product.id });
      if (existingItems.length > 0) {
        await base44.entities.CartItem.update(existingItems[0].id, { quantity: existingItems[0].quantity + quantity });
      } else {
        await base44.entities.CartItem.create({ product_id: product.id, product_name: product.name, product_image: product.image_url, product_price: product.price, quantity, user_email: user.email });
      }
      if (product.stock != null) {
        await base44.entities.Product.update(product.id, { stock: Math.max(0, product.stock - quantity) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const discount = product?.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextImage(); else prevImage();
    }
    setTouchStart(null);
  };

  useEffect(() => {
    if (allImages.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedImageIndex(prev => (prev + 1) % allImages.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [allImages.length]);

  // ── Description formatter ──────────────────────────────────────────
  const renderDescription = (text) => {
    const HEADER_KEYWORDS = [
      'key features', 'specifications', 'package includes',
      'package contents', "what's in the box", 'in the box',
      'features', 'specs', 'what is in the box', 'package content',
    ];

    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Bullet point
      if (/^[\*\-•]/.test(trimmed)) {
        return (
          <div key={i} className="flex items-start gap-2 ml-1">
            <span className="text-[#2E86C1] font-bold mt-0.5 flex-shrink-0">•</span>
            <span className="leading-relaxed">{trimmed.replace(/^[\*\-•]\s*/, '')}</span>
          </div>
        );
      }

      // Section header
      const isHeader = HEADER_KEYWORDS.some(h => trimmed.toLowerCase().startsWith(h));
      if (isHeader) {
        return (
          <p key={i} className="font-black text-gray-800 text-sm pt-3 pb-1 border-t border-gray-100 uppercase tracking-wide">
            {trimmed}
          </p>
        );
      }

      // Spec row: "Label: value"
      if (/^[^:]{1,30}:\s*.+$/.test(trimmed)) {
        const colonIdx = trimmed.indexOf(':');
        const label = trimmed.slice(0, colonIdx);
        const value = trimmed.slice(colonIdx + 1).trim();
        return (
          <div key={i} className="flex gap-2 leading-relaxed text-sm">
            <span className="font-semibold text-gray-700 flex-shrink-0 min-w-[100px]">{label}:</span>
            <span className="text-gray-600">{value}</span>
          </div>
        );
      }

      // Regular paragraph
      return <p key={i} className="leading-relaxed text-gray-600">{trimmed}</p>;
    }).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Product not found</h2>
        <Link to={createPageUrl('Shop')}>
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid md:grid-cols-2 gap-8">

        {/* Product Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div
            className="relative w-full max-w-[280px] sm:max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-lg cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {isVideo(galleryItems[selectedImageIndex]) ? (
                <motion.video
                  key={`video-${selectedImageIndex}`}
                  src={getUrl(galleryItems[selectedImageIndex])}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              ) : (
                <motion.img
                  key={selectedImageIndex}
                  src={getUrl(galleryItems[selectedImageIndex]) || 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=800'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                />
              )}
            </AnimatePresence>

            {discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-[#2E86C1] hover:bg-[#2E86C1] text-white text-lg px-3 py-1">
                -{discount}%
              </Badge>
            )}

            {galleryItems.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {galleryItems.map((_, idx) => (
                  <button key={idx} onClick={() => setSelectedImageIndex(idx)}
                    className={`rounded-full transition-all ${idx === selectedImageIndex ? 'bg-[#2E86C1] w-4 h-2' : 'bg-white/70 w-2 h-2'}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 max-w-[280px] sm:max-w-md mx-auto">
            {galleryItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative ${
                  selectedImageIndex === idx 
                    ? 'border-[#2E86C1] shadow-md' 
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {isVideo(item) ? (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                ) : (
                  <img
                    src={getUrl(item)}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div>
            <Badge variant="outline" className="mb-1.5 text-xs">{categoryNames[product.category]}</Badge>
            <h1 className="text-base md:text-lg font-bold text-gray-800 mb-1.5 leading-snug">{product.name}</h1>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {[1,2,3,4,5].map(i => (
                  <Star 
                    key={i} 
                    className={`h-3.5 w-3.5 ${i <= (product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <span className="text-gray-500 text-xs">({product.reviews_count || 0} reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#2E86C1]">₵{product.price?.toFixed(2)}</span>
            {product.original_price && (
              <span className="text-base text-gray-400 line-through">₵{product.original_price?.toFixed(2)}</span>
            )}
          </div>

          {/* ── DESCRIPTION ── */}
          {product.description && (
            <details className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer font-semibold text-gray-700 select-none list-none">
                <span>Product Details</span>
                <span className="text-[#2E86C1] group-open:rotate-180 transition-transform inline-block">▼</span>
              </summary>
              <div className="px-4 py-4 space-y-2 text-sm">
                {renderDescription(product.description)}
              </div>
            </details>
          )}

          <div className="flex items-center gap-3">
            <span className="text-gray-600 font-medium text-sm">Quantity:</span>
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {product.stock != null && (
              <span className={`text-xs font-semibold ${product.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                {product.stock} in stock
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              size="lg" 
              className="flex-1 bg-[#2E86C1] hover:bg-[#2578ae] text-white font-bold shadow-lg"
              onClick={() => addToCartMutation.mutate()}
              disabled={addToCartMutation.isPending}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4 border-t">
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <Shield className="h-6 w-6 text-[#2E86C1] mb-2" />
              <span className="text-xs font-medium text-gray-600">Genuine Product</span>
            </div>
          </div>
        </motion.div>
      </div>

      <ReviewSection product={product} user={user} />
    </div>
  );
}