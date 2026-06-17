import React, { useState, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import guestCart from '@/lib/guest-cart';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Star, Plus, Minus } from 'lucide-react';
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
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedWattage, setSelectedWattage] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
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

  // Build image gallery from uploaded images only — no placeholders
  const allImages = product ? [
    product.image_url,
    ...(product.image_urls || [])
  ].filter(Boolean) : [];

  const videoUrl = product?.video_url || null;

  // Detect if a video URL is a social embed (YouTube, TikTok, etc.) or a direct file
  const getSocialEmbedUrl = (url) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
    // TikTok — use oembed page
    if (url.includes('tiktok.com')) return url; // render as link fallback
    // Pinterest video pin
    if (url.includes('pinterest.com/pin/')) return null; // no embed support, treat as direct
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Instagram — no public embed without login, treat as direct
    // Facebook
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
    return null; // direct video file
  };

  // gallery = images + video (if exists)
  const galleryItems = [
    ...allImages.map(u => ({ type: 'image', url: u })),
    ...(videoUrl ? [{ type: 'video', url: videoUrl, embedUrl: getSocialEmbedUrl(videoUrl) }] : []),
  ];

  const isVideo = (item) => typeof item === 'object' && item?.type === 'video';
  const getUrl = (item) => typeof item === 'string' ? item : item?.url;

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        // Guest: add to local cart only
        guestCart.addItem({
          id: product.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          product_price: product.price,
          quantity
        });
        toast.success('Added to cart!');
        return;
      }
      // Authenticated: Optimistic update + backend persistence
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
      // Persist in background
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

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextImage(); else prevImage();
    }
    setTouchStart(null);
  };

  // Auto-scroll product images every 10 seconds
  useEffect(() => {
    if (galleryItems.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedImageIndex(prev => (prev + 1) % galleryItems.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [galleryItems.length]);

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
          {/* Main display with swipe */}
          <div
            className="relative w-full max-w-[280px] sm:max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-lg cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              {isVideo(galleryItems[selectedImageIndex]) ? (
                galleryItems[selectedImageIndex].embedUrl ? (
                  <motion.iframe
                    key={`embed-${selectedImageIndex}`}
                    src={galleryItems[selectedImageIndex].embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ border: 'none' }}
                  />
                ) : (
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
                )
              ) : (
                <motion.img
                  key={selectedImageIndex}
                  src={getUrl(galleryItems[selectedImageIndex])}
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

            {/* Dot indicators */}
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

          {/* Thumbnail Gallery — 4 images + video */}
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

          {product.description && (
            <details className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer font-semibold text-gray-700 select-none list-none">
                <span>Product Details</span>
                <span className="text-[#2E86C1] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div
                className="px-4 py-3 text-gray-600 leading-relaxed text-sm product-description ql-editor"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </details>
          )}

          {/* Color selector */}
          {product.show_colors && product.available_colors?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Color: {selectedColor && <span className="text-[#2E86C1]">{selectedColor}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_colors.map(c => (
                  <button key={c} onClick={() => setSelectedColor(c === selectedColor ? null : c)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${selectedColor === c ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wattage selector */}
          {product.show_wattage && product.available_wattage?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Wattage: {selectedWattage && <span className="text-[#2E86C1]">{selectedWattage}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_wattage.map(w => (
                  <button key={w} onClick={() => setSelectedWattage(w === selectedWattage ? null : w)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${selectedWattage === w ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type selector */}
          {product.show_type && product.available_types?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">Type: {selectedType && <span className="text-[#2E86C1]">{selectedType}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_types.map(t => (
                  <button key={t} onClick={() => setSelectedType(t === selectedType ? null : t)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${selectedType === t ? 'border-[#2E86C1] bg-[#2E86C1]/10 text-[#2E86C1]' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
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


        </motion.div>
      </div>

      {/* Review Section */}
      <ReviewSection product={product} user={user} />
    </div>
  );
}